import React from 'react';
import { KeyRound, Clock, Calendar, ShieldCheck } from 'lucide-react';

interface AccessCardProps {
  permission: string;
  startingTime: string;
  endingTime: string;
  date: string;
}

export const AccessCard: React.FC<AccessCardProps> = ({
  permission,
  startingTime,
  endingTime,
  date,
}) => {
  return (
    <div
      id="access-period-card"
      className="bg-[#111827] rounded-2xl p-4 shadow-lg border border-slate-800 transition-all hover:border-cyan-500/40 relative overflow-hidden"
    >
      {/* Decorative cyber corner accent */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-cyan-500/10 to-transparent pointer-events-none" />

      <div className="space-y-3 relative z-10">
        {/* Permission Row */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Security Clearance</span>
            <span className="text-sm text-white font-bold tracking-wide">{permission}</span>
          </div>
        </div>

        {/* Time Row */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Authorized Hours</span>
            <span className="text-sm text-white font-mono font-medium">
              {startingTime} — {endingTime}
            </span>
          </div>
        </div>

        {/* Calendar Row */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Active Schedule Days</span>
            <span className="text-sm text-white font-semibold">{date}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
