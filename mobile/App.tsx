import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "./hooks/useAuth";
import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { FloorPlanScreen } from "./screens/FloorPlanScreen";
import { ReportsScreen } from "./screens/ReportsScreen";
import { seedHomeData } from "./services/deviceService";
import { Floor } from "./types";
import {
  collection,
  query,
  getDocs,
  limit,
  where,
} from "firebase/firestore";
import { db } from "./firebase/config";

type Screen = "dashboard" | "floor" | "reports";

export default function App() {
  const { user, loading } = useAuth();
  const [homeId, setHomeId] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [seeding, setSeeding] = useState(false);

  // Find or seed home for this user
  useEffect(() => {
    if (!user) return;
    (async () => {
      setSeeding(true);
      try {
        const q = query(
          collection(db, "homes"),
          where("ownerId", "==", user.uid),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setHomeId(snap.docs[0].id);
        } else {
          const id = await seedHomeData(user.uid);
          setHomeId(id);
        }
      } catch (e) {
        console.error("Home setup error:", e);
      } finally {
        setSeeding(false);
      }
    })();
  }, [user]);

  if (loading || (user && seeding)) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  if (!homeId) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (screen === "reports") {
    return (
      <ReportsScreen homeId={homeId} onBack={() => setScreen("dashboard")} />
    );
  }

  if (screen === "floor" && selectedFloor) {
    return (
      <FloorPlanScreen
        floor={selectedFloor}
        homeId={homeId}
        onBack={() => {
          setSelectedFloor(null);
          setScreen("dashboard");
        }}
      />
    );
  }

  return (
    <DashboardScreen
      homeId={homeId}
      onSelectFloor={(floor) => {
        setSelectedFloor(floor);
        setScreen("floor");
      }}
      onOpenReports={() => setScreen("reports")}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
});
