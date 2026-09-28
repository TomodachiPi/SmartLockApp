import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Profile,
  ProfileRequest,
  HistoryRecord,
  UserSchedule,
  LabNoteSchedule,
  EmergencyAlert,
  TabType,
  RoomTransferRequest,
  AdminLockNotification,
} from '../types';
import { ClientMessage, ServerMessage, SmartLockSyncState } from '../types/esp8266Protocol';
import user_png from './../assets/images/user.png';
import { generateMonthHistory } from '../data/mockMonthHistory';
import { AVATAR_ICONS, getAvatarByIndex, parseAvatarIndex } from '../data/avatarIcons';

interface AppContextType {
  currentUser: Profile | null;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  profiles: Profile[];
  profileRequests: ProfileRequest[];
  locked: boolean;
  changing: boolean;
  lockProgress: number;
  remainingLockTime: number | null;
  initialLockTime: number | null;
  lockOperation: 'idle' | 'locking' | 'unlocking';
  isEmergencyOverrideInProgress: boolean;
  wsStatus: 'connected' | 'connecting' | 'disconnected' | 'simulated' | 'error';
  wsUrl: string;
  setWsUrl: (url: string) => void;
  reconnectWebSocket: () => void;
  isSimulatorActive: boolean;
  setIsSimulatorActive: (active: boolean) => void;
  wsLogs: Array<{ id: string; timestamp: string; type: 'send' | 'receive' | 'system'; text: string }>;
  clearWsLogs: () => void;
  sendCustomWsMessage: (message: string) => void;
  syncAuthData: () => void;
  history: HistoryRecord[];
  userSchedules: UserSchedule[];
  labNotes: LabNoteSchedule[];
  emergencyAlerts: EmergencyAlert[];
  welcomeMessage: string | null;
  dismissWelcomeMessage: () => void;
  registrationNotice: string | null;
  dismissRegistrationNotice: () => void;
  login: (username: string, password: string) => { success: boolean; error?: 'user_not_found' | 'incorrect_password' };
  registerRequest: (username: string, password: string) => { success: boolean; error?: 'username_taken' };
  approveRequest: (username: string) => void;
  rejectRequest: (username: string) => void;
  toggleLock: () => void;
  deleteHistory: () => void;
  logout: () => void;
  addSchedule: (schedule: Omit<UserSchedule, 'id'>) => void;
  updateSchedule: (schedule: UserSchedule) => void;
  deleteSchedule: (id: string) => void;
  updatePassword: (oldPass: string, newPass: string) => { success: boolean; error?: string };
  updateAvatar: (avatarIndexOrUrl: number | string) => void;
  adminCreateUser: (userData: Omit<Profile, 'joinedDate'>) => { success: boolean; error?: string };
  adminUpdateUser: (originalUsername: string, updatedData: Partial<Profile>) => { success: boolean; error?: string };
  adminDeleteUser: (username: string) => { success: boolean; error?: string };
  addLabNote: (note: Omit<LabNoteSchedule, 'id' | 'createdDate' | 'status'>) => void;
  updateLabNote: (note: LabNoteSchedule) => void;
  deleteLabNote: (id: string) => void;
  triggerEmergency: (reason: string, notes?: string) => void;
  resolveEmergency: (id: string) => void;
  onlineUsers: Profile[];
  roomTransfers: RoomTransferRequest[];
  adminNotifications: AdminLockNotification[];
  activeRoomHolder: string | null;
  initiateRoomTransfer: (toUsername: string, notes?: string) => { success: boolean; error?: string };
  requestRoomAccess: (notes?: string) => { success: boolean; error?: string };
  respondToRoomTransfer: (transferId: string, accept: boolean) => void;
  dismissRoomTransfer: (transferId: string) => void;
  markAdminNotificationAsRead: (id: string) => void;
  clearAllAdminNotifications: () => void;
}

const defaultProfiles: Profile[] = [
  {
    username: 'Administrator',
    password: 'admin123',
    type: 'admin',
    avatarIndex: 0,
    avatarUrl: '0',
    time: [0, 1440],
    permission: 'Admin Privilege',
    joinedDate: 'Jan 15, 2026',
    isOnline: true,
    lastActive: 'Active now',
  },
  {
    username: 'User123test',
    password: 'user',
    type: 'user',
    avatarIndex: 0,
    avatarUrl: '0',
    time: [600, 780],
    permission: 'Standard User Access',
    joinedDate: 'Feb 10, 2026',
    isOnline: true,
    lastActive: 'Active 5m ago',
  },
];

export function parseTimeToMinutes(tStr: string): number | null {
  if (!tStr) return null;
  const match = tStr.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3] ? match[3].toUpperCase() : null;
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

export function isScheduleCurrentlyActive(
  schedule: Partial<UserSchedule> | null | undefined,
  role?: 'admin' | 'user'
): boolean {
  if (!schedule) return false;
  const effectiveRole = role || schedule.role;
  if (effectiveRole === 'admin' || (schedule.label && schedule.label.toLowerCase() === 'administrator')) {
    return true; // Administrators have 24/7 access clearance
  }
  if (schedule.status === 'restricted') {
    return false;
  }

  const now = new Date();
  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIdx = now.getDay();
  const currentShort = dayNamesShort[dayIdx];
  const currentFull = dayNamesFull[dayIdx];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Per-day custom dayConfigs evaluation
  if (schedule.dayConfigs && typeof schedule.dayConfigs === 'object' && Object.keys(schedule.dayConfigs).length > 0) {
    const todayKey = Object.keys(schedule.dayConfigs).find(
      (k) => k.toLowerCase() === currentShort.toLowerCase() || k.toLowerCase() === currentFull.toLowerCase()
    );
    if (!todayKey) return false;
    const dayConfig = schedule.dayConfigs[todayKey];
    if (!dayConfig || !dayConfig.enabled) return false;
    if (dayConfig.is24Hours) return true;

    const startM = dayConfig.startTime ? parseTimeToMinutes(dayConfig.startTime) : null;
    const endM = dayConfig.endTime ? parseTimeToMinutes(dayConfig.endTime) : null;

    if (startM !== null && endM !== null) {
      if (endM >= startM) {
        return currentMinutes >= startM && currentMinutes <= endM;
      } else {
        return currentMinutes >= startM || currentMinutes <= endM;
      }
    }
    return false;
  }

  // 2. Standard days array & time string evaluation
  const timeStr = (schedule.time || '').toLowerCase();
  const is24_7 =
    timeStr.includes('24/7') ||
    timeStr.includes('any time') ||
    timeStr.includes('unlimited access') ||
    (schedule.startTime === '12:00 AM' && schedule.endTime === '11:59 PM');

  let dayMatches = false;
  if (Array.isArray(schedule.days) && schedule.days.length > 0) {
    dayMatches = schedule.days.some((d) => {
      if (!d || typeof d !== 'string') return false;
      const dClean = d.trim().toLowerCase();
      if (dClean === currentShort.toLowerCase() || dClean === currentFull.toLowerCase()) return true;
      if (dClean.startsWith(currentShort.toLowerCase())) return true;
      if (dClean === 'all' || dClean.includes('all days') || dClean.includes('everyday')) return true;
      if (dClean.includes('weekday') && dayIdx >= 1 && dayIdx <= 5) return true;
      if (dClean.includes('weekend') && (dayIdx === 0 || dayIdx === 6)) return true;
      return false;
    });
  } else if (typeof schedule.days === 'string' && (schedule.days as string).trim().length > 0) {
    const dList = (schedule.days as string).split(',').map((s) => s.trim().toLowerCase());
    dayMatches = dList.some((d) => d.startsWith(currentShort.toLowerCase()) || d === currentShort.toLowerCase());
  } else {
    if (
      timeStr.includes('monday to sunday') ||
      timeStr.includes('mon-sun') ||
      timeStr.includes('all days') ||
      timeStr.includes('daily') ||
      timeStr.includes('everyday')
    ) {
      dayMatches = true;
    } else if (
      (timeStr.includes('mon-fri') ||
        timeStr.includes('monday to friday') ||
        timeStr.includes('weekdays')) &&
      dayIdx >= 1 &&
      dayIdx <= 5
    ) {
      dayMatches = true;
    } else if (
      (timeStr.includes('weekends') || timeStr.includes('sat-sun') || timeStr.includes('sat & sun')) &&
      (dayIdx === 0 || dayIdx === 6)
    ) {
      dayMatches = true;
    } else {
      dayMatches = timeStr.includes(currentShort.toLowerCase()) || timeStr.includes(currentFull.toLowerCase());
    }
  }

  if (!dayMatches) return false;
  if (is24_7) return true;

  let startM: number | null = null;
  let endM: number | null = null;

  if (schedule.startTime && schedule.endTime) {
    startM = parseTimeToMinutes(schedule.startTime);
    endM = parseTimeToMinutes(schedule.endTime);
  } else if (schedule.time) {
    const rangeMatch = schedule.time.match(
      /(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i
    );
    if (rangeMatch) {
      startM = parseTimeToMinutes(rangeMatch[1]);
      endM = parseTimeToMinutes(rangeMatch[2]);
    }
  }

  if (startM !== null && endM !== null) {
    if (endM >= startM) {
      return currentMinutes >= startM && currentMinutes <= endM;
    } else {
      return currentMinutes >= startM || currentMinutes <= endM;
    }
  }

  return false;
}

export function isUserScheduleActiveNow(
  user: Profile | null,
  schedules: UserSchedule[]
): boolean {
  if (!user) return false;
  if (user.type === 'admin' || user.username.toLowerCase() === 'administrator') return true; // Admins have 24/7 master clearance

  const userSchedules = schedules.filter(
    (s) => s.label.toLowerCase() === user.username.toLowerCase()
  );

  // If user doesn't have a schedule yet, default to active standard access
  if (userSchedules.length === 0) {
    return true;
  }

  return userSchedules.some((schedule) => isScheduleCurrentlyActive(schedule, user.type));
}

const defaultSchedules: UserSchedule[] = [
  {
    id: '1',
    label: 'Administrator',
    role: 'admin',
    time: '24/7 Unlimited Access, Monday to Sunday',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    startTime: '12:00 AM',
    endTime: '11:59 PM',
    dayConfigs: {
      Mon: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
      Tue: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
      Wed: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
      Thu: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
      Fri: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
      Sat: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
      Sun: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
    },
    status: 'active',
  },
  {
    id: '2',
    label: 'User123test',
    role: 'user',
    time: 'Tue: 10:00 AM - 01:00 PM',
    days: ['Tue'],
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    dayConfigs: {
      Mon: { enabled: false, is24Hours: false, startTime: '09:00 AM', endTime: '05:00 PM' },
      Tue: { enabled: true, is24Hours: false, startTime: '10:00 AM', endTime: '01:00 PM' },
      Wed: { enabled: false, is24Hours: false, startTime: '09:00 AM', endTime: '05:00 PM' },
      Thu: { enabled: false, is24Hours: false, startTime: '09:00 AM', endTime: '05:00 PM' },
      Fri: { enabled: false, is24Hours: false, startTime: '09:00 AM', endTime: '05:00 PM' },
      Sat: { enabled: false, is24Hours: false, startTime: '09:00 AM', endTime: '05:00 PM' },
      Sun: { enabled: false, is24Hours: false, startTime: '09:00 AM', endTime: '05:00 PM' },
    },
    status: 'active',
  },
];

const defaultHistory: HistoryRecord[] = generateMonthHistory();

export function normalizeHistoryRecord(item: HistoryRecord): HistoryRecord {
  if (!item) return item;
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const todayStr = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const nowTimeStr = `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;

  // 1. Calculate proper millisecond timestamp (year 2024+)
  let ts: number | undefined = item.timestamp;
  if (typeof ts === 'number' && !isNaN(ts)) {
    if (ts >= 1000000000000) {
      // valid ms
    } else if (ts >= 1000000000) {
      ts = ts * 1000;
    } else {
      // small ESP uptime
      ts = undefined;
    }
  } else {
    ts = undefined;
  }

  // 2. Fix date if placeholder
  let date = (item.date || '').trim();
  if (!date || date.toLowerCase() === 'today' || date.toLowerCase() === 'yesterday' || date.toLowerCase().includes('undefined')) {
    date = todayStr;
  }

  // 3. Fix startingTime & endingTime if placeholder
  let startingTime = (item.startingTime || '').trim();
  if (!startingTime || startingTime.toLowerCase().includes('recent') || startingTime.toLowerCase().includes('just now') || startingTime.toLowerCase().includes('undefined')) {
    startingTime = nowTimeStr;
  }
  let endingTime = (item.endingTime || '').trim();
  if (!endingTime || endingTime.toLowerCase().includes('recent') || endingTime.toLowerCase().includes('just now') || endingTime.toLowerCase().includes('undefined')) {
    endingTime = nowTimeStr;
  }

  if (!ts) {
    const parsed = Date.parse(`${date} ${startingTime}`);
    ts = !isNaN(parsed) && parsed > 1000000000000 ? parsed : Date.now();
  }

  return {
    ...item,
    date,
    startingTime,
    endingTime,
    timestamp: ts,
  };
}

export function deduplicateHistory(records: HistoryRecord[]): HistoryRecord[] {
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const result: HistoryRecord[] = [];

  for (const rawItem of records) {
    if (!rawItem || !rawItem.id) continue;
    const item = normalizeHistoryRecord(rawItem);
    if (seenIds.has(item.id)) continue;

    const roughTime = Math.round((item.timestamp || 0) / 15000);
    const sig = `${(item.username || '').toLowerCase()}_${item.date}_${item.startingTime}_${(item.notes || '').slice(0, 30)}_${item.locked}_${roughTime}`;

    if (seenSignatures.has(sig)) continue;

    seenIds.add(item.id);
    seenSignatures.add(sig);
    result.push(item);
  }

  result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return result;
}

function formatTimeAndDate(d = new Date()) {
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const timeStr = `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  return { timeStr, dateStr };
}

function getDefaultWsUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('smartlock_ws_url');
    if (saved) return saved;
    // Auto-detect server websocket endpoint on current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  return 'ws://192.168.4.1/ws';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Multi-tab sync channel
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('smartlock_sync_channel') : null;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Profiles (synced across devices)
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    try {
      const saved = localStorage.getItem('user_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(
            (p: any) => p.username !== 'Sarah_Chen' && p.username !== 'Alex_Rivera'
          );
          return filtered.length > 0 ? filtered : defaultProfiles;
        }
      }
      return defaultProfiles;
    } catch {
      return defaultProfiles;
    }
  });

  // Current session user (local to this device/browser)
  const [currentUser, setCurrentUser] = useState<Profile | null>(() => {
    try {
      const saved = localStorage.getItem('current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.username === 'Sarah_Chen' || parsed.username === 'Alex_Rivera')) {
          return null;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<TabType>('lock');

  // Lock status (synced via WebSocket)
  const [locked, setLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('locked');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const [changing, setChanging] = useState<boolean>(false);
  const [lockOperation, setLockOperation] = useState<'idle' | 'locking' | 'unlocking'>('idle');
  const [isEmergencyOverrideInProgress, setIsEmergencyOverrideInProgress] = useState<boolean>(false);
  const [lockProgress, setLockProgress] = useState<number>(0);
  const [remainingLockTime, setRemainingLockTime] = useState<number | null>(null);
  const [initialLockTime, setInitialLockTime] = useState<number | null>(null);

  // Active room session holder (synced via WebSocket)
  const [activeRoomHolder, setActiveRoomHolder] = useState<string | null>(() => {
    return localStorage.getItem('active_room_holder') || (locked ? null : 'Administrator');
  });

  // WebSocket states
  const [wsUrl, setWsUrlState] = useState<string>(getDefaultWsUrl);
  const [isSimulatorActive, setIsSimulatorActiveState] = useState<boolean>(() => {
    const saved = localStorage.getItem('smartlock_simulator_active');
    return saved !== null ? saved === 'true' : false;
  });
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'simulated' | 'error'>('connecting');
  const [wsLogs, setWsLogs] = useState<Array<{ id: string; timestamp: string; type: 'send' | 'receive' | 'system'; text: string }>>([
    {
      id: 'log-init',
      timestamp: new Date().toLocaleTimeString(),
      type: 'system',
      text: 'SmartLock IoT Sync Engine initialized (ESP8266 WebSocket JSON protocol ready)',
    },
  ]);

  // Data sets (synced via WebSocket)
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    try {
      const isCleared = localStorage.getItem('smartlock_history_cleared') === 'true';
      if (isCleared) return [];
      const saved = localStorage.getItem('history_record');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const combined = [...parsed];
          defaultHistory.forEach((item) => {
            if (item && item.id && !combined.some((c) => c.id === item.id)) {
              combined.push(item);
            }
          });
          return deduplicateHistory(combined);
        }
      }
      return deduplicateHistory(defaultHistory);
    } catch {
      return deduplicateHistory(defaultHistory);
    }
  });

  const [profileRequests, setProfileRequests] = useState<ProfileRequest[]>(() => {
    try {
      const saved = localStorage.getItem('profile_requests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [userSchedules, setUserSchedules] = useState<UserSchedule[]>(() => {
    try {
      const saved = localStorage.getItem('user_schedules');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (s: any) => s.label !== 'Sarah_Chen' && s.label !== 'Alex_Rivera'
          );
        }
      }
      return defaultSchedules;
    } catch {
      return defaultSchedules;
    }
  });

  const [labNotes, setLabNotes] = useState<LabNoteSchedule[]>(() => {
    try {
      const saved = localStorage.getItem('lab_notes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>(() => {
    try {
      const saved = localStorage.getItem('emergency_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [roomTransfers, setRoomTransfers] = useState<RoomTransferRequest[]>(() => {
    try {
      const saved = localStorage.getItem('room_transfers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [adminNotifications, setAdminNotifications] = useState<AdminLockNotification[]>(() => {
    try {
      const saved = localStorage.getItem('admin_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);

  // References to prevent stale closure access
  const wsRef = useRef<WebSocket | null>(null);
  const lockedRef = useRef(locked);
  const activeRoomHolderRef = useRef(activeRoomHolder);
  const currentUserRef = useRef(currentUser);
  const initialLockTimeRef = useRef<number | null>(null);
  const simTimerRef = useRef<any>(null);
  const localScheduleModTimestampsRef = useRef<Map<string, number>>(new Map());
  const localScheduleDeletedTimestampsRef = useRef<Map<string, number>>(new Map());
  const localAvatarModTimestampsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    activeRoomHolderRef.current = activeRoomHolder;
  }, [activeRoomHolder]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('user_data', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('locked', String(locked));
  }, [locked]);

  useEffect(() => {
    if (activeRoomHolder) localStorage.setItem('active_room_holder', activeRoomHolder);
    else localStorage.removeItem('active_room_holder');
  }, [activeRoomHolder]);

  useEffect(() => {
    if (currentUser) localStorage.setItem('current_user', JSON.stringify(currentUser));
    else localStorage.removeItem('current_user');
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('room_transfers', JSON.stringify(roomTransfers));
  }, [roomTransfers]);

  useEffect(() => {
    localStorage.setItem('history_record', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('profile_requests', JSON.stringify(profileRequests));
  }, [profileRequests]);

  useEffect(() => {
    localStorage.setItem('user_schedules', JSON.stringify(userSchedules));
  }, [userSchedules]);

  useEffect(() => {
    localStorage.setItem('labNotes', JSON.stringify(labNotes));
  }, [labNotes]);

  useEffect(() => {
    localStorage.setItem('emergency_alerts', JSON.stringify(emergencyAlerts));
  }, [emergencyAlerts]);

  useEffect(() => {
    localStorage.setItem('admin_notifications', JSON.stringify(adminNotifications));
  }, [adminNotifications]);

  const addWsLog = useCallback((type: 'send' | 'receive' | 'system', text: string) => {
    const entry = {
      id: `ws-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      text,
    };
    setWsLogs((prev) => [entry, ...prev.slice(0, 49)]);
  }, []);

  const clearWsLogs = () => setWsLogs([]);

  // Send JSON message over WebSocket to ESP8266 or Sync Server
  const sendWsJson = useCallback((messageObj: ClientMessage | any) => {
    const jsonStr = JSON.stringify(messageObj);
    addWsLog('send', `[JSON -> ESP8266] ${messageObj.type || 'RAW'}: ${jsonStr.slice(0, 100)}${jsonStr.length > 100 ? '...' : ''}`);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(jsonStr);
      } catch (err: any) {
        addWsLog('system', `Error sending WebSocket JSON: ${err.message}`);
      }
    } else {
      addWsLog('system', `WebSocket not open (Status: ${wsStatus}). Buffered in local state.`);
    }

    // Also broadcast to other browser tabs/windows
    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: 'LOCAL_ACTION', data: messageObj });
      } catch {}
    }
  }, [addWsLog, wsStatus]);

  // Handle incoming data from ESP8266 WebSocket server
  const handleIncomingWsMessage = useCallback((data: any) => {
    const str = String(data).trim();
    let parsed: ServerMessage | any = null;

    try {
      parsed = JSON.parse(str);
      addWsLog('receive', `[JSON <- ESP8266] ${parsed.type || 'DATA'}`);
    } catch {
      // Legacy string or number response from raw ESP8266 sketch
      addWsLog('receive', `[RAW <- ESP8266] "${str}"`);
      const num = parseFloat(str);
      if (!isNaN(num) && isFinite(num)) {
        if (initialLockTimeRef.current === null || num > initialLockTimeRef.current) {
          initialLockTimeRef.current = num;
          setInitialLockTime(num);
        }
        const total = initialLockTimeRef.current || num;
        if (num <= 0) {
          setLockProgress(100);
          setRemainingLockTime(0);
          setChanging(false);
          setLocked((prev) => !prev);
        } else {
          const computed = total > 0 ? Math.min(99, Math.max(1, Math.round(((total - num) / total) * 100))) : 50;
          setLockProgress(computed);
          setRemainingLockTime(num);
          setChanging(true);
        }
        return;
      }

      if (['done', 'complete', 'locked', 'unlocked', 'ok'].includes(str.toLowerCase())) {
        setChanging(false);
        setLockProgress(100);
        setRemainingLockTime(null);
        if (str.toLowerCase() === 'locked') setLocked(true);
        if (str.toLowerCase() === 'unlocked') setLocked(false);
        return;
      }
    }

    if (!parsed || typeof parsed !== 'object') return;

    // Process structured server / ESP8266 JSON messages:
    if (parsed.type === 'SYNC_REPLY' || parsed.type === 'STATE_CHANGED' || parsed.state) {
      const stateObj: Partial<SmartLockSyncState> = parsed.state || parsed;

      if (stateObj.locked !== undefined) {
        setLocked(stateObj.locked);
        if (stateObj.locked) {
          setActiveRoomHolder(null);
        }
      }
      if (stateObj.activeRoomHolder !== undefined) {
        setActiveRoomHolder(stateObj.activeRoomHolder);
      }
      if (stateObj.lockOperation !== undefined) {
        setLockOperation(stateObj.lockOperation);
      } else if (stateObj.changing === false) {
        setLockOperation('idle');
      } else if (stateObj.changing === true && stateObj.locked !== undefined) {
        setLockOperation(stateObj.locked ? 'locking' : 'unlocking');
      }

      if (stateObj.changing !== undefined) {
        setChanging(stateObj.changing);
        if (!stateObj.changing) {
          setLockOperation('idle');
          setLockProgress(0);
          setRemainingLockTime(null);
          initialLockTimeRef.current = null;
        }
      }
      if (stateObj.lockProgress !== undefined && stateObj.changing) {
        setLockProgress(stateObj.lockProgress);
      }
      if (stateObj.remainingLockTime !== undefined && stateObj.changing) {
        setRemainingLockTime(stateObj.remainingLockTime);
      }

      // Update full synced entities if provided in response
      if (Array.isArray(parsed.profiles)) {
        const cleanProfiles = parsed.profiles
          .filter((p: any) => p.username !== 'Sarah_Chen' && p.username !== 'Alex_Rivera')
          .map((p: any) => {
            const rawType = String(p.type || '').toLowerCase();
            const cleanType = (rawType === 'admin' || p.username.toLowerCase() === 'administrator') ? 'admin' : 'user';
            return {
              ...p,
              type: cleanType as 'admin' | 'user',
            };
          });
        const currentActiveUsername = currentUserRef.current?.username.toLowerCase();
        const now = Date.now();

        setProfiles((prevProfiles) => {
          return cleanProfiles.map((incProf: any) => {
            const uKey = incProf.username.toLowerCase();
            const localProf = prevProfiles.find(
              (lp) => lp.username.toLowerCase() === uKey
            );

            const lastLocalMod = localAvatarModTimestampsRef.current.get(uKey) || 0;
            const isRecentlyEditedLocally = now - lastLocalMod < 15000;

            let chosenIdx = parseAvatarIndex(incProf.avatarIndex !== undefined ? incProf.avatarIndex : incProf.avatarUrl);

            // If edited locally recently, preserve local index during sync window
            if (isRecentlyEditedLocally) {
              if (currentActiveUsername === uKey && currentUserRef.current?.avatarIndex !== undefined) {
                chosenIdx = currentUserRef.current.avatarIndex;
              } else if (localProf?.avatarIndex !== undefined) {
                chosenIdx = localProf.avatarIndex;
              }
            }

            return {
              ...incProf,
              avatarIndex: chosenIdx,
              avatarUrl: String(chosenIdx),
            };
          });
        });

        // Also update currentUser avatar if server has updated it and local was not recently modified
        if (currentUserRef.current) {
          const uKey = currentActiveUsername;
          const lastLocalMod = uKey ? (localAvatarModTimestampsRef.current.get(uKey) || 0) : 0;
          const isRecentlyEditedLocally = now - lastLocalMod < 15000;

          if (!isRecentlyEditedLocally && uKey) {
            const match = cleanProfiles.find(
              (p: any) => p.username.toLowerCase() === uKey
            );
            if (match) {
              const serverIdx = parseAvatarIndex(match.avatarIndex !== undefined ? match.avatarIndex : match.avatarUrl);
              const serverType: 'admin' | 'user' = (match.type === 'admin' || match.username.toLowerCase() === 'administrator') ? 'admin' : 'user';
              if (serverIdx !== currentUserRef.current.avatarIndex || serverType !== currentUserRef.current.type) {
                setCurrentUser((prev) => {
                  if (!prev) return prev;
                  const updated: Profile = { ...prev, type: serverType, avatarIndex: serverIdx, avatarUrl: String(serverIdx) };
                  try {
                    localStorage.setItem('current_user', JSON.stringify(updated));
                    localStorage.setItem(`smartlock_avatar_${uKey}`, String(serverIdx));
                  } catch {}
                  return updated;
                });
              }
            }
          }
        }
      }
      if (Array.isArray(parsed.profileRequests)) {
        setProfileRequests(parsed.profileRequests);
      }
      if (Array.isArray(parsed.userSchedules)) {
        const cleanSchedules = parsed.userSchedules
          .filter((s: any) => s.label !== 'Sarah_Chen' && s.label !== 'Alex_Rivera')
          .map((s: any) => {
            const rawRole = String(s.role || '').toLowerCase();
            const cleanRole = (rawRole === 'admin' || s.label.toLowerCase() === 'administrator') ? 'admin' : 'user';
            return {
              ...s,
              role: cleanRole as 'admin' | 'user',
            };
          });
        const incomingMsgTimestamp = parsed.timestamp || 0;
        const now = Date.now();

        setUserSchedules((prevSchedules) => {
          // Filter out incoming schedules that were recently deleted locally (within 15s)
          const validIncoming = cleanSchedules.filter((incSched: UserSchedule) => {
            const labelKey = (incSched.label || '').toLowerCase();
            const idKey = incSched.id;
            const lastDeleted = Math.max(
              localScheduleDeletedTimestampsRef.current.get(labelKey) || 0,
              localScheduleDeletedTimestampsRef.current.get(idKey) || 0
            );
            if (now - lastDeleted < 15000 && incomingMsgTimestamp < lastDeleted) {
              return false;
            }
            return true;
          });

          // Map through validIncoming and preserve dayConfigs if edited locally
          const result: UserSchedule[] = validIncoming.map((incomingSched: UserSchedule) => {
            const labelKey = (incomingSched.label || '').toLowerCase();
            const idKey = incomingSched.id;
            const lastLocalMod = Math.max(
              localScheduleModTimestampsRef.current.get(labelKey) || 0,
              localScheduleModTimestampsRef.current.get(idKey) || 0
            );
            const isRecentlyEditedLocally = now - lastLocalMod < 15000;
            const localSched = prevSchedules.find(
              (s) => s.id === incomingSched.id || (s.label || '').toLowerCase() === labelKey
            );

            if (localSched && isRecentlyEditedLocally && incomingMsgTimestamp < lastLocalMod) {
              return localSched;
            }

            return {
              ...incomingSched,
              dayConfigs:
                incomingSched.dayConfigs && Object.keys(incomingSched.dayConfigs).length > 0
                  ? incomingSched.dayConfigs
                  : localSched?.dayConfigs,
            };
          });

          // Also preserve any newly created schedule in prevSchedules that hasn't arrived from server yet (created < 15s)
          prevSchedules.forEach((prevSched) => {
            const labelKey = (prevSched.label || '').toLowerCase();
            const idKey = prevSched.id;
            const lastLocalMod = Math.max(
              localScheduleModTimestampsRef.current.get(labelKey) || 0,
              localScheduleModTimestampsRef.current.get(idKey) || 0
            );
            const lastDeleted = Math.max(
              localScheduleDeletedTimestampsRef.current.get(labelKey) || 0,
              localScheduleDeletedTimestampsRef.current.get(idKey) || 0
            );
            const isRecentlyCreated = now - lastLocalMod < 15000 && now - lastDeleted >= 15000;
            const existsInResult = result.some(
              (s) => s.id === prevSched.id || (s.label || '').toLowerCase() === labelKey
            );
            if (!existsInResult && isRecentlyCreated) {
              result.push(prevSched);
            }
          });

          return result;
        });
      }
      if (Array.isArray(parsed.roomTransfers)) {
        setRoomTransfers(parsed.roomTransfers);
      }
      if (Array.isArray(parsed.history)) {
        setHistory((prev) => {
          const isCleared = localStorage.getItem('smartlock_history_cleared') === 'true';
          const combined = [...(prev || [])];

          // Always ensure the 1-month mock history is present unless user explicitly purged
          if (!isCleared) {
            defaultHistory.forEach((item) => {
              if (item && item.id && !combined.some((c) => c.id === item.id)) {
                combined.push(item);
              }
            });
          }

          // Merge any incoming history items without overwriting older baseline records
          parsed.history.forEach((incItem: HistoryRecord) => {
            if (incItem && incItem.id) {
              combined.push(incItem);
            }
          });

          const merged = deduplicateHistory(combined);
          try {
            localStorage.setItem('history_record', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      if (Array.isArray(parsed.labNotes)) {
        setLabNotes(parsed.labNotes);
      }
      if (Array.isArray(parsed.emergencyAlerts)) {
        setEmergencyAlerts(parsed.emergencyAlerts);
      }
      if (Array.isArray(parsed.adminNotifications)) {
        setAdminNotifications(parsed.adminNotifications);
      }
    } else if (parsed.type === 'DATA_UPDATE_ACTION') {
      const { entity, action, payload } = parsed;
      if (entity === 'profileRequests') {
        if (action === 'create' && payload) {
          setProfileRequests((prev) => {
            if (prev.some((r) => r.username.toLowerCase() === payload.username.toLowerCase())) return prev;
            return [...prev, payload];
          });
        } else if (action === 'approve' && payload) {
          setProfileRequests((prev) => prev.filter((r) => r.username.toLowerCase() !== payload.username.toLowerCase()));
          if (payload.password) {
            const rawType = String(payload.type || '').toLowerCase();
            const cleanType = (rawType === 'admin' || payload.username.toLowerCase() === 'administrator') ? 'admin' : 'user';
            setProfiles((prev) => {
              if (prev.some((p) => p.username.toLowerCase() === payload.username.toLowerCase())) return prev;
              const newProf: Profile = {
                username: payload.username,
                password: payload.password,
                type: cleanType as 'admin' | 'user',
                time: payload.time || [0, 1440],
                permission: cleanType === 'admin' ? 'Admin Privilege' : 'Standard User Access',
                avatarUrl: user_png,
                joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                isOnline: false,
                lastActive: 'Registered recently',
              };
              return [...prev, newProf];
            });
          }
        } else if (action === 'reject' && payload) {
          setProfileRequests((prev) => prev.filter((r) => r.username.toLowerCase() !== payload.username.toLowerCase()));
        }
      } else if (entity === 'profiles') {
        if (action === 'create' && payload) {
          const rawType = String(payload.type || '').toLowerCase();
          const cleanType = (rawType === 'admin' || payload.username.toLowerCase() === 'administrator') ? 'admin' : 'user';
          const cleanProf = { ...payload, type: cleanType };
          setProfiles((prev) => {
            if (prev.some((p) => p.username.toLowerCase() === payload.username.toLowerCase())) return prev;
            return [...prev, cleanProf];
          });
        } else if ((action === 'update' || action === 'update_avatar') && payload) {
          const uName = (payload.username || parsed.username || '').toLowerCase();
          const rawAv = payload.avatarIndex !== undefined ? payload.avatarIndex : (payload.avatarUrl !== undefined ? payload.avatarUrl : (parsed.avatarIndex !== undefined ? parsed.avatarIndex : parsed.avatarUrl));
          const hasAvatar = rawAv !== undefined && rawAv !== null && rawAv !== '';
          const newIdx = hasAvatar ? parseAvatarIndex(rawAv) : undefined;
          const rawType = payload.type !== undefined ? String(payload.type).toLowerCase() : undefined;
          const cleanType = rawType !== undefined ? ((rawType === 'admin' || uName === 'administrator') ? 'admin' : 'user') : undefined;

          if (uName && newIdx !== undefined) {
            localAvatarModTimestampsRef.current.set(uName, Date.now());
            try {
              localStorage.setItem(`smartlock_avatar_${uName}`, String(newIdx));
            } catch {}
          }
          setProfiles((prev) =>
            prev.map((p) =>
              p.username.toLowerCase() === uName
                ? {
                    ...p,
                    ...payload,
                    type: cleanType !== undefined ? (cleanType as 'admin' | 'user') : p.type,
                    avatarIndex: newIdx !== undefined ? newIdx : p.avatarIndex,
                    avatarUrl: newIdx !== undefined ? String(newIdx) : p.avatarUrl,
                  }
                : p
            )
          );
          if (currentUserRef.current?.username.toLowerCase() === uName) {
            setCurrentUser((prev) => {
              if (!prev) return prev;
              const updated = {
                ...prev,
                ...payload,
                type: cleanType !== undefined ? (cleanType as 'admin' | 'user') : prev.type,
                avatarIndex: newIdx !== undefined ? newIdx : prev.avatarIndex,
                avatarUrl: newIdx !== undefined ? String(newIdx) : prev.avatarUrl,
              };
              try {
                localStorage.setItem('current_user', JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        } else if (action === 'delete' && payload) {
          const uName = (payload.username || '').toLowerCase();
          if (uName) {
            setProfiles((prev) => prev.filter((p) => p.username.toLowerCase() !== uName));
            setUserSchedules((prev) => prev.filter((s) => s.label.toLowerCase() !== uName));
            setLabNotes((prev) => prev.filter((n) => n.username.toLowerCase() !== uName));
            if (currentUserRef.current?.username.toLowerCase() === uName) {
              logout();
            }
          }
        }
      } else if (entity === 'schedules') {
        if (action === 'create' && payload) {
          const rawRole = String(payload.role || '').toLowerCase();
          const cleanRole = (rawRole === 'admin' || (payload.label || '').toLowerCase() === 'administrator') ? 'admin' : 'user';
          const cleanSched = { ...payload, role: cleanRole };
          setUserSchedules((prev) => {
            if (prev.some((s) => s.id === payload.id)) return prev;
            return [...prev, cleanSched];
          });
        } else if (action === 'update' && payload) {
          const rawRole = payload.role !== undefined ? String(payload.role).toLowerCase() : undefined;
          const cleanRole = rawRole !== undefined ? ((rawRole === 'admin' || (payload.label || '').toLowerCase() === 'administrator') ? 'admin' : 'user') : undefined;
          setUserSchedules((prev) => prev.map((s) => (s.id === payload.id ? { ...s, ...payload, ...(cleanRole ? { role: cleanRole as 'admin' | 'user' } : {}) } : s)));
        } else if (action === 'delete' && payload) {
          const targetId = payload.id;
          const targetLabel = (payload.label || '').toLowerCase();
          setUserSchedules((prev) =>
            prev.filter(
              (s) =>
                (targetId ? s.id !== targetId : true) &&
                (!targetLabel || s.label.toLowerCase() !== targetLabel)
            )
          );
        }
      } else if (entity === 'history') {
        if (action === 'seed' && Array.isArray(payload)) {
          setHistory(payload);
        } else if ((action === 'add' || action === 'create') && payload && payload.id) {
          setHistory((prev) => {
            if (prev.some((h) => h.id === payload.id)) return prev;
            const updated = [payload, ...prev];
            try {
              localStorage.setItem('history_record', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        } else if (action === 'add_multiple' || Array.isArray(payload)) {
          const incoming = Array.isArray(payload) ? payload : [payload];
          setHistory((prev) => {
            const updated = deduplicateHistory([...incoming, ...prev]);
            try {
              localStorage.setItem('history_record', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        } else if (action === 'clear') {
          setHistory([]);
          try {
            localStorage.setItem('history_record', JSON.stringify([]));
          } catch {}
        }
      } else if (entity === 'labNotes') {
        if (action === 'create' && payload) {
          setLabNotes((prev) => {
            if (prev.some((n) => n.id === payload.id)) return prev;
            return [payload, ...prev];
          });
        } else if (action === 'update' && payload) {
          setLabNotes((prev) => prev.map((n) => (n.id === payload.id ? { ...n, ...payload } : n)));
        } else if (action === 'delete' && payload) {
          setLabNotes((prev) => prev.filter((n) => n.id !== payload.id));
        }
      }
    } else if (parsed.type === 'LOCK_PROGRESS') {
      setChanging(parsed.changing ?? true);
      if (parsed.lockProgress !== undefined) setLockProgress(parsed.lockProgress);
      if (parsed.remainingLockTime !== undefined) setRemainingLockTime(parsed.remainingLockTime);
      if (parsed.locked !== undefined) setLocked(parsed.locked);
      if (parsed.lockOperation) setLockOperation(parsed.lockOperation);
    } else if (parsed.type === 'ROOM_TRANSFER_UPDATE') {
      if (Array.isArray(parsed.roomTransfers)) setRoomTransfers(parsed.roomTransfers);
      if (parsed.activeRoomHolder !== undefined) setActiveRoomHolder(parsed.activeRoomHolder);
      if (Array.isArray(parsed.history)) {
        setHistory((prev) => deduplicateHistory([...parsed.history, ...prev]));
      }
    }
  }, [addWsLog]);

  // Connect WebSocket to ESP8266 or Local WebSocket server
  const connectWebSocket = useCallback(() => {
    if (isSimulatorActive) {
      setWsStatus('simulated');
      return;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
    }

    setWsStatus('connecting');
    addWsLog('system', `Connecting to WebSocket server at ${wsUrl}...`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        addWsLog('system', `WebSocket connection established to ${wsUrl}`);
        // Immediately send initial POLL_REQUEST to fetch fresh sync data
        const initialPoll: ClientMessage = {
          type: 'POLL_REQUEST',
          client: 'SmartLockApp',
          timestamp: Date.now(),
        };
        ws.send(JSON.stringify(initialPoll));
      };

      ws.onmessage = (event) => {
        handleIncomingWsMessage(event.data);
      };

      ws.onerror = (err) => {
        console.warn('[SmartLock] WebSocket error on', wsUrl, err);
        setWsStatus('error');
        addWsLog('system', `WebSocket error on ${wsUrl}`);
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        addWsLog('system', `WebSocket closed at ${wsUrl}`);
      };
    } catch (err: any) {
      setWsStatus('disconnected');
      addWsLog('system', `Failed to open socket: ${err.message || 'Unknown error'}`);
    }
  }, [addWsLog, handleIncomingWsMessage, isSimulatorActive, wsUrl]);

  // WebSocket connection effect
  useEffect(() => {
    if (!isSimulatorActive) {
      connectWebSocket();
    } else {
      setWsStatus('simulated');
    }

    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
    };
  }, [connectWebSocket, isSimulatorActive]);

  // Initial HTTP state sync fallback on mount
  useEffect(() => {
    fetch('/api/state')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          handleIncomingWsMessage(JSON.stringify(data));
        }
      })
      .catch(() => {});
  }, [handleIncomingWsMessage]);

  // PERIODIC SYNC POLLING: Send WebSocket POLL_REQUEST every 5 seconds to sync schedules and presence
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const pollMsg: ClientMessage = {
          type: 'POLL_REQUEST',
          client: 'SmartLockApp',
          username: currentUserRef.current?.username,
          timestamp: Date.now(),
        };
        try {
          wsRef.current.send(JSON.stringify(pollMsg));
          addWsLog('send', `[Periodic 5s Poll] Sent POLL_REQUEST to ESP8266/Server (${currentUserRef.current?.username || 'Guest'})`);
        } catch (e: any) {
          addWsLog('system', `Failed to send periodic poll: ${e.message}`);
        }
      } else {
        // HTTP fallback poll for multi-device reliability
        fetch('/api/state')
          .then((res) => res.json())
          .then((data) => {
            if (data && typeof data === 'object') {
              handleIncomingWsMessage(JSON.stringify(data));
            }
          })
          .catch(() => {});
      }
    }, 5000); // 5 seconds interval

    return () => clearInterval(pollInterval);
  }, [addWsLog, handleIncomingWsMessage]);

  // Broadcast user online presence on login / mount
  useEffect(() => {
    if (currentUser?.username && wsStatus === 'connected') {
      sendWsJson({
        type: 'USER_PRESENCE',
        username: currentUser.username,
        status: 'online',
        timestamp: Date.now(),
      });
    }
  }, [currentUser?.username, wsStatus, sendWsJson]);

  // BroadcastChannel listener for multi-tab / multi-window instant synchronization
  useEffect(() => {
    if (!syncChannel) return;
    const handleSync = (event: MessageEvent) => {
      const msg = event.data;
      if (msg && msg.type === 'LOCAL_ACTION' && msg.data) {
        const actionData = msg.data;
        if (actionData.type === 'LOCK_ACTION') {
          // Toggle local state
          const target = actionData.action === 'toggle' ? !lockedRef.current : actionData.action === 'lock';
          setLocked(target);
          if (target) setActiveRoomHolder(null);
        } else if (actionData.type === 'ROOM_TRANSFER_ACTION' && actionData.subType === 'respond' && actionData.accept) {
          if (actionData.gaining || actionData.toUsername) setActiveRoomHolder(actionData.gaining || actionData.toUsername);
          if (actionData.gainRecord && actionData.relinqRecord) {
            setHistory((prev) => deduplicateHistory([actionData.gainRecord, actionData.relinqRecord, ...prev]));
          }
        } else if (actionData.type === 'DATA_UPDATE_ACTION') {
          if (actionData.entity === 'history') {
            if ((actionData.action === 'add' || actionData.action === 'create') && actionData.payload) {
              setHistory((prev) => {
                if (prev.some((h) => h.id === actionData.payload.id)) return prev;
                return [actionData.payload, ...prev];
              });
            } else if (actionData.action === 'add_multiple' || Array.isArray(actionData.payload)) {
              const incoming = Array.isArray(actionData.payload) ? actionData.payload : [actionData.payload];
              setHistory((prev) => deduplicateHistory([...incoming, ...prev]));
            } else if (actionData.action === 'seed' && Array.isArray(actionData.payload)) {
              setHistory(actionData.payload);
            } else if (actionData.action === 'clear') {
              setHistory([]);
            }
          } else if (actionData.entity === 'labNotes') {
            if (actionData.action === 'create' && actionData.payload) {
              setLabNotes((prev) => [actionData.payload, ...prev.filter((n) => n.id !== actionData.payload.id)]);
            } else if (actionData.action === 'update' && actionData.payload) {
              setLabNotes((prev) => prev.map((n) => (n.id === actionData.payload.id ? actionData.payload : n)));
            } else if (actionData.action === 'delete' && actionData.payload) {
              setLabNotes((prev) => prev.filter((n) => n.id !== actionData.payload.id));
            }
          }
        }
      }
    };
    syncChannel.addEventListener('message', handleSync);
    return () => syncChannel.removeEventListener('message', handleSync);
  }, []);

  const reconnectWebSocket = () => {
    addWsLog('system', 'Manually reconnecting WebSocket...');
    connectWebSocket();
  };

  const setWsUrl = (url: string) => {
    setWsUrlState(url);
    localStorage.setItem('smartlock_ws_url', url);
    addWsLog('system', `Target WebSocket address updated to ${url}`);
  };

  const setIsSimulatorActive = (active: boolean) => {
    setIsSimulatorActiveState(active);
    localStorage.setItem('smartlock_simulator_active', String(active));
    if (active) {
      setWsStatus('simulated');
      addWsLog('system', 'IoT Hardware Simulator activated');
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
    } else {
      addWsLog('system', `Connecting to hardware at ${wsUrl}`);
      connectWebSocket();
    }
  };

  const sendCustomWsMessage = (message: string) => {
    addWsLog('send', `Sent custom string: "${message}"`);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    } else if (isSimulatorActive && message.trim().toLowerCase() === 'toggle') {
      toggleLock();
    } else {
      addWsLog('system', `Cannot send: WebSocket is not open (${wsStatus})`);
    }
  };

  // Lock transition action
  const toggleLock = () => {
    if (changing) return;

    const actingUser = currentUserRef.current?.username || 'Administrator';
    const actingRole = currentUserRef.current?.type || 'admin';

    // Verify schedule access permissions for non-admin users
    if (actingRole !== 'admin' && !isUserScheduleActiveNow(currentUserRef.current, userSchedules)) {
      addWsLog('system', `Access Denied: ${actingUser} is outside authorized schedule.`);
      return;
    }

    const willBeLocked = !lockedRef.current;
    const { timeStr, dateStr } = formatTimeAndDate();

    setChanging(true);
    setLockOperation(willBeLocked ? 'locking' : 'unlocking');
    setLockProgress(0);
    setRemainingLockTime(3);

    const newRecord: HistoryRecord = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username: actingUser,
      permission: actingRole === 'admin' ? 'Admin Privilege' : (currentUserRef.current?.permission || 'Standard User Access'),
      userType: actingRole,
      locked: willBeLocked,
      startingTime: timeStr,
      endingTime: timeStr,
      date: dateStr,
      timestamp: Date.now(),
      notes: willBeLocked ? 'Door locked securely via WebSocket' : 'Door opened with authorized credential via WebSocket',
    };

    // Immediately record locally and broadcast to server and other clients
    setHistory((prev) => deduplicateHistory([newRecord, ...prev]));
    try {
      localStorage.removeItem('smartlock_history_cleared');
    } catch {}

    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'history',
      action: 'add',
      payload: newRecord,
      timestamp: Date.now(),
    });

    // Notify REST backend
    try {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      }).catch(() => {});
    } catch {}

    // Send action JSON to ESP8266 WebSocket server
    const lockActionMsg: ClientMessage = {
      type: 'LOCK_ACTION',
      action: 'toggle',
      username: actingUser,
      userRole: actingRole,
      timestamp: Date.now(),
    };
    sendWsJson(lockActionMsg);

    // If simulator or fallback, run local simulated progress
    if (isSimulatorActive || wsStatus !== 'connected') {
      let simSeconds = 3;
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      simTimerRef.current = setInterval(() => {
        simSeconds -= 1;
        setRemainingLockTime(simSeconds);
        setLockProgress(Math.min(95, Math.round(((3 - simSeconds) / 3) * 100)));

        if (simSeconds <= 0) {
          if (simTimerRef.current) clearInterval(simTimerRef.current);
          setChanging(false);
          setLockOperation('idle');
          setLockProgress(100);
          setRemainingLockTime(null);
          setLocked(willBeLocked);

          if (!willBeLocked) {
            setActiveRoomHolder(actingUser);
          } else {
            setActiveRoomHolder(null);
            setRoomTransfers((prev) => prev.filter((t) => t.status !== 'pending'));
          }

          const notif: AdminLockNotification = {
            id: `notif-${Date.now()}`,
            type: 'lock_state_change',
            action: willBeLocked ? 'locked' : 'unlocked',
            username: actingUser,
            userRole: actingRole,
            doorName: 'Laboratory SmartLock #1',
            timestamp: `${timeStr}, ${dateStr}`,
            timestampMs: Date.now(),
            read: false,
          };
          setAdminNotifications((prev) => [notif, ...prev]);
        }
      }, 700);
    }
  };

  // Emergency trigger
  const triggerEmergency = (reason: string, notes?: string) => {
    const actingUser = currentUser?.username || 'Unknown User';
    const actingRole = currentUser?.type || 'user';
    const { timeStr, dateStr } = formatTimeAndDate();

    setIsEmergencyOverrideInProgress(true);
    setChanging(true);
    setLockOperation('unlocking');
    setLockProgress(0);
    setRemainingLockTime(3);

    const newAlert: EmergencyAlert = {
      id: `alert-${Date.now()}`,
      username: actingUser,
      userRole: actingRole,
      timestamp: `${timeStr}, ${dateStr}`,
      timestampMs: Date.now(),
      reason,
      notes,
      resolved: false,
    };
    setEmergencyAlerts((prev) => [newAlert, ...prev]);

    const newRecord: HistoryRecord = {
      id: `hist-emg-${Date.now()}`,
      username: actingUser,
      permission: 'EMERGENCY OVERRIDE',
      userType: actingRole,
      locked: false,
      startingTime: timeStr,
      endingTime: timeStr,
      date: dateStr,
      timestamp: Date.now(),
      isEmergencyOverride: true,
      emergencyReason: reason,
      notes: `EMERGENCY OVERRIDE UNLOCKED: ${reason}${notes ? ` - ${notes}` : ''}`,
    };
    setHistory((prev) => deduplicateHistory([newRecord, ...prev]));
    try {
      localStorage.removeItem('smartlock_history_cleared');
    } catch {}

    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'history',
      action: 'add',
      payload: newRecord,
      timestamp: Date.now(),
    });

    try {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      }).catch(() => {});
    } catch {}

    // Send action JSON to ESP8266
    const emgActionMsg: ClientMessage = {
      type: 'EMERGENCY_ACTION',
      reason,
      notes,
      username: actingUser,
      timestamp: Date.now(),
    };
    sendWsJson(emgActionMsg);

    if (isSimulatorActive || wsStatus !== 'connected') {
      setTimeout(() => {
        setChanging(false);
        setLockOperation('idle');
        setIsEmergencyOverrideInProgress(false);
        setLockProgress(100);
        setRemainingLockTime(null);
        setLocked(false);
        setActiveRoomHolder(actingUser);
      }, 2000);
    }
  };

  const resolveEmergency = (id: string) => {
    setEmergencyAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, resolved: true, resolvedAt: new Date().toLocaleTimeString(), resolvedBy: currentUser?.username || 'Administrator' } : a))
    );
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'emergencyAlerts',
      action: 'update',
      payload: { id },
      timestamp: Date.now(),
    });
  };

  // Room Transfer Initiation
  const initiateRoomTransfer = (toUsername: string, notes?: string): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: 'You must be logged in to transfer room access.' };
    const cleanToUsername = toUsername.trim();
    if (currentUser.username.toLowerCase() === cleanToUsername.toLowerCase()) {
      return { success: false, error: 'Cannot transfer room access to yourself.' };
    }

    const targetUser = profiles.find((p) => p.username.toLowerCase() === cleanToUsername.toLowerCase());
    if (!targetUser) {
      return { success: false, error: `User "${cleanToUsername}" not found.` };
    }

    if (!isUserScheduleActiveNow(targetUser, userSchedules)) {
      return {
        success: false,
        error: `Cannot transfer access: ${targetUser.username} does not have an active access schedule that allows room access.`,
      };
    }

    const { timeStr, dateStr } = formatTimeAndDate();
    const newTransfer: RoomTransferRequest = {
      id: `transfer-${Date.now()}`,
      requestType: 'transfer',
      fromUsername: currentUser.username,
      fromUserRole: currentUser.type,
      fromPermission: currentUser.permission,
      toUsername: cleanToUsername,
      doorName: 'Laboratory SmartLock #1',
      timestamp: `${timeStr}, ${dateStr}`,
      timestampMs: Date.now(),
      notes: notes?.trim() || undefined,
      status: 'pending',
    };

    setRoomTransfers((prev) => [newTransfer, ...prev]);

    // Send action JSON to ESP8266
    sendWsJson({
      type: 'ROOM_TRANSFER_ACTION',
      subType: 'transfer',
      transferId: newTransfer.id,
      fromUsername: currentUser.username,
      toUsername: cleanToUsername,
      notes: notes?.trim(),
      timestamp: Date.now(),
    });

    return { success: true };
  };

  // Room Access Request
  const requestRoomAccess = (notes?: string): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: 'You must be logged in to request room access.' };
    const currentHolder = activeRoomHolder || 'Administrator';
    if (currentUser.username.toLowerCase() === currentHolder.toLowerCase()) {
      return { success: false, error: 'You are already the active session holder.' };
    }

    const { timeStr, dateStr } = formatTimeAndDate();
    const newRequest: RoomTransferRequest = {
      id: `request-${Date.now()}`,
      requestType: 'request',
      fromUsername: currentUser.username,
      fromUserRole: currentUser.type,
      fromPermission: currentUser.permission,
      toUsername: currentHolder,
      doorName: 'Laboratory SmartLock #1',
      timestamp: `${timeStr}, ${dateStr}`,
      timestampMs: Date.now(),
      notes: notes?.trim() || undefined,
      status: 'pending',
    };

    setRoomTransfers((prev) => [newRequest, ...prev]);

    // Send action JSON to ESP8266
    sendWsJson({
      type: 'ROOM_TRANSFER_ACTION',
      subType: 'request',
      transferId: newRequest.id,
      fromUsername: currentUser.username,
      toUsername: currentHolder,
      notes: notes?.trim(),
      timestamp: Date.now(),
    });

    return { success: true };
  };

  // Respond to Room Transfer / Access Request
  const respondToRoomTransfer = (transferId: string, accept: boolean) => {
    const transfer = roomTransfers.find((t) => t.id === transferId);
    if (!transfer) return;

    const { timeStr, dateStr } = formatTimeAndDate();
    const isAccessReq = transfer.requestType === 'request';
    const relinquishing = isAccessReq ? transfer.toUsername : transfer.fromUsername;
    const gaining = isAccessReq ? transfer.fromUsername : transfer.toUsername;

    const relinqUser = profiles.find((p) => p.username.toLowerCase() === relinquishing.toLowerCase());
    const gainUser = profiles.find((p) => p.username.toLowerCase() === gaining.toLowerCase());

    const relinqRecord: HistoryRecord = {
      id: `hist-relinq-${transferId}`,
      username: relinquishing,
      permission: relinqUser?.permission || (relinquishing.toLowerCase() === 'administrator' ? 'Admin Privilege' : 'Standard User Access'),
      userType: (relinquishing.toLowerCase() === 'administrator' || relinqUser?.type === 'admin') ? 'admin' : 'user',
      locked: false,
      startingTime: timeStr,
      endingTime: timeStr,
      date: dateStr,
      timestamp: Date.now() - 1,
      notes: `Relinquished room custody for Laboratory SmartLock #1 (Transferred to ${gaining})`,
    };

    const gainRecord: HistoryRecord = {
      id: `hist-gain-${transferId}`,
      username: gaining,
      permission: gainUser?.permission || (gaining.toLowerCase() === 'administrator' ? 'Admin Privilege' : 'Standard User Access'),
      userType: (gaining.toLowerCase() === 'administrator' || gainUser?.type === 'admin') ? 'admin' : 'user',
      locked: false,
      startingTime: timeStr,
      endingTime: timeStr,
      date: dateStr,
      timestamp: Date.now(),
      notes: `Gained room custody for Laboratory SmartLock #1 (Transferred from ${relinquishing})`,
    };

    // Send action JSON to ESP8266 & Server with complete transfer and history metadata
    sendWsJson({
      type: 'ROOM_TRANSFER_ACTION',
      subType: 'respond',
      transferId,
      accept,
      requestType: transfer.requestType,
      fromUsername: transfer.fromUsername,
      toUsername: transfer.toUsername,
      relinquishing,
      gaining,
      gainRecord,
      relinqRecord,
      timestamp: Date.now(),
    });

    if (accept) {
      setRoomTransfers((prev) =>
        prev
          .map((t) => (t.id === transferId ? { ...t, status: 'accepted' as const, resolvedAt: `${timeStr}, ${dateStr}` } : t))
          .filter((t) => t.id === transferId || t.status !== 'pending')
      );

      setActiveRoomHolder(gaining);

      setHistory((prev) => deduplicateHistory([gainRecord, relinqRecord, ...prev]));
      try {
        localStorage.removeItem('smartlock_history_cleared');
      } catch {}

      // Broadcast history updates via WebSocket data action
      sendWsJson({
        type: 'DATA_UPDATE_ACTION',
        entity: 'history',
        action: 'add_multiple',
        payload: [gainRecord, relinqRecord],
        timestamp: Date.now(),
      });

      // Notify REST backend for guaranteed cross-device replication
      try {
        fetch('/api/room-transfers/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transferId,
            accept: true,
            requestType: transfer.requestType,
            fromUsername: transfer.fromUsername,
            toUsername: transfer.toUsername,
            relinquishing,
            gaining,
            gainRecord,
            relinqRecord,
          }),
        }).catch(() => {});
      } catch {}

      const notif: AdminLockNotification = {
        id: `notif-transfer-${Date.now()}`,
        type: 'lock_state_change',
        action: 'unlocked',
        username: gaining,
        userRole: (gaining.toLowerCase() === 'administrator' || gainUser?.type === 'admin') ? 'admin' : 'user',
        doorName: 'Laboratory SmartLock #1',
        timestamp: `${timeStr}, ${dateStr}`,
        timestampMs: Date.now(),
        read: false,
      };
      setAdminNotifications((prev) => [notif, ...prev]);
    } else {
      setRoomTransfers((prev) =>
        prev.map((t) => (t.id === transferId ? { ...t, status: 'declined' as const, resolvedAt: `${timeStr}, ${dateStr}` } : t))
      );

      try {
        fetch('/api/room-transfers/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transferId,
            accept: false,
          }),
        }).catch(() => {});
      } catch {}
    }
  };

  const dismissRoomTransfer = (transferId: string) => {
    setRoomTransfers((prev) => prev.filter((t) => t.id !== transferId));
    sendWsJson({
      type: 'ROOM_TRANSFER_ACTION',
      subType: 'dismiss',
      transferId,
      timestamp: Date.now(),
    });
  };

  // Auth & Profile Management
  const syncAuthData = useCallback(() => {
    sendWsJson({
      type: 'POLL_REQUEST',
      client: 'AuthSync',
      timestamp: Date.now(),
    });
  }, [sendWsJson]);

  const login = (username: string, password: string): { success: boolean; error?: 'user_not_found' | 'incorrect_password' } => {
    let found = profiles.find((p) => p.username.toLowerCase() === username.trim().toLowerCase());
    
    // Check localStorage in case another tab or process saved a custom avatar choice
    const uKey = username.trim().toLowerCase();
    let savedIndex: number | undefined;
    try {
      const directCached = localStorage.getItem(`smartlock_avatar_${uKey}`);
      if (directCached !== null && directCached !== '') {
        savedIndex = parseAvatarIndex(directCached);
      } else {
        const savedUserStr = localStorage.getItem('current_user');
        if (savedUserStr) {
          const parsed = JSON.parse(savedUserStr);
          if (parsed?.username?.toLowerCase() === uKey) {
            savedIndex = parseAvatarIndex(parsed.avatarIndex !== undefined ? parsed.avatarIndex : parsed.avatarUrl);
          }
        }
      }
    } catch {}

    if (!found) return { success: false, error: 'user_not_found' };
    if (found.password !== password) return { success: false, error: 'incorrect_password' };

    const effectiveIndex = savedIndex !== undefined ? savedIndex : parseAvatarIndex(found.avatarIndex !== undefined ? found.avatarIndex : found.avatarUrl);

    const updatedUser: Profile = {
      ...found,
      avatarIndex: effectiveIndex,
      avatarUrl: String(effectiveIndex),
      isOnline: true,
      lastActive: 'Active now',
    };
    setProfiles((prev) => {
      const exists = prev.some((p) => p.username.toLowerCase() === found!.username.toLowerCase());
      if (exists) {
        return prev.map((p) => (p.username.toLowerCase() === found!.username.toLowerCase() ? updatedUser : p));
      }
      return [...prev, updatedUser];
    });
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('current_user', JSON.stringify(updatedUser));
    } catch {}
    setActiveTab('lock');
    setWelcomeMessage(`Welcome, ${updatedUser.username}! — The SmartLock Unit is ready.`);

    // Initialize history with 1-month mock data if empty or on login so activity log is populated
    setHistory((prev) => {
      if (!prev || prev.length === 0) {
        const monthMock = generateMonthHistory();
        try {
          localStorage.setItem('history_record', JSON.stringify(monthMock));
        } catch {}
        sendWsJson({
          type: 'DATA_UPDATE_ACTION',
          entity: 'history',
          action: 'seed',
          payload: monthMock,
          timestamp: Date.now(),
        });
        return monthMock;
      }
      return prev;
    });

    sendWsJson({
      type: 'USER_PRESENCE',
      username: updatedUser.username,
      status: 'online',
      timestamp: Date.now(),
    });

    return { success: true };
  };

  const registerRequest = (username: string, password: string): { success: boolean; error?: 'username_taken' } => {
    const trimmed = username.trim();
    if (profiles.some((p) => p.username.toLowerCase() === trimmed.toLowerCase()) ||
        profileRequests.some((p) => p.username.toLowerCase() === trimmed.toLowerCase())) {
      return { success: false, error: 'username_taken' };
    }

    const newReq: ProfileRequest = {
      username: trimmed,
      password,
      type: 'user',
      time: [0, 1440],
      requestedAt: new Date().toLocaleString(),
    };

    setProfileRequests((prev) => [...prev, newReq]);
    setRegistrationNotice('Registration successful waiting for admin approval');

    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'profileRequests',
      action: 'create',
      payload: newReq,
      timestamp: Date.now(),
    });

    return { success: true };
  };

  const approveRequest = (username: string) => {
    const req = profileRequests.find((r) => r.username === username);
    if (!req) return;

    const newProfile: Profile = {
      username: req.username,
      password: req.password,
      type: req.type,
      time: req.time,
      permission: req.type === 'admin' ? 'Admin Privilege' : 'Standard User Access',
      avatarUrl: user_png,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isOnline: false,
      lastActive: 'Registered recently',
    };

    setProfiles((prev) => [...prev, newProfile]);
    setProfileRequests((prev) => prev.filter((r) => r.username !== username));

    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'profileRequests',
      action: 'approve',
      payload: { username, password: req.password, type: req.type, time: req.time },
      timestamp: Date.now(),
    });

    // Auto-create standard access schedule for approved user
    const defaultUserSched: UserSchedule = {
      id: `sched-${Date.now()}`,
      label: req.username,
      role: req.type,
      time: '24/7 Unlimited Access, Monday to Sunday',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      startTime: '12:00 AM',
      endTime: '11:59 PM',
      dayConfigs: {
        Mon: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
        Tue: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
        Wed: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
        Thu: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
        Fri: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
        Sat: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
        Sun: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
      },
      status: 'active',
    };
    addSchedule(defaultUserSched);
  };

  const rejectRequest = (username: string) => {
    setProfileRequests((prev) => prev.filter((r) => r.username !== username));
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'profileRequests',
      action: 'reject',
      payload: { username },
      timestamp: Date.now(),
    });
  };

  const logout = () => {
    if (currentUser) {
      sendWsJson({
        type: 'USER_PRESENCE',
        username: currentUser.username,
        status: 'offline',
        timestamp: Date.now(),
      });
      setProfiles((prev) =>
        prev.map((p) =>
          p.username.toLowerCase() === currentUser.username.toLowerCase()
            ? { ...p, isOnline: false, lastActive: 'Offline' }
            : p
        )
      );
    }
    setCurrentUser(null);
    setActiveTab('lock');
    setWelcomeMessage(null);
  };

  const updatePassword = (oldPass: string, newPass: string): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    if (currentUser.password !== oldPass) return { success: false, error: 'Current password does not match' };
    if (newPass.length < 4) return { success: false, error: 'Password must be at least 4 characters long' };

    const updatedUser = { ...currentUser, password: newPass };
    setCurrentUser(updatedUser);
    setProfiles((prev) => prev.map((p) => (p.username === currentUser.username ? updatedUser : p)));

    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'profiles',
      action: 'update',
      payload: updatedUser,
      timestamp: Date.now(),
    });

    return { success: true };
  };

  const updateAvatar = (avatarIndexOrUrl: number | string) => {
    if (!currentUser) return;
    const newIndex = parseAvatarIndex(avatarIndexOrUrl);

    const userKey = currentUser.username.toLowerCase();
    const now = Date.now();
    localAvatarModTimestampsRef.current.set(userKey, now);

    const updatedUser: Profile = {
      ...currentUser,
      avatarIndex: newIndex,
      avatarUrl: String(newIndex),
    };
    currentUserRef.current = updatedUser;
    setCurrentUser(updatedUser);
    setProfiles((prev) =>
      prev.map((p) =>
        p.username.toLowerCase() === userKey ? updatedUser : p
      )
    );

    // Save locally
    try {
      localStorage.setItem('current_user', JSON.stringify(updatedUser));
      localStorage.setItem(`smartlock_avatar_${userKey}`, String(newIndex));
      const existingUsers: Profile[] = JSON.parse(localStorage.getItem('user_data') || '[]');
      const savedProfiles = existingUsers.some((p) => p.username.toLowerCase() === userKey)
        ? existingUsers.map((p) => (p.username.toLowerCase() === userKey ? updatedUser : p))
        : [...existingUsers, updatedUser];
      localStorage.setItem('user_data', JSON.stringify(savedProfiles));
    } catch {}

    // Dispatch WebSocket sync to ESP8266 & server
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'profiles',
      action: 'update_avatar',
      username: currentUser.username,
      avatarIndex: newIndex,
      avatarUrl: String(newIndex),
      timestamp: now,
    });

    // Also notify REST backend for multi-client replication
    try {
      fetch('/api/profiles/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username,
          avatarIndex: newIndex,
          avatarUrl: String(newIndex),
        }),
      }).catch(() => {});
    } catch {}
  };

  const adminCreateUser = (userData: Omit<Profile, 'joinedDate'>): { success: boolean; error?: string } => {
    const cleanUsername = userData.username.trim();
    if (!cleanUsername) return { success: false, error: 'Username is required.' };
    if (profiles.some((p) => p.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return { success: false, error: `Username "${cleanUsername}" already exists.` };
    }

    const avIdx = parseAvatarIndex(userData.avatarIndex !== undefined ? userData.avatarIndex : userData.avatarUrl);

    const cleanType = (userData.type === 'admin' || cleanUsername.toLowerCase() === 'administrator') ? 'admin' : 'user';
    const newProfile: Profile = {
      ...userData,
      username: cleanUsername,
      type: cleanType as 'admin' | 'user',
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isOnline: false,
      lastActive: 'Never logged in',
      permission: userData.permission || (cleanType === 'admin' ? 'Admin Privilege' : 'Standard User Access'),
      avatarIndex: avIdx,
      avatarUrl: String(avIdx),
    };

    setProfiles((prev) => [...prev, newProfile]);

    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'profiles',
      action: 'create',
      username: cleanUsername,
      userType: cleanType,
      role: cleanType,
      permission: newProfile.permission,
      payload: newProfile,
      timestamp: Date.now(),
    });

    // Auto-create standard access schedule for the new user
    const defaultUserSched: UserSchedule = {
      id: `sched-${Date.now()}`,
      label: cleanUsername,
      role: cleanType,
      time: '24/7 Unlimited Access, Monday to Sunday',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      startTime: '12:00 AM',
      endTime: '11:59 PM',
      dayConfigs: {
        Mon: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
        Tue: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
        Wed: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
        Thu: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
        Fri: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
        Sat: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
        Sun: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
      },
      status: 'active',
    };
    addSchedule(defaultUserSched);

    return { success: true };
  };

  const adminUpdateUser = (originalUsername: string, updatedData: Partial<Profile>): { success: boolean; error?: string } => {
    const targetUser = profiles.find((p) => p.username === originalUsername);
    if (!targetUser) return { success: false, error: 'User profile not found.' };

    const avIdx = updatedData.avatarIndex !== undefined
      ? parseAvatarIndex(updatedData.avatarIndex)
      : (updatedData.avatarUrl !== undefined ? parseAvatarIndex(updatedData.avatarUrl) : (targetUser.avatarIndex ?? 0));

    const cleanUsername = updatedData.username ? updatedData.username.trim() : targetUser.username;
    const cleanType = ((updatedData.type !== undefined ? updatedData.type : targetUser.type) === 'admin' || cleanUsername.toLowerCase() === 'administrator') ? 'admin' : 'user';

    const updatedProfile: Profile = {
      ...targetUser,
      ...updatedData,
      username: cleanUsername,
      type: cleanType as 'admin' | 'user',
      avatarIndex: avIdx,
      avatarUrl: String(avIdx),
    };

    setProfiles((prev) => prev.map((p) => (p.username === originalUsername ? updatedProfile : p)));
    if (currentUser?.username === originalUsername) setCurrentUser(updatedProfile);

    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'profiles',
      action: 'update',
      username: cleanUsername,
      userType: cleanType,
      role: cleanType,
      permission: updatedProfile.permission,
      payload: updatedProfile,
      timestamp: Date.now(),
    });

    return { success: true };
  };

  const adminDeleteUser = (username: string): { success: boolean; error?: string } => {
    const cleanUsername = username.trim();
    if (!cleanUsername) return { success: false, error: 'Valid username required.' };
    
    if (currentUser?.username.toLowerCase() === cleanUsername.toLowerCase()) {
      return { success: false, error: 'Cannot delete your own active account.' };
    }
    if (cleanUsername.toLowerCase() === 'administrator') {
      return { success: false, error: 'The primary system Administrator account cannot be deleted.' };
    }

    // 1. Remove profile
    setProfiles((prev) => prev.filter((p) => p.username.toLowerCase() !== cleanUsername.toLowerCase()));

    // 2. Cascade delete all associated access schedules for this user
    setUserSchedules((prev) => prev.filter((s) => s.label.toLowerCase() !== cleanUsername.toLowerCase()));

    // 3. Cascade delete any lab notes (schedule requests) for this user
    setLabNotes((prev) => prev.filter((n) => n.username.toLowerCase() !== cleanUsername.toLowerCase()));

    // 4. Send action to ESP8266 & WebSocket server
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'profiles',
      action: 'delete',
      username: cleanUsername,
      payload: { username: cleanUsername },
      timestamp: Date.now(),
    });

    return { success: true };
  };

  // Schedule Management
  const addSchedule = (sched: Omit<UserSchedule, 'id'>) => {
    const cleanRole = (sched.role === 'admin' || (sched.label || '').toLowerCase() === 'administrator') ? 'admin' : 'user';
    const newSched: UserSchedule = { ...sched, role: cleanRole, id: Date.now().toString() };
    const now = Date.now();
    localScheduleModTimestampsRef.current.set((newSched.label || '').toLowerCase(), now);
    localScheduleModTimestampsRef.current.set(newSched.id, now);

    setUserSchedules((prev) => {
      const exists = prev.some((s) => s.id === newSched.id || s.label.toLowerCase() === newSched.label.toLowerCase());
      if (exists) {
        return prev.map((s) => (s.id === newSched.id || s.label.toLowerCase() === newSched.label.toLowerCase() ? newSched : s));
      }
      return [...prev, newSched];
    });

    try {
      const existing = JSON.parse(localStorage.getItem('user_schedules') || '[]');
      const filtered = existing.filter((s: any) => s.label.toLowerCase() !== newSched.label.toLowerCase());
      localStorage.setItem('user_schedules', JSON.stringify([...filtered, newSched]));
    } catch {}

    addWsLog('send', `[ESP8266 IoT] New access policy dispatched for "${newSched.label}" (${newSched.time})`);
    
    const daysStr = Array.isArray(newSched.days) ? newSched.days.join(',') : newSched.days;
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'schedules',
      action: 'create',
      id: newSched.id,
      label: newSched.label,
      role: cleanRole,
      userType: cleanRole,
      time: newSched.time,
      days: daysStr,
      daysArray: newSched.days,
      startTime: newSched.startTime,
      endTime: newSched.endTime,
      status: newSched.status,
      dayConfigs: newSched.dayConfigs,
      payload: {
        ...newSched,
        role: cleanRole,
        days: newSched.days,
        daysStr,
      },
      timestamp: Date.now(),
    });
  };

  const updateSchedule = (sched: UserSchedule) => {
    const cleanRole = (sched.role === 'admin' || (sched.label || '').toLowerCase() === 'administrator') ? 'admin' : 'user';
    const cleanSched: UserSchedule = { ...sched, role: cleanRole };
    const now = Date.now();
    localScheduleModTimestampsRef.current.set((cleanSched.label || '').toLowerCase(), now);
    localScheduleModTimestampsRef.current.set(cleanSched.id, now);

    setUserSchedules((prev) => {
      const exists = prev.some((s) => s.id === cleanSched.id || s.label.toLowerCase() === cleanSched.label.toLowerCase());
      if (exists) {
        return prev.map((s) => (s.id === cleanSched.id || s.label.toLowerCase() === cleanSched.label.toLowerCase() ? cleanSched : s));
      }
      return [...prev, cleanSched];
    });

    try {
      const existing = JSON.parse(localStorage.getItem('user_schedules') || '[]');
      const updated = existing.some((s: any) => s.id === cleanSched.id || s.label.toLowerCase() === cleanSched.label.toLowerCase())
        ? existing.map((s: any) => (s.id === cleanSched.id || s.label.toLowerCase() === cleanSched.label.toLowerCase() ? cleanSched : s))
        : [...existing, cleanSched];
      localStorage.setItem('user_schedules', JSON.stringify(updated));
    } catch {}

    addWsLog('send', `[ESP8266 IoT] Access policy updated for "${cleanSched.label}" (${cleanSched.time})`);

    const daysStr = Array.isArray(cleanSched.days) ? cleanSched.days.join(',') : cleanSched.days;
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'schedules',
      action: 'update',
      id: cleanSched.id,
      label: cleanSched.label,
      role: cleanRole,
      userType: cleanRole,
      time: cleanSched.time,
      days: daysStr,
      daysArray: cleanSched.days,
      startTime: cleanSched.startTime,
      endTime: cleanSched.endTime,
      status: cleanSched.status,
      dayConfigs: cleanSched.dayConfigs,
      payload: {
        ...cleanSched,
        role: cleanRole,
        days: cleanSched.days,
        daysStr,
      },
      timestamp: Date.now(),
    });
  };

  const deleteSchedule = (id: string) => {
    const target = userSchedules.find((s) => s.id === id);
    const targetLabel = target?.label || '';
    const now = Date.now();
    localScheduleModTimestampsRef.current.set(targetLabel.toLowerCase(), now);
    localScheduleModTimestampsRef.current.set(id, now);
    localScheduleDeletedTimestampsRef.current.set(targetLabel.toLowerCase(), now);
    localScheduleDeletedTimestampsRef.current.set(id, now);

    setUserSchedules((prev) =>
      prev.filter(
        (s) =>
          s.id !== id &&
          (!targetLabel || s.label.toLowerCase() !== targetLabel.toLowerCase())
      )
    );

    try {
      const existing = JSON.parse(localStorage.getItem('user_schedules') || '[]');
      const filtered = existing.filter(
        (s: any) =>
          s.id !== id &&
          (!targetLabel || (s.label || '').toLowerCase() !== targetLabel.toLowerCase())
      );
      localStorage.setItem('user_schedules', JSON.stringify(filtered));
    } catch {}

    addWsLog('send', `[ESP8266 IoT] Access policy removed for "${targetLabel || id}"`);
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'schedules',
      action: 'delete',
      id: id,
      label: targetLabel,
      payload: { id, label: targetLabel },
      timestamp: Date.now(),
    });
  };

  // Lab Notes Management
  const addLabNote = (note: Omit<LabNoteSchedule, 'id' | 'createdDate' | 'status'>) => {
    const newNote: LabNoteSchedule = {
      ...note,
      id: `note-${Date.now()}`,
      createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'confirmed',
    };
    setLabNotes((prev) => [newNote, ...prev]);
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'labNotes',
      action: 'create',
      payload: newNote,
      timestamp: Date.now(),
    });
  };

  const updateLabNote = (note: LabNoteSchedule) => {
    setLabNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'labNotes',
      action: 'update',
      payload: note,
      timestamp: Date.now(),
    });
  };

  const deleteLabNote = (id: string) => {
    setLabNotes((prev) => prev.filter((n) => n.id !== id));
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'labNotes',
      action: 'delete',
      payload: { id },
      timestamp: Date.now(),
    });
  };

  const deleteHistory = () => {
    setHistory([]);
    try {
      localStorage.setItem('history_record', JSON.stringify([]));
      localStorage.setItem('smartlock_history_cleared', 'true');
    } catch {}
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'history',
      action: 'clear',
      timestamp: Date.now(),
    });
  };

  const markAdminNotificationAsRead = (id: string) => {
    setAdminNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'adminNotifications',
      action: 'mark_read',
      payload: { id },
      timestamp: Date.now(),
    });
  };

  const clearAllAdminNotifications = () => {
    setAdminNotifications([]);
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'adminNotifications',
      action: 'clear',
      timestamp: Date.now(),
    });
  };

  const dismissWelcomeMessage = () => setWelcomeMessage(null);
  const dismissRegistrationNotice = () => setRegistrationNotice(null);

  const onlineUsers = profiles.filter((p) => p.isOnline || p.username === currentUser?.username);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        activeTab,
        setActiveTab,
        profiles,
        profileRequests,
        locked,
        changing,
        lockOperation,
        lockProgress,
        remainingLockTime,
        initialLockTime,
        isEmergencyOverrideInProgress,
        wsStatus,
        wsUrl,
        setWsUrl,
        reconnectWebSocket,
        isSimulatorActive,
        setIsSimulatorActive,
        wsLogs,
        clearWsLogs,
        sendCustomWsMessage,
        syncAuthData,
        history,
        userSchedules,
        labNotes,
        emergencyAlerts,
        welcomeMessage,
        dismissWelcomeMessage,
        registrationNotice,
        dismissRegistrationNotice,
        login,
        registerRequest,
        approveRequest,
        rejectRequest,
        toggleLock,
        deleteHistory,
        logout,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        updatePassword,
        updateAvatar,
        adminCreateUser,
        adminUpdateUser,
        adminDeleteUser,
        addLabNote,
        updateLabNote,
        deleteLabNote,
        triggerEmergency,
        resolveEmergency,
        onlineUsers,
        roomTransfers,
        adminNotifications,
        activeRoomHolder,
        initiateRoomTransfer,
        requestRoomAccess,
        respondToRoomTransfer,
        dismissRoomTransfer,
        markAdminNotificationAsRead,
        clearAllAdminNotifications,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
