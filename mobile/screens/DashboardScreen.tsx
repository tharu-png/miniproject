// screens/DashboardScreen.tsx
// Modern Home dashboard with clean minimalist design

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { collection, onSnapshot } from "firebase/firestore";
import { useFloors } from "../hooks/useFloors";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase/config";
import { addFloor, deleteFloor } from "../services/deviceService";
import { Device, Floor } from "../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const THEME = {
  primary: "#4f46e5", // Indigo
  success: "#10b981", // Emerald
  danger: "#f43f5e",  // Rose
  warning: "#f59e0b", // Amber
  bg: "#ffffff",      // Pure White
  surface: "#f8fafc", // Lightest Slate
  border: "#e2e8f0",  // Slate 200
  text: "#0f172a",    // Slate 900
  textMuted: "#64748b", // Slate 500
};

const ROOM_COLORS = [
  "rgba(79, 70, 229, 0.15)",  // Indigo
  "rgba(16, 185, 129, 0.15)", // Emerald
  "rgba(245, 158, 11, 0.15)",  // Amber
  "rgba(139, 92, 246, 0.15)", // Violet
  "rgba(236, 72, 153, 0.15)", // Pink
  "rgba(6, 182, 212, 0.15)",  // Cyan
];

const ROOM_BORDER_COLORS = [
  "rgba(79, 70, 229, 0.4)",
  "rgba(16, 185, 129, 0.4)",
  "rgba(245, 158, 11, 0.4)",
  "rgba(139, 92, 246, 0.4)",
  "rgba(236, 72, 153, 0.4)",
  "rgba(6, 182, 212, 0.4)",
];

interface Props {
  homeId: string;
  onSelectFloor: (floor: Floor) => void;
  onOpenReports: () => void;
}

interface FloorCardProps {
  item: Floor;
  devices: Device[];
  onSelectFloor: (floor: Floor) => void;
  onDeleteFloor: (floor: Floor) => void;
}

const LOCAL_FLOOR_PLANS: Record<string, any> = {
  "/floor-plans/ground_floor.png": require("../assets/floor-plans/ground_floor.png"),
  "/floor-plans/first_floor.png": require("../assets/floor-plans/first_floor.png"),
};

const DEVICE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  outlet: "power-plug",
  multi_switch: "light-switch",
  scheduled: "iron",
  light: "lightbulb",
  camera: "cctv",
};

function getRoomBounds(room: NonNullable<Floor["layout"]>["rooms"][number]) {
  if (!room.cells || !room.cells.length) return null;
  const xs = room.cells.map((cell) => cell.x);
  const ys = room.cells.map((cell) => cell.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };
}

const GRID_PRESETS = [
  { label: "Small", cols: 5, rows: 5, icon: "grid-outline" as const },
  { label: "Medium", cols: 7, rows: 6, icon: "apps-outline" as const },
  { label: "Large", cols: 8, rows: 8, icon: "expand-outline" as const },
];

function FloorCard({ item, devices, onSelectFloor, onDeleteFloor }: FloorCardProps) {
  const [imgErr, setImgErr] = useState(false);
  const localAsset = LOCAL_FLOOR_PLANS[item.imageUrl];
  const floorDevices = devices.filter((device) => device.floorId === item.id);
  const devOn = floorDevices.filter((d) => d.status === "ON").length;

  // Determine grid size from rooms if not explicitly set
  const rooms = item.layout?.rooms || [];
  let maxCol = Number(item.gridCols) || 5;
  let maxRow = Number(item.gridRows) || 5;

  rooms.forEach(r => {
    r.cells?.forEach(c => {
      if (c.x >= maxCol) maxCol = c.x + 1;
      if (c.y >= maxRow) maxRow = c.y + 1;
    });
  });

  const gridCols = Math.max(1, maxCol);
  const gridRows = Math.max(1, maxRow);

  return (
    <TouchableOpacity
      onPress={() => onSelectFloor(item)}
      onLongPress={() => onDeleteFloor(item)}
      style={styles.floorCard}
      activeOpacity={0.9}
    >
      <View style={styles.floorCardContent}>
        {/* Blueprint Grid Background */}
        <View style={styles.blueprintGrid}>
          {Array.from({ length: gridRows + 1 }).map((_, i) => (
            <View key={`h-${i}`} style={[styles.blueprintLine, { top: `${(i / gridRows) * 100}%`, width: "100%", height: 1 }]} />
          ))}
          {Array.from({ length: gridCols + 1 }).map((_, i) => (
            <View key={`v-${i}`} style={[styles.blueprintLine, { left: `${(i / gridCols) * 100}%`, height: "100%", width: 1 }]} />
          ))}
        </View>

        {localAsset ? (
          <Image source={localAsset} style={styles.floorCardImg} resizeMode="cover" />
        ) : !imgErr && item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.floorCardImg} resizeMode="cover" onError={() => setImgErr(true)} />
        ) : (
          <View style={styles.floorCardEmpty} />
        )}

        {/* Layout Overlay */}
        <View style={styles.layoutOverlay}>
          {rooms.map((room, idx) => {
            const bounds = getRoomBounds(room);
            if (!bounds) return null;
            const colorIdx = idx % ROOM_COLORS.length;

            return (
              <View
                key={room.id}
                style={[
                  styles.roomPreviewBlock,
                  {
                    left: `${(bounds.minX / gridCols) * 100}%`,
                    top: `${(bounds.minY / gridRows) * 100}%`,
                    width: `${((bounds.maxX - bounds.minX + 1) / gridCols) * 100}%`,
                    height: `${((bounds.maxY - bounds.minY + 1) / gridRows) * 100}%`,
                    backgroundColor: ROOM_COLORS[colorIdx],
                    borderColor: ROOM_BORDER_COLORS[colorIdx],
                  },
                ]}
              >
                <Text style={styles.roomPreviewLabel} numberOfLines={1}>{room.name}</Text>
              </View>
            );
          })}

          {floorDevices.map((device) => {
            const dx = ((device.gridX || 0) + 0.5) / gridCols;
            const dy = ((device.gridY || 0) + 0.5) / gridRows;
            const isOn = device.status === "ON";

            return (
              <View
                key={device.id}
                style={[
                  styles.devicePin,
                  {
                    left: `${dx * 100}%`,
                    top: `${dy * 100}%`,
                  },
                  isOn && styles.devicePinOn
                ]}
              >
                <MaterialCommunityIcons
                  name={DEVICE_ICONS[device.type] || "help"}
                  size={8}
                  color={isOn ? "#fff" : THEME.textMuted}
                />
                {isOn && <View style={styles.pinGlow} />}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.floorCardOverlay}>
        <View style={{ flex: 1 }}>
          <Text style={styles.floorCardName}>{item.name}</Text>
          <Text style={styles.floorCardStats}>
            {floorDevices.length} {floorDevices.length === 1 ? "Device" : "Devices"} • <Text style={{ color: THEME.success, fontWeight: '700' }}>{devOn} Active</Text>
          </Text>
        </View>
        <View style={styles.floorCardAction}>
          <Ionicons name="chevron-forward" size={18} color={THEME.text} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function DashboardScreen({ homeId, onSelectFloor, onOpenReports }: Props) {
  const { floors, loading } = useFloors(homeId);
  const { user, logout } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [floorName, setFloorName] = useState("");
  const [gridCols, setGridCols] = useState(5);
  const [gridRows, setGridRows] = useState(5);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomName, setRoomName] = useState("New Room");
  const [selectedCells, setSelectedCells] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!homeId || floors.length === 0) { setDevices([]); return; }
    const floorDeviceMap = new Map<string, Device[]>();
    const unsubs = floors.map((floor) => {
      const ref = collection(db, "homes", homeId, "floors", floor.id, "devices");
      return onSnapshot(ref, (snap) => {
        const floorDevices = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Device))
          .filter(d => d.isRegistered !== false);
        floorDeviceMap.set(floor.id, floorDevices);
        setDevices(Array.from(floorDeviceMap.values()).flat());
      });
    });
    return () => unsubs.forEach(u => u());
  }, [homeId, floors]);

  const totalDevices = devices.length;
  const totalOn = devices.filter(d => d.status === "ON").length;

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const openWizard = () => {
    setWizardStep(1);
    setFloorName("");
    setRooms([]);
    setAddModalVisible(true);
  };

  const toggleCell = (x: number, y: number) => {
    const exists = selectedCells.some(c => c.x === x && c.y === y);
    if (exists) setSelectedCells(prev => prev.filter(c => !(c.x === x && c.y === y)));
    else setSelectedCells(prev => [...prev, { x, y }]);
  };

  const saveRoom = () => {
    if (selectedCells.length === 0 || !roomName.trim()) return;
    setRooms(prev => [...prev, { id: `${Date.now()}`, name: roomName, cells: selectedCells }]);
    setSelectedCells([]);
    setRoomName("New Room");
  };

  const handleAddFloor = async () => {
    if (!floorName.trim()) return;
    setSubmitting(true);
    try {
      await addFloor(homeId, {
        name: floorName,
        imageUrl: selectedImage || "",
        gridCols,
        gridRows,
        order: floors.length,
        layout: { rooms },
      });
      setAddModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Home</Text>
          <Text style={styles.headerSub}>{user?.email}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onOpenReports} style={styles.headerBtn}>
            <Ionicons name="stats-chart" size={22} color={THEME.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
            <Ionicons name="log-out-outline" size={24} color={THEME.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Pill */}
      <View style={styles.statsStrip}>
        <View style={styles.statPill}>
          <View style={[styles.statDot, { backgroundColor: THEME.primary }]} />
          <Text style={styles.statText}>{totalDevices} Devices</Text>
        </View>
        <View style={styles.statPill}>
          <View style={[styles.statDot, { backgroundColor: THEME.success }]} />
          <Text style={styles.statText}>{totalOn} Active</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={THEME.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={floors}
          keyExtractor={f => f.id}
          renderItem={({ item }) => (
            <FloorCard
              item={item}
              devices={devices}
              onSelectFloor={onSelectFloor}
              onDeleteFloor={f => deleteFloor(homeId, f.id)}
            />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.sectionTitle}>Floors</Text>}
          ListFooterComponent={
            <TouchableOpacity style={styles.addCard} onPress={openWizard}>
              <Ionicons name="add" size={28} color={THEME.primary} />
              <Text style={styles.addCardText}>Add Floor Plan</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* Modern Add Floor Wizard */}
      <Modal visible={addModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Floor</Text>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Ionicons name="close" size={28} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {wizardStep === 1 && (
              <View>
                <Text style={styles.inputLabel}>FLOOR NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={floorName}
                  onChangeText={setFloorName}
                  placeholder="Ground Floor"
                />
                <Text style={[styles.inputLabel, { marginTop: 24 }]}>GRID SIZE</Text>
                <View style={styles.gridPresets}>
                  {GRID_PRESETS.map((p, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.presetBtn, gridCols === p.cols && styles.presetBtnActive]}
                      onPress={() => { setGridCols(p.cols); setGridRows(p.rows); }}
                    >
                      <Ionicons name={p.icon} size={24} color={gridCols === p.cols ? THEME.primary : THEME.textMuted} />
                      <Text style={[styles.presetLabel, gridCols === p.cols && styles.presetLabelActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Fine-tune Section to fill space and give control */}
                <View style={styles.fineTuneCard}>
                  <Text style={styles.fineTuneTitle}>Custom Dimensions</Text>
                  <View style={styles.stepperRow}>
                    <View style={styles.stepper}>
                      <Text style={styles.stepperLabel}>COLUMNS</Text>
                      <View style={styles.stepperControls}>
                        <TouchableOpacity onPress={() => setGridCols(Math.max(4, gridCols - 1))} style={styles.stepBtn}>
                          <Ionicons name="remove" size={20} color={THEME.text} />
                        </TouchableOpacity>
                        <Text style={styles.stepVal}>{gridCols}</Text>
                        <TouchableOpacity onPress={() => setGridCols(Math.min(12, gridCols + 1))} style={styles.stepBtn}>
                          <Ionicons name="add" size={20} color={THEME.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.stepper}>
                      <Text style={styles.stepperLabel}>ROWS</Text>
                      <View style={styles.stepperControls}>
                        <TouchableOpacity onPress={() => setGridRows(Math.max(4, gridRows - 1))} style={styles.stepBtn}>
                          <Ionicons name="remove" size={20} color={THEME.text} />
                        </TouchableOpacity>
                        <Text style={styles.stepVal}>{gridRows}</Text>
                        <TouchableOpacity onPress={() => setGridRows(Math.min(12, gridRows + 1))} style={styles.stepBtn}>
                          <Ionicons name="add" size={20} color={THEME.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.fineTuneHint}>Adjust the grid to match your room layout complexity.</Text>
                </View>
              </View>
            )}

            {wizardStep === 2 && (
              <View>
                <Text style={styles.inputLabel}>ROOM DESIGNER</Text>
                <View style={styles.roomInput}>
                  <TextInput
                    style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                    value={roomName}
                    onChangeText={setRoomName}
                  />
                  <TouchableOpacity style={styles.saveRoomBtn} onPress={saveRoom}>
                    <Text style={styles.saveRoomBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.grid}>
                  {Array.from({ length: gridRows }).map((_, r) => (
                    <View key={r} style={styles.gridRow}>
                      {Array.from({ length: gridCols }).map((_, c) => {
                        const isSelected = selectedCells.some(cell => cell.x === c && cell.y === r);
                        const isRoom = rooms.find(room => room.cells?.some(cell => cell.x === c && cell.y === r));
                        return (
                          <TouchableOpacity
                            key={c}
                            onPress={() => toggleCell(c, r)}
                            style={[
                              styles.gridCell,
                              isSelected && styles.gridCellSelected,
                              isRoom && styles.gridCellRoom,
                            ]}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {wizardStep === 3 && (
              <View>
                <Text style={styles.inputLabel}>IMAGE (OPTIONAL)</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={async () => {
                  const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, base64: true });
                  if (!r.canceled) setSelectedImage(`data:image/jpeg;base64,${r.assets[0].base64}`);
                }}>
                  {selectedImage ? (
                    <Image source={{ uri: selectedImage }} style={styles.uploadPreview} />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={40} color={THEME.textMuted} />
                      <Text style={styles.uploadText}>Upload Floor Plan</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            {wizardStep > 1 && (
              <TouchableOpacity style={styles.backBtn} onPress={() => setWizardStep(prev => prev - 1)}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => wizardStep < 3 ? setWizardStep(prev => prev + 1) : handleAddFloor()}
              disabled={submitting}
            >
              <Text style={styles.nextBtnText}>
                {submitting ? "Creating..." : wizardStep === 3 ? "Create Floor" : "Continue"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 32, fontWeight: "800", color: THEME.text, letterSpacing: -1 },
  headerSub: { fontSize: 13, color: THEME.textMuted, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 12 },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  statsStrip: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 8,
  },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statText: { fontSize: 13, fontWeight: "600", color: THEME.text },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.text,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  floorCard: {
    backgroundColor: THEME.bg,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  floorCardContent: {
    width: "100%",
    height: 240,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    position: "relative",
  },
  floorCardImg: { width: "100%", height: "100%" },
  floorCardEmpty: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.surface
  },
  floorCardOverlay: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.bg,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  floorCardName: { fontSize: 18, fontWeight: "800", color: THEME.text },
  floorCardStats: { fontSize: 13, color: THEME.textMuted, marginTop: 2 },
  floorCardAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  layoutOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  blueprintGrid: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blueprintLine: { position: "absolute", backgroundColor: "rgba(79, 70, 229, 0.06)" },
  roomPreviewBlock: { position: "absolute", borderWidth: 1, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  roomPreviewLabel: { fontSize: 8, fontWeight: "700", color: THEME.text, opacity: 0.5 },
  devicePin: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    marginLeft: -8,
    marginTop: -8,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  devicePinOn: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  pinGlow: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    opacity: 0.2,
    zIndex: -1,
  },
  addCard: {
    height: 100,
    borderRadius: 24,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  addCardText: { fontSize: 15, fontWeight: "700", color: THEME.primary },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: THEME.bg },
  modalHeader: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 24, fontWeight: "800", color: THEME.text },
  modalBody: { flex: 1, paddingHorizontal: 24 },
  inputLabel: { fontSize: 11, fontWeight: "700", color: THEME.textMuted, marginBottom: 8, letterSpacing: 1 },
  textInput: {
    backgroundColor: THEME.surface,
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    color: THEME.text,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 20,
  },
  gridPresets: { flexDirection: "row", gap: 12 },
  presetBtn: {
    flex: 1,
    backgroundColor: THEME.surface,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  presetBtnActive: { borderColor: THEME.primary, backgroundColor: "rgba(79, 70, 229, 0.05)" },
  presetLabel: { fontSize: 13, fontWeight: "600", color: THEME.textMuted },
  presetLabelActive: { color: THEME.primary },
  fineTuneCard: {
    backgroundColor: THEME.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  fineTuneTitle: { fontSize: 14, fontWeight: "700", color: THEME.text, marginBottom: 16 },
  stepperRow: { flexDirection: "row", gap: 16 },
  stepper: { flex: 1 },
  stepperLabel: { fontSize: 9, fontWeight: "800", color: THEME.textMuted, marginBottom: 8, letterSpacing: 0.5 },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 4,
  },
  stepBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  stepVal: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: THEME.text },
  fineTuneHint: { fontSize: 12, color: THEME.textMuted, marginTop: 12, fontStyle: "italic" },
  roomInput: { flexDirection: "row", gap: 8, marginBottom: 20 },
  saveRoomBtn: { backgroundColor: THEME.primary, paddingHorizontal: 20, borderRadius: 16, justifyContent: "center" },
  saveRoomBtnText: { color: "#fff", fontWeight: "700" },
  grid: { backgroundColor: THEME.surface, padding: 8, borderRadius: 16, borderWidth: 1, borderColor: THEME.border },
  gridRow: { flexDirection: "row", gap: 4, marginBottom: 4 },
  gridCell: { flex: 1, height: 40, backgroundColor: THEME.bg, borderRadius: 4, borderWidth: 1, borderColor: THEME.border },
  gridCellSelected: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  gridCellRoom: { backgroundColor: THEME.border },
  uploadBtn: {
    height: 200,
    backgroundColor: THEME.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  uploadText: { fontSize: 14, fontWeight: "600", color: THEME.textMuted },
  uploadPreview: { width: "100%", height: "100%", borderRadius: 20 },
  modalFooter: {
    padding: 24,
    paddingBottom: 40,
    flexDirection: "row",
    gap: 12,
  },
  backBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: THEME.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  backBtnText: { fontSize: 16, fontWeight: "700", color: THEME.text },
  nextBtn: {
    flex: 2,
    height: 56,
    borderRadius: 16,
    backgroundColor: THEME.text,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
