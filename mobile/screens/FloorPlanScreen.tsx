// screens/FloorPlanScreen.tsx
// Modern interactive floor plan with custom device parameters

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  ActivityIndicator,
  TextInput,
  Alert,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useDevices } from "../hooks/useDevices";
import { Device, DeviceStatus, Floor, DeviceType, FloorLayout } from "../types";
import { DeviceCard } from "../components/DeviceCard";
import { MultiSwitchCard } from "../components/MultiSwitchCard";
import { ScheduledDeviceCard } from "../components/ScheduledDeviceCard";
import { LightCard } from "../components/LightCard";
import { CameraCard } from "../components/CameraCard";
import { addDevice } from "../services/deviceService";

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

const DEVICE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap | string> = {
  outlet: "power-plug",
  multi_switch: "light-switch",
  iron: "iron",
  scheduled: "iron",
  smart_bulb: "lightbulb-variant",
  light: "lightbulb",
  camera: "cctv",
};

const STATUS_COLORS: Record<DeviceStatus, string> = {
  ON: THEME.success,
  OFF: THEME.textMuted,
  ERROR: THEME.danger,
  DISCONNECTED: THEME.warning,
};

const ROOM_COLORS = [
  "rgba(79, 70, 229, 0.1)",
  "rgba(16, 185, 129, 0.1)",
  "rgba(245, 158, 11, 0.1)",
  "rgba(139, 92, 246, 0.1)",
  "rgba(236, 72, 153, 0.1)",
  "rgba(6, 182, 212, 0.1)",
];

const ROOM_BORDER_COLORS = [
  "rgba(79, 70, 229, 0.3)",
  "rgba(16, 185, 129, 0.3)",
  "rgba(245, 158, 11, 0.3)",
  "rgba(139, 92, 246, 0.3)",
  "rgba(236, 72, 153, 0.3)",
  "rgba(6, 182, 212, 0.3)",
];

const LOCAL_FLOOR_PLANS: Record<string, any> = {
  "/floor-plans/ground_floor.png": require("../assets/floor-plans/ground_floor.png"),
  "/floor-plans/first_floor.png": require("../assets/floor-plans/first_floor.png"),
};

const DEVICE_TYPES = [
  { key: "multi_switch" as const, name: "Multi Switch", icon: "light-switch" as const, desc: "Add multiple switches" },
  { key: "iron" as const, name: "Iron", icon: "iron" as const, desc: "Safety auto-off timer" },
  { key: "smart_bulb" as const, name: "Smart Bulb", icon: "lightbulb-variant" as const, desc: "Automatic schedule" },
  { key: "outlet" as const, name: "Switch", icon: "power-plug" as const, desc: "Normal power switch" },
  { key: "light" as const, name: "Light", icon: "lightbulb" as const, desc: "Normal room light" },
  { key: "camera" as const, name: "CCTV", icon: "cctv" as const, desc: "Live security monitoring" },
];

interface Props {
  floor: Floor;
  homeId: string;
  onBack: () => void;
}

export function FloorPlanScreen({ floor, homeId, onBack }: Props) {
  const { devices, loading } = useDevices(homeId, floor.id);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [listView, setListView] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType>("multi_switch");
  const [gridX, setGridX] = useState(0);
  const [gridY, setGridY] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Custom parameters
  const [switchCount, setSwitchCount] = useState("3");
  const [maxDuration, setMaxDuration] = useState("30");
  const [onTime, setOnTime] = useState("18:00");
  const [offTime, setOffTime] = useState("06:00");

  const { width } = Dimensions.get("window");
  const CELL_W = (width - 48) / floor.gridCols;
  const CELL_H = 340 / floor.gridRows;

  const layout = (floor.layout || { rooms: [] }) as FloorLayout;

  const roomForCell = (x: number, y: number) => layout.rooms.find(r => r.cells.some(c => c.x === x && c.y === y));

  const filteredDevices = selectedRoomId
    ? devices.filter(d => {
        const room = roomForCell(d.gridX, d.gridY);
        return room?.id === selectedRoomId;
      })
    : devices;

  const deviceAt = (x: number, y: number) => filteredDevices.find(d => d.gridX === x && d.gridY === y);

  const handleAddSubmit = async () => {
    if (!deviceName.trim()) return;
    setSubmitting(true);
    try {
      const dev: any = {
        name: deviceName,
        type: deviceType,
        status: "OFF",
        gridX,
        gridY
      };

      if (deviceType === "multi_switch") {
        const count = parseInt(switchCount) || 1;
        dev.switchCount = count;
        dev.switches = Array.from({ length: count }).map((_, i) => ({
          id: `s${i + 1}`,
          name: `Switch ${i + 1}`,
          status: "OFF",
        }));
      } else if (deviceType === "iron") {
        dev.maxOnDuration = parseInt(maxDuration) || 30;
      } else if (deviceType === "smart_bulb") {
        dev.autoSchedule = true;
        dev.scheduledOn = onTime;
        dev.scheduledOff = offTime;
      } else if (deviceType === "camera") {
        dev.status = "ON";
        dev.streamUri = "https://www.w3schools.com/html/mov_bbb.mp4";
      }

      await addDevice(homeId, floor.id, dev);
      setAddModalVisible(false);
      resetWizard();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setDeviceName("");
    setAddStep(1);
    setSwitchCount("3");
    setMaxDuration("30");
    setOnTime("18:00");
    setOffTime("06:00");
  };

  const renderDetail = () => {
    if (!selectedDevice) return null;
    const dev = devices.find(d => d.id === selectedDevice.id) || selectedDevice;
    switch (dev.type) {
      case "multi_switch": return <MultiSwitchCard device={dev} />;
      case "iron":
      case "scheduled": return <ScheduledDeviceCard device={dev} />;
      case "smart_bulb": return <LightCard device={dev} />;
      case "light": return <LightCard device={dev} />;
      case "camera": return <CameraCard device={dev} />;
      default: return <DeviceCard device={dev} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={THEME.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>{floor.name}</Text>
          <Text style={styles.headerSub}>{devices.length} Devices</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setListView(!listView)} style={styles.headerBtn}>
            <Ionicons name={listView ? "grid-outline" : "list-outline"} size={22} color={THEME.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setAddStep(1); setAddModalVisible(true); }} style={[styles.headerBtn, { backgroundColor: THEME.primary }]}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Room Filter Bar */}
      {layout.rooms.length > 0 && (
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              onPress={() => setSelectedRoomId(null)}
              style={[styles.filterChip, selectedRoomId === null && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, selectedRoomId === null && styles.filterTextActive]}>All Rooms</Text>
            </TouchableOpacity>
            {layout.rooms.map(room => (
              <TouchableOpacity
                key={room.id}
                onPress={() => setSelectedRoomId(room.id)}
                style={[styles.filterChip, selectedRoomId === room.id && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, selectedRoomId === room.id && styles.filterTextActive]}>{room.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={THEME.primary} style={{ marginTop: 80 }} />
      ) : listView ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredDevices.map(d => (
            <View key={d.id} style={styles.listItem}>
              {d.type === "multi_switch" ? <MultiSwitchCard device={d} /> :
               d.type === "iron" ? <ScheduledDeviceCard device={d} /> :
               d.type === "smart_bulb" || d.type === "light" ? <LightCard device={d} /> :
               d.type === "camera" ? <CameraCard device={d} /> :
               <DeviceCard device={d} />}
            </View>
          ))}
          {filteredDevices.length === 0 && (
            <View style={styles.emptyFilter}>
              <Ionicons name="search-outline" size={48} color={THEME.border} />
              <Text style={styles.emptyFilterText}>No devices found in this room</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.canvasWrapper}>
            <View style={styles.canvasBackground}>
              {LOCAL_FLOOR_PLANS[floor.imageUrl] ? (
                <Image source={LOCAL_FLOOR_PLANS[floor.imageUrl]} style={styles.canvasImg} resizeMode="contain" />
              ) : floor.imageUrl ? (
                <Image source={{ uri: floor.imageUrl }} style={styles.canvasImg} resizeMode="contain" />
              ) : null}
            </View>

            <View style={styles.roomsOverlay}>
              {layout.rooms.map((room, idx) => {
                if (!room.cells || !room.cells.length) return null;
                const xs = room.cells.map(c => c.x);
                const ys = room.cells.map(c => c.y);
                const minX = Math.min(...xs); const maxX = Math.max(...xs);
                const minY = Math.min(...ys); const maxY = Math.max(...ys);
                const colorIdx = idx % ROOM_COLORS.length;
                return (
                  <View key={room.id} style={[styles.roomBlock, {
                    left: minX * CELL_W,
                    top: minY * CELL_H,
                    width: (maxX - minX + 1) * CELL_W,
                    height: (maxY - minY + 1) * CELL_H,
                    backgroundColor: ROOM_COLORS[colorIdx],
                    borderColor: ROOM_BORDER_COLORS[colorIdx],
                  }]}>
                    <Text style={styles.roomLabel}>{room.name}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.gridOverlay}>
              {Array.from({ length: floor.gridRows }).map((_, r) => (
                <View key={r} style={[styles.gridRow, { height: CELL_H }]}>
                  {Array.from({ length: floor.gridCols }).map((_, c) => {
                    const dev = deviceAt(c, r);
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[styles.gridCell, { width: CELL_W }]}
                        onPress={() => dev && setSelectedDevice(dev)}
                        disabled={!dev}
                      >
                        {dev && (
                          <View style={[styles.marker, dev.status === "ON" && styles.markerOn]}>
                            <MaterialCommunityIcons
                              name={(DEVICE_ICONS[dev.type] as any) ?? "help"}
                              size={12}
                              color={dev.status === "ON" ? "#fff" : THEME.text}
                            />
                            {dev.status === "ON" && <View style={styles.markerGlow} />}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{selectedRoomId ? "Room Devices" : "Quick Access"}</Text>
          </View>
          <View style={styles.chipScroll}>
            {filteredDevices.map(d => (
              <TouchableOpacity key={d.id} onPress={() => setSelectedDevice(d)} style={[styles.deviceChip, d.status === "ON" && { borderColor: THEME.primary }]}>
                <MaterialCommunityIcons name={(DEVICE_ICONS[d.type] as any)} size={16} color={d.status === "ON" ? THEME.primary : THEME.textMuted} />
                <Text style={styles.chipName}>{d.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Device Modal */}
      <Modal visible={!!selectedDevice} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedDevice(null)} />
          <View style={styles.detailSheet}>
            <View style={styles.sheetHandle} />
            <ScrollView style={{ maxHeight: 600 }}>{renderDetail()}</ScrollView>

            <TouchableOpacity
              onPress={() => {
                if (selectedDevice) {
                  Alert.alert("Remove Device", "Remove this device from your app? It will still exist in the simulator hardware.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: async () => {
                        await removeDeviceFromApp(selectedDevice);
                        setSelectedDevice(null);
                      }
                    }
                  ]);
                }
              }}
              style={styles.removeBtn}
            >
              <Ionicons name="trash-outline" size={18} color={THEME.danger} />
              <Text style={styles.removeBtnText}>Remove from App</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSelectedDevice(null)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Wizard Modal */}
      <Modal visible={addModalVisible} animationType="slide">
        <View style={styles.fullModalContainer}>
          <View style={styles.wizardHeader}>
            <Text style={styles.wizardTitle}>Add {addStep === 1 ? "Device" : "Location"}</Text>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Ionicons name="close" size={28} color={THEME.text} />
            </TouchableOpacity>
          </View>

          {addStep === 1 ? (
            <ScrollView style={styles.wizardBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>CHOOSE TYPE</Text>
              <View style={styles.typeGrid}>
                {DEVICE_TYPES.map(t => (
                  <TouchableOpacity key={t.key} onPress={() => setDeviceType(t.key)} style={[styles.typeBtn, deviceType === t.key && styles.typeBtnActive]}>
                    <MaterialCommunityIcons name={t.icon} size={28} color={deviceType === t.key ? THEME.primary : THEME.textMuted} />
                    <Text style={[styles.typeLabel, deviceType === t.key && styles.typeLabelActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 24 }]}>DEVICE NAME</Text>
              <TextInput style={styles.textInput} value={deviceName} onChangeText={setDeviceName} placeholder="e.g. Master Bedroom Light" />

              {/* Dynamic Fields */}
              {deviceType === "multi_switch" && (
                <View style={styles.paramCard}>
                  <Text style={styles.paramLabel}>SWITCH COUNT</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity onPress={() => setSwitchCount(String(Math.max(1, parseInt(switchCount) - 1)))} style={styles.stepCircle}><Ionicons name="remove" size={20} color={THEME.text} /></TouchableOpacity>
                    <Text style={styles.stepText}>{switchCount}</Text>
                    <TouchableOpacity onPress={() => setSwitchCount(String(Math.min(8, parseInt(switchCount) + 1)))} style={styles.stepCircle}><Ionicons name="add" size={20} color={THEME.text} /></TouchableOpacity>
                  </View>
                </View>
              )}

              {deviceType === "iron" && (
                <View style={styles.paramCard}>
                  <Text style={styles.paramLabel}>AUTO-OFF TIMER (MINUTES)</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity onPress={() => setMaxDuration(String(Math.max(5, parseInt(maxDuration) - 5)))} style={styles.stepCircle}><Ionicons name="remove" size={20} color={THEME.text} /></TouchableOpacity>
                    <Text style={styles.stepText}>{maxDuration}m</Text>
                    <TouchableOpacity onPress={() => setMaxDuration(String(Math.min(120, parseInt(maxDuration) + 5)))} style={styles.stepCircle}><Ionicons name="add" size={20} color={THEME.text} /></TouchableOpacity>
                  </View>
                </View>
              )}

              {deviceType === "smart_bulb" && (
                <View style={styles.paramCard}>
                  <Text style={styles.paramLabel}>AUTOMATIC SCHEDULE</Text>
                  <View style={styles.timeRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timeSub}>ON AT</Text>
                      <TextInput style={styles.timeInput} value={onTime} onChangeText={setOnTime} placeholder="21:00" maxLength={5} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timeSub}>OFF AT</Text>
                      <TextInput style={styles.timeInput} value={offTime} onChangeText={setOffTime} placeholder="22:00" maxLength={5} />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.wizardBody}>
              <Text style={styles.inputLabel}>TAP TO PLACE ON FLOOR</Text>
              <View style={styles.placementGrid}>
                {Array.from({ length: floor.gridRows }).map((_, r) => (
                  <View key={r} style={styles.gridRow}>
                    {Array.from({ length: floor.gridCols }).map((_, c) => {
                      const isSelect = gridX === c && gridY === r;
                      const occupied = !!deviceAt(c, r);
                      return (
                        <TouchableOpacity key={c} onPress={() => !occupied && (setGridX(c), setGridY(r))} style={[styles.placeCell, isSelect && styles.placeCellActive, occupied && styles.placeCellOccupied]}>
                          {isSelect && <View style={styles.marker}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.wizardFooter}>
            {addStep === 2 && <TouchableOpacity style={styles.wizBack} onPress={() => setAddStep(1)}><Text style={styles.wizBackText}>Back</Text></TouchableOpacity>}
            <TouchableOpacity style={styles.wizNext} onPress={() => addStep === 1 ? setAddStep(2) : handleAddSubmit()} disabled={submitting}>
              <Text style={styles.wizNextText}>{submitting ? "Adding..." : addStep === 1 ? "Next: Placement" : "Finish"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: "row", alignItems: "center" },
  headerBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: THEME.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: THEME.text },
  headerSub: { fontSize: 12, color: THEME.textMuted },
  headerActions: { flexDirection: "row", gap: 8 },
  filterBar: {
    backgroundColor: THEME.bg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  filterScroll: { paddingHorizontal: 24, gap: 10 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  filterChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.textMuted,
  },
  filterTextActive: {
    color: "#fff",
  },
  listContent: { padding: 24 },
  listItem: { marginBottom: 16 },
  emptyFilter: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    gap: 12,
  },
  emptyFilterText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.textMuted,
  },
  canvasWrapper: { margin: 24, height: 340, backgroundColor: THEME.surface, borderRadius: 20, borderWidth: 1, borderColor: THEME.border, overflow: "hidden" },
  canvasBackground: { ...StyleSheet.absoluteFillObject },
  canvasImg: { width: "100%", height: "100%" },
  roomsOverlay: { ...StyleSheet.absoluteFillObject },
  roomBlock: { position: "absolute", borderWidth: 1, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  roomLabel: { fontSize: 8, fontWeight: "700", color: THEME.text, opacity: 0.5 },
  gridOverlay: { ...StyleSheet.absoluteFillObject },
  gridRow: { flexDirection: "row" },
  gridCell: { alignItems: "center", justifyContent: "center" },
  marker: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: THEME.border, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  markerOn: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  markerGlow: { position: "absolute", width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.primary, opacity: 0.15, zIndex: -1 },
  sectionHeader: { paddingHorizontal: 24, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: THEME.text },
  chipScroll: { paddingHorizontal: 24, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  deviceChip: { flexDirection: "row", alignItems: "center", backgroundColor: THEME.surface, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: THEME.border, gap: 8 },
  chipName: { fontSize: 13, fontWeight: "600", color: THEME.text },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  detailSheet: { backgroundColor: THEME.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: THEME.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  closeBtn: { marginTop: 20, height: 56, borderRadius: 16, backgroundColor: THEME.text, alignItems: "center", justifyContent: "center" },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginTop: 10,
    gap: 8,
  },
  removeBtnText: {
    color: THEME.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  fullModalContainer: { flex: 1, backgroundColor: THEME.bg },
  wizardHeader: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wizardTitle: { fontSize: 24, fontWeight: "800", color: THEME.text },
  wizardBody: { flex: 1, paddingHorizontal: 24 },
  inputLabel: { fontSize: 10, fontWeight: "800", color: THEME.textMuted, letterSpacing: 1, marginBottom: 16 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  typeBtn: { width: "30%", aspectRatio: 1, backgroundColor: THEME.surface, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: THEME.border },
  typeBtnActive: { borderColor: THEME.primary, backgroundColor: "rgba(79, 70, 229, 0.05)" },
  typeLabel: { fontSize: 10, fontWeight: "700", color: THEME.textMuted, textAlign: "center" },
  typeLabelActive: { color: THEME.primary },
  textInput: { backgroundColor: THEME.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: THEME.border, color: THEME.text, fontSize: 16, marginBottom: 24 },
  paramCard: { backgroundColor: THEME.surface, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: THEME.border, marginBottom: 24 },
  paramLabel: { fontSize: 10, fontWeight: "800", color: THEME.textMuted, marginBottom: 12 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 20 },
  stepCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: THEME.bg, borderWeight: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 20, fontWeight: "800", color: THEME.text },
  timeRow: { flexDirection: "row", gap: 16 },
  timeSub: { fontSize: 9, fontWeight: "800", color: THEME.textMuted, marginBottom: 4 },
  timeInput: { backgroundColor: THEME.bg, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: THEME.border, fontSize: 16, fontWeight: "700" },
  placementGrid: { backgroundColor: THEME.surface, padding: 8, borderRadius: 20 },
  placeCell: { flex: 1, height: 40, backgroundColor: THEME.bg, borderRadius: 6, margin: 2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: THEME.border },
  placeCellActive: { borderColor: THEME.primary, backgroundColor: "rgba(79, 70, 229, 0.1)" },
  placeCellOccupied: { opacity: 0.2 },
  wizardFooter: { padding: 24, flexDirection: "row", gap: 12 },
  wizBack: { flex: 1, height: 56, borderRadius: 16, backgroundColor: THEME.surface, alignItems: "center", justifyContent: "center" },
  wizBackText: { fontWeight: "700", color: THEME.text },
  wizNext: { flex: 2, height: 56, borderRadius: 16, backgroundColor: THEME.text, alignItems: "center", justifyContent: "center" },
  wizNextText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
