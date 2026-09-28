import React, { useState, useEffect } from 'react';
import { useApp, isUserScheduleActiveNow } from '../context/AppContext';
import {
  ArrowRightLeft,
  X,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Ban,
} from 'lucide-react';
import { getAvatarByIndex } from '../data/avatarIcons';
import user_png from '../assets/images/user.png';

interface TransferAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransferAccessModal: React.FC<TransferAccessModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, profiles, userSchedules, initiateRoomTransfer } = useApp();

  const eligibleUsers = profiles.filter(
    (p) => p.username.toLowerCase() !== currentUser?.username.toLowerCase()
  );

  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Default to first user who is currently allowed to lock/unlock the room
  useEffect(() => {
    if (isOpen) {
      const firstAllowed = eligibleUsers.find((u) => isUserScheduleActiveNow(u, userSchedules));
      setSelectedUsername(firstAllowed ? firstAllowed.username : '');
      setErrorMessage(null);
      setIsSuccess(false);
      setNotes('');
    }
  }, [isOpen, profiles, userSchedules]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsSuccess(false);
    setErrorMessage(null);
    setNotes('');
    onClose();
  };

  const handleSendTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedUsername) {
      setErrorMessage('Please choose an authorized recipient user to transfer room access to.');
      return;
    }

    const selectedUser = eligibleUsers.find((u) => u.username === selectedUsername);
    if (!selectedUser || !isUserScheduleActiveNow(selectedUser, userSchedules)) {
      setErrorMessage('The selected user is outside their active access schedule and cannot unlock/lock the room.');
      return;
    }

    const res = initiateRoomTransfer(selectedUsername, notes);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to dispatch room transfer request.');
      return;
    }

    setIsSuccess(true);
    setTimeout(() => {
      handleClose();
    }, 1800);
  };

  return (
    <div
      id="transfer-access-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        id="transfer-access-modal"
        className="w-full max-w-lg bg-gradient-to-b from-[#111827] via-[#0d1322] to-[#0a0f1d] border-2 border-cyan-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-white relative overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400" />

        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-md flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">Transfer Room Access</h3>
              <p className="text-xs sm:text-sm text-slate-400">Hand over active custody to another member</p>
            </div>
          </div>

          <button
            id="close-transfer-modal-btn"
            type="button"
            onClick={handleClose}
            className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-10 text-center space-y-3.5 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-white">Transfer Offer Sent!</h4>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xs mx-auto">
              A transfer proposal has been dispatched to {selectedUsername}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendTransfer} className="space-y-4 pt-3 flex-1 overflow-y-auto no-scrollbar">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs sm:text-sm flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Recipient User Selection */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-mono text-slate-300 uppercase tracking-wider block font-semibold">
                Select Authorized Recipient:
              </label>

              <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar pr-0.5">
                {eligibleUsers.map((user) => {
                  const isAuthorizedNow = isUserScheduleActiveNow(user, userSchedules);
                  const isSelected = selectedUsername === user.username;

                  return (
                    <div
                      key={user.username}
                      onClick={() => {
                        if (isAuthorizedNow) {
                          setSelectedUsername(user.username);
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                          : isAuthorizedNow
                          ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700 cursor-pointer'
                          : 'bg-[#090d16] border-slate-900 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getAvatarByIndex(user.avatarIndex !== undefined ? user.avatarIndex : user.avatarUrl)}
                          alt={user.username}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = user_png;
                          }}
                          className="w-10 h-10 rounded-full object-contain p-0.5 bg-slate-900 border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-bold text-white truncate">{user.username}</span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold ${
                                user.type === 'admin'
                                  ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {user.type}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-mono block truncate">
                            {user.permission || 'Standard Lab User'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isAuthorizedNow ? (
                          <div className="flex items-center gap-1 text-emerald-400 font-mono text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Authorized</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-500 font-mono text-xs bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-800">
                            <Ban className="w-3.5 h-3.5" />
                            <span>Off Schedule</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Note */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-mono text-slate-300 uppercase tracking-wider block font-semibold">
                Reason / Transfer Note (Optional):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Session finished, handing over laboratory keys..."
                className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 rounded-2xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Action Buttons */}
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
                disabled={!selectedUsername}
                className="py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Submit Transfer</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
