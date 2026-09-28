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
  UserCheck,
  UserX,
  Users,
  Shield,
  Clock,
  Plus,
  Lock,
  CheckCircle2,
  ShieldCheck,
  UserPlus,
  UserCog,
  Trash2,
  Edit3,
  Search,
  Radio,
  Activity,
  Cpu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import user_png from './../assets/images/user.png';
import { getAvatarByIndex } from '../data/avatarIcons';

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
  } = useApp();

  const isAdmin = currentUser?.type === 'admin';
  const currentUsernameLower = (currentUser?.username || '').toLowerCase();
  const displayedSchedules = isAdmin
    ? userSchedules
    : userSchedules.filter(
        (s) => s.label.toLowerCase() === currentUsernameLower
      );

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalDefaultTab, setModalDefaultTab] = useState<'password' | 'icon' | 'photo'>('password');
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isWsModalOpen, setIsWsModalOpen] = useState(false);
  const [selectedScheduleToEdit, setSelectedScheduleToEdit] = useState<UserSchedule | null>(null);

  // Admin user directory management modal state
  const [isUserManageModalOpen, setIsUserManageModalOpen] = useState(false);
  const [selectedUserToManage, setSelectedUserToManage] = useState<Profile | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');

  // Access schedules search & pagination state
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');
  const [scheduleCurrentPage, setScheduleCurrentPage] = useState(1);
  const schedulePageSize = 4;

  // Settings section tabs
  const [activeSection, setActiveSection] = useState<'all' | 'profile' | 'users' | 'access' | 'system'>('all');

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUserSelf, setIsUserSelf] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleOpenEdit = (tab: 'password' | 'icon' | 'photo') => {
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
  
  return (
    <div id="settings-screen" className="flex flex-col w-full pb-8 space-y-4">
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 pt-3.5 pb-3.5 border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">SmartLock Settings</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            
            {isAdmin
              ? 'User profiles and schedules'
              : 'User profile and schedules'}
          </p>
        </div>

        <button
          id="settings-logout-btn"
          onClick={logout}
          className="bg-red-500/15 hover:bg-red-500/30 text-red-400 hover:text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-red-500/40 transition-all cursor-pointer shadow-sm min-h-[40px]"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      </div>
      
      <div className="px-4 space-y-4">
        {toastMessage && (
          <div className="p-3.5 bg-cyan-500/20 border border-cyan-500/50 text-cyan-200 rounded-2xl text-sm flex items-center gap-2.5 animate-fade-in shadow-lg font-medium">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-cyan-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Filter Navigation Tabs */}
        <div className="flex bg-[#111827] p-1.5 rounded-2xl border border-slate-800 text-xs sm:text-sm font-mono overflow-x-auto no-scrollbar gap-1">
          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer min-h-[38px] shrink-0 text-center ${
              activeSection === 'all'
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('profile')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer min-h-[38px] shrink-0 text-center ${
              activeSection === 'profile'
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Profiles
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('access')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer min-h-[38px] shrink-0 text-center ${
              activeSection === 'access'
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Access
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('system')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer min-h-[38px] shrink-0 text-center ${
              activeSection === 'system'
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            System
          </button>
        </div>
        
        {(activeSection === 'all' || activeSection === 'profile') && (
          <div id="section-profile" className="bg-[#111827] rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Account Profile</h3>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative group shrink-0">
                  <img
                    src={getAvatarByIndex(currentUser?.avatarIndex !== undefined ? currentUser.avatarIndex : currentUser?.avatarUrl)}
                    alt="Profile Avatar"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = user_png;
                    }}
                    className="w-16 h-16 rounded-full object-contain p-1 bg-slate-900 border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-wide truncate">{currentUser?.username}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-mono font-bold uppercase border ${
                        isAdmin
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {currentUser?.type}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-mono text-slate-400 mt-0.5">
                    Registered: {currentUser?.joinedDate || 'Jan 2026'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button for Profile Edit */}
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                id="settings-edit-password-btn"
                onClick={() => handleOpenEdit('password')}
                className="bg-[#1e293b]/80 hover:bg-[#334155] text-white py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-slate-700/60 transition-colors cursor-pointer min-h-[44px]"
              >
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <span>Edit Profile & Password</span>
              </button>
            </div>
          </div>
        )}

        {isAdmin && (activeSection === 'all' || activeSection === 'users') && (
          <div id="section-admin-user-directory" className="bg-[#111827] rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4">
            {/* Header with Title and Create Button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/20 p-2.5 rounded-xl text-cyan-400 border border-cyan-500/30">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">User Accounts</h3>
                  <p className="text-xs text-slate-400">
                    Modify profile credentials and permissions
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
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer transition-all shrink-0 min-h-[40px]"
              >
                <UserPlus className="w-4 h-4" />
                <span>New User</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-search-users-input"
                  type="text"
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 min-h-[42px]"
                />
              </div>

              <div className="flex items-center gap-1 bg-[#0f172a] p-1 rounded-xl border border-slate-800 text-xs font-mono shrink-0">
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer min-h-[34px] ${
                    userRoleFilter === 'all'
                      ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({profiles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('admin')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer min-h-[34px] ${
                    userRoleFilter === 'admin'
                      ? 'bg-red-500/25 text-red-300 font-bold border border-red-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Admins ({profiles.filter((p) => p.type === 'admin').length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('user')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer min-h-[34px] ${
                    userRoleFilter === 'user'
                      ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Users ({profiles.filter((p) => p.type === 'user').length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-1">
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

                  return (
                    <div
                      key={profile.username}
                      id={`admin-user-card-${profile.username.replace(/[^a-zA-Z0-9]/g, '')}`}
                      className="bg-[#0f172a] hover:bg-[#131d2e] p-3.5 sm:p-4 rounded-2xl border border-slate-800/90 hover:border-cyan-500/40 flex flex-col justify-between gap-3 transition-all group shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3.5">
                          <div className="relative shrink-0">
                            <img
                              src={getAvatarByIndex(profile.avatarIndex !== undefined ? profile.avatarIndex : profile.avatarUrl)}
                              alt={profile.username}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = user_png;
                              }}
                              className="w-12 h-12 rounded-full object-contain p-1 bg-slate-900 border border-slate-700 group-hover:border-cyan-400/80 transition-colors"
                            />
                            {profile.isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0f172a]" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                                {profile.username}
                              </h4>
                              {isSelf && (
                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                  You
                                </span>
                              )}
                              <span
                                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                                  isUserAdmin
                                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }`}
                              >
                                {profile.type}
                              </span>
                            </div>
                            
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              Registered {profile.joinedDate || '2026'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-xs sm:text-sm">
                        <button
                          id={`admin-edit-user-btn-${profile.username}`}
                          type="button"
                          onClick={() => {
                            setIsUserSelf(isSelf);
                            setSelectedUserToManage(profile);
                            setIsUserManageModalOpen(true);
                          }}
                          className="bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 border border-cyan-500/40 transition-colors cursor-pointer min-h-[36px]"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Modify User</span>
                        </button>

                        {!isSelf && profile.username.toLowerCase() !== 'administrator' && (
                          <button
                            id={`admin-delete-user-btn-${profile.username}`}
                            type="button"
                            onClick={() => {
                              setIsUserSelf(isSelf);
                              setSelectedUserToManage(profile);
                              setIsUserManageModalOpen(true);
                            }}
                            className="bg-red-500/15 hover:bg-red-500/30 text-red-400 hover:text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-red-500/30 min-h-[36px]"
                            title={`Delete profile for ${profile.username}`}
                          >
                            <Trash2 className="w-4 h-4" />
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
          <div id="section-access-schedules" className="bg-[#111827] rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isAdmin ? 'Access Schedules' : 'My Access Schedule'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAdmin
                      ? 'Configure lock/unlock schedules for users'
                      : 'Authorized time windows for SmartLock operation'}
                  </p>
                </div>
              </div>

              {isAdmin && (
                <button
                  id="settings-add-schedule-btn"
                  onClick={handleOpenAddSchedule}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.25)] cursor-pointer transition-all min-h-[40px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Schedule</span>
                </button>
              )}
            </div>

            {/* Read-Only Notice for Normal Users */}
            {!isAdmin && (
              <div className="bg-[#0f172a] p-3.5 rounded-2xl border border-slate-800 flex items-start gap-3">
                <Lock className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  <span className="font-bold text-white block">Schedule Access Policy</span>
                  Access schedules are authorized and managed by System Administrators.
                </div>
              </div>
            )}

            {/* Search Bar for Access Schedules */}
            {displayedSchedules.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="search-schedules-input"
                    type="text"
                    placeholder={isAdmin ? "Search schedules by name, role, days..." : "Search my schedules..."}
                    value={scheduleSearchQuery}
                    onChange={(e) => {
                      setScheduleSearchQuery(e.target.value);
                      setScheduleCurrentPage(1);
                    }}
                    className="w-full bg-[#0f172a] border border-slate-800 rounded-xl pl-10 pr-14 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 min-h-[42px]"
                  />
                  {scheduleSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleSearchQuery('');
                        setScheduleCurrentPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-white cursor-pointer px-1.5 py-0.5 bg-slate-800 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Schedule Cards List */}
            {(() => {
              const q = scheduleSearchQuery.toLowerCase().trim();
              const filteredSchedules = displayedSchedules.filter((sched) => {
                if (!q) return true;
                const matchLabel = sched.label.toLowerCase().includes(q);
                const matchRole = sched.role.toLowerCase().includes(q);
                const matchTime = (sched.time || '').toLowerCase().includes(q);
                const matchDays = (sched.days || []).some((d) => d.toLowerCase().includes(q));
                return matchLabel || matchRole || matchTime || matchDays;
              });

              const totalPages = Math.ceil(filteredSchedules.length / schedulePageSize) || 1;
              const currentPageSafe = Math.min(Math.max(1, scheduleCurrentPage), totalPages);
              const paginatedSchedules = filteredSchedules.slice(
                (currentPageSafe - 1) * schedulePageSize,
                currentPageSafe * schedulePageSize
              );

              if (displayedSchedules.length === 0) {
                return (
                  <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 text-center space-y-2">
                    <Clock className="w-6 h-6 text-cyan-400 mx-auto" />
                    <p className="text-sm font-bold text-white">No Access Schedule</p>
                    <span className="inline-block text-xs font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 px-3 py-1 rounded-full font-bold">
                      Please Request an Access Schedule in the Requests Section
                    </span>
                  </div>
                );
              }

              if (filteredSchedules.length === 0) {
                return (
                  <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 text-center space-y-2">
                    <Search className="w-6 h-6 text-slate-500 mx-auto" />
                    <p className="text-sm font-bold text-white">No matching schedules found</p>
                    <p className="text-xs text-slate-400">
                      No schedule matches "{scheduleSearchQuery}". Try a different keyword.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1 text-xs font-mono text-slate-400">
                    <span>
                      Showing <strong className="text-white">{paginatedSchedules.length}</strong> of{' '}
                      <strong className="text-white">{filteredSchedules.length}</strong> schedules
                    </span>
                    {totalPages > 1 && (
                      <span className="text-slate-500">
                        Page {currentPageSafe} of {totalPages}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {paginatedSchedules.map((sched) => (
                      <ScheduleCard
                        key={sched.id}
                        label={sched.label}
                        role={sched.role}
                        time={sched.time}
                        days={sched.days}
                        dayConfigs={sched.dayConfigs}
                        status={sched.status}
                        isAdminViewer={isAdmin}
                        onEdit={isAdmin ? () => handleOpenEditSchedule(sched) : undefined}
                        onDelete={isAdmin ? () => deleteSchedule(sched.id) : undefined}
                      />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono text-slate-400">
                      <button
                        type="button"
                        id="schedules-prev-page-btn"
                        onClick={() => setScheduleCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPageSafe <= 1}
                        className="px-3 py-1.5 rounded-xl border border-slate-800 bg-[#0f172a] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-700 hover:text-white cursor-pointer flex items-center gap-1.5 transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setScheduleCurrentPage(pageNum)}
                            className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                              currentPageSafe === pageNum
                                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-sm'
                                : 'bg-[#0f172a] text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        id="schedules-next-page-btn"
                        onClick={() => setScheduleCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPageSafe >= totalPages}
                        className="px-3 py-1.5 rounded-xl border border-slate-800 bg-[#0f172a] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-700 hover:text-white cursor-pointer flex items-center gap-1.5 transition-colors"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ADMIN REGISTRATION QUEUE */}
        {isAdmin && (activeSection === 'all' || activeSection === 'profile') && (
          <div id="section-registration-queue" className="bg-[#111827] rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Registration Approvals</h3>
              </div>
              <span
                className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
                  profileRequests.length > 0
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {profileRequests.length} PENDING
              </span>
            </div>

            {profileRequests.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-400 py-3 text-center">
                No new account registrations awaiting approval.
              </p>
            ) : (
              <div className="space-y-3">
                {profileRequests.map((req) => (
                  <div
                    key={req.username}
                    className="bg-[#0f172a] p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
                  >
                    <div>
                      <h4 className="text-base font-bold text-white">{req.username}</h4>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">
                        Requested: {req.requestedAt || 'Recently'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                      <button
                        id={`settings-approve-btn-${req.username}`}
                        onClick={() => {
                          approveRequest(req.username);
                          showToast(`Approved account for ${req.username}`);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow min-h-[38px]"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        id={`settings-reject-btn-${req.username}`}
                        onClick={() => {
                          rejectRequest(req.username);
                          showToast(`Rejected request from ${req.username}`);
                        }}
                        className="bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-red-500/30 min-h-[38px]"
                      >
                        <UserX className="w-4 h-4" />
                        <span>Reject</span>
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
          <div id="section-online-network" className="bg-[#111827] rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 border border-emerald-500/20">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Active Users</h3>
                  <p className="text-xs text-slate-400">
                    {onlineUsers.length} user{onlineUsers.length === 1 ? '' : 's'} active
                  </p>
                </div>
              </div>

              <span className="bg-emerald-500/15 text-emerald-300 text-xs font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {onlineUsers.length} ONLINE
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              {profiles.map((p) => {
                const isSelf = p.username === currentUser?.username;
                const isOnline = p.isOnline || isSelf;

                return (
                  <div
                    key={p.username}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-xs sm:text-sm transition-all ${
                      isOnline
                        ? 'bg-[#1e293b]/80 border-emerald-500/40 text-white'
                        : 'bg-[#0f172a]/60 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={getAvatarByIndex(p.avatarIndex !== undefined ? p.avatarIndex : p.avatarUrl)}
                        alt={p.username}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = user_png;
                        }}
                        className="w-8 h-8 rounded-full object-contain p-0.5 bg-slate-900 border border-slate-600"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f172a] ${
                          isOnline ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-slate-500'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm leading-tight">
                        {p.username} {isSelf ? '(You)' : ''}
                      </p>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        {isOnline ? 'Online now' : p.lastActive || 'Offline'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isAdmin && (activeSection === 'all' || activeSection === 'system') && (
          <div id="section-hardware" className="bg-[#111827] rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white">SmartLock Hardware</h3>
                  <p className="text-xs text-slate-400">IoT controller communication configuration</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-1 text-xs sm:text-sm">
              <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2.5">
                    <Radio className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white block text-sm sm:text-base">WebSocket IoT Connection</span>
                      <span className="text-xs text-slate-400">Lock progress updates via ESP8266 string protocols</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono px-3 py-1 rounded-full font-bold uppercase shrink-0 ${
                      wsStatus === 'connected'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : wsStatus === 'simulated'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {wsStatus === 'connected' ? 'Connected' : wsStatus === 'simulated' ? 'Simulator' : 'Offline'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80 flex-wrap sm:flex-nowrap">
                  <span className="text-xs font-mono text-slate-400 truncate max-w-full">
                    {wsUrl}
                  </span>
                  <button
                    id="settings-open-ws-monitor-btn"
                    type="button"
                    onClick={() => setIsWsModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm font-mono font-bold transition cursor-pointer min-h-[38px] shrink-0"
                  >
                    Open Monitor &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {(activeSection === 'all' || activeSection === 'system') && (
          <div id="section-diagnostics" className="bg-[#090d16] rounded-3xl p-4 sm:p-5 border border-slate-800/80 space-y-3 text-xs sm:text-sm font-mono text-slate-300">
            <div className="flex items-center justify-between text-slate-200 font-bold">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>Unit Diagnostics &amp; Specifications</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-slate-500 block text-xs">Application Version:</span>
                <span className="text-white font-bold text-xs sm:text-sm">v1.0.0 (Production)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Hardware Model:</span>
                <span className="text-white font-bold text-xs sm:text-sm">ESP8266 NodeMCU</span>
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
