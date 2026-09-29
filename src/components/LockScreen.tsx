import React, { useState, useEffect } from 'react';
import { useApp, isUserScheduleActiveNow } from '../context/AppContext';
import { AccessCard } from './AccessCard';
import { EmergencyModal } from './EmergencyModal';
import { IoTWebSocketModal } from './IoTWebSocketModal';
import { TransferAccessModal } from './TransferAccessModal';
import { RequestAccessModal } from './RequestAccessModal';
import { NotificationsCenterModal } from './NotificationsCenterModal';
import { ProfileEditModal } from './ProfileEditModal';
import {
  AlertTriangle,
  Wifi,
  Cpu,
  Radio,
  ArrowRightLeft,
  Bell,
  KeyRound,
  Clock,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import locked_png from './../assets/images/locked.png';
import unlocked_png from './../assets/images/unlocked.png';
import user_png from './../assets/images/user.png';
import { getAvatarByIndex } from '../data/avatarIcons';

export const LockScreen: React.FC = () => {
  const {
    currentUser,
    locked,
    changing,
    lockOperation,
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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
  const activeEmergenciesCount = isAdmin
    ? emergencyAlerts.filter((a) => !a.resolved).length
    : 0;
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

  // Check if current user can lock/unlock the lock during the current day and time based on their access schedule
  const canAccessLock = isAdmin ? true : isUserScheduleActiveNow(currentUser, userSchedules);

  useEffect(() => {
    const updateGreetingAndTime = () => {
      const now = new Date();
      const hours = now.getHours();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      if (hours < 12) {
        setGreeting('Good Morning,');
      } else if (hours >= 12 && hours < 18) {
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
      {/* Top Header with Profile Avatar, Greeting, Notifications Trigger & Live Time */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 pt-3.5 pb-3.5 border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <img
              src={getAvatarByIndex(currentUser?.avatarIndex !== undefined ? currentUser.avatarIndex : currentUser?.avatarUrl)}
              alt="User Avatar"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = user_png;
              }}
              className="w-12 h-12 rounded-full object-contain p-1 bg-slate-900 border-2 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
            />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0b0f19] shadow-[0_0_8px_#10b981]" />
          </div>
          <div className="flex flex-col items-start">
            <p className="text-xs font-mono text-slate-400">{greeting}</p>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">{username}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <div className="flex items-center justify-end text-xs font-mono text-cyan-400">
              <span>(GMT+8)</span>
            </div>
            <p className="text-base sm:text-lg font-mono font-bold text-white tracking-wider">{time}</p>
          </div>
        </div>
      </div>

      {/* Lock Status Bar with IoT Status */}
      <div className="px-4">
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between gap-2 text-xs sm:text-sm font-mono text-slate-300">
          <div className="flex items-center gap-2 shrink-0">
            <Wifi className="w-4 h-4 text-cyan-400" />
            <span className="font-medium">SmartLock WiFi Access Point</span>
          </div>

          <button
            id="open-iot-monitor-btn"
            type="button"
            onClick={() => setIsWsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090d16] hover:bg-slate-800 border border-slate-700 transition cursor-pointer text-slate-300 hover:text-white shrink-0 min-h-[36px]"
            title={`IoT WebSocket: ${wsUrl} (${wsStatus}) - Click to configure / monitor`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
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
                ? 'Syncing...'
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
            className={`w-full px-4 py-3 rounded-2xl border text-sm flex items-center justify-between transition cursor-pointer shadow-md min-h-[48px] ${
              activeEmergenciesCount > 0
                ? 'bg-red-950/60 border-red-500/60 text-red-200 hover:bg-red-950/80 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                : pendingTransfersCount > 0
                ? 'bg-amber-950/60 border-amber-500/60 text-amber-200 hover:bg-amber-950/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-cyan-950/50 border-cyan-500/50 text-cyan-200 hover:bg-cyan-950/70 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              {activeEmergenciesCount > 0 ? (
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
              ) : pendingTransfersCount > 0 ? (
                <ArrowRightLeft className="w-5 h-5 text-amber-400 shrink-0" />
              ) : (
                <Bell className="w-5 h-5 text-cyan-400 shrink-0" />
              )}
              <span className="truncate font-semibold text-xs sm:text-sm">
                {activeEmergenciesCount > 0
                  ? `Emergency Override: ${activeEmergenciesCount} alert waiting`
                  : pendingTransfersCount > 0
                  ? `Room Custody Handover: ${pendingTransfersCount} request waiting`
                  : `${totalNotificationCount} new notification(s) waiting`}
              </span>
            </div>
            <span className="text-xs font-mono font-bold uppercase px-3 py-1 rounded-xl bg-white/10 shrink-0 ml-2">
              View All
            </span>
          </button>
        </div>
      )}

      {/* Center Lock Controller Dial Card */}
      <div className="px-4">
        <div className="relative w-full overflow-hidden rounded-3xl border border-slate-800 shadow-2xl bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#0b0f19]">
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
            <div className="flex items-center gap-2 text-xs sm:text-sm font-mono text-slate-300 uppercase tracking-wider mb-1 font-semibold">
              <Cpu className="w-4 h-4 text-cyan-400" />
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
                className={`relative group flex flex-col items-center justify-center w-52 h-52 rounded-full transition-all duration-300 transform border-4 ${
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
                    className={`w-26 h-26 object-contain transition-transform duration-300 ${
                      !canAccessLock
                        ? 'grayscale opacity-40'
                        : changing
                        ? 'animate-spin-slow'
                        : 'group-hover:scale-110'
                    }`}
                  />
                </div>

                <span
                  className={`text-base sm:text-lg font-mono font-black mt-2 tracking-widest ${
                    changing
                      ? (lockOperation === 'unlocking' || (lockOperation === 'idle' && locked)
                          ? 'text-emerald-400'
                          : 'text-red-400')
                      : !canAccessLock
                      ? 'text-slate-500'
                      : locked
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {changing
                    ? (lockOperation === 'unlocking' || (lockOperation === 'idle' && locked)
                        ? 'UNLOCKING...'
                        : 'LOCKING...')
                    : locked
                    ? 'LOCKED'
                    : 'UNLOCKED'}
                </span>
              </button>
            </div>

            {canAccessLock ? (
              <p className="text-sm font-semibold text-slate-200">
                You can <span className="text-cyan-400 font-bold">{locked ? 'UNLOCK' : 'LOCK'}</span> the SmartLock
              </p>
            ) : (
              <div className="space-y-1.5">
                <p id="lock-status-schedule-notice" className="text-sm font-semibold text-slate-300">
                  You cannot <span className="text-slate-200 font-bold">LOCK/UNLOCK</span> the SmartLock.
                </p>
                <p className="text-xs sm:text-sm font-mono text-amber-400/90 flex items-center justify-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Outside authorized access schedule</span>
                </p>
              </div>
            )}

            {!locked && !changing && (
              <div className="mt-3 py-1.5 px-4 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-xs sm:text-sm font-mono text-emerald-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Current Room Custody: <strong className="text-white">{effectiveSessionHolder}</strong>
                  {isSessionHolder && <span className="text-cyan-300 font-bold ml-1">(You)</span>}
                </span>
              </div>
            )}
            
            {changing && (
              <div id="lock-progress-container" className="w-full mt-4 pt-3 border-t border-slate-800/80 px-1">
                <div className="flex items-center justify-between text-xs sm:text-sm font-mono mb-2 gap-3">
                  <div className="w-full h-4 bg-[#090d16] rounded-full overflow-hidden border border-slate-800 p-0.5 relative shadow-inner">
                    <div
                      id="lock-progress-bar"
                      role="progressbar"
                      aria-valuenow={lockProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      style={{ width: `${lockProgress}%` }}
                      className={`h-full rounded-full transition-all duration-300 ease-out relative ${
                        locked
                          ? 'bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.7)]'
                          : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.7)]'
                      }`}
                    >
                      <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
                    </div>
                  </div>

                  <span
                    id="lock-progress-percentage"
                    className="font-bold font-mono text-sm shrink-0"
                  >
                    {lockProgress}%
                  </span>
                </div>

                <div className="flex items-center justify-center text-xl sm:text-2xl font-mono mt-1 px-1">
                  <div className="text-slate-200 font-bold">
                    {remainingLockTime !== null ? (
                      remainingLockTime > 0 ? (
                        <span>{remainingLockTime}s remaining</span>
                      ) : (
                        <span className={isEmergencyOverrideInProgress ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                          Finishing...
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400">Connecting...</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {changing && (
              <button
                id="view-iot-telemetry-btn"
                onClick={() => setIsWsModalOpen(true)}
                className={`flex items-center gap-2 mt-3.5 px-4 py-2 rounded-full text-xs sm:text-sm font-mono transition cursor-pointer shadow-sm hover:scale-[1.02] border min-h-[40px] ${
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

      {/* Emergency Override Button */}
      {(!changing) && locked && (
        <div className="px-4">
          <button
            id="emergency-departure-btn"
            onClick={() => setIsEmergencyModalOpen(true)}
            className="w-full bg-gradient-to-r from-red-950/60 to-[#1e131d] hover:from-red-950/80 hover:to-[#2b1728] border-2 border-red-500/50 text-red-300 hover:text-white p-4 rounded-2xl flex items-center justify-between transition-all duration-200 shadow-md cursor-pointer group min-h-[56px]"
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-500 text-slate-950 p-2.5 rounded-xl group-hover:scale-110 transition-transform shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-sm sm:text-base font-bold block text-white">Emergency Door Override</span>
                <span className="text-xs text-red-300/90 block mt-0.5">To unlock in emergencies (admins alerted)</span>
              </div>
            </div>
            <span className="text-xs font-mono bg-red-500 text-slate-950 font-black px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0 ml-2">
              OVERRIDE
            </span>
          </button>
        </div>
      )}

      {/* Room Access Transfer / Request Button */}
      {(!changing) && (!locked) && canAccessLock && (
        <div className="px-4">
          {isSessionHolder ? (
            <button
              id="transfer-room-access-btn"
              onClick={() => setIsTransferModalOpen(true)}
              className="w-full bg-gradient-to-r from-cyan-950/70 via-[#0e1d2e] to-blue-950/70 hover:from-cyan-900/80 hover:to-blue-900/80 border-2 border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-white p-4 rounded-2xl flex items-center justify-between transition-all duration-200 shadow-[0_0_25px_rgba(6,182,212,0.15)] cursor-pointer group min-h-[56px]"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 p-2.5 rounded-xl group-hover:scale-110 transition-transform shadow-md shrink-0">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-white">Transfer Room Access</span>
                  </div>
                  <span className="text-xs text-slate-300 block mt-0.5">
                    Hand over room custody to another user
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono bg-cyan-500 text-slate-950 font-black px-3 py-2 rounded-xl uppercase tracking-wider group-hover:bg-cyan-400 transition-colors shrink-0 ml-2">
                TRANSFER
              </span>
            </button>
          ) : (
            <button
              id="request-room-access-btn"
              onClick={() => setIsRequestModalOpen(true)}
              className="w-full bg-gradient-to-r from-amber-950/50 via-[#141d2e] to-cyan-950/50 hover:from-amber-900/60 hover:to-cyan-900/60 border-2 border-amber-500/50 hover:border-amber-400 text-amber-200 hover:text-white p-4 rounded-2xl flex items-center justify-between transition-all duration-200 shadow-[0_0_25px_rgba(245,158,11,0.15)] cursor-pointer group min-h-[56px]"
              disabled={pendingOutgoingRequest ? true : false}
            >
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-amber-400 to-cyan-500 text-slate-950 p-2.5 rounded-xl group-hover:scale-110 transition-transform shadow-md shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-white">Request Room Access</span>
                  </div>
                  <span className="text-xs text-slate-300 block mt-0.5">
                    {pendingOutgoingRequest ? (
                      <span className="text-amber-300 flex items-center gap-1.5 font-mono font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        Request pending approval by {effectiveSessionHolder}
                      </span>
                    ) : (
                      `Request room custody from ${effectiveSessionHolder}`
                    )}
                  </span>
                </div>
              </div>
              <span
                className={`text-xs font-mono font-black px-3 py-2 rounded-xl uppercase tracking-wider transition-colors shrink-0 ml-2 ${
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
      
      {/* Access Schedules Section */}
      <div id="lock-access-schedules-section" className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Access Schedules</span>
          </h4>
        </div>

        {mySchedules.length > 0 ? (
          <div className="space-y-3">
            {mySchedules.map((sched) => {
              const is24 =
                (sched.time && (sched.time.toLowerCase().includes('24/7') || sched.time.toLowerCase().includes('unlimited'))) ||
                (sched.startTime === '12:00 AM' && sched.endTime === '11:59 PM') ||
                (sched.dayConfigs && Object.values(sched.dayConfigs).some((c) => c.enabled && c.is24Hours));
              const startT = is24 ? '12:00 AM' : (sched.startTime || (isAdmin ? '12:00 AM' : '09:00 AM'));
              const endT = is24 ? '11:59 PM' : (sched.endTime || (isAdmin ? '11:59 PM' : '05:00 PM'));

              return (
                <AccessCard
                  key={sched.id}
                  label={sched.label}
                  role={sched.role}
                  permission={isAdmin ? 'Root Administrator Access' : currentUser?.permission || 'Standard Lab Clearance'}
                  startingTime={startT}
                  endingTime={endT}
                  time={sched.time}
                  date={sched.time || (isAdmin ? '24/7 Unlimited Access (Mon-Sun)' : 'Monday to Friday')}
                  days={sched.days || (isAdmin ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])}
                  dayConfigs={sched.dayConfigs}
                  isCurrentlyAuthorized={isAdmin ? true : isUserScheduleActiveNow(currentUser, [sched])}
                />
              );
            })}
          </div>
        ) : (
          <AccessCard
            label={currentUser?.username || 'Current User'}
            role={isAdmin ? 'admin' : 'user'}
            permission={isAdmin ? 'Root Administrator Access' : currentUser?.permission || 'Standard Lab Clearance'}
            startingTime={isAdmin ? '12:00 AM' : mySchedule?.startTime || '09:00 AM'}
            endingTime={isAdmin ? '11:59 PM' : mySchedule?.endTime || '05:00 PM'}
            time={isAdmin ? '12:00 AM - 11:59 PM' : mySchedule?.time}
            date={isAdmin ? '24/7 Unlimited Access (Mon-Sun)' : mySchedule?.time || 'Monday to Friday'}
            days={isAdmin ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : mySchedule?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']}
            dayConfigs={mySchedule?.dayConfigs}
            isCurrentlyAuthorized={isAdmin ? true : mySchedule ? isUserScheduleActiveNow(currentUser, [mySchedule]) : false}
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

      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        defaultTab="photo"
      />
    </div>
  );
};
