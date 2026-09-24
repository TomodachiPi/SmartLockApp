import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AccessCard } from './AccessCard';
import { WelcomeBanner } from './WelcomeBanner';
import { EmergencyBanner } from './EmergencyBanner';
import { EmergencyModal } from './EmergencyModal';
import { IoTWebSocketModal } from './IoTWebSocketModal';
import { TransferAccessModal } from './TransferAccessModal';
import { RequestAccessModal } from './RequestAccessModal';
import { RoomTransferNotificationBanner } from './RoomTransferNotificationBanner';
import { AdminNotificationBanner } from './AdminNotificationBanner';
import { NotificationsCenterModal } from './NotificationsCenterModal';
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  Wifi,
  BatteryCharging,
  Cpu,
  Lock as LockIcon,
  Unlock,
  Radio,
  ArrowRightLeft,
  Bell,
  UserCheck,
  KeyRound,
  Clock,
  AlertCircle,
} from 'lucide-react';
import locked_png from './../assets/images/locked.png';
import unlocked_png from './../assets/images/unlocked.png';
import user_png from './../assets/images/user.png';

export const LockScreen: React.FC = () => {
  const {
    currentUser,
    locked,
    changing,
    toggleLock,
    userSchedules,
    lockProgress,
    remainingLockTime,
    isEmergencyOverrideInProgress,
    wsStatus,
    wsUrl,
    roomTransfers,
    adminNotifications,
    activeRoomHolder,
    emergencyAlerts,
    profileRequests,
  } = useApp();

  const [greeting, setGreeting] = useState('Good Morning,');
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isWsModalOpen, setIsWsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

  const username = currentUser?.username || 'Administrator';
  const isAdmin = currentUser?.type === 'admin';
  const doorName = 'Laboratory SmartLock #1';

  const effectiveSessionHolder = activeRoomHolder || 'Administrator';
  const isSessionHolder = currentUser
    ? currentUser.username.toLowerCase() === effectiveSessionHolder.toLowerCase()
    : false;

  const pendingOutgoingRequest = roomTransfers.find(
    (t) =>
      t.fromUsername.toLowerCase() === currentUser?.username.toLowerCase() &&
      t.toUsername.toLowerCase() === effectiveSessionHolder.toLowerCase() &&
      t.status === 'pending'
  );

  // Consolidated notification metrics for both admin and normal users
  const currentUsernameLower = (currentUser?.username || '').toLowerCase();
  const pendingTransfersCount = roomTransfers.filter(
    (t) => t.toUsername.toLowerCase() === currentUsernameLower && t.status === 'pending'
  ).length;
  const activeEmergenciesCount = emergencyAlerts.filter((a) => !a.resolved).length;
  const unreadAdminNotifsCount = isAdmin
    ? adminNotifications.filter((n) => !n.read).length
    : 0;
  const pendingProfileRequestsCount = isAdmin ? profileRequests.length : 0;

  const totalNotificationCount =
    pendingTransfersCount +
    activeEmergenciesCount +
    unreadAdminNotifsCount +
    pendingProfileRequestsCount;

  // User's own access schedule(s)
  const mySchedules = userSchedules.filter((s) => {
    const labelMatch = s.label.toLowerCase() === (currentUser?.username || '').toLowerCase();
    const adminMatch = isAdmin && (s.role === 'admin' || s.label.toLowerCase() === 'administrator');
    return labelMatch || adminMatch;
  });
  const mySchedule = mySchedules[0] || userSchedules.find(
    (s) => s.label.toLowerCase() === currentUser?.username.toLowerCase()
  );

  const isScheduleActiveNow = (schedule?: {
    time?: string;
    days?: string[];
    startTime?: string;
    endTime?: string;
    role?: string;
    status?: 'active' | 'restricted';
  }): boolean => {
    if (!schedule) return false;
    if (schedule.status === 'restricted') return false;

    const now = new Date();
    const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIdx = now.getDay();
    const currentShort = dayNamesShort[dayIdx];
    const currentFull = dayNamesFull[dayIdx];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const timeStr = (schedule.time || '').toLowerCase();
    const is24_7 = timeStr.includes('24/7') || timeStr.includes('any time') || timeStr.includes('unlimited access');

    // 1. Day Check
    let dayMatches = false;
    if (schedule.days && schedule.days.length > 0) {
      dayMatches = schedule.days.some((d) => {
        const dClean = d.trim().toLowerCase();
        if (dClean === currentShort.toLowerCase() || dClean === currentFull.toLowerCase()) return true;
        if (dClean.startsWith(currentShort.toLowerCase())) return true;
        if (dClean === 'all' || dClean.includes('all days') || dClean.includes('everyday')) return true;
        if (dClean.includes('weekday') && dayIdx >= 1 && dayIdx <= 5) return true;
        if (dClean.includes('weekend') && (dayIdx === 0 || dayIdx === 6)) return true;
        return false;
      });
    } else {
      // Parse days from timeStr
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
      } else if (
        timeStr.includes(currentFull.toLowerCase()) ||
        timeStr.includes(currentShort.toLowerCase())
      ) {
        dayMatches = true;
      } else {
        const mentionsOtherDays = dayNamesFull.some(
          (fullDay, idx) =>
            idx !== dayIdx &&
            (timeStr.includes(fullDay.toLowerCase()) || timeStr.includes(dayNamesShort[idx].toLowerCase()))
        );
        if (mentionsOtherDays) {
          dayMatches = false;
        } else {
          dayMatches = schedule.role === 'admin' || (dayIdx >= 1 && dayIdx <= 5);
        }
      }
    }

    if (!dayMatches) return false;

    // 2. Time Check
    if (is24_7) return true;

    const parseTimeStr = (tStr: string): number | null => {
      if (!tStr) return null;
      const match = tStr.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) : 0;
      const ampm = match[3] ? match[3].toUpperCase() : null;
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    let startM: number | null = null;
    let endM: number | null = null;

    if (schedule.startTime && schedule.endTime) {
      startM = parseTimeStr(schedule.startTime);
      endM = parseTimeStr(schedule.endTime);
    } else if (schedule.time) {
      const rangeMatch = schedule.time.match(
        /(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i
      );
      if (rangeMatch) {
        startM = parseTimeStr(rangeMatch[1]);
        endM = parseTimeStr(rangeMatch[2]);
      }
    }

    if (startM !== null && endM !== null) {
      if (endM >= startM) {
        return currentMinutes >= startM && currentMinutes <= endM;
      } else {
        // Overnight schedule
        return currentMinutes >= startM || currentMinutes <= endM;
      }
    }

    return true;
  };

  // Check if current user can lock/unlock the lock during the current day and time based on their access schedule
  const canAccessLock = (() => {
    if (mySchedules.length > 0) {
      return mySchedules.some((sched) => isScheduleActiveNow(sched));
    }
    // If admin has no explicit schedule entries, default to 24/7 master clearance
    if (isAdmin) return true;
    // If regular user has profile.time defined [startMin, endMin]
    if (currentUser?.time && currentUser.time.length === 2) {
      const now = new Date();
      const currentDay = now.getDay();
      const isWeekday = currentDay >= 1 && currentDay <= 5;
      const currentM = now.getHours() * 60 + now.getMinutes();
      return isWeekday && currentM >= currentUser.time[0] && currentM <= currentUser.time[1];
    }
    return false;
  })();

  useEffect(() => {
    const updateGreetingAndTime = () => {
      const now = new Date();
      const hours = now.getHours();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      if (hours <= 12) {
        setGreeting('Good Morning,');
      } else if (hours > 12 && hours <= 18) {
        setGreeting('Good Afternoon,');
      } else {
        setGreeting('Good Evening,');
      }
    };

    updateGreetingAndTime();
    const timer = setInterval(updateGreetingAndTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div id="lock-screen" className="flex flex-col w-full pb-8 space-y-4">
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 pt-3 pb-3 border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={currentUser?.avatarUrl || user_png}
              alt="User Avatar"
              className="w-11 h-11 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0b0f19] shadow-[0_0_8px_#10b981]" />
          </div>
          <div>
            <p className="text-[11px] font-mono text-slate-400">{greeting}</p>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">{username}</h2>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-extrabold uppercase border ${
                  isAdmin
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isAdmin ? 'Admin' : 'User'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <div className="flex items-center justify-end text-[12px] font-mono text-cyan-400">
              <span>Time Zone: (GMT+8)</span>
            </div>
            <p className="text-base font-mono font-bold text-white tracking-wider">{time}</p>
          </div>
        </div>
      </div>

      {/* Lock Status Bar with Consolidated Clickable Notifications for Admin & Normal Users */}
      <div className="px-4">
        <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-1.5 text-[10px] font-mono text-slate-300 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lock WiFi AP -42dBm 1.0 Mbps</span>
          </div>

          <button
            id="open-iot-monitor-btn"
            type="button"
            onClick={() => setIsWsModalOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#090d16] hover:bg-slate-800 border border-slate-700 transition cursor-pointer text-slate-300 hover:text-white shrink-0"
            title={`IoT WebSocket: ${wsUrl} (${wsStatus}) - Click to configure / monitor`}
          >
            <Radio
              className={`w-3 h-3 ${
                wsStatus === 'connected'
                  ? 'text-emerald-400 animate-pulse'
                  : wsStatus === 'simulated'
                  ? 'text-cyan-400'
                  : wsStatus === 'connecting'
                  ? 'text-amber-400 animate-spin'
                  : 'text-rose-400'
              }`}
            />
            <span className="font-bold">
              {wsStatus === 'connected'
                ? 'Online'
                : wsStatus === 'simulated'
                ? 'Simulated'
                : wsStatus === 'connecting'
                ? 'Sync...'
                : 'Offline'}
            </span>
          </button>
        </div>
      </div>

      {/* Sleek compact notification banner when active alerts exist */}
      {totalNotificationCount > 0 && (
        <div className="px-4">
          <button
            id="compact-notifications-alert-strip"
            type="button"
            onClick={() => setIsNotificationsModalOpen(true)}
            className={`w-full px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer shadow-sm ${
              activeEmergenciesCount > 0
                ? 'bg-red-950/50 border-red-500/50 text-red-300 hover:bg-red-950/70'
                : pendingTransfersCount > 0
                ? 'bg-amber-950/50 border-amber-500/50 text-amber-200 hover:bg-amber-950/70'
                : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200 hover:bg-cyan-950/60'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {activeEmergenciesCount > 0 ? (
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
              ) : pendingTransfersCount > 0 ? (
                <ArrowRightLeft className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Bell className="w-4 h-4 text-cyan-400 shrink-0" />
              )}
              <span className="truncate font-medium text-[11px]">
                {activeEmergenciesCount > 0
                  ? `Active Emergency Override: ${activeEmergenciesCount} alert waiting`
                  : pendingTransfersCount > 0
                  ? `Room Access Handover: ${pendingTransfersCount} request pending review`
                  : `${totalNotificationCount} notification(s) waiting in Notifications Center`}
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-white/10 shrink-0 ml-2">
              View All
            </span>
          </button>
        </div>
      )}

      <div className="px-4">
        <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800 shadow-2xl bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#0b0f19]">
          {/* Subtle Cyber Grid Background */}
          <div
            className="absolute inset-0 opacity-15 bg-[radial-gradient(#06b6d4_1px,transparent_1px)]"
            style={{ backgroundSize: '16px 16px' }}
          />

          {/* Glowing Radial Backdrop */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
              !canAccessLock
                ? 'bg-slate-800 opacity-5'
                : locked
                ? 'bg-red-500 opacity-20'
                : 'bg-emerald-500 opacity-20'
            }`}
          />

          {/* Lock Interactive Control */}
          <div className="relative z-10 flex flex-col items-center justify-center py-7 px-4 text-center">
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>{doorName}</span>
            </div>

            {/* Smart Lock Dial Button */}
            <div className="my-5 relative flex items-center justify-center">
              {/* Outer Cyber Pulse Ring */}
              <div
                className={`absolute inset-0 rounded-full transition-all duration-700 pointer-events-none ${
                  !canAccessLock
                    ? 'border border-slate-800/20 opacity-0 scale-100'
                    : changing
                    ? 'scale-125 opacity-70 animate-ping'
                    : locked
                    ? 'border-2 border-red-500/20 scale-110'
                    : 'border-2 border-emerald-500/20 scale-110'
                }`}
              />

              <button
                id="toggle-lock-button"
                onClick={canAccessLock ? toggleLock : undefined}
                disabled={changing || !canAccessLock}
                title={
                  !canAccessLock
                    ? 'You cannot LOCK/UNLOCK the SmartLock. Outside your authorized access schedule.'
                    : undefined
                }
                className={`relative group flex flex-col items-center justify-center w-48 h-48 rounded-full transition-all duration-300 transform border-4 ${
                  !canAccessLock
                    ? 'bg-gradient-to-b from-[#131926] to-[#0a0e17] border-slate-700/60 shadow-none cursor-not-allowed opacity-50 grayscale hover:scale-100'
                    : changing
                    ? isEmergencyOverrideInProgress
                      ? 'cursor-wait scale-105 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.7)] animate-pulse'
                      : 'cursor-wait scale-105 border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.4)]'
                    : 'cursor-pointer hover:scale-105 active:scale-95 ' +
                      (locked
                        ? 'bg-gradient-to-b from-[#1f1622] to-[#120d14] border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.35)]'
                        : 'bg-gradient-to-b from-[#112421] to-[#0c1615] border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.35)]')
                }`}
              >
                <div className="relative">
                  <img
                    src={locked ? locked_png : unlocked_png}
                    alt={locked ? 'Locked' : 'Unlocked'}
                    className={`w-24 h-24 object-contain transition-transform duration-300 ${
                      !canAccessLock
                        ? 'grayscale opacity-40'
                        : changing
                        ? 'animate-spin-slow'
                        : 'group-hover:scale-110'
                    }`}
                  />
                </div>

                <span
                  className={`text-base font-mono font-black mt-2 tracking-widest ${
                    !canAccessLock
                      ? 'text-slate-500'
                      : locked
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {!canAccessLock
                    ? locked
                      ? 'LOCKED'
                      : 'UNLOCKED'
                    : changing
                    ? locked
                      ? 'UNLOCKING...'
                      : 'LOCKING...'
                    : locked
                    ? 'LOCKED'
                    : 'UNLOCKED'}
                </span>
              </button>
            </div>

            {canAccessLock ? (
              <p className="text-xs font-semibold text-slate-300">
                You can <span className="text-cyan-400 font-bold">{locked ? 'UNLOCK' : 'LOCK'}</span> the SmartLock
              </p>
            ) : (
              <div className="space-y-1">
                <p id="lock-status-schedule-notice" className="text-xs font-semibold text-slate-400">
                  You cannot <span className="text-slate-300 font-bold">LOCK/UNLOCK</span> the SmartLock.
                </p>
                <p className="text-[11px] font-mono text-amber-400/90 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Outside authorized access schedule</span>
                </p>
              </div>
            )}

            {!locked && !changing && (
              <div className="mt-2 py-1 px-3 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Current Room Custody: <strong className="text-white">{effectiveSessionHolder}</strong>
                  {isSessionHolder && <span className="text-cyan-300 font-bold ml-1">(You)</span>}
                </span>
              </div>
            )}
            
            {changing && (
            <div id="lock-progress-container" className="w-full mt-4 pt-3 border-t border-slate-800/80 px-1">
              <div className="flex items-center justify-between text-[11px] font-mono mb-1.5 gap-3">
                <div className="w-full h-3.5 bg-[#090d16] rounded-full overflow-hidden border border-slate-800 p-0.5 relative shadow-inner">
                  <div
                    id="lock-progress-bar"
                    role="progressbar"
                    aria-valuenow={lockProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    style={{ width: `${lockProgress}%` }}
                    className={`h-full rounded-full transition-all duration-300 ease-out relative ${
                      locked ? 'bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.7)]'
                      : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.7)]'
                    }`}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
                  </div>
                </div>

                <span
                  id="lock-progress-percentage"
                  className={`font-bold font-mono text-xs`}
                >
                  {lockProgress}%
                </span>
              </div>

              <div className="flex items-center justify-center text-[24px] font-mono mt-1 px-1">
                <div className="text-slate-300 font-semibold">
                  {remainingLockTime !== null ? (
                    remainingLockTime > 0 ? (
                      <span>{remainingLockTime}s remaining</span>
                    ) : (
                      <span className={isEmergencyOverrideInProgress ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>Finishing...</span>
                    )
                  ) : (
                    <span className="text-slate-500">Connecting...</span>
                  )}
                </div>
              </div>
            </div>
            )}

            {changing && (
              <button
                id="view-iot-telemetry-btn"
                onClick={() => setIsWsModalOpen(true)}
                className={`flex items-center gap-2 mt-3 px-3.5 py-1.5 rounded-full text-[11px] font-mono transition cursor-pointer shadow-sm hover:scale-[1.02] border ${
                  isEmergencyOverrideInProgress
                    ? 'bg-red-950/80 hover:bg-red-900 border-red-500/50 text-red-200'
                    : 'bg-cyan-950/70 hover:bg-cyan-900 border-cyan-500/40 text-cyan-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full animate-ping ${isEmergencyOverrideInProgress ? 'bg-red-400' : 'bg-cyan-400'}`} />
                <span>View SmartLock IoT Connection Status</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {(!changing) && locked && (
        <div className="px-4">
          <button
            id="emergency-departure-btn"
            onClick={() => setIsEmergencyModalOpen(true)}
            className="w-full bg-gradient-to-r from-red-950/50 to-[#1e131d] hover:from-red-950/80 hover:to-[#2b1728] border border-red-500/50 text-red-300 hover:text-white p-3 rounded-2xl flex items-center justify-between transition-all duration-200 shadow-md cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-red-500 text-slate-950 p-2 rounded-xl group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold block text-white">Emergency Door Override</span>
                <span className="text-[12px] text-red-300/80 block">To open the lock in the case of an emergency but the adminstrators will be alerted</span>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-red-500 text-slate-950 font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
              OVERRIDE
            </span>
          </button>
        </div>
      )}

      {(!changing) && (!locked) && canAccessLock && (
        <div className="px-4">
          {isSessionHolder ? (
            <button
              id="transfer-room-access-btn"
              onClick={() => setIsTransferModalOpen(true)}
              className="w-full bg-gradient-to-r from-cyan-950/60 via-[#0e1d2e] to-blue-950/60 hover:from-cyan-900/80 hover:to-blue-900/80 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white p-3.5 rounded-2xl flex items-center justify-between transition-all duration-200 shadow-[0_0_25px_rgba(6,182,212,0.15)] cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 p-2.5 rounded-xl group-hover:scale-110 transition-transform shadow-md">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Transfer Room Access</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Give room custody to another user
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-cyan-500 text-slate-950 font-black px-2.5 py-1.5 rounded-lg uppercase tracking-wider group-hover:bg-cyan-400 transition-colors">
                TRANSFER
              </span>
            </button>
          ) : (
            <button
              id="request-room-access-btn"
              onClick={() => setIsRequestModalOpen(true)}
              className="w-full bg-gradient-to-r from-amber-950/40 via-[#141d2e] to-cyan-950/50 hover:from-amber-900/60 hover:to-cyan-900/60 border border-amber-500/40 hover:border-amber-400 text-amber-200 hover:text-white p-3.5 rounded-2xl flex items-center justify-between transition-all duration-200 shadow-[0_0_25px_rgba(245,158,11,0.15)] cursor-pointer group"
              disabled={pendingOutgoingRequest ? true : false}
            >
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-amber-400 to-cyan-500 text-slate-950 p-2.5 rounded-xl group-hover:scale-110 transition-transform shadow-md">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Request Room Access</span>
                  </div>
                  <span className="text-[11px] text-slate-300 block mt-0.5">
                    {pendingOutgoingRequest ? (
                      <span className="text-amber-300 flex items-center gap-1 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Request pending approval by {effectiveSessionHolder}
                      </span>
                    ) : (
                      `Request room access from ${effectiveSessionHolder}`
                    )}
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] font-mono font-black px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-colors ${
                  pendingOutgoingRequest
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-amber-400 text-slate-950 group-hover:bg-amber-300'
                }`}
              >
                {pendingOutgoingRequest ? 'PENDING' : 'REQUEST'}
              </span>
            </button>
          )}
        </div>
      )}
      
      {/* Access Schedules Section: displays authorized time periods to lock and unlock */}
      <div id="lock-access-schedules-section" className="px-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Access Schedules</span>
          </h4>
        </div>

        {mySchedules.length > 0 ? (
          <div className="space-y-2.5">
            {mySchedules.map((sched) => (
              <AccessCard
                key={sched.id}
                label={sched.label}
                role={sched.role}
                permission={isAdmin ? 'Root Administrator Access' : currentUser?.permission || 'Standard Lab Clearance'}
                startingTime={sched.startTime || (isAdmin ? '12:00 AM' : '09:00 AM')}
                endingTime={sched.endTime || (isAdmin ? '11:59 PM' : '05:00 PM')}
                date={sched.time || (isAdmin ? 'Monday to Sunday' : 'Monday to Friday')}
                days={sched.days || (isAdmin ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])}
                isCurrentlyAuthorized={isScheduleActiveNow(sched)}
              />
            ))}
          </div>
        ) : (
          <AccessCard
            label={currentUser?.username || 'Current User'}
            role={isAdmin ? 'admin' : 'user'}
            permission={isAdmin ? 'Root Administrator Access' : currentUser?.permission || 'Standard Lab Clearance'}
            startingTime={isAdmin ? '12:00 AM' : mySchedule?.startTime || '09:00 AM'}
            endingTime={isAdmin ? '11:59 PM' : mySchedule?.endTime || '05:00 PM'}
            date={isAdmin ? 'Monday to Sunday' : mySchedule?.time || 'Monday to Friday'}
            days={isAdmin ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : mySchedule?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']}
            isCurrentlyAuthorized={isAdmin ? true : isScheduleActiveNow(mySchedule)}
          />
        )}
      </div>
      
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />

      <IoTWebSocketModal
        isOpen={isWsModalOpen}
        onClose={() => setIsWsModalOpen(false)}
      />

      <TransferAccessModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />

      <RequestAccessModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        sessionHolderName={effectiveSessionHolder}
      />

      <NotificationsCenterModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
      />
    </div>
  );
};
