import React, { useState } from 'react';
import { Clock, Calendar, Edit3, Trash2, KeyRound, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { DayScheduleConfig } from '../types';
import { isScheduleCurrentlyActive } from '../context/AppContext';

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

  const isCurrentlyInWindow = isScheduleCurrentlyActive(
    {
      label,
      role,
      time,
      days,
      dayConfigs,
      status,
    },
    role
  );

  const hasDayConfigs = dayConfigs && typeof dayConfigs === 'object' && Object.keys(dayConfigs).length > 0;
  const is24Hours =
    (time && (time.toLowerCase().includes('24/7') || time.toLowerCase().includes('unlimited'))) ||
    (hasDayConfigs && Object.values(dayConfigs).some((c) => c.enabled && c.is24Hours));

  const cardIdSafe = (label || 'user').replace(/[^a-zA-Z0-9]/g, '');

  return (
    <div
      id={`schedule-card-${cardIdSafe}`}
      //onClick={isAdminViewer && onEdit ? onEdit : undefined}
      className={`relative rounded-3xl p-4 sm:p-5 transition-all duration-200 bg-[#0f172a] border border-slate-800/90 shadow-md space-y-3.5 group ${
        isAdminViewer && onEdit
          ? 'hover:border-cyan-500/50 hover:bg-[#131d2e] hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]'
          : 'hover:border-slate-700'
      }`}
    >
      {/* Row 1: User / Label Header and Actions */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${
              isAdmin
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
            }`}
          >
            {isAdmin ? <Shield className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
          </div>

          <div className="min-w-0">
            <h4 className="text-base font-bold text-white tracking-wide truncate group-hover:text-cyan-300 transition-colors">
              {label}
            </h4>

            <span
              className={`text-xs px-2.5 py-1 rounded-xl font-mono uppercase font-bold border ${
                isAdmin
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}
            >
              {isAdmin ? 'Admin' : 'User'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAdminViewer && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/40 transition-colors cursor-pointer"
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
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                  title="Delete Access Schedule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Status Window Row (Dedicated row to eliminate collision with Admin/User tag) */}
      <div>
        <div
          className={`w-full px-3.5 py-2 rounded-2xl text-xs font-mono font-bold border flex items-center justify-between shadow-sm ${
            isRestricted
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              : isCurrentlyInWindow
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {isRestricted ? (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
            ) : isCurrentlyInWindow ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
            )}
            <span className="tracking-wide">
              {isRestricted
                ? 'ACCESS RESTRICTED'
                : isCurrentlyInWindow
                ? 'IN ACTIVE WINDOW'
                : 'OUTSIDE WINDOW'}
            </span>
          </div>

          <span className="text-[11px] font-normal text-slate-400 hidden sm:inline">
            {isRestricted
              ? 'Lock access disabled'
              : isCurrentlyInWindow
              ? 'Currently authorized to operate lock'
              : 'Currently outside scheduled window'}
          </span>
        </div>
      </div>

      {/* Row 3: Schedule Details */}
      <div className="space-y-2.5 pt-1">
        <div className="bg-[#090d16] p-3.5 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-mono uppercase text-slate-400 block font-semibold">
                Authorized Schedule
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-mono font-bold text-white break-all">
                  {is24Hours ? '12:00 AM — 11:59 PM' : time}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 4: Days */}
        <div className="bg-[#090d16] p-3.5 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-mono uppercase text-slate-400 block font-semibold mb-1">
                Allowed Days
              </span>
              <div className="flex flex-wrap gap-1">
                {ALL_DAYS.map((day) => {
                  const isDayActive = hasDayConfigs
                    ? !!dayConfigs[day]?.enabled
                    : (days || []).includes(day);

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
              onClick={(e) => {
                e.stopPropagation();
                setShowDayBreakdown(!showDayBreakdown);
              }}
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
