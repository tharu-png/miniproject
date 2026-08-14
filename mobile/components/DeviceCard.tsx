// components/DeviceCard.tsx
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
  danger: "#f43f5e",
  warning: "#f59e0b",
  bg: "#ffffff",
  surface: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
};

interface Props {
  device: Device;
  onPress?: () => void;
}

export function DeviceCard({ device, onPress }: Props) {
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
      } else {
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress ?? handleToggle}
      activeOpacity={0.7}
      style={[styles.card, isOn && styles.cardOn]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconBox, isOn && styles.iconBoxOn]}>
          <Ionicons
            name={isOn ? "flash" : "flash-outline"}
            size={20}
            color={isOn ? THEME.primary : THEME.textMuted}
          />
        </View>

        <TouchableOpacity
          onPress={handleToggle}
          disabled={loading}
          style={[styles.toggleTrack, isOn && styles.toggleTrackOn]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={[styles.toggleThumb, isOn && styles.toggleThumbOn]} />
          )}
        </TouchableOpacity>
      </View>

      <View>
        <Text style={[styles.deviceName, isOn && styles.deviceNameOn]} numberOfLines={1}>
          {device.name}
        </Text>
        <Text style={[styles.deviceMeta, isOn && styles.deviceMetaOn]}>
          {isOn ? "Running" : "Paused"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 20,
    padding: 16,
    height: 140,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardOn: {
    backgroundColor: THEME.bg,
    borderColor: THEME.primary,
    elevation: 4,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBox: {
    width: 40,
    height: 40,
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
  toggleTrack: {
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.border,
    padding: 2,
    justifyContent: "center",
  },
  toggleTrackOn: {
    backgroundColor: THEME.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    elevation: 2,
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  deviceName: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "700",
  },
  deviceNameOn: {
    color: THEME.primary,
  },
  deviceMeta: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  deviceMetaOn: {
    color: THEME.primary,
    opacity: 0.8,
  },
});
