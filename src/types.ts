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

export interface UserSchedule {
  id: string;
  label: string;
  role: 'admin' | 'user';
  time: string;
  color: string;
  days?: string[];
  startTime?: string;
  endTime?: string;
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
