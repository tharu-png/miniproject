// screens/ReportsScreen.tsx
// Usage analytics with modern minimalist design

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getRecentLogs } from "../services/deviceService";
import { UsageLog } from "../types";

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

const EVENT_COLORS = {
  ON: THEME.success,
  OFF: THEME.textMuted,
  CUTOFF: THEME.danger,
};

const EVENT_ICONS = {
  ON: "power" as const,
  OFF: "power-outline" as const,
  CUTOFF: "warning" as const,
};

const EVENT_LABELS = {
  ON: "Turned On",
  OFF: "Turned Off",
  CUTOFF: "Safety Cutoff",
};

const guessIcon = (name: string): keyof typeof MaterialCommunityIcons.glyphMap => {
  const lower = name.toLowerCase();
  if (lower.includes("light") || lower.includes("lamp")) return "lightbulb";
  if (lower.includes("cam")) return "cctv";
  if (lower.includes("iron") || lower.includes("heater")) return "iron";
  if (lower.includes("switch")) return "light-switch";
  return "power-plug";
};

function groupByDevice(logs: UsageLog[]): Record<string, UsageLog[]> {
  return logs.reduce((acc, log) => {
    const key = log.deviceName ?? log.deviceId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {} as Record<string, UsageLog[]>);
}

function getRelativeTime(date: Date): string {
  const diffMinutes = (date.getTime() - new Date().getTime()) / (1000 * 60);
  if (Math.abs(diffMinutes) < 1) return "Just now";
  if (Math.abs(diffMinutes) < 60) return `${Math.abs(Math.floor(diffMinutes))}m ago`;
  const diffHours = diffMinutes / 60;
  if (Math.abs(diffHours) < 24) return `${Math.abs(Math.floor(diffHours))}h ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function groupLogsByDay(logs: UsageLog[]) {
  const groups: { title: string; data: UsageLog[] }[] = [];
  logs.forEach(log => {
    const day = getDayLabel(log.timestamp);
    if (!groups.length || groups[groups.length - 1].title !== day) {
      groups.push({ title: day, data: [] });
    }
    groups[groups.length - 1].data.push(log);
  });
  return groups;
}

export function ReportsScreen({ homeId, onBack }: Props) {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"summary" | "timeline">("summary");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await getRecentLogs(homeId, 100);
      setLogs(result);
      setLoading(false);
    })();
  }, [homeId]);

  const grouped = groupByDevice(logs);
  const totalCutoffs = logs.filter(l => l.event === "CUTOFF").length;
  const totalOn = logs.filter(l => l.event === "ON").length;
  const dayGroups = groupLogsByDay(logs);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={THEME.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsStrip}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL</Text>
          <Text style={styles.statValue}>{logs.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statLabel, { color: THEME.success }]}>ACTIVE</Text>
          <Text style={[styles.statValue, { color: THEME.success }]}>{totalOn}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statLabel, { color: THEME.danger }]}>CUTOFFS</Text>
          <Text style={[styles.statValue, { color: THEME.danger }]}>{totalCutoffs}</Text>
        </View>
      </View>

      {/* Modern Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab("summary")}
          style={[styles.tab, activeTab === "summary" && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === "summary" && styles.tabTextActive]}>Summary</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("timeline")}
          style={[styles.tab, activeTab === "timeline" && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === "timeline" && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={THEME.primary} style={{ marginTop: 60 }} />
      ) : activeTab === "summary" ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {Object.entries(grouped).map(([name, devLogs]) => {
            const onCount = devLogs.filter(l => l.event === "ON").length;
            const offCount = devLogs.filter(l => l.event === "OFF").length;
            const cutoffCount = devLogs.filter(l => l.event === "CUTOFF").length;
            const max = Math.max(onCount, offCount, cutoffCount, 1);

            return (
              <View key={name} style={styles.deviceCard}>
                <View style={styles.deviceHeader}>
                  <MaterialCommunityIcons name={guessIcon(name)} size={20} color={THEME.primary} />
                  <Text style={styles.deviceName}>{name}</Text>
                </View>

                <View style={styles.chart}>
                  <View style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      <View style={[styles.bar, { width: `${(onCount/max)*100}%`, backgroundColor: THEME.success }]} />
                    </View>
                    <Text style={styles.barVal}>{onCount} ON</Text>
                  </View>
                  <View style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      <View style={[styles.bar, { width: `${(offCount/max)*100}%`, backgroundColor: THEME.textMuted }]} />
                    </View>
                    <Text style={styles.barVal}>{offCount} OFF</Text>
                  </View>
                  {cutoffCount > 0 && (
                    <View style={styles.barContainer}>
                      <View style={styles.barWrapper}>
                        <View style={[styles.bar, { width: `${(cutoffCount/max)*100}%`, backgroundColor: THEME.danger }]} />
                      </View>
                      <Text style={styles.barVal}>{cutoffCount} CUTOFF</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
          {Object.keys(grouped).length === 0 && <EmptyState icon="analytics-outline" title="No Data" sub="Activity will appear here." />}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {dayGroups.map(group => (
            <View key={group.title} style={styles.dayGroup}>
              <Text style={styles.dayTitle}>{group.title}</Text>
              {group.data.map(item => (
                <View key={item.id} style={styles.logItem}>
                  <View style={[styles.logIcon, { backgroundColor: EVENT_COLORS[item.event] + "15" }]}>
                    <Ionicons name={EVENT_ICONS[item.event]} size={16} color={EVENT_COLORS[item.event]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logDevice}>{item.deviceName}</Text>
                    <Text style={styles.logMeta}>{EVENT_LABELS[item.event]} • {getRelativeTime(item.timestamp)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
          {logs.length === 0 && <EmptyState icon="time-outline" title="Empty History" sub="Waiting for device events." />}
        </ScrollView>
      )}
    </View>
  );
}

function EmptyState({ icon, title, sub }: { icon: any, title: string, sub: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={THEME.border} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
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
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: THEME.text },
  statsStrip: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: THEME.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statLabel: { fontSize: 9, fontWeight: "800", color: THEME.textMuted, letterSpacing: 1, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: "800", color: THEME.text },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 24,
    backgroundColor: THEME.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: THEME.bg, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tabText: { fontSize: 13, fontWeight: "600", color: THEME.textMuted },
  tabTextActive: { color: THEME.text },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  deviceCard: {
    backgroundColor: THEME.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  deviceHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  deviceName: { fontSize: 15, fontWeight: "700", color: THEME.text },
  chart: { gap: 8 },
  barContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  barWrapper: { flex: 1, height: 6, backgroundColor: "rgba(0,0,0,0.03)", borderRadius: 3, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 3, minWidth: 4 },
  barVal: { fontSize: 10, fontWeight: "700", color: THEME.textMuted, width: 60, textAlign: "right" },
  dayGroup: { marginBottom: 24 },
  dayTitle: { fontSize: 12, fontWeight: "800", color: THEME.textMuted, letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" },
  logItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    backgroundColor: THEME.bg,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.surface,
  },
  logIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logDevice: { fontSize: 14, fontWeight: "700", color: THEME.text },
  logMeta: { fontSize: 12, color: THEME.textMuted, marginTop: 1 },
  empty: { alignItems: "center", marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: THEME.text, marginTop: 16 },
  emptySub: { fontSize: 14, color: THEME.textMuted, marginTop: 4 },
});
