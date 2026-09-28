import React, { useState } from 'react';
import { Clock, Calendar, ShieldCheck, KeyRound, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { DayScheduleConfig } from '../types';

interface AccessCardProps {
  label?: string;
  role?: 'admin' | 'user';
  permission?: string;
  startingTime?: string;
  endingTime?: string;
  time?: string;
  date?: string;
  days?: string[];
  dayConfigs?: Record<string, DayScheduleConfig>;
  isCurrentlyAuthorized?: boolean;
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const AccessCard: React.FC<AccessCardProps> = ({
  label,
  role = 'user',
  permission = 'Standard Access',
  startingTime,
  endingTime,
  time = '',
  date = '',
  days = [],
  dayConfigs,
  isCurrentlyAuthorized = true,
}) => {
  const isAdmin = role === 'admin';
  const [showDayBreakdown, setShowDayBreakdown] = useState(false);

  const hasDayConfigs = dayConfigs && typeof dayConfigs === 'object' && Object.keys(dayConfigs).length > 0;
  
  const is24Hours =
    (startingTime === '12:00 AM' && endingTime === '11:59 PM') ||
    (time && (time.toLowerCase().includes('24/7') || time.toLowerCase().includes('unlimited'))) ||
    (date && (date.toLowerCase().includes('24/7') || date.toLowerCase().includes('unlimited'))) ||
    (hasDayConfigs && Object.values(dayConfigs).some((c) => c.enabled && c.is24Hours));

  const displayStartTime = is24Hours ? '12:00 AM' : (startingTime || '09:00 AM');
  const displayEndTime = is24Hours ? '11:59 PM' : (endingTime || '05:00 PM');
  const displayTime = is24Hours
    ? '12:00 AM — 11:59 PM'
    : time && !time.toLowerCase().includes('custom') && time.includes(':')
    ? time
    : `${displayStartTime} — ${displayEndTime}`;

  return (
    <div
      id="access-period-card"
      className="bg-[#111827] rounded-3xl p-4 sm:p-5 shadow-lg border border-slate-800/90 transition-all hover:border-cyan-500/40 relative overflow-hidden space-y-3.5"
    >
      {/* Decorative cyber subtle accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 via-blue-500/5 to-transparent pointer-events-none" />

      {/* Row 1: User / Schedule Header and Role Badge */}
      <div className="flex items-center justify-between gap-3 relative z-10 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${
              isAdmin
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
            }`}
          >
            {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-bold text-white tracking-wide truncate">
              {label ? `${label}'s Schedule` : 'SmartLock Schedule'}
            </h4>
            
            <span
              className={`text-xs px-2.5 py-1 rounded-xl font-mono uppercase font-bold border shrink-0 ${
                isAdmin
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}
            >
              {isAdmin ? 'Admin' : 'User'}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Status Banner (Dedicated clean mobile row to avoid colliding with tags) */}
      <div className="relative z-10">
        <div
          className={`w-full px-3.5 py-2 rounded-2xl text-xs font-mono font-bold border flex items-center justify-between shadow-sm ${
            isCurrentlyAuthorized
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {isCurrentlyAuthorized ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="tracking-wide">
              {isCurrentlyAuthorized ? 'IN ACTIVE WINDOW' : 'OUTSIDE PERMITTED WINDOW'}
            </span>
          </div>
          <span className="text-[11px] font-normal text-slate-300 hidden sm:inline">
            {isCurrentlyAuthorized ? 'Authorized to Lock/Unlock' : 'Lock Operations Blocked'}
          </span>
        </div>
      </div>

      {/* Row 3: Authorized Time Window */}
      <div className="space-y-2.5 relative z-10">
        <div className="bg-[#0f172a] p-3.5 rounded-2xl border border-slate-800/90 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-mono uppercase text-slate-400 block font-semibold">
                Authorized Schedule
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-mono font-bold text-white break-all">
                  {displayTime}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 4: Allowed Days */}
        <div className="bg-[#0f172a] p-3.5 rounded-2xl border border-slate-800/90 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-mono uppercase text-slate-400 block font-semibold mb-1">
                Allowed Days
              </span>
              <div className="flex flex-wrap gap-1">
                {ALL_DAYS.map((day) => {
                  const isDayActive = hasDayConfigs
                    ? !!dayConfigs[day]?.enabled
                    : (days || []).some((d) => d.toLowerCase().startsWith(day.toLowerCase()) || day.toLowerCase().startsWith(d.toLowerCase()));

                  return (
                    <span
                      key={day}
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                        isDayActive
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-[#111827] text-slate-600 border-slate-800'
                      }`}
                    >
                      {day}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {hasDayConfigs && (
            <button
              type="button"
              onClick={() => setShowDayBreakdown(!showDayBreakdown)}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-bold py-1 ml-auto"
            >
              <span>{showDayBreakdown ? 'Hide Details' : 'View Daily Details'}</span>
              {showDayBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Detailed Per-Day Breakdown when expanded */}
        {hasDayConfigs && showDayBreakdown && (
          <div className="p-3 bg-[#060a12] rounded-2xl border border-slate-800 space-y-2 animate-fade-in text-xs font-mono">
            {ALL_DAYS.map((day) => {
              const cfg = dayConfigs[day];
              const isEnabled = cfg?.enabled;
              return (
                <div
                  key={day}
                  className={`flex items-center justify-between py-1.5 px-2.5 rounded-xl ${
                    isEnabled ? 'bg-[#1e293b]/60 text-slate-200' : 'text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-cyan-400' : 'bg-slate-700'}`} />
                    <span className="font-bold">{day}</span>
                  </div>
                  <div>
                    {isEnabled ? (
                      cfg?.is24Hours ? (
                        <span className="text-cyan-400 font-bold">12:00 AM — 11:59 PM (24/7)</span>
                      ) : (
                        <span>
                          {cfg?.startTime || '09:00 AM'} — {cfg?.endTime || '05:00 PM'}
                        </span>
                      )
                    ) : (
                      <span className="text-slate-600">Access Disabled</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
