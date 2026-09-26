import React from 'react';
import { Clock, Calendar, ShieldCheck, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

interface AccessCardProps {
  label?: string;
  role?: 'admin' | 'user';
  permission?: string;
  startingTime: string;
  endingTime: string;
  date: string;
  days?: string[];
  isCurrentlyAuthorized?: boolean;
}

export const AccessCard: React.FC<AccessCardProps> = ({
  label,
  role = 'user',
  permission = 'Standard Access',
  startingTime,
  endingTime,
  date,
  days,
  isCurrentlyAuthorized = true,
}) => {
  const isAdmin = role === 'admin';
  const currentDayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];

  return (
    <div
      id="access-period-card"
      className="bg-[#111827] rounded-2xl p-4 shadow-lg border border-slate-800 transition-all hover:border-cyan-500/40 relative overflow-hidden"
    >
      {/* Decorative cyber subtle accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/10 via-blue-500/5 to-transparent pointer-events-none" />

      {/* Top Header Row with Status */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl border shrink-0 ${
              isAdmin
                ? 'bg-red-500/10 text-red-400 border-red-500/25'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
            }`}
          >
            {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide">
                {label ? `${label}'s Schedule` : 'SmartLock Schedule'}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold border ${
                  isAdmin
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                }`}
              >
                {isAdmin ? 'Admin' : 'User'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{permission}</span>
          </div>
        </div>
        
        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border shrink-0 ${
            isCurrentlyAuthorized
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          }`}
          title={isCurrentlyAuthorized ? 'You can currently lock and unlock' : 'Outside permitted lock/unlock window'}
        >
          {isCurrentlyAuthorized ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>IN WINDOW</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>OUTSIDE WINDOW</span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2.5 pt-3 relative z-10">
        <div className="flex items-center justify-between bg-[#0f172a] px-3 py-2.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="text-[12px] font-mono uppercase text-slate-400 block">
                Assigned Time
              </span>
              <span className="text-xs text-white font-mono font-bold">
                {startingTime} — {endingTime}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-[#0f172a] px-3 py-2.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="text-[12px] font-mono uppercase text-slate-400 block">
                Assigned Days
              </span>
              {days && days.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {days.map((day) => {
                    const isToday = day.toLowerCase().startsWith(currentDayShort.toLowerCase());
                    return (
                      <span
                        key={day}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                          isToday
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-black'
                            : 'bg-[#1e293b] text-slate-400 border-slate-700'
                        }`}
                      >
                        {day}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
