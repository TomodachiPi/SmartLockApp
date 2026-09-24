import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowRightLeft,
  X,
  UserCheck,
  CheckCircle2,
  Clock,
  Shield,
  KeyRound,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import user_png from '../assets/images/user.png';

interface TransferAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransferAccessModal: React.FC<TransferAccessModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, profiles, initiateRoomTransfer } = useApp();

  const eligibleUsers = profiles.filter(
    (p) => p.username.toLowerCase() !== currentUser?.username.toLowerCase()
  );

  const [selectedUsername, setSelectedUsername] = useState<string>(
    eligibleUsers.length > 0 ? eligibleUsers[0].username : ''
  );
  const [notes, setNotes] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setErrorMessage('Please choose a recipient user to transfer room access to.');
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

  const selectedUserObj = eligibleUsers.find((u) => u.username === selectedUsername);

  return (
    <div
      id="transfer-access-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        id="transfer-access-modal"
        className="w-full max-w-md bg-gradient-to-b from-[#111827] to-[#0a0f1d] border border-cyan-500/40 rounded-3xl p-5 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-white relative overflow-hidden"
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400" />

        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-md">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Transfer Room Access</h3>
            </div>
          </div>

          <button
            id="close-transfer-modal-btn"
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3 animate-fade-in">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">Transfer Request Sent!</h4>
          </div>
        ) : (
          <form onSubmit={handleSendTransfer} className="space-y-4 pt-3">
            {/* Context Info Card */}
            <div className="p-3 rounded-2xl bg-[#090d16] border border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Current Session Holder:</span>
                <span className="text-cyan-300 font-bold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  {currentUser?.username} ({currentUser?.type === 'admin' ? 'Admin' : 'User'})
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
                Select User to Transfer Room Access to:
              </label>

              {eligibleUsers.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 text-center">
                  No other user accounts found to transfer access to.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {eligibleUsers.map((user) => {
                    const isSelected = selectedUsername === user.username;
                    const isUserAdmin = user.type === 'admin';

                    return (
                      <div
                        key={user.username}
                        id={`select-user-${user.username}`}
                        onClick={() => setSelectedUsername(user.username)}
                        className={`p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                            : 'bg-[#090d16] border-slate-800/90 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <img
                              src={user.avatarUrl || user_png}
                              alt={user.username}
                              className="w-8 h-8 rounded-full object-cover border border-slate-600"
                            />
                            {user.isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#090d16]" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{user.username}</span>
                              <span
                                className={`text-[8px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold ${
                                  isUserAdmin
                                    ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {user.type}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-700" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                id="cancel-transfer-btn"
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-send-transfer-btn"
                type="submit"
                disabled={!selectedUsername}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Send Transfer Request</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
