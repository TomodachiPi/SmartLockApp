import {
  Profile,
  ProfileRequest,
  HistoryRecord,
  UserSchedule,
  LabNoteSchedule,
  EmergencyAlert,
  RoomTransferRequest,
  AdminLockNotification,
} from '../types';

/**
 * Shared ESP8266 & Multi-device Sync State
 */
export interface SmartLockSyncState {
  locked: boolean;
  activeRoomHolder: string | null;
  changing: boolean;
  lockOperation?: 'idle' | 'locking' | 'unlocking';
  lockProgress: number;
  remainingLockTime: number | null;
  version: number;
  lastUpdated: number;
}

export interface SmartLockFullData {
  state: SmartLockSyncState;
  profiles: Profile[];
  profileRequests: ProfileRequest[];
  userSchedules: UserSchedule[];
  roomTransfers: RoomTransferRequest[];
  history: HistoryRecord[];
  labNotes: LabNoteSchedule[];
  emergencyAlerts: EmergencyAlert[];
  adminNotifications: AdminLockNotification[];
}

/**
 * Messages from SmartLock App -> ESP8266 WebSocket Server
 */
export type ClientMessage =
  | {
      type: 'POLL_REQUEST';
      client: string;
      username?: string;
      timestamp: number;
    }
  | {
      type: 'USER_PRESENCE';
      username: string;
      status: 'online' | 'offline';
      timestamp: number;
    }
  | {
      type: 'LOCK_ACTION';
      action: 'lock' | 'unlock' | 'toggle';
      username: string;
      userRole?: 'admin' | 'user';
      emergency?: boolean;
      timestamp: number;
    }
  | {
      type: 'ROOM_TRANSFER_ACTION';
      subType: 'transfer' | 'request' | 'respond' | 'dismiss';
      transferId?: string;
      fromUsername?: string;
      toUsername?: string;
      notes?: string;
      accept?: boolean;
      timestamp: number;
    }
  | {
      type: 'EMERGENCY_ACTION';
      reason: string;
      notes?: string;
      username: string;
      timestamp: number;
    }
  | {
      type: 'DATA_UPDATE_ACTION';
      entity: 'profiles' | 'schedules' | 'labNotes' | 'profileRequests' | 'history' | 'adminNotifications' | 'emergencyAlerts';
      action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'clear' | 'mark_read';
      payload?: any;
      timestamp: number;
    }
  | {
      type: 'PUSH_STATE';
      state: Partial<SmartLockSyncState>;
      data?: Partial<SmartLockFullData>;
      timestamp: number;
    };

/**
 * Messages from ESP8266 WebSocket Server -> SmartLock App
 */
export type ServerMessage =
  | {
      type: 'SYNC_REPLY';
      state: SmartLockSyncState;
      profiles?: Profile[];
      profileRequests?: ProfileRequest[];
      userSchedules?: UserSchedule[];
      roomTransfers?: RoomTransferRequest[];
      history?: HistoryRecord[];
      labNotes?: LabNoteSchedule[];
      emergencyAlerts?: EmergencyAlert[];
      adminNotifications?: AdminLockNotification[];
      timestamp: number;
    }
  | {
      type: 'STATE_CHANGED';
      state: Partial<SmartLockSyncState>;
      roomTransfers?: RoomTransferRequest[];
      historyRecord?: HistoryRecord;
      adminNotification?: AdminLockNotification;
      timestamp: number;
    }
  | {
      type: 'LOCK_PROGRESS';
      changing: boolean;
      lockProgress: number;
      remainingLockTime: number | null;
      locked: boolean;
      timestamp?: number;
    }
  | {
      type: 'ROOM_TRANSFER_UPDATE';
      roomTransfers: RoomTransferRequest[];
      activeRoomHolder: string | null;
      timestamp: number;
    }
  | {
      type: 'ACK';
      action: string;
      success: boolean;
      message?: string;
      timestamp: number;
    };
