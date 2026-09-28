import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RoomTransferRequest } from '../types';
import { TransferReviewModal } from './TransferReviewModal';
import { ArrowRightLeft, ChevronRight } from 'lucide-react';

export const RoomTransferNotificationBanner: React.FC = () => {
  const { roomTransfers, currentUser } = useApp();
  const [activeReviewTransfer, setActiveReviewTransfer] = useState<RoomTransferRequest | null>(null);

  if (!currentUser) return null;

  const pendingTransfers = roomTransfers.filter(
    (t) =>
      t.toUsername.toLowerCase() === currentUser.username.toLowerCase() &&
      t.status === 'pending'
  );

  if (pendingTransfers.length === 0) return null;

  return (
    <>
      <div id="room-transfer-notifications" className="mx-4 mt-2 space-y-2.5">
        {pendingTransfers.map((transfer) => (
          <div
            key={transfer.id}
            id={`transfer-notification-${transfer.id}`}
            onClick={() => setActiveReviewTransfer(transfer)}
            className="bg-gradient-to-r from-cyan-950/90 via-[#0f1d2e] to-blue-950/90 border-2 border-cyan-400/80 rounded-2xl p-4 shadow-[0_0_25px_rgba(6,182,212,0.3)] text-white cursor-pointer hover:border-cyan-300 transition-all group animate-pulse-slow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="bg-cyan-500 p-2.5 rounded-xl text-slate-950 mt-0.5 shrink-0 shadow-md group-hover:scale-110 transition-transform">
                  <ArrowRightLeft className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-slate-950 text-xs font-mono font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        transfer.requestType === 'request'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-cyan-400 text-slate-950'
                      }`}
                    >
                      {transfer.requestType === 'request' ? 'ACCESS REQUEST' : 'TRANSFER OFFER'}
                    </span>
                    <span className="text-xs font-mono text-cyan-300">{transfer.timestamp}</span>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-white mt-1 truncate">
                    {transfer.requestType === 'request'
                      ? `Room Access Request from ${transfer.fromUsername}`
                      : 'Room Access Transfer Request'}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-200 mt-1 leading-snug">
                    <strong className="text-cyan-300 font-bold">{transfer.fromUsername}</strong> ({transfer.fromUserRole}){' '}
                    {transfer.requestType === 'request'
                      ? 'is requesting room access for '
                      : 'wants to transfer room access for '}
                    <span className="text-white font-semibold">{transfer.doorName}</span>
                    {transfer.requestType === 'request' ? ' from you.' : ' to you.'}
                  </p>
                  {transfer.notes && (
                    <p className="text-xs text-slate-300 italic mt-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                      Note: "{transfer.notes}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pt-1">
                <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow group-hover:brightness-110 transition-all flex items-center gap-1 min-h-[40px]">
                  <span>Review</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <TransferReviewModal
        transfer={activeReviewTransfer}
        isOpen={!!activeReviewTransfer}
        onClose={() => setActiveReviewTransfer(null)}
      />
    </>
  );
};
