import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserSchedule } from '../types';
import { X, Shield, Clock, Calendar, Check, Sliders, AlertCircle, Trash2 } from 'lucide-react';

interface AccessScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleToEdit?: UserSchedule | null;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const COLOR_OPTIONS = [
  { label: 'Cyan Cyber', value: '#06b6d4' },
  { label: 'Emerald Shield', value: '#10b981' },
  { label: 'Electric Blue', value: '#3b82f6' },
  { label: 'Amber Alert', value: '#f59e0b' },
  { label: 'Crimson Secure', value: '#ef4444' },
  { label: 'Violet Core', value: '#a855f7' },
];

export const AccessScheduleModal: React.FC<AccessScheduleModalProps> = ({
  isOpen,
  onClose,
  scheduleToEdit,
}) => {
  const { profiles, addSchedule, updateSchedule, deleteSchedule, currentUser } = useApp();

  const [label, setLabel] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [is24Hours, setIs24Hours] = useState(false);
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  const [color, setColor] = useState('#06b6d4');
  const [status, setStatus] = useState<'active' | 'restricted'>('active');

  const isAdmin = currentUser?.type === 'admin';

  useEffect(() => {
    if (scheduleToEdit) {
      setLabel(scheduleToEdit.label);
      setRole(scheduleToEdit.role);
      setColor(scheduleToEdit.color || '#06b6d4');
      setStatus(scheduleToEdit.status || 'active');

      if (scheduleToEdit.time.toLowerCase().includes('any time') || scheduleToEdit.time.toLowerCase().includes('24/7')) {
        setIs24Hours(true);
        setStartTime('12:00 AM');
        setEndTime('11:59 PM');
      } else {
        setIs24Hours(false);
      }

      if (scheduleToEdit.days && scheduleToEdit.days.length > 0) {
        setSelectedDays(scheduleToEdit.days);
      }
    } else {
      setLabel('');
      setRole('user');
      setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      setIs24Hours(false);
      setStartTime('09:00 AM');
      setEndTime('05:00 PM');
      setColor('#06b6d4');
      setStatus('active');
    }
  }, [scheduleToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const applyPreset = (preset: 'all' | 'weekdays' | 'weekends') => {
    if (preset === 'all') {
      setSelectedDays([...DAYS_OF_WEEK]);
    } else if (preset === 'weekdays') {
      setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    } else if (preset === 'weekends') {
      setSelectedDays(['Sat', 'Sun']);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    let timeString = '';
    const daysStr = selectedDays.length === 7 ? 'Monday to Sunday' : selectedDays.join(', ');

    if (is24Hours) {
      timeString = `24/7 All Day (${daysStr})`;
    } else {
      timeString = `${startTime} to ${endTime}, ${daysStr}`;
    }

    if (scheduleToEdit) {
      updateSchedule({
        id: scheduleToEdit.id,
        label: label.trim(),
        role,
        time: timeString,
        color,
        days: selectedDays,
        startTime: is24Hours ? '12:00 AM' : startTime,
        endTime: is24Hours ? '11:59 PM' : endTime,
        status,
      });
    } else {
      addSchedule({
        label: label.trim(),
        role,
        time: timeString,
        color,
        days: selectedDays,
        startTime: is24Hours ? '12:00 AM' : startTime,
        endTime: is24Hours ? '11:59 PM' : endTime,
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

  return (
    <div
      id="access-schedule-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        id="access-schedule-modal-card"
        className="bg-[#0f172a] w-full max-w-md rounded-2xl border border-[#334155] shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b] bg-[#1e293b]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {scheduleToEdit ? 'Modify Access Schedule' : 'Grant New Access Policy'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure access schedule for user
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Target User Account</span>
              <span className="text-[10px] text-cyan-400 font-mono">REQUIRED</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Administrator"
                className="w-full bg-[#090d16] border border-[#334155] focus:border-[#06b6d4] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none transition-colors"
                required
              />

              {/* Quick Select from Registered Lab Profiles */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-slate-400 mr-1">Quick Select:</span>
                {profiles.map((p) => (
                  <button
                    key={p.username}
                    type="button"
                    onClick={() => {
                      setLabel(p.username);
                      setRole(p.type);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition-all cursor-pointer ${
                      label === p.username
                        ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#06b6d4]'
                        : 'bg-[#1e293b]/60 border-[#334155] text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {p.username}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Days of Week Configuration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Authorized Days</label>
              <div className="flex gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="text-cyan-400 hover:underline cursor-pointer"
                >
                  All Days
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => applyPreset('weekdays')}
                  className="text-cyan-400 hover:underline cursor-pointer"
                >
                  Weekdays
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => applyPreset('weekends')}
                  className="text-cyan-400 hover:underline cursor-pointer"
                >
                  Weekends
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#06b6d4] text-[#090d16] border-[#06b6d4] shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-[#090d16] text-slate-400 border-[#334155] hover:border-slate-400'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Window Section */}
          <div className="space-y-2 pt-1 border-t border-[#1e293b]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Access Time Window</label>
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={is24Hours}
                  onChange={(e) => setIs24Hours(e.target.checked)}
                  className="rounded border-[#334155] text-[#06b6d4] focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] font-mono">24/7 Unlimited Access</span>
              </label>
            </div>

            {!is24Hours && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-white" />
                    <span>Starting Time</span>
                  </label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="w-full bg-[#090d16] border border-[#334155] focus:border-[#06b6d4] text-white px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-white" />
                    <span>Ending Time</span>
                  </label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="05:00 PM"
                    className="w-full bg-[#090d16] border border-[#334155] focus:border-[#06b6d4] text-white px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Access Schedule Color Accent</label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                    color === opt.value ? 'scale-115 border-white shadow-lg' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: opt.value }}
                  title={opt.label}
                >
                  {color === opt.value && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-3 border-t border-[#1e293b]">
            {scheduleToEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-red-500/40 transition-colors cursor-pointer"
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
              className="flex-1 bg-gradient-to-r from-[#06b6d4] to-[#0284c7] hover:from-[#22d3ee] hover:to-[#0369a1] text-[#090d16] py-2.5 rounded-xl text-xs font-black tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
            >
              {scheduleToEdit ? 'Save Changes' : 'Confirm Policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
