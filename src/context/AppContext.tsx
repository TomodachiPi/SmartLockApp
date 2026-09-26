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
  updateAvatar: (avatarUrl: string) => void;
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
    avatarUrl: user_png,
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
    avatarUrl: user_png,
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
  if (user.type === 'admin') return true; // Admins have 24/7 master clearance

  const userSchedules = schedules.filter(
    (s) => s.label.toLowerCase() === user.username.toLowerCase()
  );

  // Non-admin users MUST have an explicit access schedule configured
  if (userSchedules.length === 0) {
    return false;
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
      const saved = localStorage.getItem('history_record');
      return saved ? JSON.parse(saved) : defaultHistory;
    } catch {
      return defaultHistory;
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
          const filtered = parsed.filter(
            (s: any) => s.label !== 'Sarah_Chen' && s.label !== 'Alex_Rivera'
          );
          return filtered.length > 0 ? filtered : defaultSchedules;
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
        const cleanProfiles = parsed.profiles.filter(
          (p: any) => p.username !== 'Sarah_Chen' && p.username !== 'Alex_Rivera'
        );
        setProfiles((prevProfiles) => {
          return cleanProfiles.map((incProf: Profile) => {
            const localProf = prevProfiles.find(
              (lp) => lp.username.toLowerCase() === incProf.username.toLowerCase()
            );
            const avatarUrl =
              incProf.avatarUrl && incProf.avatarUrl !== '/images/user.png'
                ? incProf.avatarUrl
                : localProf?.avatarUrl || incProf.avatarUrl || user_png;

            return {
              ...incProf,
              avatarUrl,
            };
          });
        });

        // Also update currentUser avatar if it matches
        if (currentUserRef.current) {
          const match = cleanProfiles.find(
            (p: Profile) => p.username.toLowerCase() === currentUserRef.current?.username.toLowerCase()
          );
          if (match && match.avatarUrl && match.avatarUrl !== '/images/user.png' && match.avatarUrl !== currentUserRef.current.avatarUrl) {
            setCurrentUser((prev) => {
              if (!prev) return prev;
              const updated = { ...prev, avatarUrl: match.avatarUrl };
              try {
                localStorage.setItem('current_user', JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        }
      }
      if (Array.isArray(parsed.profileRequests)) {
        setProfileRequests(parsed.profileRequests);
      }
      if (Array.isArray(parsed.userSchedules)) {
        const cleanSchedules = parsed.userSchedules.filter(
          (s: any) => s.label !== 'Sarah_Chen' && s.label !== 'Alex_Rivera'
        );
        const incomingMsgTimestamp = parsed.timestamp || 0;
        const now = Date.now();

        setUserSchedules((prevSchedules) => {
          const merged = [...prevSchedules];

          cleanSchedules.forEach((incomingSched: UserSchedule) => {
            const labelKey = (incomingSched.label || '').toLowerCase();
            const idKey = incomingSched.id;
            const lastLocalMod = Math.max(
              localScheduleModTimestampsRef.current.get(labelKey) || 0,
              localScheduleModTimestampsRef.current.get(idKey) || 0
            );

            // If we recently updated this schedule locally (within last 15s) and the incoming message is older, retain the local state!
            const isRecentlyEditedLocally = now - lastLocalMod < 15000;
            const existingIdx = merged.findIndex(
              (s) => s.id === incomingSched.id || s.label.toLowerCase() === labelKey
            );

            if (existingIdx >= 0) {
              const localSched = merged[existingIdx];
              if (isRecentlyEditedLocally && incomingMsgTimestamp < lastLocalMod) {
                // Keep locally updated schedule to prevent polling reverts
                return;
              }

              merged[existingIdx] = {
                ...incomingSched,
                // Preserve dayConfigs if local has custom configured days and incoming doesn't or is generic
                dayConfigs:
                  incomingSched.dayConfigs && Object.keys(incomingSched.dayConfigs).length > 0
                    ? incomingSched.dayConfigs
                    : localSched.dayConfigs,
              };
            } else {
              merged.push(incomingSched);
            }
          });

          return merged;
        });
      }
      if (Array.isArray(parsed.roomTransfers)) {
        setRoomTransfers(parsed.roomTransfers);
      }
      if (Array.isArray(parsed.history)) {
        setHistory(parsed.history);
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
            setProfiles((prev) => {
              if (prev.some((p) => p.username.toLowerCase() === payload.username.toLowerCase())) return prev;
              const newProf: Profile = {
                username: payload.username,
                password: payload.password,
                type: payload.type || 'user',
                time: payload.time || [0, 1440],
                permission: payload.type === 'admin' ? 'Admin Privilege' : 'Standard User Access',
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
          setProfiles((prev) => {
            if (prev.some((p) => p.username.toLowerCase() === payload.username.toLowerCase())) return prev;
            return [...prev, payload];
          });
        } else if (action === 'update' && payload) {
          setProfiles((prev) =>
            prev.map((p) => (p.username.toLowerCase() === payload.username.toLowerCase() ? { ...p, ...payload } : p))
          );
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
          setUserSchedules((prev) => {
            if (prev.some((s) => s.id === payload.id)) return prev;
            return [...prev, payload];
          });
        } else if (action === 'update' && payload) {
          setUserSchedules((prev) => prev.map((s) => (s.id === payload.id ? { ...s, ...payload } : s)));
        } else if (action === 'delete' && payload) {
          setUserSchedules((prev) => prev.filter((s) => s.id !== payload.id));
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
      }
    }, 5000); // 5 seconds interval

    return () => clearInterval(pollInterval);
  }, [addWsLog]);

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
          if (actionData.toUsername) setActiveRoomHolder(actionData.toUsername);
        } else if (actionData.type === 'DATA_UPDATE_ACTION') {
          if (actionData.entity === 'labNotes') {
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

          const previousTime = history.length > 0 ? history[0].endingTime : '8:00 AM';
          const newRecord: HistoryRecord = {
            id: `hist-${Date.now()}`,
            username: actingUser,
            permission: actingRole === 'admin' ? 'Admin Privilege' : 'Standard User Access',
            userType: actingRole,
            locked: willBeLocked,
            startingTime: previousTime,
            endingTime: timeStr,
            date: dateStr,
            timestamp: Date.now(),
            notes: willBeLocked ? 'Door locked securely via WebSocket' : 'Door opened with authorized credential via WebSocket',
          };
          setHistory((prev) => [newRecord, ...prev]);

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
    const { timeStr, dateStr } = formatTimeAndDate();

    setIsEmergencyOverrideInProgress(true);
    setChanging(true);
    setLockOperation('unlocking');
    setLockProgress(0);
    setRemainingLockTime(3);

    const newAlert: EmergencyAlert = {
      id: `alert-${Date.now()}`,
      username: actingUser,
      userRole: currentUser?.type || 'user',
      timestamp: `${timeStr}, ${dateStr}`,
      timestampMs: Date.now(),
      reason,
      notes,
      resolved: false,
    };
    setEmergencyAlerts((prev) => [newAlert, ...prev]);

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

        const newRecord: HistoryRecord = {
          id: `hist-emg-${Date.now()}`,
          username: actingUser,
          permission: 'EMERGENCY OVERRIDE',
          userType: currentUser?.type || 'user',
          locked: false,
          startingTime: timeStr,
          endingTime: timeStr,
          date: dateStr,
          timestamp: Date.now(),
          isEmergencyOverride: true,
          emergencyReason: reason,
          notes: `EMERGENCY OVERRIDE UNLOCKED: ${reason}${notes ? ` - ${notes}` : ''}`,
        };
        setHistory((prev) => [newRecord, ...prev]);
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

    // Send action JSON to ESP8266
    sendWsJson({
      type: 'ROOM_TRANSFER_ACTION',
      subType: 'respond',
      transferId,
      accept,
      fromUsername: transfer.fromUsername,
      toUsername: transfer.toUsername,
      timestamp: Date.now(),
    });

    if (accept) {
      const isAccessReq = transfer.requestType === 'request';
      const relinquishing = isAccessReq ? transfer.toUsername : transfer.fromUsername;
      const gaining = isAccessReq ? transfer.fromUsername : transfer.toUsername;

      setRoomTransfers((prev) =>
        prev
          .map((t) => (t.id === transferId ? { ...t, status: 'accepted' as const, resolvedAt: `${timeStr}, ${dateStr}` } : t))
          .filter((t) => t.id === transferId || t.status !== 'pending')
      );

      setActiveRoomHolder(gaining);

      const gainRecord: HistoryRecord = {
        id: `hist-gain-${Date.now()}`,
        username: gaining,
        permission: 'Standard User Access',
        userType: 'user',
        locked: false,
        startingTime: timeStr,
        endingTime: timeStr,
        date: dateStr,
        timestamp: Date.now(),
        notes: `Gained room access for Laboratory SmartLock #1 (Transferred from ${relinquishing})`,
      };

      setHistory((prev) => [gainRecord, ...prev]);

      const notif: AdminLockNotification = {
        id: `notif-transfer-${Date.now()}`,
        type: 'lock_state_change',
        action: 'unlocked',
        username: gaining,
        userRole: 'user',
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
    
    // Check localStorage in case another tab or process synced profiles
    if (!found) {
      try {
        const saved = localStorage.getItem('user_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            found = parsed.find((p: any) => p.username.toLowerCase() === username.trim().toLowerCase());
          }
        }
      } catch {}
    }

    if (!found) return { success: false, error: 'user_not_found' };
    if (found.password !== password) return { success: false, error: 'incorrect_password' };

    const updatedUser: Profile = { ...found, isOnline: true, lastActive: 'Active now' };
    setProfiles((prev) => {
      const exists = prev.some((p) => p.username.toLowerCase() === found!.username.toLowerCase());
      if (exists) {
        return prev.map((p) => (p.username.toLowerCase() === found!.username.toLowerCase() ? updatedUser : p));
      }
      return [...prev, updatedUser];
    });
    setCurrentUser(updatedUser);
    setActiveTab('lock');
    setWelcomeMessage(`Welcome, ${updatedUser.username}! — The SmartLock Unit is ready.`);

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

  const updateAvatar = (avatarUrl: string) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, avatarUrl };
    setCurrentUser(updatedUser);
    setProfiles((prev) =>
      prev.map((p) =>
        p.username.toLowerCase() === currentUser.username.toLowerCase() ? updatedUser : p
      )
    );

    // Save locally
    try {
      localStorage.setItem('current_user', JSON.stringify(updatedUser));
      const existingUsers: Profile[] = JSON.parse(localStorage.getItem('user_data') || '[]');
      const savedProfiles = existingUsers.some((p) => p.username.toLowerCase() === currentUser.username.toLowerCase())
        ? existingUsers.map((p) => (p.username.toLowerCase() === currentUser.username.toLowerCase() ? updatedUser : p))
        : [...existingUsers, updatedUser];
      localStorage.setItem('user_data', JSON.stringify(savedProfiles));
    } catch {}

    // Dispatch WebSocket sync to ESP8266 & server
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'profiles',
      action: 'update_avatar',
      username: currentUser.username,
      avatarUrl: avatarUrl,
      payload: {
        username: currentUser.username,
        avatarUrl: avatarUrl,
      },
      timestamp: Date.now(),
    });

    // Also notify REST backend for multi-client replication
    try {
      fetch('/api/profiles/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username,
          avatarUrl: avatarUrl,
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

    const newProfile: Profile = {
      ...userData,
      username: cleanUsername,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isOnline: false,
      lastActive: 'Never logged in',
      permission: userData.permission || (userData.type === 'admin' ? 'Admin Privilege' : 'Standard User Access'),
      avatarUrl: userData.avatarUrl || user_png,
    };

    setProfiles((prev) => [...prev, newProfile]);

    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'profiles',
      action: 'create',
      payload: newProfile,
      timestamp: Date.now(),
    });

    return { success: true };
  };

  const adminUpdateUser = (originalUsername: string, updatedData: Partial<Profile>): { success: boolean; error?: string } => {
    const targetUser = profiles.find((p) => p.username === originalUsername);
    if (!targetUser) return { success: false, error: 'User profile not found.' };

    const updatedProfile: Profile = {
      ...targetUser,
      ...updatedData,
      username: updatedData.username ? updatedData.username.trim() : targetUser.username,
    };

    setProfiles((prev) => prev.map((p) => (p.username === originalUsername ? updatedProfile : p)));
    if (currentUser?.username === originalUsername) setCurrentUser(updatedProfile);

    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'profiles',
      action: 'update',
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
      payload: { username: cleanUsername },
      timestamp: Date.now(),
    });

    return { success: true };
  };

  // Schedule Management
  const addSchedule = (sched: Omit<UserSchedule, 'id'>) => {
    const newSched: UserSchedule = { ...sched, id: Date.now().toString() };
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
      role: newSched.role,
      time: newSched.time,
      days: daysStr,
      daysArray: newSched.days,
      startTime: newSched.startTime,
      endTime: newSched.endTime,
      status: newSched.status,
      dayConfigs: newSched.dayConfigs,
      payload: {
        ...newSched,
        days: newSched.days,
        daysStr,
      },
      timestamp: Date.now(),
    });
  };

  const updateSchedule = (sched: UserSchedule) => {
    const now = Date.now();
    localScheduleModTimestampsRef.current.set((sched.label || '').toLowerCase(), now);
    localScheduleModTimestampsRef.current.set(sched.id, now);

    setUserSchedules((prev) => {
      const exists = prev.some((s) => s.id === sched.id || s.label.toLowerCase() === sched.label.toLowerCase());
      if (exists) {
        return prev.map((s) => (s.id === sched.id || s.label.toLowerCase() === sched.label.toLowerCase() ? { ...s, ...sched } : s));
      }
      return [...prev, sched];
    });

    try {
      const existing = JSON.parse(localStorage.getItem('user_schedules') || '[]');
      const updated = existing.some((s: any) => s.id === sched.id || s.label.toLowerCase() === sched.label.toLowerCase())
        ? existing.map((s: any) => (s.id === sched.id || s.label.toLowerCase() === sched.label.toLowerCase() ? { ...s, ...sched } : s))
        : [...existing, sched];
      localStorage.setItem('user_schedules', JSON.stringify(updated));
    } catch {}

    addWsLog('send', `[ESP8266 IoT] Access policy updated for "${sched.label}" (${sched.time})`);

    const daysStr = Array.isArray(sched.days) ? sched.days.join(',') : sched.days;
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'schedules',
      action: 'update',
      id: sched.id,
      label: sched.label,
      role: sched.role,
      time: sched.time,
      days: daysStr,
      daysArray: sched.days,
      startTime: sched.startTime,
      endTime: sched.endTime,
      status: sched.status,
      dayConfigs: sched.dayConfigs,
      payload: {
        ...sched,
        days: sched.days,
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

    setUserSchedules((prev) => prev.filter((s) => s.id !== id));

    try {
      const existing = JSON.parse(localStorage.getItem('user_schedules') || '[]');
      const filtered = existing.filter((s: any) => s.id !== id);
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
