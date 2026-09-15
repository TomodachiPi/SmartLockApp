import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AccessCard } from './AccessCard';
import { WelcomeBanner } from './WelcomeBanner';
import { EmergencyBanner } from './EmergencyBanner';
import { EmergencyModal } from './EmergencyModal';
import { IoTWebSocketModal } from './IoTWebSocketModal';
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
  } = useApp();

  const [greeting, setGreeting] = useState('Good Morning,');
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isWsModalOpen, setIsWsModalOpen] = useState(false);

  const username = currentUser?.username || 'Administrator';
  const isAdmin = currentUser?.type === 'admin';
  const doorName = 'Laboratory SmartLock #1';

  const mySchedule = userSchedules.find(
    (s) => s.label.toLowerCase() === currentUser?.username.toLowerCase()
  );

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

        <div className="text-right">
          <div className="flex items-center justify-end text-[12px] font-mono text-cyan-400">
            <span>Time Zone: (GMT+8)</span>
          </div>
          <p className="text-base font-mono font-bold text-white tracking-wider">{time}</p>
        </div>
      </div>
      
      {isAdmin && (<EmergencyBanner />)}

      <div className="px-4">
        <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-[10px] font-mono text-slate-300">
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <span>WiFi -42dBm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            <span>98% BATTERY</span>
          </div>
          <button
            id="open-iot-monitor-btn"
            onClick={() => setIsWsModalOpen(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#090d16] hover:bg-slate-800 border border-slate-700 transition cursor-pointer text-slate-300 hover:text-white"
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

      <div className="px-4">
        <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800 shadow-2xl bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#0b0f19]">
          {/* Subtle Cyber Grid Background */}
          <div
            className="absolute inset-0 opacity-15 bg-[radial-gradient(#06b6d4_1px,transparent_1px)]"
            style={{ backgroundSize: '16px 16px' }}
          />

          {/* Glowing Radial Backdrop */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500 ${
              locked ? 'bg-red-500' : 'bg-emerald-500'
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
                  changing
                    ? 'scale-125 opacity-70 animate-ping'
                    : locked
                    ? 'border-2 border-red-500/20 scale-110'
                    : 'border-2 border-emerald-500/20 scale-110'
                }`}
              />

              <button
                id="toggle-lock-button"
                onClick={toggleLock}
                disabled={changing}
                className={`relative group flex flex-col items-center justify-center w-48 h-48 rounded-full transition-all duration-300 transform active:scale-95 cursor-pointer border-4 ${
                  changing
                    ? isEmergencyOverrideInProgress
                      ? 'cursor-wait scale-105 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.7)] animate-pulse'
                      : 'cursor-wait scale-105 border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.4)]'
                    : 'hover:scale-105'
                } ${
                  locked
                    ? 'bg-gradient-to-b from-[#1f1622] to-[#120d14] border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.35)]'
                    : 'bg-gradient-to-b from-[#112421] to-[#0c1615] border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.35)]'
                }`}
              >
                <div className="relative">
                  <img
                    src={locked ? locked_png : unlocked_png}
                    alt={locked ? 'Locked' : 'Unlocked'}
                    className={`w-24 h-24 object-contain transition-transform duration-300 ${
                      changing ? 'animate-spin-slow' : 'group-hover:scale-110'
                    }`}
                  />
                </div>

                <span
                  className={`text-base font-mono font-black mt-2 tracking-widest ${
                    locked
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {changing
                    ? locked
                      ? 'UNLOCKING...'
                      : 'LOCKING...'
                    : locked
                    ? 'LOCKED'
                    : 'UNLOCKED'}
                </span>
              </button>
            </div>

            <p className="text-xs font-semibold text-slate-300">
              You can <span className="text-cyan-400 font-bold">{locked ? 'UNLOCK' : 'LOCK'}</span> the SmartLock
            </p>
            
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
      
      <div className="px-4 space-y-2">
        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Active Credentials</h4>
        <AccessCard
          permission={isAdmin ? 'Root Administrator Access' : currentUser?.permission || 'Standard Access'}
          startingTime={isAdmin ? '12:00 AM' : mySchedule?.startTime || '12:00 AM'}
          endingTime={isAdmin ? '11:59 PM' : mySchedule?.endTime || '11:59 PM'}
          date={isAdmin ? 'Monday to Sunday' : mySchedule?.time || 'Monday to Sunday'}
        />
      </div>
      
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />

      <IoTWebSocketModal
        isOpen={isWsModalOpen}
        onClose={() => setIsWsModalOpen(false)}
      />
    </div>
  );
};
