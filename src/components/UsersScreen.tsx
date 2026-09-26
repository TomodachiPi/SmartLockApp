import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ScheduleCard } from './ScheduleCard';
import { ProfileEditModal } from './ProfileEditModal';
import { AccessScheduleModal } from './AccessScheduleModal';
import { UserSchedule } from '../types';
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
} from 'lucide-react';
import user_png from './../assets/images/user.png';

export const UsersScreen: React.FC = () => {
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
  } = useApp();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalDefaultTab, setModalDefaultTab] = useState<'password' | 'photo'>('password');
  
  // Access schedule modal state
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedScheduleToEdit, setSelectedScheduleToEdit] = useState<UserSchedule | null>(null);

  const isAdmin = currentUser?.type === 'admin';
  const currentUsernameLower = (currentUser?.username || '').toLowerCase();
  const displayedSchedules = isAdmin
    ? userSchedules
    : userSchedules.filter(
        (s) => s.label.toLowerCase() === currentUsernameLower
      );

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

  return (
    <div id="users-profile-screen" className="flex flex-col w-full px-4 pt-4 pb-8 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-tight">
              {isAdmin ? 'System & Access Hub' : 'My Security Profile'}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
              {isAdmin ? 'ROOT ADMIN' : 'AUTHORIZED'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {isAdmin
              ? 'Manage user clearance, account requests & access schedules'
              : 'Credentials, assigned authorization window & account details'}
          </p>
        </div>

        <button
          id="logout-btn"
          onClick={logout}
          className="bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-red-500/30 transition-all cursor-pointer shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>

      {/* Account Details Card */}
      <div className="bg-[#111827] rounded-2xl p-4 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative group">
              <img
                src={currentUser?.avatarUrl || user_png}
                alt="Profile Avatar"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = user_png;
                }}
                className="w-16 h-16 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              />
              <button
                id="edit-avatar-quick-btn"
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
              <p className="text-xs text-slate-400 mt-0.5">{currentUser?.permission || 'Standard Access'}</p>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                Keycode ID: SL-{currentUser?.username.slice(0, 3).toUpperCase()}-2026 • Joined {currentUser?.joinedDate || 'Jan 2026'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons for Normal Users & Admin */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
          <button
            id="edit-password-btn"
            onClick={() => handleOpenEdit('password')}
            className="bg-[#1e293b]/70 hover:bg-[#334155] text-white py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700/60 transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            Change Password
          </button>

          <button
            id="upload-photo-btn"
            onClick={() => handleOpenEdit('photo')}
            className="bg-[#1e293b]/70 hover:bg-[#334155] text-white py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700/60 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            Upload Photo
          </button>
        </div>
      </div>

      {/* Online / Active Users Widget (Admin + User Visibility) */}
      <div className="bg-[#111827] rounded-2xl p-4 border border-slate-800 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-400 border border-emerald-500/20">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Active Lab Network Status</h3>
              <p className="text-[11px] text-slate-400">
                {onlineUsers.length} user{onlineUsers.length === 1 ? '' : 's'} connected to smart lock beacon
              </p>
            </div>
          </div>

          <span className="bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {onlineUsers.length} ONLINE
          </span>
        </div>

        {/* Online user avatars row */}
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
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = user_png;
                    }}
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

      {/* Admin Only: Pending Sign-In Account Approvals */}
      {isAdmin && (
        <div className="bg-[#111827] rounded-2xl p-4 border border-slate-800 shadow-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Pending Registration Queue</h3>
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
              No new member registrations awaiting approval.
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
                      id={`approve-btn-${req.username}`}
                      onClick={() => approveRequest(req.username)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      id={`reject-btn-${req.username}`}
                      onClick={() => rejectRequest(req.username)}
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

      {/* User Access Schedules Section */}
      <div className="bg-[#111827] rounded-2xl p-4 border border-slate-800 shadow-md space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                {isAdmin ? 'User Access Schedules & Policies' : 'My Assigned Access Policies'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {isAdmin
                  ? 'Click any policy to modify time windows, days & user assignments'
                  : 'Time authorizations configured by system administrator'}
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              id="admin-add-schedule-btn"
              onClick={handleOpenAddSchedule}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.25)] cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Policy</span>
            </button>
          )}
        </div>

        {/* Informational banner for regular users indicating read-only nature */}
        {!isAdmin && (
          <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-bold text-white block">Read-Only Access Authorization</span>
              Access policies are managed exclusively by System Administrators. Contact your administrator to request custom lab hours or expanded clearances.
            </div>
          </div>
        )}

        {/* Schedule Cards List */}
        {displayedSchedules.length === 0 ? (
          <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 text-center space-y-2">
            <Clock className="w-5 h-5 text-cyan-400 mx-auto" />
            <p className="text-xs font-bold text-white">Default Access Schedule Active</p>
            <p className="text-[11px] text-slate-400 font-mono">
              {currentUser?.time
                ? `Authorized: ${Math.floor(currentUser.time[0] / 60)}:00 - ${Math.floor(currentUser.time[1] / 60)}:00, Monday to Friday`
                : 'Standard hours: 09:00 AM — 05:00 PM, Monday to Friday'}
            </p>
            <span className="inline-block text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
              Standard Clearance
            </span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedSchedules.map((sched) => (
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
    </div>
  );
};
