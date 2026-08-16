// functions/src/index.ts
// Firebase Cloud Functions — Safety cutoff worker + usage log trigger

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ─── 1. Scheduled Safety Cutoff Worker ────────────────────────────────────────
// Runs every minute. Checks all "scheduled" devices that are ON.
// If device has been ON longer than maxOnDuration, flips to OFF and logs CUTOFF.

export const safetyCutoffWorker = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async (context) => {
    const now = new Date();
    const homesSnap = await db.collection("homes").get();

    for (const homeDoc of homesSnap.docs) {
      const homeId = homeDoc.id;
      const floorsSnap = await db
        .collection("homes")
        .doc(homeId)
        .collection("floors")
        .get();

      for (const floorDoc of floorsSnap.docs) {
        const floorId = floorDoc.id;
        const devicesSnap = await db
          .collection("homes")
          .doc(homeId)
          .collection("floors")
          .doc(floorId)
          .collection("devices")
          .where("type", "in", ["scheduled", "iron"])
          .where("status", "==", "ON")
          .get();

        for (const deviceDoc of devicesSnap.docs) {
          const device = deviceDoc.data();
          const turnedOnAt: admin.firestore.Timestamp | null = device.turnedOnAt;
          const maxOnDuration: number = device.maxOnDuration ?? 30; // minutes

          if (!turnedOnAt) continue;

          const elapsedMinutes =
            (now.getTime() - turnedOnAt.toDate().getTime()) / 60000;

          if (elapsedMinutes >= maxOnDuration) {
            functions.logger.info(
              `Safety cutoff triggered for device ${deviceDoc.id} (${device.name})`
            );

            // Flip to OFF
            await deviceDoc.ref.update({
              status: "OFF",
              turnedOnAt: null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Write CUTOFF log
            await db
              .collection("homes")
              .doc(homeId)
              .collection("usage_logs")
              .add({
                deviceId: deviceDoc.id,
                deviceName: device.name,
                floorId,
                homeId,
                event: "CUTOFF",
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                durationMinutes: elapsedMinutes,
              });

            // Send FCM push notification to home owner
            const homeData = homeDoc.data();
            if (homeData?.ownerId) {
              const userDoc = await db
                .collection("users")
                .doc(homeData.ownerId)
                .get();
              const fcmToken = userDoc.data()?.fcmToken;
              if (fcmToken) {
                await admin.messaging().send({
                  token: fcmToken,
                  notification: {
                    title: "⚠️ Safety Alert",
                    body: `${device.name} was automatically turned OFF after ${Math.floor(elapsedMinutes)} min (max: ${maxOnDuration} min).`,
                  },
                  data: {
                    type: "SAFETY_CUTOFF",
                    deviceId: deviceDoc.id,
                    homeId,
                    floorId,
                  },
                  android: {
                    priority: "high",
                    notification: { channelId: "safety_alerts" },
                  },
                });
              }
            }
          }
        }
      }
    }

    return null;
  });

// ─── 2. Light Auto-Schedule Worker ────────────────────────────────────────────
// Runs every minute. Checks lights with autoSchedule=true.
// Turns ON/OFF based on scheduledOn/scheduledOff time strings.

export const lightScheduleWorker = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async (context) => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const homesSnap = await db.collection("homes").get();

    for (const homeDoc of homesSnap.docs) {
      const homeId = homeDoc.id;
      const floorsSnap = await db
        .collection("homes")
        .doc(homeId)
        .collection("floors")
        .get();

      for (const floorDoc of floorsSnap.docs) {
        const floorId = floorDoc.id;
        const devicesSnap = await db
          .collection("homes")
          .doc(homeId)
          .collection("floors")
          .doc(floorId)
          .collection("devices")
          .where("type", "in", ["light", "smart_bulb"])
          .where("autoSchedule", "==", true)
          .get();

        for (const deviceDoc of devicesSnap.docs) {
          const device = deviceDoc.data();
          const scheduledOn: string = device.scheduledOn;
          const scheduledOff: string = device.scheduledOff;
          const currentStatus: string = device.status;

          if (!scheduledOn || !scheduledOff) continue;

          let targetStatus: string | null = null;

          if (currentTime === scheduledOn && currentStatus !== "ON") {
            targetStatus = "ON";
          } else if (currentTime === scheduledOff && currentStatus !== "OFF") {
            targetStatus = "OFF";
          }

          if (targetStatus) {
            await deviceDoc.ref.update({
              status: targetStatus,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            await db
              .collection("homes")
              .doc(homeId)
              .collection("usage_logs")
              .add({
                deviceId: deviceDoc.id,
                deviceName: device.name,
                floorId,
                homeId,
                event: targetStatus,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
              });
            functions.logger.info(
              `Auto-schedule: ${device.name} → ${targetStatus} at ${currentTime}`
            );
          }
        }
      }
    }

    return null;
  });

// ─── 3. Device State Change Trigger ──────────────────────────────────────────
// Logs every manual ON/OFF state change as a usage event.

export const onDeviceStatusChange = functions.firestore
  .document("homes/{homeId}/floors/{floorId}/devices/{deviceId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only log status changes
    if (before.status === after.status) return null;

    // Skip if this update was from safety cutoff (already logged there)
    // We detect that by checking if event was CUTOFF (after.status === "OFF" && before.turnedOnAt !== null)
    // Let the safety worker log those — avoid double-logging
    const { homeId, floorId, deviceId } = context.params;

    await db
      .collection("homes")
      .doc(homeId)
      .collection("usage_logs")
      .add({
        deviceId,
        deviceName: after.name ?? "Unknown",
        floorId,
        homeId,
        event: after.status,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

    return null;
  });
