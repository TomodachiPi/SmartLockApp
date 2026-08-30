import React from 'react';
import { User, KeyRound, Lock, Unlock, Clock, Calendar, AlertTriangle } from 'lucide-react';

interface TimeCardProps {
  username: string;
  permission: string;
  locked: boolean;
  startingTime: string;
  endingTime: string;
  date: string;
  notes?: string;
  isEmergencyOverride?: boolean;
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
}) => {
  return (
    <div
      id={`time-card-${username}-${startingTime.replace(/[^a-zA-Z0-9]/g, '')}`}
      className={`rounded-2xl p-4 shadow-lg border transition-all relative overflow-hidden ${
        isEmergencyOverride
          ? 'bg-gradient-to-r from-red-950/40 to-[#120d14] border-red-500/50'
          : 'bg-[#111827] border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="space-y-2.5">
        {/* Top Header: User & Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <User className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-white tracking-wide">{username}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isEmergencyOverride ? (
              <span className="text-[10px] px-2.5 py-0.5 rounded-md font-mono font-black uppercase bg-red-500 text-slate-950 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                EMERGENCY OVERRIDE
              </span>
            ) : locked ? (
              <span className="text-[10px] px-2.5 py-0.5 rounded-md font-mono font-bold uppercase bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                DOOR LOCKED
              </span>
            ) : (
              <span className="text-[10px] px-2.5 py-0.5 rounded-md font-mono font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Unlock className="w-3 h-3" />
                DOOR UNLOCKED
              </span>
            )}
          </div>
        </div>

        {/* Clearance Row */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{permission}</span>
        </div>

        {/* Time Interval and Date Row */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{startingTime} — {endingTime}</span>
          </div>
          <div className="flex items-center justify-end gap-1.5 text-slate-300 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{date}</span>
          </div>
        </div>

        {notes && (
          <p className="text-[11px] text-slate-400 bg-[#090d16] p-2 rounded-lg border border-slate-800/80 italic">
            "{notes}"
          </p>
        )}
      </div>
    </div>
  );
};
