// services/deviceService.ts
// All Firestore read/write operations for devices, floors, and usage logs

import {
  collection,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  writeBatch,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import { Alert } from "react-native";
import { db } from "../firebase/config";
import { Device, Floor, Home, SwitchNode, UsageLog } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function handleInteractionError(error: any, device: Device) {
  if (error.message === "UNPLUGGED") {
    Alert.alert(
      "Hardware Unavailable",
      `The "${device.name}" is no longer connected to the simulator. Would you like to remove it from your app as well?`,
      [
        { text: "Keep in App", style: "cancel" },
        {
          text: "Remove from App",
          style: "destructive",
          onPress: () => removeDeviceFromApp(device)
        },
      ]
    );
    return true;
  }
  return false;
}

function devicesRef(homeId: string, floorId: string) {
  return collection(db, "homes", homeId, "floors", floorId, "devices");
}

function deviceRef(homeId: string, floorId: string, deviceId: string) {
  return doc(db, "homes", homeId, "floors", floorId, "devices", deviceId);
}

function logsRef(homeId: string) {
  return collection(db, "homes", homeId, "usage_logs");
}

// ─── Device Toggle ─────────────────────────────────────────────────────────────

export async function toggleDevice(device: Device, newStatus: "ON" | "OFF") {
  if (device.isUnplugged) {
    throw new Error("UNPLUGGED");
  }
  const ref = deviceRef(device.homeId, device.floorId, device.id);
  const batch = writeBatch(db);

  const updateData: Record<string, any> = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };

  if (device.type === "scheduled" || device.type === "light") {
    if (newStatus === "ON") {
      updateData.turnedOnAt = serverTimestamp();
    } else {
      updateData.turnedOnAt = null;
    }
  }

  batch.update(ref, updateData);

  // Log the event
  const logRef = doc(logsRef(device.homeId));
  batch.set(logRef, {
    deviceId: device.id,
    deviceName: device.name,
    floorId: device.floorId,
    homeId: device.homeId,
    event: newStatus,
    timestamp: serverTimestamp(),
  });

  await batch.commit();
}

// ─── Multi-Switch Toggle ───────────────────────────────────────────────────────

export async function toggleSwitch(
  device: Device,
  switchId: string,
  newStatus: "ON" | "OFF"
) {
  const ref = deviceRef(device.homeId, device.floorId, device.id);
  const updatedSwitches = (device.switches || []).map((sw: SwitchNode) =>
    sw.id === switchId ? { ...sw, status: newStatus } : sw
  );
  const anyOn = updatedSwitches.some((s) => s.status === "ON");

  await updateDoc(ref, {
    switches: updatedSwitches,
    status: anyOn ? "ON" : "OFF",
    updatedAt: serverTimestamp(),
  });
}

// ─── Scheduled Device Config ───────────────────────────────────────────────────

export async function updateScheduledConfig(
  device: Device,
  config: { maxOnDuration?: number; scheduledOn?: string; scheduledOff?: string; autoSchedule?: boolean }
) {
  const ref = deviceRef(device.homeId, device.floorId, device.id);
  await updateDoc(ref, {
    ...config,
    updatedAt: serverTimestamp(),
  });
}

// ─── Device CRUD ──────────────────────────────────────────────────────────────

export async function addDevice(
  homeId: string,
  floorId: string,
  device: Omit<Device, "id" | "homeId" | "floorId">
) {
  const ref = devicesRef(homeId, floorId);
  await addDoc(ref, {
    ...device,
    homeId,
    floorId,
    isRegistered: true,
    isUnplugged: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Marks a device as unregistered (removed from mobile app dashboard)
 * but doesn't actually delete the hardware record.
 */
export async function removeDeviceFromApp(device: Device) {
  const ref = deviceRef(device.homeId, device.floorId, device.id);
  await updateDoc(ref, { isRegistered: false, updatedAt: serverTimestamp() });
}

/**
 * Marks hardware as unplugged (removed from simulator)
 * but keeps the app registration.
 */
export async function removeDeviceFromSimulator(device: Device) {
  const ref = deviceRef(device.homeId, device.floorId, device.id);
  await updateDoc(ref, { isUnplugged: true, updatedAt: serverTimestamp() });
}

export async function deleteDevice(device: Device) {
  const ref = deviceRef(device.homeId, device.floorId, device.id);
  await deleteDoc(ref);
}

export async function deleteFloor(homeId: string, floorId: string) {
  const dSnap = await getDocs(devicesRef(homeId, floorId));
  const batch = writeBatch(db);
  dSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "homes", homeId, "floors", floorId));
  await batch.commit();
}

export async function updateDevicePosition(
  device: Device,
  gridX: number,
  gridY: number
) {
  const ref = deviceRef(device.homeId, device.floorId, device.id);
  await updateDoc(ref, { gridX, gridY, updatedAt: serverTimestamp() });
}

// ─── Usage Logs ───────────────────────────────────────────────────────────────

export async function getRecentLogs(
  homeId: string,
  count = 50
): Promise<UsageLog[]> {
  const ref = logsRef(homeId);
  const q = query(ref, orderBy("timestamp", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      timestamp: (data.timestamp as Timestamp)?.toDate() ?? new Date(),
    } as UsageLog;
  });
}

export async function getDeviceLogs(
  homeId: string,
  deviceId: string
): Promise<UsageLog[]> {
  const ref = logsRef(homeId);
  const q = query(
    ref,
    where("deviceId", "==", deviceId),
    orderBy("timestamp", "desc"),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      timestamp: (data.timestamp as Timestamp)?.toDate() ?? new Date(),
    } as UsageLog;
  });
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

export async function seedHomeData(userId: string): Promise<string> {
  const homeRef = doc(collection(db, "homes"));
  const homeId = homeRef.id;

  const batch = writeBatch(db);

  // Create home
  batch.set(homeRef, {
    name: "My Smart Home",
    ownerId: userId,
    address: "123 Smart Street",
    createdAt: serverTimestamp(),
  });

  // Floor 1 - Ground Floor
  const gf = doc(collection(db, "homes", homeId, "floors"));
  batch.set(gf, {
    name: "Ground Floor",
    imageUrl: "/floor-plans/ground_floor.png",
    gridCols: 8,
    gridRows: 6,
    order: 0,
    homeId,
  });

  // Floor 2 - First Floor
  const ff = doc(collection(db, "homes", homeId, "floors"));
  batch.set(ff, {
    name: "First Floor",
    imageUrl: "/floor-plans/first_floor.png",
    gridCols: 8,
    gridRows: 6,
    order: 1,
    homeId,
  });

  await batch.commit();

  // Seed devices for Ground Floor
  const devices = [
    {
      name: "Living Room Outlet",
      type: "outlet",
      status: "OFF",
      gridX: 2,
      gridY: 1,
      floorId: gf.id,
      homeId,
    },
    {
      name: "Kitchen Multi-Switch",
      type: "multi_switch",
      status: "OFF",
      gridX: 5,
      gridY: 2,
      switchCount: 3,
      switches: [
        { id: "s1", name: "Counter Light", status: "OFF" },
        { id: "s2", name: "Exhaust Fan", status: "OFF" },
        { id: "s3", name: "Oven Socket", status: "OFF" },
      ],
      floorId: gf.id,
      homeId,
    },
    {
      name: "Iron (Laundry)",
      type: "scheduled",
      status: "OFF",
      gridX: 3,
      gridY: 4,
      maxOnDuration: 30,
      turnedOnAt: null,
      floorId: gf.id,
      homeId,
    },
    {
      name: "Front Door Camera",
      type: "camera",
      status: "ON",
      gridX: 0,
      gridY: 0,
      streamUri: "https://www.w3schools.com/html/mov_bbb.mp4",
      snapshotUri: "https://picsum.photos/seed/cam1/400/300",
      floorId: gf.id,
      homeId,
    },
    {
      name: "Porch Light",
      type: "light",
      status: "OFF",
      gridX: 6,
      gridY: 0,
      autoSchedule: true,
      scheduledOn: "18:00",
      scheduledOff: "06:00",
      floorId: gf.id,
      homeId,
    },
    {
      name: "Bedroom Outlet",
      type: "outlet",
      status: "ON",
      gridX: 2,
      gridY: 2,
      floorId: ff.id,
      homeId,
    },
    {
      name: "Bedroom Multi-Switch",
      type: "multi_switch",
      status: "OFF",
      gridX: 5,
      gridY: 1,
      switchCount: 2,
      switches: [
        { id: "s1", name: "Ceiling Fan", status: "OFF" },
        { id: "s2", name: "Reading Light", status: "OFF" },
      ],
      floorId: ff.id,
      homeId,
    },
    {
      name: "Study Iron",
      type: "scheduled",
      status: "OFF",
      gridX: 7,
      gridY: 3,
      maxOnDuration: 20,
      turnedOnAt: null,
      floorId: ff.id,
      homeId,
    },
    {
      name: "Hallway Camera",
      type: "camera",
      status: "ON",
      gridX: 4,
      gridY: 0,
      streamUri: "https://www.w3schools.com/html/mov_bbb.mp4",
      snapshotUri: "https://picsum.photos/seed/cam2/400/300",
      floorId: ff.id,
      homeId,
    },
  ];

  const deviceBatch = writeBatch(db);
  for (const d of devices) {
    const dRef = doc(
      collection(db, "homes", homeId, "floors", d.floorId, "devices")
    );
    deviceBatch.set(dRef, { ...d, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
  await deviceBatch.commit();

  return homeId;
}
