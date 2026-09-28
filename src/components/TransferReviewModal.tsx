import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RoomTransferRequest } from '../types';
import {
  X,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
  DoorOpen,
  FileText,
} from 'lucide-react';
import user_png from '../assets/images/user.png';
import { getAvatarByIndex } from '../data/avatarIcons';

interface TransferReviewModalProps {
  transfer: RoomTransferRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TransferReviewModal: React.FC<TransferReviewModalProps> = ({
  transfer,
  isOpen,
  onClose,
}) => {
  const { respondToRoomTransfer, currentUser, profiles } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'accepted' | 'declined'; text: string } | null>(null);

  if (!isOpen || !transfer) return null;

  const handleClose = () => {
    setResultMessage(null);
    setIsProcessing(false);
    onClose();
  };

  const isAccessRequest = transfer.requestType === 'request';
  const isSenderAdmin = transfer.fromUserRole === 'admin';

  const senderProfile = profiles.find(
    (p) => p.username.toLowerCase() === transfer.fromUsername.toLowerCase()
  );

  const handleAction = (accept: boolean) => {
    setIsProcessing(true);
    respondToRoomTransfer(transfer.id, accept);

    if (accept) {
      setResultMessage({
        type: 'accepted',
        text: isAccessRequest
          ? `Room access transferred to ${transfer.fromUsername}!`
          : 'Room access accepted! You are now the active custody holder.',
      });
    } else {
      setResultMessage({
        type: 'declined',
        text: isAccessRequest ? 'Room access request declined.' : 'Room transfer offer declined.',
      });
    }

    setTimeout(() => {
      handleClose();
    }, 1500);
  };

  return (
    <div
      id="transfer-review-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) handleClose();
      }}
    >
      <div
        id="transfer-review-modal"
        className="w-full max-w-lg bg-gradient-to-b from-[#111827] via-[#0d1322] to-[#0a0f1d] border-2 border-cyan-500/50 rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(6,182,212,0.3)] text-white relative overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Glow Top Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500" />

        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-lg flex items-center justify-center shrink-0">
              <DoorOpen className="w-6 h-6" />
            </div>
            <div>
              <span
                className={`text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-md border ${
                  isAccessRequest
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                }`}
              >
                {isAccessRequest ? 'ROOM ACCESS REQUEST' : 'INCOMING TRANSFER'}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide mt-1">
                {isAccessRequest ? 'Room Access Handover Request' : 'Room Access Transfer Request'}
              </h3>
            </div>
          </div>

          {!isProcessing && (
            <button
              id="close-review-modal-btn"
              type="button"
              onClick={handleClose}
              className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {resultMessage ? (
          <div className="py-10 text-center space-y-3.5 animate-fade-in">
            <div
              className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center border-2 ${
                resultMessage.type === 'accepted'
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-red-500/20 border-red-500/60 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
              }`}
            >
              {resultMessage.type === 'accepted' ? (
                <CheckCircle2 className="w-9 h-9" />
              ) : (
                <XCircle className="w-9 h-9" />
              )}
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-white">
              {resultMessage.type === 'accepted' ? 'Access Transferred Successfully!' : 'Transfer Declined'}
            </h4>
            <p className="text-sm sm:text-base text-slate-300 max-w-xs mx-auto leading-relaxed">{resultMessage.text}</p>
          </div>
        ) : (
          <div className="space-y-4 pt-3 flex-1 overflow-y-auto no-scrollbar">
            {/* Sender Detail Card */}
            <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-mono text-slate-400 uppercase tracking-wider font-semibold">
                  Request Initiator
                </span>
                <span className="text-xs sm:text-sm font-mono text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  {transfer.timestamp}
                </span>
              </div>

              <div className="flex items-center gap-3.5 pt-1">
                <img
                  src={getAvatarByIndex(senderProfile?.avatarIndex !== undefined ? senderProfile.avatarIndex : senderProfile?.avatarUrl)}
                  alt={transfer.fromUsername}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = user_png;
                  }}
                  className="w-12 h-12 rounded-full object-contain p-0.5 bg-slate-900 border-2 border-cyan-500/40"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base sm:text-lg font-bold text-white">{transfer.fromUsername}</h4>
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-md border uppercase font-bold ${
                        isSenderAdmin
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {transfer.fromUserRole}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 font-mono mt-0.5">
                    {transfer.fromPermission || 'Authorized Access'}
                  </p>
                </div>
              </div>

              {transfer.notes && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 font-mono text-xs block font-semibold">Reason / Note:</span>
                    <span className="italic text-slate-200">"{transfer.notes}"</span>
                  </div>
                </div>
              )}
            </div>

            {/* Audit Log Explanation */}
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 text-xs sm:text-sm space-y-2.5 text-slate-200">
              <div className="flex items-center gap-2 font-bold text-cyan-300 text-sm">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>Security Handover Protocol:</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {isAccessRequest ? (
                  <>
                    Approving will hand over active room session custody of{' '}
                    <strong className="text-white font-bold">{transfer.doorName}</strong> to{' '}
                    <strong className="text-cyan-300 font-bold">{transfer.fromUsername}</strong>.
                  </>
                ) : (
                  <>
                    Accepting will hand over active room session control of{' '}
                    <strong className="text-white font-bold">{transfer.doorName}</strong> to you.
                  </>
                )}
              </p>
              <ul className="text-xs sm:text-sm font-mono space-y-1.5 pl-2 text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                  <span>
                    1. <strong className="text-white font-bold">{isAccessRequest ? (currentUser?.username || transfer.toUsername) : transfer.fromUsername}</strong> relinquishes
                    access
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>
                    2. <strong className="text-white font-bold">{isAccessRequest ? transfer.fromUsername : (currentUser?.username || transfer.toUsername)}</strong> gains room
                    access
                  </span>
                </li>
              </ul>
            </div>

            {/* Buttons: Accept vs Decline */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <button
                id="decline-transfer-btn"
                type="button"
                disabled={isProcessing}
                onClick={() => handleAction(false)}
                className="h-12 rounded-xl border-2 border-red-500/40 hover:bg-red-950/40 text-red-400 hover:text-red-300 text-sm sm:text-base font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
              >
                <XCircle className="w-5 h-5" />
                <span>Decline</span>
              </button>

              <button
                id="accept-transfer-btn"
                type="button"
                disabled={isProcessing}
                onClick={() => handleAction(true)}
                className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-sm sm:text-base font-black transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isAccessRequest ? 'Approve' : 'Accept'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
