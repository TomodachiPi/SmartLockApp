import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Profile,
  ProfileRequest,
  HistoryRecord,
  UserSchedule,
  LabNoteSchedule,
  EmergencyAlert,
  TabType,
} from '../types';
import user_png from './../assets/images/user.png';

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
  }
];

const defaultSchedules: UserSchedule[] = [
  {
    id: '1',
    label: 'Administrator',
    role: 'admin',
    time: 'Any time, Monday to Sunday',
    color: '#ff6b6b',
  },
  {
    id: '2',
    label: 'User123test',
    role: 'user',
    time: '10:00 AM to 1:00 PM, Tuesday',
    color: '#4ecdc4',
  },
  {
    id: '3',
    label: 'Research Interns',
    role: 'user',
    time: '9:00 AM to 5:00 PM, Mon-Fri',
    color: '#ffd166',
  },
];

const defaultLabNotes: LabNoteSchedule[] = [];

const defaultHistory: HistoryRecord[] = [
  {
    id: 'hist-1',
    username: 'Administrator',
    permission: 'Admin Privilege',
    userType: 'admin',
    locked: false,
    startingTime: '8:00 AM',
    endingTime: '8:45 AM',
    date: 'Aug 29, 2026',
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
    notes: 'Morning routine lab check',
  },
  {
    id: 'hist-2',
    username: 'Administrator',
    permission: 'Admin Privilege',
    userType: 'admin',
    locked: true,
    startingTime: '8:45 AM',
    endingTime: '9:00 AM',
    date: 'Aug 29, 2026',
    timestamp: Date.now() - 1000 * 60 * 60 * 1.5,
    notes: 'Door secured after inspection',
  },
  {
    id: 'hist-3',
    username: 'User123test',
    permission: 'Standard User Access',
    userType: 'user',
    locked: false,
    startingTime: '10:05 AM',
    endingTime: '11:50 AM',
    date: 'Aug 29, 2026',
    timestamp: Date.now() - 1000 * 60 * 60 * 1,
    notes: 'Optics test session',
  },
  {
    id: 'hist-4',
    username: 'User123test',
    permission: 'Standard User Access',
    userType: 'user',
    locked: true,
    startingTime: '11:50 AM',
    endingTime: '12:00 PM',
    date: 'Aug 29, 2026',
    timestamp: Date.now() - 1000 * 60 * 45,
    notes: 'Locked upon departure',
  },
  {
    id: 'hist-5',
    username: 'Administrator',
    permission: 'Admin Privilege',
    userType: 'admin',
    locked: false,
    startingTime: '6:12 PM',
    endingTime: '8:47 PM',
    date: 'Aug 26, 2026',
    timestamp: Date.now() - 1000 * 60 * 60 * 72,
    notes: 'Evening equipment servicing',
  },
  {
    id: 'hist-6',
    username: 'Administrator',
    permission: 'Admin Privilege',
    userType: 'admin',
    locked: true,
    startingTime: '8:47 PM',
    endingTime: '8:55 PM',
    date: 'Aug 26, 2026',
    timestamp: Date.now() - 1000 * 60 * 60 * 71,
    notes: 'Final night lockdown',
  },
];

const defaultEmergencyAlerts: EmergencyAlert[] = [];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Profiles
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    try {
      const saved = localStorage.getItem('user_data');
      return saved ? JSON.parse(saved) : defaultProfiles;
    } catch {
      return defaultProfiles;
    }
  });

  // Current session user
  const [currentUser, setCurrentUser] = useState<Profile | null>(() => {
    try {
      const saved = localStorage.getItem('current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabType>('lock');

  // Lock status
  const [locked, setLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('locked');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return true;
    }
  });

  // Changing lock animation state
  const [changing, setChanging] = useState<boolean>(false);
  const [isEmergencyOverrideInProgress, setIsEmergencyOverrideInProgress] = useState<boolean>(false);
  const isEmergencyOverrideInProgressRef = useRef<boolean>(false);
  const emergencyDetailsRef = useRef<{ reason: string; notes?: string } | null>(null);
  
  // Real-time lock progress (0 - 100) driven by IoT WebSocket data
  const [lockProgress, setLockProgress] = useState<number>(0);
  // Remaining lock time received from the IoT device (e.g. 23, 20, 15, 0)
  const [remainingLockTime, setRemainingLockTime] = useState<number | null>(null);
  // Initial lock duration captured from the first string number received
  const [initialLockTime, setInitialLockTime] = useState<number | null>(null);

  // IoT WebSocket connection states
  const [wsUrl, setWsUrlState] = useState<string>(() => {
    return localStorage.getItem('smartlock_ws_url') || 'ws://192.168.4.1/ws';
  });
  const [isSimulatorActive, setIsSimulatorActiveState] = useState<boolean>(() => {
    const saved = localStorage.getItem('smartlock_simulator_active');
    return saved !== null ? saved === 'true' : false;
  });
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'simulated' | 'error'>(() => {
    const saved = localStorage.getItem('smartlock_simulator_active');
    return saved !== null ? (saved === 'true' ? 'simulated' : 'disconnected') : 'simulated';
  });
  const [wsLogs, setWsLogs] = useState<Array<{ id: string; timestamp: string; type: 'send' | 'receive' | 'system'; text: string }>>([
    {
      id: 'log-init',
      timestamp: new Date().toLocaleTimeString(),
      type: 'system',
      text: 'SmartLock IoT Simulator active (ready for live testing or custom WebSocket target)',
    },
  ]);

  const wsRef = useRef<WebSocket | null>(null);
  const initialLockTimeRef = useRef<number | null>(null);
  const simTimerRef = useRef<any>(null);
  const watchdogTimerRef = useRef<any>(null);
  const lockedRef = useRef(locked);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // History records
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('history_record');
      return saved ? JSON.parse(saved) : defaultHistory;
    } catch {
      return defaultHistory;
    }
  });

  const historyRef = useRef(history);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // Profile requests (pending user sign in requests)
  const [profileRequests, setProfileRequests] = useState<ProfileRequest[]>(() => {
    try {
      const saved = localStorage.getItem('profile_requests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // User schedules
  const [userSchedules, setUserSchedules] = useState<UserSchedule[]>(() => {
    try {
      const saved = localStorage.getItem('user_schedules');
      return saved ? JSON.parse(saved) : defaultSchedules;
    } catch {
      return defaultSchedules;
    }
  });

  // Lab note reservations
  const [labNotes, setLabNotes] = useState<LabNoteSchedule[]>(() => {
    try {
      const saved = localStorage.getItem('lab_notes');
      return saved ? JSON.parse(saved) : defaultLabNotes;
    } catch {
      return defaultLabNotes;
    }
  });

  // Emergency Alerts
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>(() => {
    try {
      const saved = localStorage.getItem('emergency_alerts');
      return saved ? JSON.parse(saved) : defaultEmergencyAlerts;
    } catch {
      return defaultEmergencyAlerts;
    }
  });

  // Welcome message banner state
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  // Registration banner notice
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('user_data', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('locked', String(locked));
  }, [locked]);

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
    localStorage.setItem('lab_notes', JSON.stringify(labNotes));
  }, [labNotes]);

  useEffect(() => {
    localStorage.setItem('emergency_alerts', JSON.stringify(emergencyAlerts));
  }, [emergencyAlerts]);

  const login = (username: string, password: string): { success: boolean; error?: 'user_not_found' | 'incorrect_password' } => {
    const found = profiles.find((p) => p.username.toLowerCase() === username.trim().toLowerCase());
    if (!found) {
      return { success: false, error: 'user_not_found' };
    }
    if (found.password !== password) {
      return { success: false, error: 'incorrect_password' };
    }

    const updatedUser = {
      ...found,
      isOnline: true,
      lastActive: 'Active now',
    };

    // Update in profiles
    setProfiles((prev) =>
      prev.map((p) => (p.username === found.username ? updatedUser : p))
    );
    setCurrentUser(updatedUser);
    setActiveTab('lock');

    // Add requested welcome message banner
    const rolePrefix = updatedUser.type === 'admin' ? 'Administrator' : 'User';
    setWelcomeMessage(`Welcome, ${updatedUser.username}! — The SmartLock Unit is ready.`);

    return { success: true };
  };

  const registerRequest = (username: string, password: string): { success: boolean; error?: 'username_taken' } => {
    const trimmed = username.trim();
    const existing = profiles.find((p) => p.username.toLowerCase() === trimmed.toLowerCase());
    const existingReq = profileRequests.find((p) => p.username.toLowerCase() === trimmed.toLowerCase());
    if (existing || existingReq) {
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
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.username)}`,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isOnline: false,
      lastActive: 'Registered recently',
    };

    setProfiles((prev) => [...prev, newProfile]);
    setProfileRequests((prev) => prev.filter((r) => r.username !== username));

    // Add to user schedules
    setUserSchedules((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        label: req.username,
        role: req.type,
        time: '10:00 AM to 5:00 PM, Weekdays',
        color: '#4ecdc4',
      },
    ]);
  };

  const rejectRequest = (username: string) => {
    setProfileRequests((prev) => prev.filter((r) => r.username !== username));
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
      addWsLog('system', 'IoT Hardware Simulator activated (countdown string numbers enabled)');
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
    } else {
      addWsLog('system', 'IoT Simulator deactivated. Connecting to hardware at ' + wsUrl);
      connectWebSocket();
    }
  };

  const addWsLog = (type: 'send' | 'receive' | 'system', text: string) => {
    const entry = {
      id: `ws-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      text,
    };
    setWsLogs((prev) => [entry, ...prev.slice(0, 49)]);
  };

  const clearWsLogs = () => {
    setWsLogs([]);
  };

  const finishLockTransition = () => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    let currentTime = '';
    if (hours < 12) {
      currentTime = `${hours === 0 ? 12 : hours}:${String(minutes).padStart(2, '0')} AM`;
    } else if (hours === 12) {
      currentTime = `12:${String(minutes).padStart(2, '0')} PM`;
    } else {
      currentTime = `${hours - 12}:${String(minutes).padStart(2, '0')} PM`;
    }

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const currentDate = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    const previousTime = historyRef.current.length > 0 ? historyRef.current[0].endingTime : '12:00 AM';

    const isEmergency = isEmergencyOverrideInProgressRef.current;
    const emergencyDetails = emergencyDetailsRef.current;

    const willBeLocked = isEmergency ? false : !lockedRef.current;

    const newRecord: HistoryRecord = isEmergency ? {
      id: `hist-emg-${Date.now()}`,
      username: currentUserRef.current?.username || 'User',
      permission: 'EMERGENCY OVERRIDE',
      userType: currentUserRef.current?.type || 'user',
      locked: false,
      startingTime: previousTime,
      endingTime: currentTime,
      date: currentDate,
      timestamp: Date.now(),
      isEmergencyOverride: true,
      emergencyReason: emergencyDetails?.reason || 'Emergency Evacuation',
      notes: `EMERGENCY OVERRIDE / UNLOCKED: ${emergencyDetails?.reason || 'Emergency Evacuation'}${emergencyDetails?.notes ? ` - ${emergencyDetails.notes}` : ''}`,
    } : {
      id: `hist-${Date.now()}`,
      username: currentUserRef.current?.username || 'Administrator',
      permission: currentUserRef.current?.type === 'admin' ? 'Admin Privilege' : 'Standard User Access',
      userType: currentUserRef.current?.type || 'admin',
      locked: willBeLocked,
      startingTime: previousTime,
      endingTime: currentTime,
      date: currentDate,
      timestamp: Date.now(),
      notes: willBeLocked ? 'Door locked securely via IoT WebSocket' : 'Door opened with authorized credential via IoT WebSocket',
    };

    setHistory((prev) => [newRecord, ...prev]);
    setLocked(willBeLocked);
    lockedRef.current = willBeLocked;
    try {
      localStorage.setItem('locked', String(willBeLocked));
    } catch {}
    setChanging(false);
    setIsEmergencyOverrideInProgress(false);
    isEmergencyOverrideInProgressRef.current = false;
    emergencyDetailsRef.current = null;
    setLockProgress(100);
    setTimeout(() => {
      setLockProgress(0);
      setRemainingLockTime(null);
      initialLockTimeRef.current = null;
    }, 400);

    addWsLog('system', isEmergency
      ? 'EMERGENCY OVERRIDE COMPLETE: SmartLock door unlatched and unlocked safely.'
      : `Lock transition complete: Unit is now ${willBeLocked ? 'LOCKED' : 'UNLOCKED'}`);
  };

  const handleIncomingWsMessage = (data: any) => {
    const str = String(data).trim();
    addWsLog('receive', `Received string: "${str}"`);

    // Parse the string number representing remaining lock time
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
        finishLockTransition();
      } else {
        // Compute progress based on elapsed ratio: ((total - remaining) / total) * 100
        const computed = total > 0 ? Math.min(99, Math.max(1, Math.round(((total - num) / total) * 100))) : 50;
        setLockProgress(computed);
        setRemainingLockTime(num);
      }
    } else {
      // Handle semantic status responses
      const lower = str.toLowerCase();
      if (lower === 'done' || lower === 'complete' || lower === 'locked' || lower === 'unlocked' || lower === 'ok') {
        finishLockTransition();
      }
    }
  };

  const connectWebSocket = () => {
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
    addWsLog('system', `Connecting to IoT WebSocket at ${wsUrl}...`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        addWsLog('system', `WebSocket connection established to ${wsUrl}`);
      };

      ws.onmessage = (event) => {
        handleIncomingWsMessage(event.data);
      };

      ws.onerror = (err) => {
        console.warn('[SmartLock] WebSocket error on', wsUrl, err);
        setWsStatus('error');
        addWsLog('system', `WebSocket error on ${wsUrl} (device offline or network unreachable)`);
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        addWsLog('system', `WebSocket closed at ${wsUrl}`);
      };
    } catch (err: any) {
      console.warn('[SmartLock] Failed to create WebSocket:', err);
      setWsStatus('disconnected');
      addWsLog('system', `Failed to open socket: ${err.message || 'Unknown error'}`);
    }
  };

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
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
      }
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
      }
    };
  }, [wsUrl, isSimulatorActive]);

  const reconnectWebSocket = () => {
    addWsLog('system', 'Manually reconnecting WebSocket...');
    connectWebSocket();
  };

  const sendCustomWsMessage = (message: string) => {
    addWsLog('send', `Sent custom: "${message}"`);
    if (isSimulatorActive) {
      if (message.trim().toLowerCase() === 'toggle') {
        toggleLock();
      }
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    } else {
      addWsLog('system', `Cannot send: WebSocket is not connected (${wsStatus})`);
    }
  };

  const toggleLock = () => {
    if (changing) return;
    setChanging(true);
    setLockProgress(0);
    setRemainingLockTime(null);
    initialLockTimeRef.current = null;

    addWsLog('send', 'Sent command: "toggle"');

    // If Simulator is active, simulate IoT device string countdown responses:
    if (isSimulatorActive) {
      let simSeconds = 20; // 5-second realistic IoT countdown
      initialLockTimeRef.current = simSeconds;
      setInitialLockTime(simSeconds);
      handleIncomingWsMessage(String(simSeconds));

      simTimerRef.current = setInterval(() => {
        simSeconds -= 1;
        handleIncomingWsMessage(String(simSeconds));
        if (simSeconds <= 0) {
          if (simTimerRef.current) {
            clearInterval(simTimerRef.current);
            simTimerRef.current = null;
          }
        }
      }, 1000);
      return;
    }

    // Real IoT WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send('toggle');
        addWsLog('system', `Command "toggle" sent to IoT device at ${wsUrl}`);
      } catch (err: any) {
        addWsLog('system', `Error sending "toggle": ${err.message}`);
      }
    } else {
      // Connect on the fly if not open
      addWsLog('system', `WebSocket not open, attempting connection to ${wsUrl}...`);
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        setWsStatus('connecting');

        ws.onopen = () => {
          setWsStatus('connected');
          addWsLog('system', `Connected! Sending command "toggle"...`);
          ws.send('toggle');
          addWsLog('send', 'Sent command: "toggle"');
        };

        ws.onmessage = (event) => {
          handleIncomingWsMessage(event.data);
        };

        ws.onerror = () => {
          setWsStatus('error');
          addWsLog('system', `Connection to ${wsUrl} unreachable. Running simulated lock transition.`);
          let fallbackSeconds = 4;
          initialLockTimeRef.current = fallbackSeconds;
          setInitialLockTime(fallbackSeconds);
          handleIncomingWsMessage(String(fallbackSeconds));
          simTimerRef.current = setInterval(() => {
            fallbackSeconds -= 1;
            handleIncomingWsMessage(String(fallbackSeconds));
            if (fallbackSeconds <= 0) {
              if (simTimerRef.current) {
                clearInterval(simTimerRef.current);
                simTimerRef.current = null;
              }
            }
          }, 1000);
        };

        ws.onclose = () => {
          setWsStatus('disconnected');
          addWsLog('system', 'Connection closed.');
        };
      } catch (e: any) {
        addWsLog('system', `Failed to open socket: ${e.message}`);
      }
    }

    // Safety watchdog: abort/reconcile after 60 seconds if hardware never responds with 0
    watchdogTimerRef.current = setTimeout(() => {
      addWsLog('system', 'Watchdog timeout: IoT device did not send completion signal in 60s. Finalizing lock.');
      finishLockTransition();
    }, 60000);
  };

  const triggerEmergency = (reason: string, notes?: string) => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    // Set emergency state and initialize real-time progress sequence
    emergencyDetailsRef.current = { reason, notes };
    isEmergencyOverrideInProgressRef.current = true;
    setIsEmergencyOverrideInProgress(true);
    setChanging(true);
    setLockProgress(0);
    setRemainingLockTime(null);
    initialLockTimeRef.current = null;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Immediate alert broadcast to administrators
    const newAlert: EmergencyAlert = {
      id: `alert-${Date.now()}`,
      username: currentUser?.username || 'Unknown User',
      userRole: currentUser?.type || 'user',
      timestamp: `${timeStr}, ${dateStr}`,
      timestampMs: Date.now(),
      reason,
      notes,
      resolved: false,
    };
    setEmergencyAlerts((prev) => [newAlert, ...prev]);

    addWsLog('send', 'Sent command: "toggle" (Emergency Override - Opening SmartLock)');

    // Safety watchdog: ensure unlock finalization within 25s if IoT hardware fails to reach 0
    watchdogTimerRef.current = setTimeout(() => {
      addWsLog('system', 'Emergency watchdog: Finalizing unlock transition after timeout.');
      finishLockTransition();
    }, 60000);

    // If Simulator is active, simulate IoT device string countdown responses:
    if (isSimulatorActive) {
      let simSeconds = 20;
      initialLockTimeRef.current = simSeconds;
      setInitialLockTime(simSeconds);
      handleIncomingWsMessage(String(simSeconds));

      simTimerRef.current = setInterval(() => {
        simSeconds -= 1;
        handleIncomingWsMessage(String(simSeconds));
        if (simSeconds <= 0) {
          if (simTimerRef.current) {
            clearInterval(simTimerRef.current);
            simTimerRef.current = null;
          }
        }
      }, 1000);
      return;
    }

    // Real IoT WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send('toggle');
        addWsLog('system', `Emergency override "toggle" command dispatched to IoT hardware at ${wsUrl}`);
      } catch (err: any) {
        addWsLog('system', `Error sending emergency "toggle": ${err.message}`);
      }
    } else {
      // Connect on the fly if not open and dispatch 'toggle'
      addWsLog('system', `WebSocket not open, attempting connection to ${wsUrl} to dispatch emergency "toggle"...`);
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        setWsStatus('connecting');

        ws.onopen = () => {
          setWsStatus('connected');
          addWsLog('system', `Connected! Sending emergency command "toggle"...`);
          ws.send('toggle');
          addWsLog('send', 'Sent command: "toggle" (Emergency Override)');
        };

        ws.onmessage = (event) => {
          handleIncomingWsMessage(event.data);
        };

        ws.onerror = () => {
          setWsStatus('error');
          addWsLog('system', `Connection to ${wsUrl} unreachable. Running emergency fallback countdown.`);
          let fallbackSeconds = 4;
          initialLockTimeRef.current = fallbackSeconds;
          setInitialLockTime(fallbackSeconds);
          handleIncomingWsMessage(String(fallbackSeconds));
          simTimerRef.current = setInterval(() => {
            fallbackSeconds -= 1;
            handleIncomingWsMessage(String(fallbackSeconds));
            if (fallbackSeconds <= 0) {
              if (simTimerRef.current) {
                clearInterval(simTimerRef.current);
                simTimerRef.current = null;
              }
            }
          }, 1000);
        };

        ws.onclose = () => {
          setWsStatus('disconnected');
          addWsLog('system', 'Connection closed.');
        };
      } catch (e: any) {
        addWsLog('system', `Failed to open socket: ${e.message}`);
        let fallbackSeconds = 4;
        initialLockTimeRef.current = fallbackSeconds;
        setInitialLockTime(fallbackSeconds);
        handleIncomingWsMessage(String(fallbackSeconds));
        simTimerRef.current = setInterval(() => {
          fallbackSeconds -= 1;
          handleIncomingWsMessage(String(fallbackSeconds));
          if (fallbackSeconds <= 0) {
            if (simTimerRef.current) {
              clearInterval(simTimerRef.current);
              simTimerRef.current = null;
            }
          }
        }, 1000);
      }
    }
  };

  const resolveEmergency = (id: string) => {
    setEmergencyAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              resolved: true,
              resolvedAt: new Date().toLocaleTimeString(),
              resolvedBy: currentUser?.username || 'Administrator',
            }
          : a
      )
    );
  };

  const updatePassword = (oldPass: string, newPass: string): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    if (currentUser.password !== oldPass) {
      return { success: false, error: 'Current password does not match' };
    }
    if (newPass.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long' };
    }

    const updatedUser = { ...currentUser, password: newPass };
    setCurrentUser(updatedUser);
    setProfiles((prev) =>
      prev.map((p) => (p.username === currentUser.username ? updatedUser : p))
    );
    return { success: true };
  };

  const updateAvatar = (avatarUrl: string) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, avatarUrl };
    setCurrentUser(updatedUser);
    setProfiles((prev) =>
      prev.map((p) => (p.username === currentUser.username ? updatedUser : p))
    );
  };

  const adminCreateUser = (userData: Omit<Profile, 'joinedDate'>): { success: boolean; error?: string } => {
    if (currentUser?.type !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin privileges required.' };
    }
    const cleanUsername = userData.username.trim();
    if (!cleanUsername) {
      return { success: false, error: 'Username is required.' };
    }
    if (profiles.some((p) => p.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return { success: false, error: `Username "${cleanUsername}" already exists.` };
    }
    if (!userData.password || userData.password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
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
    return { success: true };
  };

  const adminUpdateUser = (originalUsername: string, updatedData: Partial<Profile>): { success: boolean; error?: string } => {
    if (currentUser?.type !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin privileges required.' };
    }

    const targetUser = profiles.find((p) => p.username === originalUsername);
    if (!targetUser) {
      return { success: false, error: 'User profile not found.' };
    }

    // Check if new username collides with another user
    if (
      updatedData.username &&
      updatedData.username.toLowerCase() !== originalUsername.toLowerCase() &&
      profiles.some((p) => p.username.toLowerCase() === updatedData.username!.toLowerCase())
    ) {
      return { success: false, error: `Username "${updatedData.username}" is already taken.` };
    }

    const updatedProfile: Profile = {
      ...targetUser,
      ...updatedData,
      username: updatedData.username ? updatedData.username.trim() : targetUser.username,
    };

    setProfiles((prev) =>
      prev.map((p) => (p.username === originalUsername ? updatedProfile : p))
    );

    // If admin is editing their own active profile, update currentUser too
    if (currentUser.username === originalUsername) {
      setCurrentUser(updatedProfile);
    }

    return { success: true };
  };

  const adminDeleteUser = (username: string): { success: boolean; error?: string } => {
    if (currentUser?.type !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin privileges required.' };
    }
    if (currentUser.username === username) {
      return { success: false, error: 'Cannot delete your own active administrator account.' };
    }

    const exists = profiles.some((p) => p.username === username);
    if (!exists) {
      return { success: false, error: 'User profile does not exist.' };
    }

    setProfiles((prev) => prev.filter((p) => p.username !== username));
    return { success: true };
  };

  const addLabNote = (note: Omit<LabNoteSchedule, 'id' | 'createdDate' | 'status'>) => {
    const newNote: LabNoteSchedule = {
      ...note,
      id: `note-${Date.now()}`,
      createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'confirmed',
    };
    setLabNotes((prev) => [newNote, ...prev]);
  };

  const updateLabNote = (updatedNote: LabNoteSchedule) => {
    setLabNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
  };

  const deleteLabNote = (id: string) => {
    setLabNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const deleteHistory = () => {
    setHistory([]);
  };

  const logout = () => {
    if (currentUser) {
      setProfiles((prev) =>
        prev.map((p) => (p.username === currentUser.username ? { ...p, isOnline: false, lastActive: 'Logged out' } : p))
      );
    }
    setCurrentUser(null);
    setActiveTab('lock');
    setWelcomeMessage(null);
  };

  const addSchedule = (sched: Omit<UserSchedule, 'id'>) => {
    setUserSchedules((prev) => [...prev, { ...sched, id: Date.now().toString() }]);
  };

  const updateSchedule = (sched: UserSchedule) => {
    setUserSchedules((prev) => prev.map((s) => (s.id === sched.id ? sched : s)));
  };

  const deleteSchedule = (id: string) => {
    setUserSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const dismissWelcomeMessage = () => {
    setWelcomeMessage(null);
  };

  const dismissRegistrationNotice = () => {
    setRegistrationNotice(null);
  };

  // Online active users
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
