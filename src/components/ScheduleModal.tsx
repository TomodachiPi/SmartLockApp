import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { LabNoteSchedule } from '../types';
import { Calendar, Clock, X, Plus, Check, Edit3, AlertTriangle, Tag } from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteToEdit?: LabNoteSchedule | null;
}

// Helper to convert HH:mm (24-hour) to 12-hour AM/PM format
const formatTo12Hour = (time24: string): string => {
  if (!time24) return time24;
  if (time24.toUpperCase().includes('AM') || time24.toUpperCase().includes('PM')) {
    return time24;
  }
  const parts = time24.split(':');
  const h = parseInt(parts[0], 10);
  if (isNaN(h)) return time24;
  const m = parts[1] || '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const formattedHours = h12 < 10 ? `0${h12}` : `${h12}`;
  return `${formattedHours}:${m} ${period}`;
};

// Helper to convert 12-hour AM/PM or arbitrary time to 24-hour HH:mm format for <input type="time">
const formatTo24Hour = (timeStr: string): string => {
  if (!timeStr) return '10:00';
  if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) {
    const isPM = timeStr.toUpperCase().includes('PM');
    const isAM = timeStr.toUpperCase().includes('AM');
    const cleaned = timeStr.replace(/AM|PM/gi, '').trim();
    const parts = cleaned.split(':');
    let h = parseInt(parts[0], 10) || 0;
    const m = parts[1] || '00';
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return `${h < 10 ? `0${h}` : h}:${m}`;
  }
  return timeStr;
};

// Helper to parse date string (YYYY-MM-DD) and time string (HH:mm or 12h) into Date object
const parseDateTime = (dateStr: string, timeStr: string): Date | null => {
  if (!dateStr || !timeStr) return null;
  let hours = 0;
  let minutes = 0;

  if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) {
    const isPM = timeStr.toUpperCase().includes('PM');
    const isAM = timeStr.toUpperCase().includes('AM');
    const cleaned = timeStr.replace(/AM|PM/gi, '').trim();
    const [h, m] = cleaned.split(':').map(Number);
    let hour = h || 0;
    if (isPM && hour < 12) hour += 12;
    if (isAM && hour === 12) hour = 0;
    hours = hour;
    minutes = m || 0;
  } else {
    const [h, m] = timeStr.split(':').map(Number);
    hours = isNaN(h) ? 0 : h;
    minutes = isNaN(m) ? 0 : m;
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, noteToEdit }) => {
  const { addLabNote, updateLabNote, currentUser } = useApp();

  const isEditing = !!noteToEdit;

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [purpose, setPurpose] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (noteToEdit) {
        setTitle(noteToEdit.title || '');
        const sDate =
          noteToEdit.startDate ||
          (noteToEdit.date?.includes(' to ') ? noteToEdit.date.split(' to ')[0] : noteToEdit.date) ||
          new Date().toISOString().split('T')[0];
        const eDate =
          noteToEdit.endDate ||
          (noteToEdit.date?.includes(' to ') ? noteToEdit.date.split(' to ')[1] : noteToEdit.date) ||
          sDate;
        setStartDate(sDate);
        setEndDate(eDate);
        setStartTime(formatTo24Hour(noteToEdit.startTime || '10:00 AM'));
        setEndTime(formatTo24Hour(noteToEdit.endTime || '12:00 PM'));
        setPurpose(noteToEdit.purpose || '');
      } else {
        const today = new Date().toISOString().split('T')[0];
        setTitle('');
        setStartDate(today);
        setEndDate(today);
        setStartTime('10:00');
        setEndTime('12:00');
        setPurpose('');
      }
    }
  }, [isOpen, noteToEdit]);

  if (!isOpen) return null;

  const handleClose = () => {
    setErrorMessage(null);
    onClose();
  };

  const handleFieldChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Title validation
    if (!title.trim()) {
      setErrorMessage('Please enter a request title for the reservation.');
      return;
    }

    // 2. Date presence check
    if (!startDate) {
      setErrorMessage('Please select a valid start date.');
      return;
    }
    if (!endDate) {
      setErrorMessage('Please select a valid end date.');
      return;
    }

    // 3. Time presence check
    if (!startTime) {
      setErrorMessage('Please select a valid start time.');
      return;
    }
    if (!endTime) {
      setErrorMessage('Please select a valid end time.');
      return;
    }

    const now = new Date();
    // 1 minute buffer to account for form fill time
    const nowWithBuffer = new Date(now.getTime() - 60 * 1000);

    const startDateTime = parseDateTime(startDate, startTime);
    const endDateTime = parseDateTime(endDate, endTime);

    if (!startDateTime || isNaN(startDateTime.getTime())) {
      setErrorMessage('The selected start date or time is invalid.');
      return;
    }

    if (!endDateTime || isNaN(endDateTime.getTime())) {
      setErrorMessage('The selected end date or time is invalid.');
      return;
    }

    // 4. Deny if start date and time are in the past
    // If editing a reservation that was previously created, we allow saving if the start date hasn't been changed into the past,
    // but validate if start date and time are strictly before current time.
    if (startDateTime.getTime() < nowWithBuffer.getTime()) {
      const todayStr = now.toISOString().split('T')[0];
      if (startDate < todayStr) {
        setErrorMessage(`Start date (${startDate}) cannot be before today (${todayStr}).`);
      } else {
        const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setErrorMessage(
          `Start time (${formatTo12Hour(startTime)}) cannot be earlier than current time (${currentTimeStr}).`
        );
      }
      return;
    }

    // 5. Deny if end date is before start date
    if (endDate < startDate) {
      setErrorMessage(`End date (${endDate}) cannot be earlier than the start date (${startDate}).`);
      return;
    }

    // 6. Deny if end date & time is before or equal to start date & time
    if (endDateTime.getTime() <= startDateTime.getTime()) {
      if (startDate === endDate) {
        setErrorMessage(
          `End time (${formatTo12Hour(endTime)}) must be after the start time (${formatTo12Hour(startTime)}) on the same date.`
        );
      } else {
        setErrorMessage('The reservation end date and time must be after the start date and time.');
      }
      return;
    }

    // All validations passed!
    setErrorMessage(null);

    const formattedStartTime = formatTo12Hour(startTime);
    const formattedEndTime = formatTo12Hour(endTime);
    const dateFormatted = startDate === endDate ? startDate : `${startDate} to ${endDate}`;

    if (noteToEdit) {
      // Update existing reservation note
      updateLabNote({
        ...noteToEdit,
        title: title.trim(),
        date: dateFormatted,
        startDate,
        endDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        purpose: purpose.trim() || undefined,
      });
    } else {
      // Add new reservation note
      addLabNote({
        username: currentUser?.username || 'User',
        userRole: currentUser?.type || 'user',
        title: title.trim(),
        date: dateFormatted,
        startDate,
        endDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        purpose: purpose.trim() || undefined,
      });
    }

    setTitle('');
    setPurpose('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div
        id="schedule-modal-content"
        className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(6,182,212,0.18)] text-white space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="bg-cyan-500/15 p-2 rounded-xl text-cyan-400 border border-cyan-500/30">
              {isEditing ? <Edit3 className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {isEditing ? 'Edit Access Schedule Request' : 'Make Access Schedule Request'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? `Updating schedule access request`
                  : `Creating schedule access request`
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              <Tag className="w-3.5 h-3.5 text-white" />
              <span>Request Title:</span>
            </label>
            <input
              id="schedule-title-input"
              type="text"
              placeholder="e.g. Morning Computer Science Class or Evening Physics Class"
              value={title}
              onChange={(e) => handleFieldChange(setTitle, e.target.value)}
              className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none transition-colors placeholder:text-slate-600"
              required
            />
          </div>

          {/* Date Range Selection with prominent white Calendar icon */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-white" />
                <span>Start Date:</span>
              </label>
              <div className="relative">
                <input
                  id="schedule-start-date-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleFieldChange(setStartDate, e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 hover:border-slate-600 focus:border-cyan-400 text-white px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors [color-scheme:dark]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-white" />
                <span>End Date:</span>
              </label>
              <div className="relative">
                <input
                  id="schedule-end-date-input"
                  type="date"
                  value={endDate}
                  onChange={(e) => handleFieldChange(setEndDate, e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 hover:border-slate-600 focus:border-cyan-400 text-white px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors [color-scheme:dark]"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                <Clock className="w-3.5 h-3.5 text-white" />
                <span>Start Time:</span>
              </label>
              <div className="relative">
                <input
                  id="schedule-start-time-input"
                  type="time"
                  value={startTime}
                  onChange={(e) => handleFieldChange(setStartTime, e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 hover:border-slate-600 focus:border-cyan-400 text-white px-3 py-2 rounded-xl text-xs font-mono focus:outline-none transition-colors [color-scheme:dark]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                <Clock className="w-3.5 h-3.5 text-white" />
                <span>End Time:</span>
              </label>
              <div className="relative">
                <input
                  id="schedule-end-time-input"
                  type="time"
                  value={endTime}
                  onChange={(e) => handleFieldChange(setEndTime, e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 hover:border-slate-600 focus:border-cyan-400 text-white px-3 py-2 rounded-xl text-xs font-mono focus:outline-none transition-colors [color-scheme:dark]"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Additional Description:
              </label>
              <span className="text-[10px] font-mono text-slate-500 uppercase">Optional</span>
            </div>
            <textarea
              id="schedule-purpose-input"
              placeholder="Optional: e.g. Using the lab for evening physics class"
              value={purpose}
              onChange={(e) => handleFieldChange(setPurpose, e.target.value)}
              rows={3}
              className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 text-white p-3 rounded-xl text-xs focus:outline-none transition-colors placeholder:text-slate-600 resize-none leading-relaxed"
            />
          </div>

          {/* Popup Error Alert Banner directly above the action buttons */}
          {errorMessage && (
            <div
              id="schedule-validation-alert"
              role="alert"
              className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-3 text-rose-200 text-xs shadow-[0_0_20px_rgba(244,63,94,0.2)] animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-300 text-xs font-mono uppercase tracking-wide">
                      Invalid Date/Time
                    </p>
                    <p className="text-[11px] text-rose-200/90 leading-snug mt-0.5">
                      {errorMessage}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-rose-200 p-0.5 rounded transition-colors shrink-0 cursor-pointer"
                  aria-label="Dismiss alert"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-[#1e293b] hover:bg-[#334155] text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-schedule-request-btn"
              type="submit"
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-2.5 rounded-xl text-xs tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isEditing ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Update Request</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Confirm Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
