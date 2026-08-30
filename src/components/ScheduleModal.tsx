import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Clock, BookOpen, X, Plus } from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose }) => {
  const { addLabNote, currentUser } = useApp();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('12:00 PM');
  const [purpose, setPurpose] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !purpose.trim()) return;

    addLabNote({
      username: currentUser?.username || 'User',
      userRole: currentUser?.type || 'user',
      title: title.trim(),
      date,
      startTime,
      endTime,
      purpose: purpose.trim(),
    });

    setTitle('');
    setPurpose('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div
        id="schedule-modal-content"
        className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(6,182,212,0.15)] text-white space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="bg-cyan-500/10 p-2 rounded-xl text-cyan-400 border border-cyan-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Schedule Reservation Note</h3>
              <p className="text-xs text-slate-400">Reserve schedule access for the SmartLock</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Request Title:
            </label>
            <input
              id="schedule-title-input"
              type="text"
              placeholder="e.g. Morning Lab Class or Evening Cleaning"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none transition-colors placeholder:text-slate-600"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Start Date:
              </label>
              <input
                id="schedule-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 text-white px-3.5 py-2 rounded-xl text-xs focus:outline-none transition-colors"
                required
              />
            </div>
              <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                End Date:
              </label>
              <input
                id="schedule-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 text-white px-3.5 py-2 rounded-xl text-xs focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Start Time:
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="10:00 AM"
                className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 text-white px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                End Time:
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="12:00 PM"
                className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 text-white px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Additional Description:
            </label>
            <textarea
              id="schedule-purpose-input"
              placeholder="e.g. Using the laboratory for lecture purposes"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 text-white p-3 rounded-xl text-xs focus:outline-none transition-colors placeholder:text-slate-600 resize-none leading-relaxed"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#1e293b] hover:bg-[#334155] text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-2.5 rounded-xl text-xs tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Confirm Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
