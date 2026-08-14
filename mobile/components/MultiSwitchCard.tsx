// components/MultiSwitchCard.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Device } from "../types";
import { toggleDevice, toggleSwitch } from "../services/deviceService";

const THEME = {
  primary: "#4f46e5",
  success: "#10b981",
  bg: "#ffffff",
  surface: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
};

export function MultiSwitchCard({ device }: { device: Device }) {
  const [loading, setLoading] = useState<string | null>(null);
  const isOn = device.status === "ON";

  const handleToggleIndividual = async (switchId: string, currentStatus: string) => {
    setLoading(switchId);
    try {
      await toggleSwitch(device, switchId, currentStatus === "ON" ? "OFF" : "ON");
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={[styles.card, isOn && styles.cardOn]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, isOn && styles.iconBoxOn]}>
          <Ionicons name="apps" size={20} color={isOn ? THEME.primary : THEME.textMuted} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceMeta}>{device.switches?.length ?? 0} Units Discovery</Text>
        </View>
      </View>

      <View style={styles.switchGrid}>
        {device.switches?.map((sw) => (
          <TouchableOpacity
            key={sw.id}
            style={[styles.switchItem, sw.status === "ON" && styles.switchItemOn]}
            onPress={() => handleToggleIndividual(sw.id, sw.status)}
            disabled={!!loading}
          >
            <View style={styles.switchInfo}>
              <Text style={[styles.switchName, sw.status === "ON" && styles.switchNameOn]}>{sw.name}</Text>
              <Text style={[styles.switchStatus, sw.status === "ON" && styles.switchStatusOn]}>
                {sw.status === "ON" ? "ACTIVE" : "OFF"}
              </Text>
            </View>
            {loading === sw.id ? (
              <ActivityIndicator size="small" color={THEME.primary} />
            ) : (
              <View style={[styles.miniToggle, sw.status === "ON" && styles.miniToggleOn]}>
                <View style={[styles.miniKnob, sw.status === "ON" && styles.miniKnobOn]} />
              </View>
            )}
          </TouchableOpacity>
        ))}
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
  cardOn: {
    backgroundColor: THEME.bg,
    borderColor: THEME.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  iconBoxOn: {
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    borderColor: THEME.primary,
  },
  deviceName: { fontSize: 16, fontWeight: "700", color: THEME.text },
  deviceMeta: { fontSize: 12, color: THEME.textMuted, marginTop: 2 },
  switchGrid: { gap: 10 },
  switchItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.bg,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  switchItemOn: {
    borderColor: THEME.success,
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  switchInfo: { flex: 1 },
  switchName: { fontSize: 14, fontWeight: "600", color: THEME.textMuted },
  switchNameOn: { color: THEME.text },
  switchStatus: { fontSize: 10, fontWeight: "800", color: THEME.textMuted, marginTop: 2 },
  switchStatusOn: { color: THEME.success },
  miniToggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.border,
    padding: 2,
  },
  miniToggleOn: { backgroundColor: THEME.success },
  miniKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff" },
  miniKnobOn: { alignSelf: "flex-end" },
});
