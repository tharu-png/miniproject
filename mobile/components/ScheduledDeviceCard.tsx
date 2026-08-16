// components/ScheduledDeviceCard.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Device } from "../types";
import { toggleDevice, removeDeviceFromApp, updateScheduledConfig } from "../services/deviceService";

const THEME = {
  primary: "#4f46e5",
  success: "#10b981",
  danger: "#f43f5e",
  warning: "#f59e0b",
  bg: "#ffffff",
  surface: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
};

export function ScheduledDeviceCard({ device }: { device: Device }) {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newMax, setNewMax] = useState(String(device.maxOnDuration ?? 30));
  const [remaining, setRemaining] = useState(0);
  const autoTurnOffTriggeredRef = useRef(false);

  const isOn = device.status === "ON";
  const maxD = device.maxOnDuration ?? 30;

  const handleToggle = async () => {
    setLoading(true);
    try {
      await toggleDevice(device, isOn ? "OFF" : "ON");
    } catch (e: any) {
      if (e.message === "UNPLUGGED") {
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
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMax = async () => {
    const val = parseInt(newMax);
    if (isNaN(val) || val < 1) {
      Alert.alert("Invalid Duration", "Please enter a valid number of minutes.");
      return;
    }
    setLoading(true);
    try {
      await updateScheduledConfig(device, { maxOnDuration: val });
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOn || !device.turnedOnAt) {
      autoTurnOffTriggeredRef.current = false;
      setRemaining(0);
      return;
    }
    const tick = () => {
      const elapsedMs = Date.now() - device.turnedOnAt!.getTime();
      const nextRemaining = Math.max(0, maxD - (elapsedMs / 60000));
      setRemaining(nextRemaining);
      if (nextRemaining <= 0 && !autoTurnOffTriggeredRef.current && !loading) {
        autoTurnOffTriggeredRef.current = true;
        void toggleDevice(device, "OFF");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isOn, device.turnedOnAt, maxD, loading]);

  const pct = (remaining / maxD) * 100;
  const isCritical = pct < 20;

  return (
    <View style={[styles.card, isOn && styles.cardOn, isOn && isCritical && styles.cardCritical]}>
      <View style={styles.topRow}>
        <View style={styles.headerInfo}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceType}>{device.type === 'iron' ? 'SAFETY IRON' : 'SAFETY CRITICAL DEVICE'}</Text>
        </View>
        <TouchableOpacity
          onPress={handleToggle}
          disabled={loading}
          style={[styles.mainBtn, isOn ? { backgroundColor: isCritical ? THEME.danger : THEME.warning } : { backgroundColor: THEME.text }]}
        >
          {loading && !editing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.mainBtnText}>{isOn ? "KILL POWER" : "MANUAL START"}</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.hardwareContainer}>
        <View style={styles.timerDisplay}>
          <View style={styles.timerLabels}>
             <Text style={[styles.timerValue, isOn && isCritical && { color: THEME.danger }]}>
               {Math.floor(remaining)}<Text style={{ fontSize: 14 }}>m</Text> {Math.floor((remaining % 1) * 60)}<Text style={{ fontSize: 14 }}>s</Text>
             </Text>
             <Text style={styles.timerLabel}>REMAINING</Text>
          </View>
          <View style={styles.progressArea}>
             <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: isCritical ? THEME.danger : THEME.warning }]} />
             </View>

             {editing ? (
               <View style={styles.editRow}>
                 <TextInput
                   style={styles.editInput}
                   value={newMax}
                   onChangeText={setNewMax}
                   keyboardType="numeric"
                   autoFocus
                 />
                 <TouchableOpacity onPress={handleUpdateMax} style={styles.editBtn}>
                   <Ionicons name="checkmark-circle" size={24} color={THEME.success} />
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => setEditing(false)} style={styles.editBtn}>
                   <Ionicons name="close-circle" size={24} color={THEME.danger} />
                 </TouchableOpacity>
               </View>
             ) : (
               <TouchableOpacity onPress={() => setEditing(true)} style={styles.limitRow}>
                 <Text style={styles.maxLabel}>{maxD}m AUTO-CUTOFF</Text>
                 <Ionicons name="create-outline" size={14} color={THEME.textMuted} style={{ marginLeft: 4 }} />
               </TouchableOpacity>
             )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    marginVertical: 4,
  },
  cardOn: { backgroundColor: THEME.bg, borderColor: THEME.warning },
  cardCritical: { borderColor: THEME.danger },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  headerInfo: { flex: 1 },
  deviceName: { fontSize: 18, fontWeight: "700", color: THEME.text },
  deviceType: { fontSize: 10, fontWeight: "800", color: THEME.textMuted, letterSpacing: 1, marginTop: 4 },
  mainBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mainBtnText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  hardwareContainer: {
    backgroundColor: "rgba(0,0,0,0.02)",
    padding: 16,
    borderRadius: 20,
  },
  timerDisplay: { flexDirection: "row", alignItems: "center", gap: 20 },
  timerLabels: { alignItems: "center" },
  timerValue: { fontSize: 24, fontWeight: "900", color: THEME.warning, tabularNums: true },
  timerLabel: { fontSize: 9, fontWeight: "800", color: THEME.textMuted, letterSpacing: 1 },
  progressArea: { flex: 1 },
  track: { height: 8, backgroundColor: THEME.border, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  fill: { height: "100%", borderRadius: 4 },
  limitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  maxLabel: { fontSize: 12, fontWeight: "700", color: THEME.textMuted, textAlign: "right" },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  editInput: {
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 0,
    height: 38,
    width: 80,
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  editBtn: {
    padding: 4,
  }
});
