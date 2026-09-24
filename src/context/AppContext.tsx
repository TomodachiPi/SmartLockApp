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

const defaultSchedules: UserSchedule[] = [
  {
    id: '1',
    label: 'Administrator',
    role: 'admin',
    time: '24/7 Unlimited Access, Monday to Sunday',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    startTime: '12:00 AM',
    endTime: '11:59 PM',
    status: 'active',
  },
  {
    id: '2',
    label: 'User123test',
    role: 'user',
    time: '10:00 AM to 01:00 PM, Tuesday',
    days: ['Tue'],
    startTime: '10:00 AM',
    endTime: '01:00 PM',
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
        setProfiles(cleanProfiles);
      }
      if (Array.isArray(parsed.profileRequests)) {
        setProfileRequests(parsed.profileRequests);
      }
      if (Array.isArray(parsed.userSchedules)) {
        const cleanSchedules = parsed.userSchedules.filter(
          (s: any) => s.label !== 'Sarah_Chen' && s.label !== 'Alex_Rivera'
        );
        setUserSchedules(cleanSchedules);
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
          setProfiles((prev) => prev.filter((p) => p.username.toLowerCase() !== payload.username.toLowerCase()));
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

  // PERIODIC SYNC POLLING: Send WebSocket POLL_REQUEST every half a minute (30s)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const pollMsg: ClientMessage = {
          type: 'POLL_REQUEST',
          client: 'SmartLockApp',
          timestamp: Date.now(),
        };
        try {
          wsRef.current.send(JSON.stringify(pollMsg));
          addWsLog('send', '[Periodic 30s Poll] Sent POLL_REQUEST to ESP8266');
        } catch (e: any) {
          addWsLog('system', `Failed to send periodic poll: ${e.message}`);
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(pollInterval);
  }, [addWsLog]);

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

    const willBeLocked = !lockedRef.current;
    const actingUser = currentUserRef.current?.username || 'Administrator';
    const actingRole = currentUserRef.current?.type || 'admin';
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
    if (currentUser.username.toLowerCase() === toUsername.trim().toLowerCase()) {
      return { success: false, error: 'Cannot transfer room access to yourself.' };
    }

    const { timeStr, dateStr } = formatTimeAndDate();
    const newTransfer: RoomTransferRequest = {
      id: `transfer-${Date.now()}`,
      requestType: 'transfer',
      fromUsername: currentUser.username,
      fromUserRole: currentUser.type,
      fromPermission: currentUser.permission,
      toUsername: toUsername.trim(),
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
      toUsername: toUsername.trim(),
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
      setProfiles((prev) => prev.map((p) => (p.username === currentUser.username ? { ...p, isOnline: false, lastActive: 'Logged out' } : p)));
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
    setProfiles((prev) => prev.map((p) => (p.username === currentUser.username ? updatedUser : p)));
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
    if (currentUser?.username === username) return { success: false, error: 'Cannot delete your own active administrator account.' };
    setProfiles((prev) => prev.filter((p) => p.username !== username));

    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'profiles',
      action: 'delete',
      payload: { username },
      timestamp: Date.now(),
    });

    return { success: true };
  };

  // Schedule Management
  const addSchedule = (sched: Omit<UserSchedule, 'id'>) => {
    const newSched: UserSchedule = { ...sched, id: Date.now().toString() };
    setUserSchedules((prev) => [...prev, newSched]);
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'schedules',
      action: 'create',
      payload: newSched,
      timestamp: Date.now(),
    });
  };

  const updateSchedule = (sched: UserSchedule) => {
    setUserSchedules((prev) => prev.map((s) => (s.id === sched.id ? sched : s)));
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'schedules',
      action: 'update',
      payload: sched,
      timestamp: Date.now(),
    });
  };

  const deleteSchedule = (id: string) => {
    setUserSchedules((prev) => prev.filter((s) => s.id !== id));
    sendWsJson({
      type: 'DATA_UPDATE_ACTION',
      entity: 'schedules',
      action: 'delete',
      payload: { id },
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
