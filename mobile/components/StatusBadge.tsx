// components/StatusBadge.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DeviceStatus } from "../types";

const THEME = {
  success: "#10b981",
  danger: "#f43f5e",
  warning: "#f59e0b",
  textMuted: "#64748b",
};

const STATUS_CONFIG: Record<
  DeviceStatus,
  { bg: string; text: string; label: string }
> = {
  ON:           { bg: "rgba(16, 185, 129, 0.1)",  text: THEME.success, label: "ACTIVE" },
  OFF:          { bg: "rgba(100, 116, 139, 0.1)", text: THEME.textMuted, label: "OFF" },
  ERROR:        { bg: "rgba(244, 63, 94, 0.1)",   text: THEME.danger, label: "ERROR" },
  DISCONNECTED: { bg: "rgba(245, 158, 11, 0.1)",  text: THEME.warning, label: "DC" },
};

export function StatusBadge({ status }: { status: DeviceStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.OFF;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.label, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
