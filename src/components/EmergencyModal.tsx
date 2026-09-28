import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, X, Bell } from 'lucide-react';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emergencyReasons = [
  'Immediate Building / Fire Evacuation',
  'Chemical / Hazardous Material Spill',
  'Medical Emergency',
  'Equipment Electrical Hazard / Smoke',
  'Power / Ventilation Failure',
  'None of the above, explained in additional notes',
];

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose }) => {
  const { triggerEmergency } = useApp();
  const [selectedReason, setSelectedReason] = useState(emergencyReasons[0]);
  const [customNotes, setCustomNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(3);
  const closeTimerRef = useRef<any>(null);
  const intervalTimerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitted(false);
      setSecondsRemaining(3);
    } else {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerEmergency(selectedReason, customNotes.trim());
    setIsSubmitted(true);
    setSecondsRemaining(3);

    let count = 3;
    intervalTimerRef.current = setInterval(() => {
      count -= 1;
      setSecondsRemaining(count);
      if (count <= 0 && intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    }, 1000);

    closeTimerRef.current = setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 3000);
  };

  const handleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
      <div
        id="emergency-modal-content"
        className="bg-[#0f172a] border-2 border-red-500 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-[0_0_50px_rgba(239,68,68,0.35)] relative text-white max-h-[92vh] flex flex-col"
      >
        {!isSubmitted ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-red-500/30 mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 p-2.5 rounded-xl text-slate-950 shadow-md">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-wide">Emergency Override</h3>
                  <p className="text-xs sm:text-sm text-red-400 font-mono">Alerts all administrators</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
              <div>
                <label className="block text-xs sm:text-sm font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Please Select Override Reason:
                </label>
                <div className="space-y-2">
                  {emergencyReasons.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all ${
                        selectedReason === reason
                          ? 'bg-red-500/20 border-red-500 text-white font-bold'
                          : 'bg-[#090d16] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="emergencyReason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="text-red-500 focus:ring-0 w-4 h-4"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Additional Incident Notes (Optional):
                </label>
                <textarea
                  placeholder="e.g. Evacuation initiated due to fire alarm trigger"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#090d16] border border-slate-800 focus:border-red-500 text-white p-3 rounded-xl text-xs sm:text-sm focus:outline-none transition-colors placeholder:text-slate-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="bg-[#1e293b] hover:bg-[#334155] text-slate-300 py-3 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-500 hover:bg-red-400 text-slate-950 font-black py-3 rounded-xl text-xs sm:text-sm tracking-wider transition-all duration-200 shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer min-h-[44px]"
                >
                  TRIGGER OVERRIDE
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="py-8 text-center space-y-4 animate-fade-in">
            <div className="bg-red-500/20 border border-red-500/60 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center text-red-400 shadow-[0_0_35px_rgba(239,68,68,0.5)]">
              <ShieldAlert className="w-10 h-10 animate-pulse text-red-400" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 bg-red-500 text-slate-950 px-3 py-1 rounded-md text-xs font-mono font-black uppercase tracking-widest shadow">
                EMERGENCY OVERRIDE ACTIVATED
              </span>
              <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">The SmartLock is Unlocking</h4>
            </div>

            <div className="bg-[#090d16] border border-red-500/40 rounded-2xl p-4 text-left space-y-2 shadow-inner">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Bell className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
                <span>All administrators have been alerted</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 pl-7 leading-relaxed">
                The SmartLock has been overridden due to <strong className="text-white">"{selectedReason}"</strong>.
              </p>
            </div>

            <div className="pt-2 flex flex-col items-center gap-2">
              <p className="text-xs sm:text-sm font-mono text-slate-400">
                Returning to lock screen in <span className="text-amber-400 font-bold">{secondsRemaining}s</span>...
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full bg-[#1e293b] hover:bg-[#334155] text-slate-200 py-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer border border-slate-700 min-h-[44px]"
            >
              Close Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
