// hooks/useDevices.ts
// Real-time Firestore listener for devices on a floor

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { Device } from "../types";

function mapDoc(id: string, data: any): Device {
  return {
    id,
    ...data,
    turnedOnAt:
      data.turnedOnAt instanceof Timestamp
        ? data.turnedOnAt.toDate()
        : data.turnedOnAt
        ? new Date(data.turnedOnAt)
        : null,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : undefined,
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate()
        : undefined,
  } as Device;
}

export function useDevices(homeId: string, floorId: string) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!homeId || !floorId) return;

    const ref = collection(
      db,
      "homes",
      homeId,
      "floors",
      floorId,
      "devices"
    );

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const docs = snap.docs
          .map((d) => mapDoc(d.id, d.data()))
          .filter((d) => d.isRegistered !== false); // Hide devices removed from app
        setDevices(docs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [homeId, floorId]);

  return { devices, loading, error };
}
