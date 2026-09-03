import React from 'react';
import { Clock, Shield, Edit3, Trash2, CheckCircle2, AlertOctagon } from 'lucide-react';

interface ScheduleCardProps {
  label: string;
  role: 'admin' | 'user';
  time: string;
  color: string;
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
  color,
  days,
  status = 'active',
  isAdminViewer = false,
  onEdit,
  onDelete,
}) => {
  const isRestricted = status === 'restricted';

  return (
    <div
      id={`schedule-card-${label.replace(/[^a-zA-Z0-9]/g, '')}`}
      onClick={isAdminViewer && onEdit ? onEdit : undefined}
      className={`relative rounded-xl p-4 transition-all duration-200 border bg-[#111827]/90 backdrop-blur-sm shadow-md ${
        isAdminViewer && onEdit
          ? 'cursor-pointer hover:border-cyan-500/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.12)] hover:translate-x-0.5'
          : 'border-slate-800/80'
      }`}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: color || (role === 'admin' ? '#ef4444' : '#06b6d4'),
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          {/* Header with Name & Role Pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-white tracking-wide">{label}</h4>
            <span
              className={`text-[9px] px-2 py-0.5 rounded-md font-mono uppercase tracking-wider font-extrabold border ${
                role === 'admin'
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
              }`}
            >
              {role === 'admin' ? 'Admin' : 'User'}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-mono text-[11px]">{time}</span>
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
                title="Delete Schedule"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
