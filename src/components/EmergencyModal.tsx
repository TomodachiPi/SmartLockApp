import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, AlertTriangle, X, Bell } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div
        id="emergency-modal-content"
        className="bg-[#0f172a] border-2 border-red-500 rounded-2xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.35)] relative text-white"
      >
        {!isSubmitted ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-red-500/30 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="bg-red-500 p-2 rounded-xl text-slate-950 shadow-md">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-wide">Emergency Door Override</h3>
                  <p className="text-xs text-red-400 font-mono">And broadcasts override to all adminstrators</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Please Select Override Reason:
                </label>
                <div className="space-y-1.5">
                  {emergencyReasons.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedReason === reason
                          ? 'bg-red-500/20 border-red-500 text-white font-bold'
                          : 'bg-[#090d16] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="emergencyReason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="text-red-500 focus:ring-0"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Additional Incident Notes (Optional):
                </label>
                <textarea
                  placeholder="e.g. Evacuation initiated due to fire alarm trigger"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#090d16] border border-slate-800 focus:border-red-500 text-white p-2.5 rounded-xl text-xs focus:outline-none transition-colors placeholder:text-slate-600 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 bg-[#1e293b] hover:bg-[#334155] text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-500 hover:bg-red-400 text-slate-950 font-black py-2.5 rounded-xl text-xs tracking-wider transition-all duration-200 shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer"
                >
                  OVERRIDE
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="py-6 text-center space-y-4 animate-fade-in">
            <div className="bg-red-500/20 border border-red-500/60 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center text-red-400 shadow-[0_0_35px_rgba(239,68,68,0.5)]">
              <ShieldAlert className="w-10 h-10 animate-pulse text-red-400" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 bg-red-500 text-slate-950 px-3 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-widest shadow">
                EMERGENCY OVERRIDE ACTIVATED
              </span>
              <h4 className="text-xl font-black text-white tracking-tight">The SmartLock is Unlocking</h4>
            </div>

            <div className="bg-[#090d16] border border-red-500/40 rounded-xl p-4 text-left space-y-2 shadow-inner">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Bell className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                <span>All administrators have been alerted</span>
              </div>
              <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                The SmartLock has been overriden due to <strong className="text-white">"{selectedReason}"</strong>.
              </p>
            </div>

            <div className="pt-2 flex flex-col items-center gap-2">
              <p className="text-xs font-mono text-slate-400">
                Returning to lock screen in <span className="text-amber-400 font-bold">{secondsRemaining}s</span>...
              </p>
            </div>

            <button
            type="button"
            onClick={handleClose}
            className="w-full bg-[#1e293b] hover:bg-[#334155] text-slate-200 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-700"
            >
            Close Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
