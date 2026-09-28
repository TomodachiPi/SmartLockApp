import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle,
  Send,
} from 'lucide-react';
import { getAvatarByIndex } from '../data/avatarIcons';
import user_png from '../assets/images/user.png';

interface RequestAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionHolderName: string;
}

export const RequestAccessModal: React.FC<RequestAccessModalProps> = ({
  isOpen,
  onClose,
  sessionHolderName,
}) => {
  const { profiles, requestRoomAccess } = useApp();
  const [notes, setNotes] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const holderProfile = profiles.find(
    (p) => p.username.toLowerCase() === sessionHolderName.toLowerCase()
  );

  const handleClose = () => {
    setIsSuccess(false);
    setErrorMessage(null);
    setNotes('');
    onClose();
  };

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const res = requestRoomAccess(notes);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to send room access request.');
      return;
    }

    setIsSuccess(true);
    setTimeout(() => {
      handleClose();
    }, 1800);
  };

  const presetReasons = [
    'Finished Class Early',
    'Cancelled Class',
    'Equipment Maintenance',
  ];

  return (
    <div
      id="request-access-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        id="request-access-modal"
        className="w-full max-w-lg bg-gradient-to-b from-[#111827] via-[#0d1322] to-[#0a0f1d] border-2 border-cyan-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-white relative overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Modal Top Nav */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-md flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Request Room Access
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">Ask current session holder for control</p>
            </div>
          </div>

          <button
            id="close-request-access-modal-btn"
            type="button"
            onClick={handleClose}
            className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-10 text-center space-y-3.5 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-white">Access Request Sent!</h4>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xs mx-auto">
              A notification banner has been dispatched to {sessionHolderName}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendRequest} className="space-y-4 pt-3 flex-1 overflow-y-auto no-scrollbar">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs sm:text-sm flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-mono text-slate-400 uppercase tracking-wider font-semibold">
                  Current Session Holder
                </span>
              </div>

              <div className="flex items-center gap-3.5 pt-1">
                <img
                  src={getAvatarByIndex(holderProfile?.avatarIndex !== undefined ? holderProfile.avatarIndex : holderProfile?.avatarUrl)}
                  alt={sessionHolderName}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = user_png;
                  }}
                  className="w-12 h-12 rounded-full object-contain p-0.5 bg-slate-900 border-2 border-cyan-400/80 shadow"
                />
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-white">{sessionHolderName}</h4>
                  <p className="text-xs sm:text-sm text-slate-400 font-mono">
                    {holderProfile?.permission || 'Active Room Controller'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick preset reason pills */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-mono text-slate-300 uppercase tracking-wider block font-semibold">
                Reason / Note for Handover:
              </label>

              <div className="flex flex-wrap gap-2">
                {presetReasons.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNotes(preset)}
                    className={`text-xs sm:text-sm font-mono px-3 py-1.5 rounded-xl border transition-all cursor-pointer min-h-[36px] ${
                      notes === preset
                        ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 font-bold shadow-sm'
                        : 'bg-[#0f172a] text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Write specific reason or instruction for requesting custody..."
                className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-colors resize-none mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs sm:text-sm font-bold transition cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <Send className="w-4 h-4" />
                <span>Send Request</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
