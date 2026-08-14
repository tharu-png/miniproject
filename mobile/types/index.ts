// types/index.ts - Shared TypeScript types across the mobile app

export type DeviceStatus = "ON" | "OFF" | "ERROR" | "DISCONNECTED";

export type DeviceType =
  | "outlet"
  | "multi_switch"
  | "iron"
  | "smart_bulb"
  | "light"
  | "camera";

export interface SwitchNode {
  id: string;
  name: string;
  status: DeviceStatus;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  gridX: number;
  gridY: number;
  floorId: string;
  homeId: string;
  // Multi-switch
  switches?: SwitchNode[];
  switchCount?: number;
  // Scheduled (iron / hazardous)
  maxOnDuration?: number; // minutes
  turnedOnAt?: Date | null;
  // Light scheduling
  scheduledOn?: string;  // "HH:MM"
  scheduledOff?: string; // "HH:MM"
  autoSchedule?: boolean;
  // Camera
  streamUri?: string;
  snapshotUri?: string;
  // Availability Flags
  isRegistered?: boolean; // Visible in mobile app
  isUnplugged?: boolean;   // Visible in hardware simulator
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FloorLayoutCell {
  x: number;
  y: number;
}

export interface FloorLayout {
  rooms: FloorRoom[];
}

export interface Floor {
  id: string;
  name: string;
  imageUrl: string;
  gridCols: number;
  gridRows: number;
  homeId: string;
  order: number;
  layout?: FloorLayout;
}

export interface Home {
  id: string;
  name: string;
  ownerId: string;
  address?: string;
  createdAt?: Date;
}

export interface UsageLog {
  id: string;
  deviceId: string;
  deviceName: string;
  event: "ON" | "OFF" | "CUTOFF";
  timestamp: Date;
  durationMinutes?: number;
  floorId: string;
  homeId: string;
}
