import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ScheduleCard } from './ScheduleCard';
import { ProfileEditModal } from './ProfileEditModal';
import { AccessScheduleModal } from './AccessScheduleModal';
import { UserManagementModal } from './UserManagementModal';
import { IoTWebSocketModal } from './IoTWebSocketModal';
import { UserSchedule, Profile } from '../types';
import {
  LogOut,
  KeyRound,
  Camera,
  UserCheck,
  UserX,
  Users,
  Shield,
  Clock,
  Sparkles,
  Calendar,
  Activity,
  Plus,
  Lock,
  CheckCircle2,
  Sliders,
  Info,
  Globe,
  Palette,
  Bell,
  Cpu,
  Smartphone,
  ChevronRight,
  ShieldCheck,
  Volume2,
  VolumeX,
  Check,
  SlidersHorizontal,
  UserPlus,
  UserCog,
  Trash2,
  Edit3,
  Search,
  User,
  Radio,
  Wifi,
} from 'lucide-react';
import user_png from './../assets/images/user.png';

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languageOptions: LanguageOption[] = [
  { code: 'en', name: 'English (US)', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'fil', name: 'Filipino', nativeName: 'Tagalog', flag: '🇵🇭' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳' },
];

interface ThemeOption {
  id: string;
  name: string;
  subtitle: string;
  colorBorder: string;
  bgPreview: string;
  accentColor: string;
}

const themeOptions: ThemeOption[] = [
  {
    id: 'cyber-obsidian',
    name: 'Obsidian Cyber (Default)',
    subtitle: 'High-contrast dark with electric cyan & emerald accents',
    colorBorder: 'border-cyan-500/50',
    bgPreview: 'bg-[#090d16]',
    accentColor: '#06b6d4',
  },
  {
    id: 'neon-matrix',
    name: 'Neon Matrix',
    subtitle: 'Vibrant cyberpunk emerald & biometric glow',
    colorBorder: 'border-emerald-500/50',
    bgPreview: 'bg-[#061412]',
    accentColor: '#10b981',
  },
  {
    id: 'titanium-slate',
    name: 'Titanium Slate',
    subtitle: 'Industrial deep charcoal with ice blue highlights',
    colorBorder: 'border-slate-500/50',
    bgPreview: 'bg-[#0f172a]',
    accentColor: '#64748b',
  },
  {
    id: 'pure-oled',
    name: 'Pure OLED Stealth',
    subtitle: 'True pitch black 0% luminescence for power efficiency',
    colorBorder: 'border-cyan-400',
    bgPreview: 'bg-[#000000]',
    accentColor: '#ffffff',
  },
];

export const SettingsScreen: React.FC = () => {
  const {
    currentUser,
    profiles,
    profileRequests,
    userSchedules,
    approveRequest,
    rejectRequest,
    logout,
    deleteSchedule,
    onlineUsers,
    adminCreateUser,
    adminUpdateUser,
    adminDeleteUser,
    wsStatus,
    wsUrl,
    setWsUrl,
    isSimulatorActive,
    setIsSimulatorActive,
  } = useApp();

  const isAdmin = currentUser?.type === 'admin';

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalDefaultTab, setModalDefaultTab] = useState<'password' | 'photo'>('password');
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isWsModalOpen, setIsWsModalOpen] = useState(false);
  const [selectedScheduleToEdit, setSelectedScheduleToEdit] = useState<UserSchedule | null>(null);

  // Admin user directory management modal state
  const [isUserManageModalOpen, setIsUserManageModalOpen] = useState(false);
  const [selectedUserToManage, setSelectedUserToManage] = useState<Profile | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');

  // Settings section tabs or active category filter
  const [activeSection, setActiveSection] = useState<'all' | 'profile' | 'users' | 'access' | 'system'>('all');

  // General Settings Interactive State
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [selectedTheme, setSelectedTheme] = useState<string>('cyber-obsidian');
  const [autoLockDelay, setAutoLockDelay] = useState<string>('30s');
  
  // Notification Toggles
  const [notifyLockState, setNotifyLockState] = useState(true);
  const [notifyEmergencySiren, setNotifyEmergencySiren] = useState(true);
  const [notifyLowBattery, setNotifyLowBattery] = useState(true);
  const [notifyAuditDigest, setNotifyAuditDigest] = useState(false);
  const [soundFeedback, setSoundFeedback] = useState(true);

  // Security Toggles
  const [proximityUnlock, setProximityUnlock] = useState(false);
  const [biometricQuickPass, setBiometricQuickPass] = useState(true);
  const [tamperAlarmSensitivity, setTamperAlarmSensitivity] = useState<'high' | 'medium' | 'off'>('high');

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isUserSelf, setIsUserSelf] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleOpenEdit = (tab: 'password' | 'photo') => {
    setModalDefaultTab(tab);
    setIsEditModalOpen(true);
  };

  const handleOpenAddSchedule = () => {
    setSelectedScheduleToEdit(null);
    setIsAccessModalOpen(true);
  };

  const handleOpenEditSchedule = (sched: UserSchedule) => {
    setSelectedScheduleToEdit(sched);
    setIsAccessModalOpen(true);
  };
  
  return(
    <div id="settings-screen" className="flex flex-col w-full pb-8 space-y-4">
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 pt-3 pb-3 border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white tracking-tight">Accounts and App Settings</h2>
          </div>
          <p className="text-xs text-slate-400">
            {isAdmin
              ? 'User accounts, access schedules and general settings'
              : 'User account, access schedule and general settings'}
          </p>
        </div>

        <button
          id="settings-logout-btn"
          onClick={logout}
          className="bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-red-500/30 transition-all cursor-pointer shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>
      
      <div className="px-4 space-y-4">
        {toastMessage && (
          <div className="p-3 bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in shadow-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="flex bg-[#111827] p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSection === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('profile')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSection === 'profile'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Profiles
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('access')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSection === 'access'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Access
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('system')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSection === 'system'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            System
          </button>
        </div>
        
        {(activeSection === 'all' || activeSection === 'profile') && (
          <div id="section-profile" className="bg-[#111827] rounded-2xl p-4 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Account Settings</h3>
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="relative group">
                  <img
                    src={currentUser?.avatarUrl || user_png}
                    alt="Profile Avatar"
                    className="w-16 h-16 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  />
                  <button
                    id="settings-edit-avatar-quick-btn"
                    onClick={() => handleOpenEdit('photo')}
                    className="absolute bottom-0 right-0 bg-cyan-500 text-slate-950 p-1.5 rounded-full hover:scale-110 transition-transform shadow cursor-pointer"
                    title="Change profile photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white tracking-wide">{currentUser?.username}</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold uppercase border ${
                        isAdmin
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {currentUser?.type}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Registered {currentUser?.joinedDate || 'Jan 2026'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons for Passcode & Avatar */}
            <div className="grid grid-cols-1 gap-1 pt-1">
              <button
                id="settings-edit-password-btn"
                onClick={() => handleOpenEdit('password')}
                className="bg-[#1e293b]/70 hover:bg-[#334155] text-white py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700/60 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                Edit Profile
              </button>
            </div>
          </div>
        )}

        {isAdmin && (activeSection === 'all' || activeSection === 'users') && (
          <div id="section-admin-user-directory" className="bg-[#111827] rounded-2xl p-4 border border-slate-800 shadow-xl space-y-4">
            {/* Header with Title and Create Button */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 p-2 rounded-xl text-cyan-400 border border-cyan-500/30">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Manage User Accounts</h3>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Modify profile details and settings
                  </p>
                </div>
              </div>

              <button
                id="admin-enroll-new-user-btn"
                type="button"
                onClick={() => {
                  setSelectedUserToManage(null);
                  setIsUserManageModalOpen(true);
                }}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer transition-all shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create New User</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-search-users-input"
                  type="text"
                  placeholder="Search user profiles by name or role..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-1 bg-[#0f172a] p-1 rounded-xl border border-slate-800 text-[11px] font-mono shrink-0">
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    userRoleFilter === 'all'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({profiles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('admin')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    userRoleFilter === 'admin'
                      ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Admins ({profiles.filter((p) => p.type === 'admin').length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('user')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    userRoleFilter === 'user'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Users ({profiles.filter((p) => p.type === 'user').length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-2.5 pt-1">
              {profiles
                .filter((p) => {
                  const matchQuery =
                    p.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                    (p.permission && p.permission.toLowerCase().includes(userSearchQuery.toLowerCase()));
                  const matchRole = userRoleFilter === 'all' || p.type === userRoleFilter;
                  return matchQuery && matchRole;
                })
                .map((profile) => {
                  const isSelf = profile.username === currentUser?.username;
                  const isUserAdmin = profile.type === 'admin';

                  //setIsUserSelf(isSelf ? true : false);

                  return (
                    <div
                      key={profile.username}
                      id={`admin-user-card-${profile.username.replace(/[^a-zA-Z0-9]/g, '')}`}
                      className="bg-[#0f172a] hover:bg-[#131d2e] p-3 rounded-xl border border-slate-800/90 hover:border-cyan-500/40 flex flex-col justify-between gap-3 transition-all group shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={profile.avatarUrl || user_png}
                              alt={profile.username}
                              className="w-10 h-10 rounded-full object-cover border border-slate-700 group-hover:border-cyan-400/80 transition-colors"
                            />
                            {profile.isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0f172a]" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                                {profile.username}
                              </h4>
                              {isSelf && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                  You
                                </span>
                              )}
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase ${
                                  isUserAdmin
                                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {profile.type}
                              </span>
                            </div>
                            
                            <div>
                              <p className="text-[12px] text-slate-500 font-mono">
                                Registered {profile.joinedDate || '2026'}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[12px]">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              <span>
                                {profile.type === 'admin' || (profile.time && profile.time[0] === 0 && profile.time[1] >= 1440)
                                  ? '24/7 Clearance'
                                  : profile.time
                                  ? `${Math.floor(profile.time[0] / 60)}:00 - ${Math.floor(profile.time[1] / 60)}:00`
                                  : 'Standard'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>


                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[12px]">
                        <button
                          id={`admin-edit-user-btn-${profile.username}`}
                          type="button"
                          onClick={() => {
                            setSelectedUserToManage(profile);
                            setIsUserManageModalOpen(true);
                          }}
                          className="bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 hover:text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border border-cyan-500/30 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3 text-cyan-400" />
                          <span>Modify</span>
                        </button>

                        {!isSelf && (
                          <button
                            id={`admin-delete-user-btn-${profile.username}`}
                            type="button"
                            onClick={() => {
                              setSelectedUserToManage(profile);
                              setIsUserManageModalOpen(true);
                            }}
                            className="bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-white p-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-red-500/20"
                            title={`Delete profile for ${profile.username}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {(activeSection === 'all' || activeSection === 'access') && (
          <div id="section-access-schedules" className="bg-[#111827] rounded-2xl p-4 border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAdmin ? 'Access Schedules' : 'My Access Schedule'}
                  </h3>
                  <p className="text-[12px] text-slate-400">
                    {isAdmin
                      ? 'Configure lock/unlock schedules for users'
                      : 'When you can lock/unlock the SmartLock'}
                  </p>
                </div>
              </div>

              {isAdmin && (
                <button
                  id="settings-add-schedule-btn"
                  onClick={handleOpenAddSchedule}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.25)] cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Schedule</span>
                </button>
              )}
            </div>

            {/* Informational banner for normal user */}
            {!isAdmin && (
              <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-white block">Read-Only</span>
                  Schedule access are managed exclusively by System Administrators. Regular users cannot alter schedule times.
                </div>
              </div>
            )}

            {/* Schedule Cards List */}
            <div className="space-y-2.5">
              {userSchedules.map((sched) => (
                <ScheduleCard
                  key={sched.id}
                  label={sched.label}
                  role={sched.role}
                  time={sched.time}
                  color={sched.color}
                  days={sched.days}
                  status={sched.status}
                  isAdminViewer={isAdmin}
                  onEdit={isAdmin ? () => handleOpenEditSchedule(sched) : undefined}
                  onDelete={isAdmin ? () => deleteSchedule(sched.id) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* SECTION 3: ADMIN PENDING USER REGISTRATIONS & ACTIVE NETWORK */}
        {isAdmin && (activeSection === 'all' || activeSection === 'profile') && (
          <div id="section-registration-queue" className="bg-[#111827] rounded-2xl p-4 border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Pending Registration Approvals</h3>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                  profileRequests.length > 0
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {profileRequests.length} PENDING
              </span>
            </div>

            {profileRequests.length === 0 ? (
              <p className="text-xs text-slate-400 py-2 text-center">
                No new account registration awaiting approval.
              </p>
            ) : (
              <div className="space-y-2.5">
                {profileRequests.map((req) => (
                  <div
                    key={req.username}
                    className="bg-[#0f172a] p-3 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-white">{req.username}</h4>
                      <p className="text-[11px] font-mono text-slate-400">
                        Requested at: {req.requestedAt || 'Recently'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id={`settings-approve-btn-${req.username}`}
                        onClick={() => {
                          approveRequest(req.username);
                          showToast(`Approved account for ${req.username}`);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        id={`settings-reject-btn-${req.username}`}
                        onClick={() => {
                          rejectRequest(req.username);
                          showToast(`Rejected request from ${req.username}`);
                        }}
                        className="bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVE NETWORK STATUS (Online Users) */}
        {(activeSection === 'all' || activeSection === 'profile') && (
          <div id="section-online-network" className="bg-[#111827] rounded-2xl p-4 border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-400 border border-emerald-500/20">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Active Users</h3>
                  <p className="text-[11px] text-slate-400">
                    {onlineUsers.length} user{onlineUsers.length === 1 ? '' : 's'} active
                  </p>
                </div>
              </div>

              <span className="bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {onlineUsers.length} ONLINE
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {profiles.map((p) => {
                const isSelf = p.username === currentUser?.username;
                const isOnline = p.isOnline || isSelf;

                return (
                  <div
                    key={p.username}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs transition-all ${
                      isOnline
                        ? 'bg-[#1e293b]/80 border-emerald-500/30 text-white'
                        : 'bg-[#0f172a]/60 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={p.avatarUrl || user_png}
                        alt={p.username}
                        className="w-7 h-7 rounded-full object-cover border border-slate-600"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0f172a] ${
                          isOnline ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-slate-500'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-bold text-xs leading-none">
                        {p.username} {isSelf ? '(You)' : ''}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {isOnline ? 'Online now' : p.lastActive || 'Offline'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(activeSection === 'all' || activeSection === 'system') && (
          <div id="section-language" className="bg-[#111827] rounded-2xl p-4 border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">App Language Settings</h3>
                  <p className="text-[10px] text-slate-400">Select language for the app to use</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {languageOptions.find((l) => l.code === selectedLanguage)?.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {languageOptions.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    id={`lang-btn-${lang.code}`}
                    onClick={() => {
                      setSelectedLanguage(lang.code);
                      showToast(`Language switched to ${lang.name}`);
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/60 text-white shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-[#0f172a] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{lang.flag}</span>
                      <div>
                        <p className="text-xs font-bold">{lang.nativeName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{lang.name}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(activeSection === 'all' || activeSection === 'system') && (
          <div id="section-theme" className="bg-[#111827] rounded-2xl p-4 border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Display Theme & Palette</h3>
                  <p className="text-[10px] text-slate-400">Cyber security UI visual themes & glow accents</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {themeOptions.map((thm) => {
                const isSelected = selectedTheme === thm.id;
                return (
                  <div
                    key={thm.id}
                    id={`theme-card-${thm.id}`}
                    onClick={() => {
                      setSelectedTheme(thm.id);
                      showToast(`Theme applied: ${thm.name}`);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? `bg-[#131d2e] ${thm.colorBorder} shadow-[0_0_15px_rgba(6,182,212,0.2)]`
                        : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 border-slate-700 flex items-center justify-center ${thm.bgPreview}`}
                        style={{ borderColor: thm.accentColor }}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: thm.accentColor }}
                        />
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-white">{thm.name}</h4>
                        <p className="text-[10px] text-slate-400">{thm.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <span className="text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500">Select</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 6: NOTIFICATIONS & TELEMETRY ALERTS */}
        {isAdmin && (activeSection === 'all' || activeSection === 'system') && (
          <div id="section-notifications" className="bg-[#111827] rounded-2xl p-4 border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Notifications & Alert Broadcasts</h3>
                  <p className="text-[10px] text-slate-400">Manage notifications and real-time alert broadcasts</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-1 text-xs">
              <div className="flex items-center justify-between bg-[#0f172a] p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="font-bold text-white block">SmartLock Locking/Unlocking Alerts</span>
                  <span className="text-[10px] text-slate-400">Broadcast immediate message upon lock state toggle</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNotifyLockState(!notifyLockState);
                    showToast(`Lock state alerts ${!notifyLockState ? 'enabled' : 'disabled'}`);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    notifyLockState ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      notifyLockState ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between bg-[#0f172a] p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="font-bold text-white block">Low Battery Warning Notification</span>
                  <span className="text-[10px] text-slate-400">Alert notification when SmartLock battery drops below 20%</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNotifyLowBattery(!notifyLowBattery);
                    showToast(`Battery warnings ${!notifyLowBattery ? 'enabled' : 'disabled'}`);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    notifyLowBattery ? 'bg-red-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      notifyLowBattery ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {isAdmin && (activeSection === 'all' || activeSection === 'system') && (
          <div id="section-hardware" className="bg-[#111827] rounded-2xl p-4 border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">SmartLock Hardware Settings</h3>
                  <p className="text-[10px] text-slate-400">Manage hardware settings for the SmartLock</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-1 text-xs">
              {/* Auto-Lock Delay Selector */}
              <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white block">SmartLock Auto-Lock Delay</span>
                    <span className="text-[10px] text-slate-400">Automatically locks the SmartLock after a set amount of time</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400">{autoLockDelay}</span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {['10s', '30s', '60s', '120s', 'Off'].map((delay) => (
                    <button
                      key={delay}
                      type="button"
                      onClick={() => {
                        setAutoLockDelay(delay);
                        showToast(`Auto-lock delay set to ${delay}`);
                      }}
                      className={`py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        autoLockDelay === delay
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-[#1e293b] text-slate-400 hover:text-white'
                      }`}
                    >
                      {delay}
                    </button>
                  ))}
                </div>
              </div>

              {/* IoT Device WebSocket Telemetry Settings */}
              <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="font-bold text-white block">IoT WebSocket Connection</span>
                      <span className="text-[10px] text-slate-400">Lock progress updates via ESP32 string messages</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                      wsStatus === 'connected'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : wsStatus === 'simulated'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {wsStatus === 'connected' ? 'Connected' : wsStatus === 'simulated' ? 'Simulator' : 'Offline'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <span className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]">
                    {wsUrl}
                  </span>
                  <button
                    id="settings-open-ws-monitor-btn"
                    type="button"
                    onClick={() => setIsWsModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-bold transition cursor-pointer"
                  >
                    Open Monitor &amp; Config &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 8: HARDWARE & OS DIAGNOSTICS */}
        {(activeSection === 'all' || activeSection === 'system') && (
          <div id="section-diagnostics" className="bg-[#090d16] rounded-2xl p-4 border border-slate-800/80 space-y-2 text-[11px] font-mono text-slate-400">
            <div className="flex items-center justify-between text-slate-300 font-bold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                SmartLock Unit Hardware Information
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-slate-500 block">SmartLock App Version:</span>
                <span className="text-white font-bold">Version 1.0.0</span>
              </div>
              <div>
                <span className="text-slate-500 block">SmartLock Hardware Version:</span>
                <span className="text-white font-bold">Version 1.0.0</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Password & Photo Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        defaultTab={modalDefaultTab}
      />

      {/* Admin Access Schedule Modification Modal */}
      {isAdmin && (
        <AccessScheduleModal
          isOpen={isAccessModalOpen}
          onClose={() => setIsAccessModalOpen(false)}
          scheduleToEdit={selectedScheduleToEdit}
        />
      )}

      {isAdmin && (
        <UserManagementModal
          isSelf={isUserSelf}
          isOpen={isUserManageModalOpen}
          onClose={() => {
            setIsUserManageModalOpen(false);
            setSelectedUserToManage(null);
          }}
          userToEdit={selectedUserToManage}
          onSaveUser={(userData, isEditing, origUsername) => {
            if (isEditing && origUsername) {
              const res = adminUpdateUser(origUsername, userData);
              if (res.success) {
                showToast(`Successfully updated ${userData.username}'s profile`);
              }
              return res;
            } else {
              const res = adminCreateUser(userData as any);
              if (res.success) {
                showToast(`Successfully created ${userData.username}'s profile`);
              }
              return res;
            }
          }}
          onDeleteUser={(username) => {
            const res = adminDeleteUser(username);
            if (res.success) {
              showToast(`Deleted user profile for ${username}`);
            }
            return res;
          }}
        />
      )}

      <IoTWebSocketModal
        isOpen={isWsModalOpen}
        onClose={() => setIsWsModalOpen(false)}
      />
    </div>
  );
};
