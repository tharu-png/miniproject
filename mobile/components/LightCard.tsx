// components/LightCard.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Device } from "../types";
import { toggleDevice, removeDeviceFromApp } from "../services/deviceService";

const THEME = {
  primary: "#4f46e5",
  success: "#10b981",
  warning: "#f59e0b",
  bg: "#ffffff",
  surface: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
};

export function LightCard({ device }: { device: Device }) {
  const [loading, setLoading] = useState(false);
  const isOn = device.status === "ON";

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

  return (
    <View style={[styles.card, isOn && styles.cardOn]}>
      <View style={styles.topRow}>
        <View style={styles.headerInfo}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceType}>SMART LIGHTING</Text>
        </View>
        <TouchableOpacity
          onPress={handleToggle}
          disabled={loading}
          style={[styles.toggleBtn, isOn && styles.toggleBtnOn]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="power" size={20} color={isOn ? "#fff" : THEME.textMuted} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.hardwareContainer}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleToggle}
          style={[styles.bulbContainer, isOn && styles.bulbContainerOn]}
        >
          <Ionicons
            name={isOn ? "sunny" : "bulb-outline"}
            size={48}
            color={isOn ? THEME.warning : THEME.border}
          />
          {isOn && <View style={styles.glow} />}
        </TouchableOpacity>

        <View style={styles.statusInfo}>
          <Text style={[styles.statusText, isOn && styles.statusTextOn]}>
            {isOn ? "LIGHT SOURCE ACTIVE" : "MANUALLY DISCONNECTED"}
          </Text>
          {device.scheduledOn && (
            <View style={styles.scheduleRow}>
              <Ionicons name="time-outline" size={14} color={THEME.textMuted} />
              <Text style={styles.scheduleText}>{device.scheduledOn} – {device.scheduledOff}</Text>
            </View>
          )}
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
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  headerInfo: { flex: 1 },
  deviceName: { fontSize: 18, fontWeight: "700", color: THEME.text },
  deviceType: { fontSize: 10, fontWeight: "800", color: THEME.textMuted, letterSpacing: 1, marginTop: 4 },
  toggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnOn: { backgroundColor: THEME.warning, borderColor: THEME.warning },
  hardwareContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    backgroundColor: "rgba(0,0,0,0.02)",
    padding: 16,
    borderRadius: 20,
  },
  bulbContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  bulbContainerOn: {
    borderColor: THEME.warning,
    backgroundColor: "rgba(245, 158, 11, 0.05)",
  },
  glow: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.warning,
    opacity: 0.2,
  },
  statusInfo: { flex: 1 },
  statusText: { fontSize: 12, fontWeight: "800", color: THEME.textMuted, marginBottom: 8 },
  statusTextOn: { color: THEME.warning },
  scheduleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  scheduleText: { fontSize: 13, fontWeight: "600", color: THEME.textMuted },
});
