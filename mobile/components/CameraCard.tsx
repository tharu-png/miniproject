// components/CameraCard.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Device } from "../types";
import { toggleDevice, removeDeviceFromApp } from "../services/deviceService";

const THEME = {
  primary: "#4f46e5",
  success: "#10b981",
  danger: "#f43f5e",
  bg: "#ffffff",
  surface: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
};

// Mock video placeholder - using a high-quality GIF or static image with animation
const MOCK_FEED = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJtZzZyeXh6Z3Z6Z3Z6Z3Z6Z3Z6Z3Z6Z3Z6Z3Z6Z3Z6Z3ZmZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKMGpxx6B8Z3xXy/giphy.gif";

export function CameraCard({ device }: { device: Device }) {
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
          <Text style={styles.deviceType}>LIVE SECURITY FEED</Text>
        </View>
        <TouchableOpacity
          onPress={handleToggle}
          disabled={loading}
          style={[styles.toggleBtn, isOn && styles.toggleBtnOn]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name={isOn ? "videocam" : "videocam-outline"} size={20} color={isOn ? "#fff" : THEME.textMuted} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.hardwareContainer}>
        {isOn ? (
          <View style={styles.videoWrapper}>
            <Image
              source={{ uri: MOCK_FEED }}
              style={styles.mockVideo}
              resizeMode="cover"
            />
            <View style={styles.liveBadge}>
              <View style={styles.recDot} />
              <Text style={styles.liveText}>REC LIVE</Text>
            </View>
            <View style={styles.timeOverlay}>
              <Text style={styles.timestamp}>{new Date().toLocaleTimeString()}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.monitorAreaOff}>
            <Ionicons name="eye-off-outline" size={32} color={THEME.border} />
            <Text style={styles.offText}>SIGNAL ENCRYPTED</Text>
          </View>
        )}
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
  cardOn: { backgroundColor: THEME.bg, borderColor: THEME.primary },
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
  toggleBtnOn: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  hardwareContainer: {
    backgroundColor: "#000",
    borderRadius: 20,
    overflow: "hidden",
  },
  videoWrapper: {
    height: 180,
    position: "relative",
  },
  mockVideo: {
    width: "100%",
    height: "100%",
    opacity: 0.8,
  },
  monitorAreaOff: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  offText: {
    color: THEME.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  liveBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 6,
  },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.danger },
  liveText: { fontSize: 10, fontWeight: "800", color: "#fff" },
  timeOverlay: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timestamp: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
