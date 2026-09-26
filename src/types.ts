export interface Profile {
  username: string;
  password: string;
  type: 'admin' | 'user';
  avatarUrl?: string;
  time?: number[];
  permission?: string;
  schedule?: string;
  joinedDate?: string;
  isOnline?: boolean;
  lastActive?: string;
  email?: string;
}

export interface ProfileRequest {
  username: string;
  password: string;
  type: 'admin' | 'user';
  time: number[];
  requestedAt?: string;
  email?: string;
}

export interface HistoryRecord {
  id: string;
  username: string;
  permission: string;
  userType: 'admin' | 'user';
  locked: boolean;
  startingTime: string;
  endingTime: string;
  date: string;
  timestamp: number; // For sorting & filtering
  notes?: string;
  isEmergencyOverride?: boolean;
  emergencyReason?: string;
}

export interface DayScheduleConfig {
  enabled: boolean;
  is24Hours?: boolean;
  startTime?: string;
  endTime?: string;
}

export interface UserSchedule {
  id: string;
  label: string;
  role: 'admin' | 'user';
  time: string;
  color?: string;
  days?: string[];
  startTime?: string;
  endTime?: string;
  dayConfigs?: Record<string, DayScheduleConfig>;
  status?: 'active' | 'restricted';
}

export interface LabNoteSchedule {
  id: string;
  username: string;
  userRole: 'admin' | 'user';
  title: string;
  date: string;
  startDate?: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  purpose?: string;
  createdDate: string;
  status: 'confirmed' | 'pending' | 'completed';
}

export interface EmergencyAlert {
  id: string;
  username: string;
  userRole: 'admin' | 'user';
  timestamp: string;
  timestampMs: number;
  reason: string;
  notes?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export type TabType = 'lock' | 'history' | 'schedule' | 'settings' | 'users';

export interface RoomTransferRequest {
  id: string;
  requestType?: 'transfer' | 'request';
  fromUsername: string;
  fromUserRole: 'admin' | 'user';
  fromPermission?: string;
  toUsername: string;
  doorName: string;
  timestamp: string;
  timestampMs: number;
  notes?: string;
  status: 'pending' | 'accepted' | 'declined';
  resolvedAt?: string;
}

export interface AdminLockNotification {
  id: string;
  type: 'lock_state_change';
  action: 'locked' | 'unlocked';
  username: string;
  userRole: 'admin' | 'user';
  doorName: string;
  timestamp: string;
  timestampMs: number;
  read: boolean;
}

export interface AppSettings {
  language: string;
  theme: string;
  autoLockDelay: number;
  notifications: {
    lockStateChanges: boolean;
    emergencySirens: boolean;
    lowBatteryAlerts: boolean;
    auditDigest: boolean;
    hapticFeedback: boolean;
  };
  security: {
    proximityUnlock: boolean;
    tamperAlarm: 'high' | 'medium' | 'off';
    biometricQuickPass: boolean;
  };
}
