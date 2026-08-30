import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, AlertTriangle, X, Check } from 'lucide-react';

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
  const { triggerEmergency, currentUser } = useApp();
  const [selectedReason, setSelectedReason] = useState(emergencyReasons[0]);
  const [customNotes, setCustomNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerEmergency(selectedReason, customNotes.trim());
    setIsSubmitted(true);

    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 2200);
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
                  <p className="text-xs text-red-400 font-mono">Override Lock & Broadcast to Admin Alert</p>
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

            {/* Warning Box */}
            <div className="bg-red-950/40 border border-red-500/40 p-3 rounded-xl mb-4 text-sm text-red-200 leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-1.5" />
              <span>
                The SmartLock will unlock immediately and priority security alerts for Administrators will be broadcasted when this override is triggerred.
              </span>
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
                  placeholder="e.g. May nakalimutan sa loob ng lab lmao"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#090d16] border border-slate-800 focus:border-red-500 text-white p-2.5 rounded-xl text-xs focus:outline-none transition-colors placeholder:text-slate-600 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
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
          <div className="py-8 text-center space-y-3">
            <div className="bg-red-500 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center text-slate-950 shadow-[0_0_30px_#ef4444]">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h4 className="text-lg font-black text-white">SmartLock Overriden</h4>
            <p className="text-xs text-red-300 max-w-xs mx-auto">
              Alert broadcasted to Administrators.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
