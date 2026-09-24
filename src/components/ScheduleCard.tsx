import React from 'react';
import { Clock, Calendar, Edit3, Trash2, KeyRound, Shield, CheckCircle2 } from 'lucide-react';

interface ScheduleCardProps {
  label: string;
  role: 'admin' | 'user';
  time: string;
  color?: string;
  days?: string[];
  status?: 'active' | 'restricted';
  isAdminViewer?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({
  label,
  role,
  time,
  days,
  status = 'active',
  isAdminViewer = false,
  onEdit,
  onDelete,
}) => {
  const isRestricted = status === 'restricted';
  const isAdmin = role === 'admin';

  return (
    <div
      id={`schedule-card-${label.replace(/[^a-zA-Z0-9]/g, '')}`}
      onClick={isAdminViewer && onEdit ? onEdit : undefined}
      className={`relative rounded-2xl p-4 transition-all duration-200 bg-[#0f172a] border border-slate-800/90 shadow-md group ${
        isAdminViewer && onEdit
          ? 'cursor-pointer hover:border-cyan-500/50 hover:bg-[#131d2e] hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]'
          : 'hover:border-slate-700'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border shrink-0 ${
              isAdmin
                ? 'bg-red-500/10 text-red-400 border-red-500/25'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
            }`}
          >
            {isAdmin ? <Shield className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-white tracking-wide group-hover:text-cyan-300 transition-colors">
                {label}
              </h4>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-md font-mono uppercase tracking-wider font-extrabold border ${
                  isAdmin
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                }`}
              >
                {isAdmin ? 'Admin' : 'User'}
              </span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-md font-mono uppercase tracking-wider font-bold border flex items-center gap-1 ${
                  isRestricted
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {!isRestricted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {isRestricted ? 'Restricted' : 'Active Window'}
              </span>
            </div>
          </div>
        </div>

        {isAdminViewer && (
          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/40 transition-colors cursor-pointer"
                title="Edit Access Schedule"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                title="Delete Access Schedule"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Time & Days Details */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-400 text-[11px] font-mono uppercase">Authorized Hours:</span>
          <span className="text-white font-mono font-medium text-xs">{time}</span>
        </div>

        {days && days.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 text-[11px] font-mono uppercase">Allowed Days:</span>
            <div className="flex flex-wrap gap-1">
              {days.map((day) => (
                <span
                  key={day}
                  className="px-1.5 py-0.5 rounded bg-[#1e293b] text-[10px] font-mono font-semibold border border-slate-700"
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
