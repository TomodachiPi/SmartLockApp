import React, { useState } from 'react';
import { Clock, Calendar, Edit3, Trash2, KeyRound, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { DayScheduleConfig } from '../types';

interface ScheduleCardProps {
  label: string;
  role: 'admin' | 'user';
  time: string;
  color?: string;
  days?: string[];
  dayConfigs?: Record<string, DayScheduleConfig>;
  status?: 'active' | 'restricted';
  isAdminViewer?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const ScheduleCard: React.FC<ScheduleCardProps> = ({
  label = '',
  role = 'user',
  time = '',
  days = [],
  dayConfigs,
  status = 'active',
  isAdminViewer = false,
  onEdit,
  onDelete,
}) => {
  const isRestricted = status === 'restricted';
  const isAdmin = role === 'admin';
  const [showDayBreakdown, setShowDayBreakdown] = useState(false);

  const hasDayConfigs = dayConfigs && typeof dayConfigs === 'object' && Object.keys(dayConfigs).length > 0;
  const activeDaysList = hasDayConfigs
    ? ALL_DAYS.filter((d) => dayConfigs[d]?.enabled)
    : days || [];

  const cardIdSafe = (label || 'user').replace(/[^a-zA-Z0-9]/g, '');

  return (
    <div
      id={`schedule-card-${cardIdSafe}`}
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

      {/* Time & Days Summary Details */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-2.5">
        <div className="flex items-center gap-2 text-xs">
          <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-400 text-[11px] font-mono uppercase">Authorized Schedule:</span>
          <span className="text-white font-mono font-medium text-xs break-all">{time}</span>
        </div>

        {/* Day Pills Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 text-[11px] font-mono uppercase">Allowed Days:</span>
            <div className="flex flex-wrap gap-1">
              {ALL_DAYS.map((day) => {
                const isDayActive = hasDayConfigs
                  ? !!dayConfigs[day]?.enabled
                  : (days || []).includes(day);

                return (
                  <span
                    key={day}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                      isDayActive
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        : 'bg-[#090d16]/60 text-slate-600 border-slate-800'
                    }`}
                  >
                    {day}
                  </span>
                );
              })}
            </div>
          </div>

          {hasDayConfigs && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDayBreakdown(!showDayBreakdown);
              }}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer ml-auto"
            >
              <span>{showDayBreakdown ? 'Hide Daily Details' : 'View Daily Details'}</span>
              {showDayBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Detailed Per-Day Breakdown when toggled or expanded */}
        {hasDayConfigs && showDayBreakdown && (
          <div className="mt-2.5 p-2.5 bg-[#090d16] rounded-xl border border-slate-800 space-y-1.5 animate-fade-in text-[11px] font-mono">
            {ALL_DAYS.map((day) => {
              const cfg = dayConfigs[day];
              const isEnabled = cfg?.enabled;
              return (
                <div
                  key={day}
                  className={`flex items-center justify-between py-1 px-2 rounded-lg ${
                    isEnabled ? 'bg-[#1e293b]/50 text-slate-200' : 'text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-cyan-400' : 'bg-slate-700'}`} />
                    <span className="font-bold">{day}</span>
                  </div>
                  <div>
                    {isEnabled ? (
                      cfg?.is24Hours ? (
                        <span className="text-cyan-400 font-bold">24/7 Unlimited Access</span>
                      ) : (
                        <span className="text-white font-medium">
                          {cfg?.startTime || '09:00 AM'} — {cfg?.endTime || '05:00 PM'}
                        </span>
                      )
                    ) : (
                      <span className="text-slate-600 italic">No Access</span>
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
