import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RoomTransferRequest } from '../types';
import {
  ArrowRightLeft,
  X,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
  DoorOpen,
  User,
  FileText,
  AlertCircle,
} from 'lucide-react';
import user_png from '../assets/images/user.png';

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
  const { respondToRoomTransfer, currentUser } = useApp();
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

  const handleAction = (accept: boolean) => {
    setIsProcessing(true);
    respondToRoomTransfer(transfer.id, accept);

    if (accept) {
      setResultMessage({
        type: 'accepted',
        text: isAccessRequest
          ? `Room access transferred to ${transfer.fromUsername}! Two activity log entries have been generated.`
          : 'Room access accepted! Two activity log entries have been generated.',
      });
    } else {
      setResultMessage({
        type: 'declined',
        text: isAccessRequest ? 'Room access request declined.' : 'Room transfer offer declined.',
      });
    }

    setTimeout(() => {
      handleClose();
    }, 1600);
  };

  return (
    <div
      id="transfer-review-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) handleClose();
      }}
    >
      <div
        id="transfer-review-modal"
        className="w-full max-w-md bg-gradient-to-b from-[#111827] to-[#0a0f1d] border-2 border-cyan-500/50 rounded-3xl p-5 shadow-[0_0_50px_rgba(6,182,212,0.3)] text-white relative overflow-hidden"
      >
        {/* Glow Top Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500" />

        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-lg">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <span
                className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border ${
                  isAccessRequest
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                }`}
              >
                {isAccessRequest ? 'ROOM ACCESS REQUEST' : 'INCOMING TRANSFER'}
              </span>
              <h3 className="text-base font-bold text-white tracking-wide mt-0.5">
                {isAccessRequest ? 'Room Access Handover Request' : 'Room Access Transfer Request'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">{transfer.doorName}</p>
            </div>
          </div>

          {!isProcessing && (
            <button
              id="close-review-modal-btn"
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {resultMessage ? (
          <div className="py-8 text-center space-y-3 animate-fade-in">
            <div
              className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center border-2 ${
                resultMessage.type === 'accepted'
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-red-500/20 border-red-500/60 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
              }`}
            >
              {resultMessage.type === 'accepted' ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : (
                <XCircle className="w-8 h-8" />
              )}
            </div>
            <h4 className="text-base font-bold text-white">
              {resultMessage.type === 'accepted' ? 'Access Transferred Successfully!' : 'Transfer Declined'}
            </h4>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">{resultMessage.text}</p>
          </div>
        ) : (
          <div className="space-y-4 pt-3">
            {/* Sender Detail Card */}
            <div className="p-3.5 rounded-2xl bg-[#090d16] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Request Initiator
                </span>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  {transfer.timestamp}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={user_png}
                  alt={transfer.fromUsername}
                  className="w-10 h-10 rounded-full object-cover border border-slate-600"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{transfer.fromUsername}</h4>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold ${
                        isSenderAdmin
                          ? 'bg-red-500/20 text-red-300 border-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {transfer.fromUserRole}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    {transfer.fromPermission || 'Authorized Access'}
                  </p>
                </div>
              </div>

              {transfer.notes && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-300">
                  <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 font-mono text-[10px] block">Reason / Note:</span>
                    <span className="italic">"{transfer.notes}"</span>
                  </div>
                </div>
              )}
            </div>

            {/* Audit Log Explanation */}
            <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Security Handover Protocol:</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {isAccessRequest
                  ? (
                    <>
                      Approving this request will hand over active room session custody of{' '}
                      <strong className="text-white">{transfer.doorName}</strong> to{' '}
                      <strong className="text-cyan-300">{transfer.fromUsername}</strong>. Two official entries will be generated in the activity audit logs:
                    </>
                  )
                  : (
                    <>
                      Accepting this transfer will hand over active room session control of{' '}
                      <strong className="text-white">{transfer.doorName}</strong> to you. Two official entries will be generated in the activity audit logs:
                    </>
                  )}
              </p>
              <ul className="text-[11px] font-mono space-y-1 pl-2 text-slate-400">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>
                    1. <strong className="text-slate-200">{isAccessRequest ? (currentUser?.username || transfer.toUsername) : transfer.fromUsername}</strong> relinquishes
                    room access
                  </span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>
                    2. <strong className="text-slate-200">{isAccessRequest ? transfer.fromUsername : (currentUser?.username || transfer.toUsername)}</strong> gains room
                    access
                  </span>
                </li>
              </ul>
            </div>

            {/* Buttons: Accept vs Decline */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                id="decline-transfer-btn"
                type="button"
                disabled={isProcessing}
                onClick={() => handleAction(false)}
                className="flex-1 py-2.5 rounded-xl border border-red-500/40 hover:bg-red-950/40 text-red-400 hover:text-red-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>{isAccessRequest ? 'Decline Request' : 'Decline'}</span>
              </button>

              <button
                id="accept-transfer-btn"
                type="button"
                disabled={isProcessing}
                onClick={() => handleAction(true)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAccessRequest ? 'Approve & Transfer' : 'Accept Transfer'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
