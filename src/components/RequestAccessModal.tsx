import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  KeyRound,
  X,
  UserCheck,
  CheckCircle2,
  Clock,
  Shield,
  ArrowRightLeft,
  AlertCircle,
  DoorOpen,
  Send,
} from 'lucide-react';
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
  const { currentUser, profiles, requestRoomAccess } = useApp();
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
  ];

  return (
    <div
      id="request-access-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        id="request-access-modal"
        className="w-full max-w-md bg-gradient-to-b from-[#111827] to-[#0a0f1d] border border-cyan-500/40 rounded-3xl p-5 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-white relative overflow-hidden"
      >

        {/* Modal Top Nav */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-md">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide mt-0.5">
                Request Room Access
              </h3>
            </div>
          </div>

          <button
            id="close-request-access-modal-btn"
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3 animate-fade-in">
            <div className="w-14 h-14 mx-auto rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">Access Request Sent!</h4>
          </div>
        ) : (
          <form onSubmit={handleSendRequest} className="space-y-4 pt-3">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-[#090d16] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Current Session Holder
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="relative">
                  <img
                    src={holderProfile?.avatarUrl || user_png}
                    alt={sessionHolderName}
                    className="w-11 h-11 rounded-full object-cover border-2 border-cyan-500/40 shadow-sm"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#090d16]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">
                      {sessionHolderName}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold ${
                        holderProfile?.type === 'admin'
                          ? 'bg-red-500/20 text-red-300 border-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {holderProfile?.type || 'User'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono truncate">
                    {holderProfile?.permission || 'Active Access Holder'}
                  </p>
                </div>
              </div>
            </div>

            {/* Request Reason / Note Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="request-access-notes-input"
                  className="text-xs font-semibold text-slate-300"
                >
                  Reason for Transferring Access (Optional)
                </label>
              </div>

              <textarea
                id="request-access-notes-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Finished laboratory class early today..."
                className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 text-white p-2.5 rounded-xl text-xs focus:outline-none placeholder:text-slate-500 transition-colors resize-none"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                {presetReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setNotes(reason)}
                    className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                      notes === reason
                        ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                id="cancel-request-access-btn"
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="submit-request-access-btn"
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Request</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
