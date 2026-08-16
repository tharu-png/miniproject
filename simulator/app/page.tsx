"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  query,
  getDocs,
  Timestamp,
  where,
  limit,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { db, auth } from "../lib/firebase";

interface Device {
  id: string;
  name: string;
  type: string;
  status: "ON" | "OFF" | "ERROR" | "DISCONNECTED";
  gridX: number;
  gridY: number;
  floorId: string;
  homeId: string;
  switches?: { id: string; name: string; status: string }[];
  maxOnDuration?: number;
  turnedOnAt?: Date | null;
  snapshotUri?: string;
  streamUri?: string;
  scheduledOn?: string;
  scheduledOff?: string;
  isRegistered?: boolean;
  isUnplugged?: boolean;
}

interface Floor {
  id: string;
  name: string;
  homeId: string;
}

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

const STATUS_COLOR: Record<string, string> = {
  ON: THEME.success,
  OFF: THEME.textMuted,
  ERROR: THEME.danger,
  DISCONNECTED: THEME.warning,
};

const STATUS_BG: Record<string, string> = {
  ON: "rgba(16, 185, 129, 0.08)",
  OFF: "rgba(100, 116, 139, 0.05)",
  ERROR: "rgba(244, 63, 94, 0.08)",
  DISCONNECTED: "rgba(245, 158, 11, 0.08)",
};

const TYPE_ICON: Record<string, string> = {
  outlet: "🔌",
  multi_switch: "🎛️",
  scheduled: "⏱️",
  iron: "⏱️",
  light: "💡",
  smart_bulb: "💡",
  camera: "📷",
};

export default function SimulatorPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connected, setConnected] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) { setFloors([]); setDevices([]); return; }
    setLastUpdate(new Date());
    let deviceUnsubs: (() => void)[] = [];

    const loadUserHome = async () => {
      try {
        const homeQuery = query(collection(db, "homes"), where("ownerId", "==", user.uid), limit(1));
        const homeSnap = await getDocs(homeQuery);
        if (homeSnap.empty) { setConnected(false); return; }
        const homeId = homeSnap.docs[0].id;

        const floorsUnsub = onSnapshot(collection(db, "homes", homeId, "floors"), (floorsSnap) => {
          const allFloors: Floor[] = [];
          deviceUnsubs.forEach((u) => u());
          deviceUnsubs = [];

          for (const floorDoc of floorsSnap.docs) {
            const floorId = floorDoc.id;
            allFloors.push({ id: floorId, name: floorDoc.data().name, homeId });
            const unsub = onSnapshot(
              collection(db, "homes", homeId, "floors", floorId, "devices"),
              (devSnap) => {
                const floorDevices = devSnap.docs.map((d) => {
                  const data = d.data();
                  return { id: d.id, ...data, homeId, floorId,
                    turnedOnAt: data.turnedOnAt instanceof Timestamp ? data.turnedOnAt.toDate() : null,
                  } as Device;
                }).filter(d => d.isUnplugged !== true);
                setDevices((prev) => {
                  const others = prev.filter((d) => d.floorId !== floorId);
                  return [...others, ...floorDevices];
                });
                setLastUpdate(new Date());
                setConnected(true);
              }
            );
            deviceUnsubs.push(unsub);
          }
          setFloors(allFloors);
        });
        deviceUnsubs.push(floorsUnsub);
      } catch (err) { console.error("Error loading user home:", err); }
    };

    loadUserHome();
    return () => { deviceUnsubs.forEach((u) => u()); };
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setLoginError(err.message?.replace("Firebase: ", "").replace(/ \(auth\/.*\)/, "") || "Failed to sign in");
    }
  };

  const toggleDevice = async (device: Device) => {
    const newStatus = device.status === "ON" ? "OFF" : "ON";
    const dRef = doc(db, "homes", device.homeId, "floors", device.floorId, "devices", device.id);

    const updateData: any = {
      status: newStatus,
      updatedAt: serverTimestamp(),
    };

    if (device.type === "scheduled" || device.type === "iron" || device.type === "light" || device.type === "smart_bulb") {
      updateData.turnedOnAt = newStatus === "ON" ? serverTimestamp() : null;
    }

    try {
      await updateDoc(dRef, updateData);

      const logRef = doc(collection(db, "homes", device.homeId, "usage_logs"));
      await setDoc(logRef, {
        deviceId: device.id,
        deviceName: device.name,
        floorId: device.floorId,
        homeId: device.homeId,
        event: newStatus,
        timestamp: serverTimestamp(),
        source: "hardware_simulator"
      });
    } catch (err) {
      console.error("Failed to toggle device:", err);
    }
  };

  const toggleSwitch = async (device: Device, switchId: string) => {
    if (!device.switches) return;

    const updatedSwitches = device.switches.map(sw =>
      sw.id === switchId ? { ...sw, status: sw.status === "ON" ? "OFF" : "ON" } : sw
    );
    const anyOn = updatedSwitches.some(s => s.status === "ON");

    const dRef = doc(db, "homes", device.homeId, "floors", device.floorId, "devices", device.id);
    try {
      await updateDoc(dRef, {
        switches: updatedSwitches,
        status: anyOn ? "ON" : "OFF",
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to toggle switch:", err);
    }
  };

  if (!mounted || authLoading) return <div style={s.bg} />;

  if (!user) {
    return (
      <div style={s.loginBg}>
        <form onSubmit={handleLogin} style={s.loginCard}>
          <div style={s.loginIconWrap}>
            <span style={{ fontSize: 32 }}>🏠</span>
          </div>
          <h2 style={s.loginTitle}>SmartHome Simulator</h2>
          <p style={s.loginSub}>Sign in to monitor your hardware</p>
          {loginError && <div style={s.errorBanner}>{loginError}</div>}
          <div style={s.inputGroup}>
            <label style={s.inputLabel}>EMAIL ADDRESS</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={s.input} required />
          </div>
          <div style={s.inputGroup}>
            <label style={s.inputLabel}>PASSWORD</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={s.input} required />
          </div>
          <button type="submit" style={s.loginBtn}>Sign In</button>
        </form>
      </div>
    );
  }

  const grouped = floors.reduce((acc, floor) => {
    acc[floor.id] = { floor, devices: devices.filter((d) => d.floorId === floor.id) };
    return acc;
  }, {} as Record<string, { floor: Floor; devices: Device[] }>);

  const totalOn = devices.filter((d) => d.status === "ON").length;

  return (
    <div style={s.bg}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.headerIconWrap}>🏠</div>
          <div>
            <h1 style={s.headerTitle}>Hardware Simulator</h1>
            <p style={s.headerSub}>Connected as {user.email}</p>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={{ ...s.connPill, color: connected ? THEME.success : THEME.danger }}>
            <span style={{ ...s.connDot, backgroundColor: connected ? THEME.success : THEME.danger }} />
            {connected ? "LIVE" : "OFFLINE"}
          </div>
          <button onClick={() => signOut(auth)} style={s.signOutBtn}>Sign Out</button>
        </div>
      </header>

      <div style={s.statsStrip}>
        {[
          { label: "Devices", value: devices.length, color: THEME.primary },
          { label: "Active", value: totalOn, color: THEME.success },
          { label: "Floors", value: floors.length, color: THEME.text },
        ].map((st) => (
          <div key={st.label} style={s.statCard}>
            <span style={s.statLabel}>{st.label.toUpperCase()}</span>
            <span style={{ ...s.statNum, color: st.color }}>{st.value}</span>
          </div>
        ))}
      </div>

      <main style={s.main}>
        {Object.values(grouped).map(({ floor, devices: floorDevs }) => (
          <section key={floor.id} style={s.floorSection}>
            <div style={s.floorHeader}>
              <h2 style={s.floorTitle}>{floor.name}</h2>
              <span style={s.floorBadge}>{floorDevs.length} Units</span>
            </div>
            <div style={s.deviceGrid}>
              {floorDevs.map((dev) => (
                <DevicePanel
                  key={dev.id}
                  device={dev}
                  onToggle={() => toggleDevice(dev)}
                  onToggleSwitch={(sid) => toggleSwitch(dev, sid)}
                />
              ))}
              {floorDevs.length === 0 && <div style={s.noDevices}>No devices discovered</div>}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function DevicePanel({ device, onToggle, onToggleSwitch }: { device: Device; onToggle: () => void; onToggleSwitch: (sid: string) => void; }) {
  const isOn = device.status === "ON";
  const statusColor = STATUS_COLOR[device.status] ?? THEME.textMuted;
  const icon = TYPE_ICON[device.type] ?? "⚙️";

  const renderHardware = () => {
    switch (device.type) {
      case "multi_switch":
        return (
          <div style={s.hardwareList}>
            {device.switches?.map((sw) => (
              <div key={sw.id} onClick={() => onToggleSwitch(sw.id)} style={{...s.hardwareSwitch, opacity: sw.status === "ON" ? 1 : 0.6}}>
                <span style={s.hwSwitchLabel}>{sw.name}</span>
                <div style={{...s.hwToggle, backgroundColor: sw.status === "ON" ? THEME.success : THEME.border}}>
                  <div style={{...s.hwKnob, transform: sw.status === "ON" ? "translateX(16px)" : "translateX(0)"}} />
                </div>
              </div>
            ))}
          </div>
        );
      case "scheduled":
      case "iron":
        return (
          <div style={s.hwCenter}>
            <button onClick={onToggle} style={{...s.hwMainBtn, backgroundColor: isOn ? THEME.danger : THEME.success}}>
              {isOn ? "EMERGENCY STOP" : "MANUAL START"}
            </button>
            {isOn && device.turnedOnAt && <CountdownDisplay turnedOnAt={device.turnedOnAt} maxDuration={device.maxOnDuration ?? 30} onExpire={onToggle} />}
          </div>
        );
      case "light":
      case "smart_bulb":
        return (
          <div style={s.hwCenter}>
             <div onClick={onToggle} style={{...s.hwLightBulb, opacity: isOn ? 1 : 0.2, textShadow: isOn ? `0 0 30px ${THEME.warning}` : "none"}}>💡</div>
             <p style={s.hwSubtext}>CLICK TO FLICK</p>
          </div>
        );
      case "camera":
        return (
          <div style={s.hwCenter}>
            <div style={{...s.hwCamFeed, backgroundColor: isOn ? "#000" : THEME.surface}}>
              {isOn ? <div style={s.hwLiveBadge}><div style={s.recDot} /> LIVE</div> : <span style={{fontSize: 10, color: THEME.textMuted}}>SIGNAL LOST</span>}
            </div>
            <button onClick={onToggle} style={s.hwMainBtn}>{isOn ? "DEACTIVATE" : "ACTIVATE"}</button>
          </div>
        );
      default:
        return (
          <div style={s.hwCenter}>
            <div onClick={onToggle} style={{...s.hwOutlet, backgroundColor: isOn ? THEME.success : THEME.border}}>
               <div style={{...s.hwOutletKnob, transform: isOn ? "translateY(-10px)" : "translateY(10px)"}} />
            </div>
            <span style={{fontSize: 10, fontWeight: 800, marginTop: 8, color: statusColor}}>{device.status}</span>
          </div>
        );
    }
  };

  return (
    <div style={{...s.deviceCard, borderColor: isOn ? THEME.primary : THEME.border, boxShadow: isOn ? "0 10px 30px -10px rgba(79, 70, 229, 0.2)" : "none"}}>
      <div style={s.cardTop}>
        <div style={s.cardIconBox}>{icon}</div>
        <div style={{...s.statusDot, backgroundColor: statusColor, boxShadow: isOn ? `0 0 10px ${statusColor}` : "none"}} />
      </div>
      <div style={s.cardBody}>
        <h3 style={{...s.deviceName, color: isOn ? THEME.primary : THEME.text}}>{device.name}</h3>
        <p style={s.deviceType}>{device.type.toUpperCase()}</p>
      </div>
      <div style={s.hwContainer}>{renderHardware()}</div>
      <div style={s.gridPos}>COORD: {device.gridX}, {device.gridY}</div>
    </div>
  );
}

function CountdownDisplay({ turnedOnAt, maxDuration, onExpire }: { turnedOnAt: Date; maxDuration: number; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState(0);
  const expiredRef = useRef(false);
  useEffect(() => {
    expiredRef.current = false;
    const tick = () => {
      const elapsed = (Date.now() - turnedOnAt.getTime()) / 60000;
      const nextRemaining = Math.max(0, maxDuration - elapsed);
      setRemaining(nextRemaining);
      if (nextRemaining <= 0 && !expiredRef.current && onExpire) {
        expiredRef.current = true;
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [turnedOnAt, maxDuration, onExpire]);
  const pct = (remaining / maxDuration) * 100;
  const m = Math.floor(remaining);
  const sec = Math.floor((remaining - m) * 60);
  return (
    <div style={s.timerBox}>
      <div style={s.timerHeader}><span style={s.timerVal}>{m}:{String(sec).padStart(2, "0")}</span><span style={s.timerLabel}>REMAINING</span></div>
      <div style={s.progressTrack}><div style={{...s.progressFill, width: `${pct}%`, backgroundColor: pct < 20 ? THEME.danger : THEME.success}} /></div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  bg: { minHeight: "100vh", backgroundColor: THEME.bg, color: THEME.text, fontFamily: '-apple-system, system-ui, sans-serif' },
  loginBg: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.surface },
  loginCard: { width: "100%", maxWidth: 400, backgroundColor: THEME.bg, padding: 40, borderRadius: 24, border: `1px solid ${THEME.border}`, textAlign: "center" },
  loginIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: THEME.surface, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" },
  loginTitle: { margin: "0 0 8px", fontSize: 24, fontWeight: 800 },
  loginSub: { margin: "0 0 32px", color: THEME.textMuted, fontSize: 14 },
  errorBanner: { padding: 12, backgroundColor: "rgba(244, 63, 94, 0.05)", border: `1px solid ${THEME.danger}`, color: THEME.danger, borderRadius: 12, fontSize: 13, marginBottom: 20 },
  inputGroup: { textAlign: "left", marginBottom: 20 },
  inputLabel: { fontSize: 10, fontWeight: 800, color: THEME.textMuted, marginBottom: 8, letterSpacing: "1px" },
  input: { width: "100%", padding: "14px 16px", borderRadius: 12, border: `1px solid ${THEME.border}`, outline: "none" },
  loginBtn: { width: "100%", padding: 14, borderRadius: 12, border: "none", backgroundColor: THEME.text, color: "#fff", fontWeight: 700, cursor: "pointer" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 40px", borderBottom: `1px solid ${THEME.border}`, position: "sticky", top: 0, zIndex: 100, backgroundColor: "#fff" },
  headerLeft: { display: "flex", alignItems: "center", gap: 16 },
  headerIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: THEME.surface, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${THEME.border}` },
  headerTitle: { margin: 0, fontSize: 18, fontWeight: 800 },
  headerSub: { margin: 0, fontSize: 12, color: THEME.textMuted },
  headerRight: { display: "flex", alignItems: "center", gap: 20 },
  connPill: { display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800 },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  signOutBtn: { padding: "8px 16px", borderRadius: 10, border: `1px solid ${THEME.border}`, backgroundColor: THEME.surface, cursor: "pointer", fontSize: 11, fontWeight: 700 },
  statsStrip: { display: "flex", gap: 16, padding: "24px 40px" },
  statCard: { flex: 1, padding: 20, borderRadius: 20, backgroundColor: THEME.surface, border: `1px solid ${THEME.border}`, display: "flex", flexDirection: "column" },
  statLabel: { fontSize: 9, fontWeight: 800, color: THEME.textMuted, letterSpacing: "1px" },
  statNum: { fontSize: 28, fontWeight: 800 },
  main: { padding: "0 40px 60px" },
  floorSection: { marginBottom: 48 },
  floorHeader: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  floorTitle: { margin: 0, fontSize: 20, fontWeight: 800 },
  floorBadge: { padding: "4px 12px", borderRadius: 20, backgroundColor: THEME.surface, border: `1px solid ${THEME.border}`, fontSize: 10, fontWeight: 700 },
  deviceGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 },
  deviceCard: { backgroundColor: "#fff", borderRadius: 24, padding: 24, border: "1px solid", display: "flex", flexDirection: "column", gap: 16 },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: THEME.surface, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${THEME.border}` },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardBody: { display: "flex", flexDirection: "column", gap: 2 },
  deviceName: { margin: 0, fontSize: 16, fontWeight: 700 },
  deviceType: { fontSize: 9, fontWeight: 800, color: THEME.textMuted },
  hwContainer: { padding: "16px 0", borderTop: `1px solid ${THEME.border}`, borderBottom: `1px solid ${THEME.border}` },
  hwCenter: { display: "flex", flexDirection: "column", alignItems: "center" },
  hardwareList: { display: "flex", flexDirection: "column", gap: 8 },
  hardwareSwitch: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, backgroundColor: THEME.surface, borderRadius: 12, border: `1px solid ${THEME.border}`, cursor: "pointer" },
  hwSwitchLabel: { fontSize: 12, fontWeight: 600 },
  hwToggle: { width: 32, height: 16, borderRadius: 8, padding: 2 },
  hwKnob: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#fff", transition: "transform 0.2s" },
  hwMainBtn: { width: "100%", padding: 12, borderRadius: 12, border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 11 },
  hwLightBulb: { fontSize: 48, cursor: "pointer", transition: "all 0.2s" },
  hwSubtext: { fontSize: 9, fontWeight: 800, color: THEME.textMuted, marginTop: 8 },
  hwCamFeed: { width: "100%", height: 120, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  hwLiveBadge: { position: "absolute", top: 12, left: 12, backgroundColor: "rgba(0,0,0,0.5)", color: "#fff", padding: "4px 8px", borderRadius: 4, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", gap: 4 },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.danger },
  hwOutlet: { width: 30, height: 50, borderRadius: 6, padding: 4, display: "flex", justifyContent: "center", cursor: "pointer" },
  hwOutletKnob: { width: 22, height: 26, borderRadius: 4, backgroundColor: "#fff", transition: "transform 0.2s" },
  timerBox: { width: "100%", marginTop: 12, padding: 12, backgroundColor: THEME.surface, borderRadius: 12 },
  timerHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  timerVal: { fontSize: 18, fontWeight: 800, color: THEME.primary },
  timerLabel: { fontSize: 8, fontWeight: 800, color: THEME.textMuted },
  progressTrack: { height: 4, backgroundColor: THEME.border, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", transition: "width 1s linear" },
  gridPos: { fontSize: 8, fontWeight: 800, color: THEME.border, textAlign: "center" },
};
