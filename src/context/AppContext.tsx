import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Profile,
  ProfileRequest,
  HistoryRecord,
  UserSchedule,
  LabNoteSchedule,
  EmergencyAlert,
  TabType,
} from '../types';


interface AppContextType {
  currentUser: Profile | null;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  profiles: Profile[];
  profileRequests: ProfileRequest[];
  locked: boolean;
  changing: boolean;
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
    avatarUrl: '/images/user.png',
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
    avatarUrl: '/images/user.png',
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
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Changing lock animation state (3 seconds duration)
  const [changing, setChanging] = useState<boolean>(false);
  //const [duration, setDuration] = useState<number>(0);

  // History records
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('history_record');
      return saved ? JSON.parse(saved) : defaultHistory;
    } catch {
      return defaultHistory;
    }
  });

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

  const toggleLock = () => {
    if (changing) return;
    setChanging(true);

    let websocket = new WebSocket('ws://192.168.4.1/ws');
    websocket.send("toggle");

    setTimeout(() => {
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

      const previousTime = history.length > 0 ? history[0].endingTime : '12:00 AM';

      const newRecord: HistoryRecord = {
        id: `hist-${Date.now()}`,
        username: currentUser?.username || 'Administrator',
        permission: currentUser?.type === 'admin' ? 'Admin Privilege' : 'Standard User Access',
        userType: currentUser?.type || 'admin',
        locked: !locked,
        startingTime: previousTime,
        endingTime: currentTime,
        date: currentDate,
        timestamp: Date.now(),
        notes: !locked ? 'Door locked securely' : 'Door opened with authorized credential',
      };

      setHistory((prev) => [newRecord, ...prev]);
      setLocked((prev) => !prev);
      setChanging(false);
    }, 23000); // change this shi to be changeable
  };

  const triggerEmergency = (reason: string, notes?: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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

    // Force door to unlocked state in emergency
    setLocked(false);

    // Record emergency log
    const emergencyRecord: HistoryRecord = {
      id: `hist-emg-${Date.now()}`,
      username: currentUser?.username || 'User',
      permission: 'EMERGENCY OVERRIDE',
      userType: currentUser?.type || 'user',
      locked: false,
      startingTime: timeStr,
      endingTime: timeStr,
      date: dateStr,
      timestamp: Date.now(),
      isEmergencyOverride: true,
      emergencyReason: reason,
      notes: `EMERGENCY EVACUATION / UNLOCKED: ${reason}${notes ? ` - ${notes}` : ''}`,
    };

    setHistory((prev) => [emergencyRecord, ...prev]);
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
      avatarUrl: userData.avatarUrl || 'user/images.png',
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
