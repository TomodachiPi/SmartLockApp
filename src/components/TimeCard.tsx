import React from 'react';
import { User, Lock, Unlock, Clock, Calendar, AlertTriangle, ArrowRightLeft } from 'lucide-react';

interface TimeCardProps {
  username: string;
  permission: string;
  locked: boolean;
  startingTime: string;
  endingTime: string;
  date: string;
  notes?: string;
  isEmergencyOverride?: boolean;
  timestamp?: number;
}

function getValidEpoch(timestamp?: number, rawDate?: string, rawTime?: string): number | null {
  if (timestamp && typeof timestamp === 'number' && !isNaN(timestamp)) {
    // 13-digit millisecond timestamp (e.g. 1727431200000 for year 2024+)
    if (timestamp >= 1000000000000) return timestamp;
    // 10-digit second timestamp (e.g. 1727431200)
    if (timestamp >= 1000000000) return timestamp * 1000;
  }
  // If timestamp is missing or is small ESP uptime (millis < 1 billion):
  if (rawDate && rawDate.trim().length > 0 && rawDate.toLowerCase() !== 'today' && rawDate.toLowerCase() !== 'yesterday') {
    const timeToParse = rawTime && !rawTime.toLowerCase().includes('just now') && !rawTime.toLowerCase().includes('recent') ? rawTime : '12:00 PM';
    const parsed = Date.parse(`${rawDate.trim()} ${timeToParse}`);
    if (!isNaN(parsed) && parsed > 1000000000000) return parsed;
  }
  return null;
}

/**
 * Returns formatted actual time (e.g. "9:29 AM"), strictly formatting epoch timestamps to client's local timezone.
 */
function formatActualTime(rawTime: string | undefined, timestamp?: number): string {
  const validEpoch = getValidEpoch(timestamp, undefined, rawTime);
  if (validEpoch && validEpoch >= 1000000000000) {
    const d = new Date(validEpoch);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
  }
  if (
    rawTime &&
    rawTime.trim().length > 0 &&
    !rawTime.toLowerCase().includes('just now') &&
    !rawTime.toLowerCase().includes('recent') &&
    !rawTime.toLowerCase().includes('undefined')
  ) {
    return rawTime.trim();
  }
  const d = new Date();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
}

/**
 * Returns formatted actual calendar date (e.g. "Sep 27, 2026"), resolving any placeholder "Today" / "Yesterday".
 */
function formatActualDate(rawDate: string | undefined, timestamp?: number): string {
  const validEpoch = getValidEpoch(timestamp, rawDate);
  if (validEpoch && validEpoch >= 1000000000000) {
    const d = new Date(validEpoch);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  if (
    rawDate &&
    rawDate.trim().length > 0 &&
    rawDate.toLowerCase() !== 'today' &&
    rawDate.toLowerCase() !== 'yesterday' &&
    !rawDate.toLowerCase().includes('undefined')
  ) {
    return rawDate.trim();
  }
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export const TimeCard: React.FC<TimeCardProps> = ({
  username,
  permission,
  locked,
  startingTime,
  endingTime,
  date,
  notes,
  isEmergencyOverride,
  timestamp,
}) => {
  const notesLower = (notes || '').toLowerCase();
  const isRelinquished =
    notesLower.includes('relinquish') ||
    notesLower.includes('transferred to') ||
    notesLower.includes('transferred custody to') ||
    notesLower.includes('handed over to');

  const isGained =
    notesLower.includes('gained room') ||
    notesLower.includes('gained custody') ||
    notesLower.includes('gained access') ||
    notesLower.includes('transferred from') ||
    notesLower.includes('received custody');

  const isRoomTransfer = isRelinquished || isGained || notesLower.includes('room transfer') || notesLower.includes('room custody');

  const isAdmin = (permission || '').toLowerCase().includes('admin') || username.toLowerCase() === 'administrator';

  const startFmt = formatActualTime(startingTime, timestamp);
  const endFmt = formatActualTime(endingTime, timestamp);
  const displayDate = formatActualDate(date, timestamp);

  const isSingleTime = !startingTime || !endingTime || startFmt === endFmt;
  const displayTime = isSingleTime ? endFmt : `${startFmt} — ${endFmt}`;

  return (
    <div
      id={`time-card-${username}-${startFmt.replace(/[^a-zA-Z0-9]/g, '')}`}
      className={`rounded-3xl p-4 sm:p-5 shadow-lg border transition-all relative overflow-hidden space-y-3 ${
        isEmergencyOverride
          ? 'bg-gradient-to-r from-red-950/60 via-[#200f18] to-[#111827] border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
          : isRelinquished
          ? 'bg-gradient-to-r from-amber-950/50 via-[#1f1726] to-[#111827] border-amber-500/50'
          : isGained
          ? 'bg-gradient-to-r from-cyan-950/50 via-[#0e2133] to-[#111827] border-cyan-500/50'
          : isRoomTransfer
          ? 'bg-gradient-to-r from-cyan-950/50 via-[#0e2133] to-[#111827] border-cyan-500/50'
          : 'bg-[#111827] border-slate-800/90 hover:border-slate-700'
      }`}
    >
      {/* Row 1: User Profile Header and Role Badge */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${
              isEmergencyOverride
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : isRelinquished
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : isGained || isRoomTransfer
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
            }`}
          >
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-base font-bold text-white tracking-wide truncate block">
              {username}
            </span>
            <span className="text-xs text-slate-400 font-mono block truncate">
              {permission || (isAdmin ? 'Admin Privilege' : 'Standard User Access')}
            </span>
          </div>
        </div>

        <span
          className={`text-xs px-2.5 py-1 rounded-xl font-mono uppercase font-bold border shrink-0 ${
            isAdmin
              ? 'bg-red-500/20 text-red-300 border-red-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}
        >
          {isAdmin ? 'Admin' : 'User'}
        </span>
      </div>

      {/* Row 2: Action Badge (Dedicated mobile row to prevent crowding/wrapping collisions) */}
      <div>
        {isEmergencyOverride ? (
          <div className="w-full px-3.5 py-2 rounded-2xl text-xs font-mono font-black uppercase bg-red-500 text-slate-950 flex items-center justify-center gap-2 shadow-md">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>EMERGENCY OVERRIDE</span>
          </div>
        ) : isRelinquished ? (
          <div className="w-full px-3.5 py-2 rounded-2xl text-xs font-mono font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center justify-center gap-2 shadow-sm">
            <ArrowRightLeft className="w-4 h-4 shrink-0" />
            <span>RELINQUISHED ACCESS</span>
          </div>
        ) : isGained ? (
          <div className="w-full px-3.5 py-2 rounded-2xl text-xs font-mono font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 flex items-center justify-center gap-2 shadow-sm">
            <ArrowRightLeft className="w-4 h-4 shrink-0" />
            <span>GAINED ACCESS</span>
          </div>
        ) : isRoomTransfer ? (
          <div className="w-full px-3.5 py-2 rounded-2xl text-xs font-mono font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 flex items-center justify-center gap-2 shadow-sm">
            <ArrowRightLeft className="w-4 h-4 shrink-0" />
            <span>ROOM TRANSFER</span>
          </div>
        ) : locked ? (
          <div className="w-full px-3.5 py-2 rounded-2xl text-xs font-mono font-bold uppercase bg-red-500/15 text-red-400 border border-red-500/40 flex items-center justify-center gap-2 shadow-sm">
            <Lock className="w-4 h-4 shrink-0" />
            <span>DOOR LOCKED</span>
          </div>
        ) : (
          <div className="w-full px-3.5 py-2 rounded-2xl text-xs font-mono font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 flex items-center justify-center gap-2 shadow-sm">
            <Unlock className="w-4 h-4 shrink-0" />
            <span>DOOR UNLOCKED</span>
          </div>
        )}
      </div>

      {/* Row 3: Date & Actual Time Footer */}
      <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-800/80 text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-slate-200 font-mono font-semibold">
          <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="tracking-tight text-xs sm:text-sm">{displayTime}</span>
        </div>
        <div className="flex items-center justify-end gap-2 text-slate-300 font-medium">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs sm:text-sm">{displayDate}</span>
        </div>
      </div>
    </div>
  );
};
