import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp, parseTimeToMinutes } from '../context/AppContext';
import { UserSchedule, DayScheduleConfig } from '../types';
import {
  X,
  Shield,
  Clock,
  Calendar,
  Check,
  Sliders,
  AlertCircle,
  Trash2,
  Search,
  User,
  KeyRound,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Info,
} from 'lucide-react';
import user_png from '../assets/images/user.png';

interface AccessScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleToEdit?: UserSchedule | null;
}

interface DayState {
  enabled: boolean;
  is24Hours: boolean;
  startTime: string;
  endTime: string;
}

const ALL_DAYS = [
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
  { short: 'Sat', full: 'Saturday' },
  { short: 'Sun', full: 'Sunday' },
];

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

// Helper to parse "09:00 AM" into components
function parseTimeComponents(timeStr: string | undefined | null) {
  if (!timeStr || typeof timeStr !== 'string') {
    return { hour: '09', minute: '00', period: 'AM' as 'AM' | 'PM' };
  }
  const cleanStr = timeStr.trim();
  const match = cleanStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    // Attempt fallback from 24h format
    const match24 = cleanStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      let h = parseInt(match24[1], 10);
      const m = match24[2] || '00';
      const p = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return {
        hour: h < 10 ? `0${h}` : `${h}`,
        minute: m,
        period: p as 'AM' | 'PM',
      };
    }
    return { hour: '09', minute: '00', period: 'AM' as 'AM' | 'PM' };
  }

  let h = parseInt(match[1], 10);
  if (isNaN(h)) h = 9;
  const hour = h < 10 ? `0${h}` : `${h}`;
  const minute = match[2] || '00';
  const period = (match[3] ? match[3].toUpperCase() : 'AM') as 'AM' | 'PM';
  return { hour, minute, period };
}

// Subcomponent: Intuitive Interactive Time Picker (No typing required)
interface TimePickerSelectProps {
  label: string;
  value: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
}

const TimePickerSelect: React.FC<TimePickerSelectProps> = ({
  label,
  value,
  onChange,
  disabled = false,
}) => {
  const { hour, minute, period } = parseTimeComponents(value);

  // Ensure the minute select always includes the current minute if not in standard step list
  const minuteOptions = useMemo(() => {
    if (minute && !MINUTES.includes(minute)) {
      return [...MINUTES, minute].sort();
    }
    return MINUTES;
  }, [minute]);

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${minute} ${period}`);
  };

  const handleMinuteChange = (newMin: string) => {
    onChange(`${hour}:${newMin} ${period}`);
  };

  const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
    onChange(`${hour}:${minute} ${newPeriod}`);
  };

  return (
    <div className={`space-y-1.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span>{label}</span>
        </label>
        <span className="text-[11px] font-mono font-extrabold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
          {value || '09:00 AM'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 bg-[#090d16] p-1.5 rounded-xl border border-slate-700/80">
        {/* Hour Select */}
        <div className="flex-1">
          <select
            value={hour}
            onChange={(e) => handleHourChange(e.target.value)}
            disabled={disabled}
            className="w-full bg-[#111827] text-white text-xs font-mono font-bold rounded-lg px-2 py-1.5 border border-slate-700 focus:border-cyan-400 focus:outline-none cursor-pointer"
          >
            {HOURS.map((h) => (
              <option key={h} value={h} className="bg-[#111827] text-white">
                {h}
              </option>
            ))}
          </select>
        </div>

        <span className="text-slate-500 font-bold">:</span>

        {/* Minute Select */}
        <div className="flex-1">
          <select
            value={minute}
            onChange={(e) => handleMinuteChange(e.target.value)}
            disabled={disabled}
            className="w-full bg-[#111827] text-white text-xs font-mono font-bold rounded-lg px-2 py-1.5 border border-slate-700 focus:border-cyan-400 focus:outline-none cursor-pointer"
          >
            {minuteOptions.map((m) => (
              <option key={m} value={m} className="bg-[#111827] text-white">
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* AM / PM Toggle */}
        <div className="flex bg-[#111827] rounded-lg p-0.5 border border-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => handlePeriodChange('AM')}
            disabled={disabled}
            className={`px-2 py-1 text-[11px] font-mono font-bold rounded cursor-pointer transition-all ${
              period === 'AM'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange('PM')}
            disabled={disabled}
            className={`px-2 py-1 text-[11px] font-mono font-bold rounded cursor-pointer transition-all ${
              period === 'PM'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
};

export const AccessScheduleModal: React.FC<AccessScheduleModalProps> = ({
  isOpen,
  onClose,
  scheduleToEdit,
}) => {
  const { profiles, userSchedules, addSchedule, updateSchedule, deleteSchedule, currentUser } = useApp();

  // Selected Target User
  const [selectedUsername, setSelectedUsername] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [userFilter, setUserFilter] = useState('');

  // Day schedules configuration
  const [dayConfigs, setDayConfigs] = useState<Record<string, DayState>>(() => {
    const initial: Record<string, DayState> = {};
    ALL_DAYS.forEach((d) => {
      initial[d.short] = {
        enabled: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d.short),
        is24Hours: false,
        startTime: '09:00 AM',
        endTime: '05:00 PM',
      };
    });
    return initial;
  });

  // Global uniform time inputs (for quick uniform applying)
  const [uniformStartTime, setUniformStartTime] = useState('09:00 AM');
  const [uniformEndTime, setUniformEndTime] = useState('05:00 PM');
  const [uniform24Hours, setUniform24Hours] = useState(false);
  const [activeTab, setActiveTab] = useState<'custom' | 'uniform'>('custom');

  const [status, setStatus] = useState<'active' | 'restricted'>('active');

  // Track modal open state and schedule ID so background ticks don't revert user edits
  const prevOpenRef = useRef(false);
  const currentEditIdRef = useRef<string | null | undefined>(undefined);

  // Load existing schedule when modal opens
  useEffect(() => {
    const isOpening = isOpen && !prevOpenRef.current;
    const isDifferentSchedule = isOpen && (scheduleToEdit ? scheduleToEdit.id !== currentEditIdRef.current : currentEditIdRef.current !== null);

    if (isOpening || isDifferentSchedule) {
      currentEditIdRef.current = scheduleToEdit ? scheduleToEdit.id : null;

      if (scheduleToEdit) {
        const label = scheduleToEdit.label || '';
        setSelectedUsername(label);
        setRole(scheduleToEdit.role || 'user');
        setStatus(scheduleToEdit.status || 'active');

        const timeStr = typeof scheduleToEdit.time === 'string' ? scheduleToEdit.time : '';
        const is24 =
          timeStr.toLowerCase().includes('24/7') ||
          timeStr.toLowerCase().includes('any time') ||
          timeStr.toLowerCase().includes('unlimited');

        setUniform24Hours(is24);
        setUniformStartTime(scheduleToEdit.startTime || '09:00 AM');
        setUniformEndTime(scheduleToEdit.endTime || '05:00 PM');

        if (scheduleToEdit.dayConfigs && typeof scheduleToEdit.dayConfigs === 'object' && Object.keys(scheduleToEdit.dayConfigs).length > 0) {
          const nextConfigs: Record<string, DayState> = {};
          ALL_DAYS.forEach((d) => {
            const existing = scheduleToEdit.dayConfigs?.[d.short];
            if (existing) {
              nextConfigs[d.short] = {
                enabled: !!existing.enabled,
                is24Hours: !!existing.is24Hours,
                startTime: existing.startTime || '09:00 AM',
                endTime: existing.endTime || '05:00 PM',
              };
            } else {
              nextConfigs[d.short] = {
                enabled: false,
                is24Hours: false,
                startTime: '09:00 AM',
                endTime: '05:00 PM',
              };
            }
          });
          setDayConfigs(nextConfigs);
        } else {
          // Fallback from legacy days list
          const legacyDays = Array.isArray(scheduleToEdit.days) ? scheduleToEdit.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
          const nextConfigs: Record<string, DayState> = {};
          ALL_DAYS.forEach((d) => {
            nextConfigs[d.short] = {
              enabled: legacyDays.includes(d.short),
              is24Hours: is24,
              startTime: scheduleToEdit.startTime || '09:00 AM',
              endTime: scheduleToEdit.endTime || '05:00 PM',
            };
          });
          setDayConfigs(nextConfigs);
        }
      } else {
        // Default new schedule
        const firstUser = profiles[0]?.username || '';
        setSelectedUsername(firstUser);
        setRole(profiles[0]?.type || 'user');
        setUserFilter('');
        setStatus('active');
        setUniform24Hours(false);
        setUniformStartTime('09:00 AM');
        setUniformEndTime('05:00 PM');
        setActiveTab('custom');

        const initial: Record<string, DayState> = {};
        ALL_DAYS.forEach((d) => {
          initial[d.short] = {
            enabled: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d.short),
            is24Hours: false,
            startTime: '09:00 AM',
            endTime: '05:00 PM',
          };
        });
        setDayConfigs(initial);
      }
    }

    prevOpenRef.current = isOpen;
  }, [isOpen, scheduleToEdit]);

  // Filter profiles based on search query
  const filteredProfiles = profiles.filter((p) => {
    const q = (userFilter || '').toLowerCase().trim();
    if (!q) return true;
    const uName = (p?.username || '').toLowerCase();
    const uType = (p?.type || '').toLowerCase();
    return uName.includes(q) || uType.includes(q);
  });

  // Day toggle and presets
  const toggleDayEnabled = (dayShort: string) => {
    setDayConfigs((prev) => ({
      ...prev,
      [dayShort]: {
        ...prev[dayShort],
        enabled: !prev[dayShort]?.enabled,
      },
    }));
  };

  const setDayTime = (dayShort: string, field: 'startTime' | 'endTime', val: string) => {
    setDayConfigs((prev) => ({
      ...prev,
      [dayShort]: {
        ...prev[dayShort],
        [field]: val,
      },
    }));
  };

  const setDay24Hours = (dayShort: string, is24: boolean) => {
    setDayConfigs((prev) => ({
      ...prev,
      [dayShort]: {
        ...prev[dayShort],
        is24Hours: is24,
      },
    }));
  };

  const applyDayPreset = (preset: 'all' | 'weekdays' | 'weekends' | 'clear') => {
    setDayConfigs((prev) => {
      const next = { ...prev };
      ALL_DAYS.forEach((d) => {
        let shouldEnable = false;
        if (preset === 'all') shouldEnable = true;
        else if (preset === 'weekdays') shouldEnable = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d.short);
        else if (preset === 'weekends') shouldEnable = ['Sat', 'Sun'].includes(d.short);
        else if (preset === 'clear') shouldEnable = false;

        next[d.short] = {
          ...(next[d.short] || { is24Hours: false, startTime: '09:00 AM', endTime: '05:00 PM' }),
          enabled: shouldEnable,
        };
      });
      return next;
    });
  };

  const applyUniformTimeToAllActive = () => {
    setDayConfigs((prev) => {
      const next = { ...prev };
      ALL_DAYS.forEach((d) => {
        if (next[d.short]?.enabled) {
          next[d.short] = {
            ...(next[d.short] || { enabled: true }),
            is24Hours: uniform24Hours,
            startTime: uniformStartTime,
            endTime: uniformEndTime,
          };
        }
      });
      return next;
    });
  };

  // Validation Checks
  const validationError = useMemo(() => {
    if (!selectedUsername || !selectedUsername.trim()) {
      return 'Please select a target user account.';
    }

    const enabledDays = ALL_DAYS.filter((d) => dayConfigs[d.short]?.enabled);
    if (enabledDays.length === 0) {
      return 'Please enable at least one authorized access day.';
    }

    // Check time range validity for every enabled day
    for (const day of enabledDays) {
      const config = dayConfigs[day.short];
      if (config && !config.is24Hours) {
        const startM = parseTimeToMinutes(config.startTime || '09:00 AM');
        const endM = parseTimeToMinutes(config.endTime || '05:00 PM');

        if (startM === null || endM === null) {
          return `Invalid time format on ${day.full}.`;
        }

        if (endM <= startM) {
          return `Ending time (${config.endTime || '05:00 PM'}) must be later than starting time (${config.startTime || '09:00 AM'}) on ${day.full}.`;
        }
      }
    }

    return null;
  }, [selectedUsername, dayConfigs]);

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) return;

    const enabledDays = ALL_DAYS.filter((d) => dayConfigs[d.short]?.enabled).map((d) => d.short);

    // Build dayConfigs object
    const finalDayConfigs: Record<string, DayScheduleConfig> = {};
    ALL_DAYS.forEach((d) => {
      finalDayConfigs[d.short] = {
        enabled: dayConfigs[d.short]?.enabled || false,
        is24Hours: dayConfigs[d.short]?.is24Hours || false,
        startTime: dayConfigs[d.short]?.startTime || '09:00 AM',
        endTime: dayConfigs[d.short]?.endTime || '05:00 PM',
      };
    });

    // Generate concise summary time string
    let timeSummary = '';
    const all24 = enabledDays.every((d) => dayConfigs[d]?.is24Hours);
    const sameTime =
      !all24 &&
      enabledDays.every(
        (d) =>
          !dayConfigs[d]?.is24Hours &&
          dayConfigs[d]?.startTime === dayConfigs[enabledDays[0]]?.startTime &&
          dayConfigs[d]?.endTime === dayConfigs[enabledDays[0]]?.endTime
      );

    const daysFormatted =
      enabledDays.length === 7
        ? 'Mon-Sun'
        : enabledDays.length === 5 &&
          ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].every((d) => enabledDays.includes(d))
        ? 'Mon-Fri'
        : enabledDays.join(', ');

    if (all24) {
      timeSummary = `24/7 Unlimited Access (${daysFormatted})`;
    } else if (sameTime && enabledDays.length > 0) {
      const firstCfg = dayConfigs[enabledDays[0]];
      timeSummary = `${daysFormatted}: ${firstCfg.startTime} - ${firstCfg.endTime}`;
    } else {
      // Group custom days
      const parts = enabledDays.map((d) => {
        const cfg = dayConfigs[d];
        if (cfg.is24Hours) return `${d}: 24/7`;
        return `${d}: ${cfg.startTime}-${cfg.endTime}`;
      });
      timeSummary = parts.join(', ');
    }

    const firstActiveDay = enabledDays[0] ? dayConfigs[enabledDays[0]] : null;

    if (scheduleToEdit) {
      updateSchedule({
        id: scheduleToEdit.id,
        label: selectedUsername.trim(),
        role,
        time: timeSummary,
        days: enabledDays,
        startTime: firstActiveDay?.startTime || '09:00 AM',
        endTime: firstActiveDay?.endTime || '05:00 PM',
        dayConfigs: finalDayConfigs,
        status,
      });
    } else {
      addSchedule({
        label: selectedUsername.trim(),
        role,
        time: timeSummary,
        days: enabledDays,
        startTime: firstActiveDay?.startTime || '09:00 AM',
        endTime: firstActiveDay?.endTime || '05:00 PM',
        dayConfigs: finalDayConfigs,
        status,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (scheduleToEdit) {
      deleteSchedule(scheduleToEdit.id);
      onClose();
    }
  };

  const selectedProfileObj = profiles.find(
    (p) => (p?.username || '').toLowerCase() === (selectedUsername || '').toLowerCase()
  );

  if (!isOpen) return null;

  return (
    <div
      id="access-schedule-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="access-schedule-modal-card"
        className="bg-[#0f172a] w-full max-w-lg rounded-2xl border border-slate-700 shadow-[0_0_60px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b] bg-[#1e293b]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide">
                {scheduleToEdit ? 'Modify Access Schedule Policy' : 'Configure Access Schedule Policy'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Set personalized days & time windows per user
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* 1. TARGET USER ACCOUNT SELECTION OVERHAUL */}
          <div className="space-y-2.5 bg-[#090d16]/80 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Target User Account</span>
              </label>
              <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                REQUIRED
              </span>
            </div>

            {/* Filter / Search Users Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Filter users by typing username or role..."
                className="w-full bg-[#111827] border border-slate-700/90 focus:border-cyan-400 text-white pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none placeholder:text-slate-500 transition-colors"
              />
              {userFilter && (
                <button
                  type="button"
                  onClick={() => setUserFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Interactive User Cards / Quick Select (Main selection mode) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-slate-400 font-semibold">
                Select from registered users ({filteredProfiles.length}):
              </span>

              {filteredProfiles.length === 0 ? (
                <div className="text-center py-3 bg-[#111827] rounded-xl border border-slate-800 text-xs text-slate-400">
                  No registered accounts matched &quot;{userFilter}&quot;
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {filteredProfiles.map((p) => {
                    const isSelected = (selectedUsername || '').toLowerCase() === (p?.username || '').toLowerCase();
                    const userHasSchedule = userSchedules.some(
                      (s) => (s?.label || '').toLowerCase() === (p?.username || '').toLowerCase()
                    );

                    return (
                      <button
                        key={p.username}
                        type="button"
                        onClick={() => {
                          setSelectedUsername(p.username);
                          setRole(p.type || 'user');
                        }}
                        className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50'
                            : 'bg-[#111827] border-slate-800 hover:border-slate-600 hover:bg-[#131d2e]'
                        }`}
                      >
                        <img
                          src={p.avatarUrl || user_png}
                          alt={p.username}
                          className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-white truncate">{p.username}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-mono uppercase px-1 py-0.2 rounded font-bold ${
                                p.type === 'admin'
                                  ? 'bg-red-500/20 text-red-300'
                                  : 'bg-cyan-500/20 text-cyan-300'
                              }`}
                            >
                              {p.type}
                            </span>
                            {userHasSchedule && (
                              <span className="text-[9px] font-mono text-emerald-400">• Scheduled</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 2. AUTHORIZED DAYS CONFIGURATION & PRESETS */}
          <div className="space-y-2.5 bg-[#090d16]/80 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Authorized Days</span>
              </label>

              {/* Quick Day Presets */}
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => applyDayPreset('all')}
                  className="px-1.5 py-0.5 rounded bg-[#111827] text-cyan-400 hover:bg-cyan-500/20 border border-slate-700 cursor-pointer"
                >
                  All Days
                </button>
                <button
                  type="button"
                  onClick={() => applyDayPreset('weekdays')}
                  className="px-1.5 py-0.5 rounded bg-[#111827] text-cyan-400 hover:bg-cyan-500/20 border border-slate-700 cursor-pointer"
                >
                  Mon-Fri
                </button>
                <button
                  type="button"
                  onClick={() => applyDayPreset('weekends')}
                  className="px-1.5 py-0.5 rounded bg-[#111827] text-cyan-400 hover:bg-cyan-500/20 border border-slate-700 cursor-pointer"
                >
                  Sat-Sun
                </button>
                <button
                  type="button"
                  onClick={() => applyDayPreset('clear')}
                  className="px-1.5 py-0.5 rounded bg-[#111827] text-slate-400 hover:text-red-400 border border-slate-700 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* 7 Days Toggle Buttons */}
            <div className="grid grid-cols-7 gap-1.5">
              {ALL_DAYS.map((day) => {
                const isDayEnabled = dayConfigs[day.short]?.enabled;
                return (
                  <button
                    key={day.short}
                    type="button"
                    onClick={() => toggleDayEnabled(day.short)}
                    className={`py-2 text-xs font-bold font-mono rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isDayEnabled
                        ? 'bg-gradient-to-b from-cyan-500 to-cyan-600 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-black'
                        : 'bg-[#111827] text-slate-500 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <span>{day.short}</span>
                    <span className="text-[9px] font-normal opacity-80">
                      {isDayEnabled ? 'ON' : 'OFF'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. ACCESS TIME WINDOW REHAUL: PER-DAY CUSTOM TIME OR UNIFORM SELECTOR */}
          <div className="space-y-3 bg-[#090d16]/80 p-3.5 rounded-xl border border-slate-800">
            {/* Tab switch for Quick Uniform vs Per-Day Customizer */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Authorized Time Windows</span>
              </label>

              <div className="flex bg-[#111827] p-0.5 rounded-lg border border-slate-700 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                    activeTab === 'custom'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Custom Per Day
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('uniform')}
                  className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                    activeTab === 'uniform'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Batch Apply
                </button>
              </div>
            </div>

            {/* BATCH APPLY UNIFORM HOURS TAB */}
            {activeTab === 'uniform' && (
              <div className="space-y-3 p-3 bg-[#111827] rounded-xl border border-slate-700/80 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-bold">Configure Common Time Window:</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uniform24Hours}
                      onChange={(e) => setUniform24Hours(e.target.checked)}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-cyan-300">24/7 Unlimited Access</span>
                  </label>
                </div>

                {!uniform24Hours && (
                  <div className="grid grid-cols-2 gap-3">
                    <TimePickerSelect
                      label="Starting Time"
                      value={uniformStartTime}
                      onChange={setUniformStartTime}
                    />
                    <TimePickerSelect
                      label="Ending Time"
                      value={uniformEndTime}
                      onChange={setUniformEndTime}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={applyUniformTimeToAllActive}
                  className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 py-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Apply this time window to all active days</span>
                </button>
              </div>
            )}

            {/* CUSTOM PER-DAY TIME WINDOWS */}
            <div className="space-y-3">
              <span className="text-[11px] font-mono text-slate-400 font-semibold block">
                {activeTab === 'custom'
                  ? 'Set custom access hours for each active day:'
                  : 'Current Day-by-Day Schedule overview:'}
              </span>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {ALL_DAYS.map((day) => {
                  const cfg = dayConfigs[day.short] || {
                    enabled: false,
                    is24Hours: false,
                    startTime: '09:00 AM',
                    endTime: '05:00 PM',
                  };
                  const isEnabled = !!cfg.enabled;

                  if (!isEnabled && activeTab === 'custom') {
                    return (
                      <div
                        key={day.short}
                        className="p-2.5 rounded-xl border border-slate-800/60 bg-[#111827]/40 flex items-center justify-between text-xs text-slate-600"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-700" />
                          <span className="font-bold text-slate-500 font-mono">{day.full}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleDayEnabled(day.short)}
                          className="text-[11px] font-mono text-cyan-400/80 hover:text-cyan-300 cursor-pointer"
                        >
                          + Enable {day.short}
                        </button>
                      </div>
                    );
                  }

                  if (!isEnabled && activeTab === 'uniform') {
                    return null;
                  }

                  return (
                    <div
                      key={day.short}
                      className="p-3 bg-[#111827] rounded-xl border border-slate-700 space-y-2.5"
                    >
                      {/* Day Header row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          <span className="text-xs font-black text-white font-mono">{day.full}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!cfg.is24Hours}
                              onChange={(e) => setDay24Hours(day.short, e.target.checked)}
                              className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-cyan-300">24/7 Access</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => toggleDayEnabled(day.short)}
                            className="text-[10px] font-mono text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                          >
                            Disable
                          </button>
                        </div>
                      </div>

                      {/* Time Pickers for this day (if not 24/7) */}
                      {!cfg.is24Hours && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                          <TimePickerSelect
                            label="Start"
                            value={cfg.startTime || '09:00 AM'}
                            onChange={(v) => setDayTime(day.short, 'startTime', v)}
                          />
                          <TimePickerSelect
                            label="End"
                            value={cfg.endTime || '05:00 PM'}
                            onChange={(v) => setDayTime(day.short, 'endTime', v)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Validation Alert Message */}
          {validationError && (
            <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Validation Issue: </strong>
                <span>{validationError}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-800 shrink-0">
            {scheduleToEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-red-500/40 transition-colors cursor-pointer"
                title="Delete this schedule policy"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#1e293b] hover:bg-[#334155] text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!!validationError}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer ${
                validationError
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              }`}
            >
              {scheduleToEdit ? 'Save Changes' : 'Confirm Policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
