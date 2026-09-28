import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  X,
  CheckCircle2,
  Lock,
  Unlock,
  Trash2,
  ShieldAlert,
  ArrowRightLeft,
  Check,
  UserCheck,
  CheckCheck,
} from 'lucide-react';
import { getAvatarByIndex } from '../data/avatarIcons';

interface NotificationsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTransferReview?: (transferId: string) => void;
}

type TabFilter = 'all' | 'transfers' | 'emergencies' | 'events' | 'approvals';

export const NotificationsCenterModal: React.FC<NotificationsCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentUser,
    roomTransfers,
    respondToRoomTransfer,
    dismissRoomTransfer,
    emergencyAlerts,
    resolveEmergency,
    adminNotifications,
    markAdminNotificationAsRead,
    clearAllAdminNotifications,
    profileRequests,
    approveRequest,
    rejectRequest,
    profiles,
  } = useApp();

  const [activeTab, setActiveTabFilter] = useState<TabFilter>('all');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdmin = currentUser?.type === 'admin';
  const currentUsernameLower = (currentUser?.username || '').toLowerCase();

  // 1. Filter room transfers relevant to this user
  const relevantTransfers = roomTransfers.filter(
    (t) =>
      t.toUsername.toLowerCase() === currentUsernameLower ||
      t.fromUsername.toLowerCase() === currentUsernameLower
  );
  const pendingTransfers = relevantTransfers.filter((t) => t.status === 'pending');

  // 2. Filter emergencies
  const activeEmergencies = emergencyAlerts.filter((a) => !a.resolved);

  // 3. Admin lock events
  const unreadAdminNotifs = adminNotifications.filter((n) => !n.read);
  const relevantAdminNotifs = isAdmin ? adminNotifications : [];

  // 4. Profile approvals
  const pendingApprovals = isAdmin ? profileRequests : [];

  const totalCount =
    pendingTransfers.length +
    activeEmergencies.length +
    (isAdmin ? unreadAdminNotifs.length + pendingApprovals.length : 0);

  const handleAcceptTransfer = (transferId: string, isAccessRequest: boolean, otherUser: string) => {
    respondToRoomTransfer(transferId, true);
    setActionSuccessMsg(
      isAccessRequest
        ? `Room custody transferred to ${otherUser}!`
        : `Room access accepted! You are now active custody holder.`
    );
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleDeclineTransfer = (transferId: string) => {
    respondToRoomTransfer(transferId, false);
    setActionSuccessMsg('Transfer request declined.');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleMarkAllRead = () => {
    adminNotifications.forEach((n) => {
      if (!n.read) markAdminNotificationAsRead(n.id);
    });
    setActionSuccessMsg('All notifications marked as read.');
    setTimeout(() => setActionSuccessMsg(null), 2500);
  };

  return (
    <div
      id="notifications-center-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="notifications-center-modal"
        className="w-full max-w-lg bg-gradient-to-b from-[#111827] via-[#0d1322] to-[#090d16] border-2 border-cyan-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-white relative overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Glowing Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-md flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Notifications & Alerts
                </h3>
                {totalCount > 0 && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950">
                    {totalCount} Active
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-mono">
                Room custody, overrides & activity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && unreadAdminNotifs.length > 0 && (
              <button
                id="notifs-mark-all-read-btn"
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs sm:text-sm font-mono font-bold text-cyan-300 hover:text-cyan-200 transition px-3 py-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                title="Mark all activity logs as read"
              >
                <CheckCheck className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Mark All Read</span>
              </button>
            )}
            <button
              id="close-notifications-center-btn"
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center cursor-pointer"
              aria-label="Close notification modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Success Toast Notice */}
        {actionSuccessMsg && (
          <div className="mt-3 p-3.5 rounded-2xl bg-emerald-950/95 border border-emerald-500/60 text-emerald-200 text-sm flex items-center gap-2.5 animate-fade-in shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
        )}

        {/* Filter Tabs with comfortable touch targets */}
        <div className="flex items-center gap-2 py-3 overflow-x-auto border-b border-slate-800/80 text-xs sm:text-sm font-mono no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTabFilter('all')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 font-bold min-h-[40px] flex items-center justify-center ${
              activeTab === 'all'
                ? 'bg-cyan-500/30 text-cyan-200 border-2 border-cyan-400 font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            All ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTabFilter('transfers')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 font-bold min-h-[40px] ${
              activeTab === 'transfers'
                ? 'bg-amber-500/30 text-amber-200 border-2 border-amber-400 font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
            <span>Room Custody</span>
            {pendingTransfers.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                {pendingTransfers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTabFilter('emergencies')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 font-bold min-h-[40px] ${
              activeTab === 'emergencies'
                ? 'bg-red-500/30 text-red-200 border-2 border-red-400 font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Emergencies</span>
            {activeEmergencies.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white font-black text-xs flex items-center justify-center">
                {activeEmergencies.length}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTabFilter('events')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 font-bold min-h-[40px] ${
                activeTab === 'events'
                  ? 'bg-cyan-500/30 text-cyan-200 border-2 border-cyan-400 font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Lock Logs</span>
              {unreadAdminNotifs.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center">
                  {unreadAdminNotifs.length}
                </span>
              )}
            </button>
          )}

          {isAdmin && pendingApprovals.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTabFilter('approvals')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 font-bold min-h-[40px] ${
                activeTab === 'approvals'
                  ? 'bg-emerald-500/30 text-emerald-200 border-2 border-emerald-400 font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Approvals</span>
              <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center">
                {pendingApprovals.length}
              </span>
            </button>
          )}
        </div>

        {/* Scrollable Notification List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 no-scrollbar">
          {(activeTab === 'all' || activeTab === 'transfers') && (
            <>
              {relevantTransfers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-mono text-slate-400 uppercase tracking-wider px-1">
                    <span className="flex items-center gap-2 font-bold">
                      <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                      <span>Room Access Handover</span>
                    </span>
                    <span className="font-semibold">{relevantTransfers.length} request(s)</span>
                  </div>

                  {relevantTransfers.map((transfer) => {
                    const isAccessRequest = transfer.requestType === 'request';
                    const isPending = transfer.status === 'pending';
                    const isRecipient =
                      transfer.toUsername.toLowerCase() === currentUsernameLower;
                    const fromUserObj = profiles.find(
                      (p) => p.username.toLowerCase() === transfer.fromUsername.toLowerCase()
                    );

                    return (
                      <div
                        key={transfer.id}
                        id={`notif-transfer-${transfer.id}`}
                        className={`p-4 rounded-2xl border transition-all ${
                          isPending
                            ? isAccessRequest
                              ? 'bg-gradient-to-r from-amber-950/50 via-[#1a1f2e] to-[#0e1626] border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                              : 'bg-gradient-to-r from-cyan-950/50 via-[#0e2236] to-[#0e1626] border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.2)]'
                            : 'bg-[#090d16] border-slate-800 opacity-70'
                        }`}
                      >
                        {/* Requester Header */}
                        <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <img
                                src={getAvatarByIndex(fromUserObj?.avatarIndex !== undefined ? fromUserObj.avatarIndex : fromUserObj?.avatarUrl)}
                                alt={transfer.fromUsername}
                                className="w-12 h-12 rounded-full object-contain p-0.5 bg-slate-900 border-2 border-cyan-500/50 shadow"
                              />
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow ${
                                  isAccessRequest
                                    ? 'bg-amber-400 text-slate-950'
                                    : 'bg-cyan-400 text-slate-950'
                                }`}
                              >
                                {isAccessRequest ? 'REQ' : 'TRF'}
                              </span>
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base sm:text-lg font-bold text-white">
                                  {transfer.fromUsername}
                                </h4>
                                <span
                                  className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                                    transfer.fromUserRole === 'admin'
                                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  }`}
                                >
                                  {transfer.fromUserRole}
                                </span>
                              </div>
                              <span className="text-xs sm:text-sm font-mono text-slate-400 block mt-0.5">
                                {transfer.timestamp}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-lg border shrink-0 ${
                              isAccessRequest
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            }`}
                          >
                            {isAccessRequest ? 'ACCESS REQUEST' : 'TRANSFER OFFER'}
                          </span>
                        </div>

                        {/* Request Message */}
                        <div className="mt-3 text-sm sm:text-base text-slate-200 leading-relaxed">
                          <p>
                            <strong className="text-cyan-300 font-bold">{transfer.fromUsername}</strong>{' '}
                            {isAccessRequest
                              ? 'is requesting active room custody from '
                              : 'wants to transfer active room custody to '}
                            <strong className="text-white font-bold">{isRecipient ? 'You' : transfer.toUsername}</strong>.
                          </p>
                          {transfer.notes && (
                            <p className="mt-2.5 text-xs sm:text-sm text-slate-200 italic bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                              "{transfer.notes}"
                            </p>
                          )}
                        </div>

                        {/* Mobile-Friendly Action Buttons with large touch targets */}
                        {isPending && isRecipient ? (
                          <div className="grid grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => handleDeclineTransfer(transfer.id)}
                              className="h-11 sm:h-12 px-4 rounded-xl border-2 border-red-500/50 hover:bg-red-950/50 text-red-400 text-sm sm:text-base font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
                            >
                              <X className="w-4 h-4 sm:w-5 sm:h-5" />
                              <span>Decline</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleAcceptTransfer(
                                  transfer.id,
                                  isAccessRequest,
                                  transfer.fromUsername
                                )
                              }
                              className="h-11 sm:h-12 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-sm sm:text-base font-black transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                            >
                              <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                              <span>{isAccessRequest ? 'Approve' : 'Accept'}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-slate-800/80 text-xs sm:text-sm">
                            <span
                              className={`text-xs font-mono px-3 py-1 rounded-lg font-bold uppercase ${
                                transfer.status === 'accepted'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : transfer.status === 'declined'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {transfer.status === 'pending'
                                ? 'Awaiting Approval'
                                : transfer.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => dismissRoomTransfer(transfer.id)}
                              className="text-slate-400 hover:text-red-400 p-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                              title="Dismiss notification"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="text-xs sm:text-sm font-mono font-medium">Dismiss</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {(activeTab === 'all' || activeTab === 'emergencies') && (
            <>
              {emergencyAlerts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-mono text-slate-400 uppercase tracking-wider px-1">
                    <span className="flex items-center gap-2 font-bold">
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                      <span>Emergency Overrides & Alarms</span>
                    </span>
                    <span className="font-semibold">{activeEmergencies.length} active</span>
                  </div>

                  {emergencyAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      id={`notif-emergency-${alert.id}`}
                      className={`p-4 rounded-2xl border transition-all ${
                        !alert.resolved
                          ? 'bg-gradient-to-r from-red-950/80 via-[#221016] to-[#0e1320] border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.25)]'
                          : 'bg-[#090d16] border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center ${
                              !alert.resolved
                                ? 'bg-red-500 text-slate-950 shadow-md'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <ShieldAlert className="w-6 h-6" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs font-mono font-black uppercase px-2 py-0.5 rounded ${
                                  !alert.resolved
                                    ? 'bg-red-500 text-slate-950'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {!alert.resolved ? 'EMERGENCY OVERRIDE' : 'RESOLVED'}
                              </span>
                              <span className="text-xs sm:text-sm font-mono text-slate-400">
                                {alert.timestamp}
                              </span>
                            </div>

                            <p className="text-sm sm:text-base text-white font-bold mt-1">
                              Trigger: {alert.reason}
                            </p>
                            <p className="text-xs sm:text-sm text-slate-300">
                              Initiated by <strong className="text-red-300 font-bold">{alert.username}</strong>
                            </p>
                            {alert.notes && (
                              <p className="text-xs sm:text-sm text-slate-200 italic bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 mt-1">
                                "{alert.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {!alert.resolved && isAdmin && (
                        <div className="mt-3.5 pt-3 border-t border-red-500/40 flex justify-end">
                          <button
                            type="button"
                            onClick={() => resolveEmergency(alert.id)}
                            className="w-full sm:w-auto h-11 px-5 rounded-xl bg-red-500 hover:bg-red-400 text-slate-950 text-sm sm:text-base font-black transition-all shadow flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Clear & Resolve Alarm</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {isAdmin && (activeTab === 'all' || activeTab === 'events') && (
            <>
              {relevantAdminNotifs.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-mono text-slate-400 uppercase tracking-wider px-1">
                    <span className="flex items-center gap-2 font-bold">
                      <Lock className="w-4 h-4 text-cyan-400" />
                      <span>Lock & Unlock Events</span>
                    </span>
                    <button
                      type="button"
                      onClick={clearAllAdminNotifications}
                      className="text-xs sm:text-sm text-slate-400 hover:text-red-400 transition cursor-pointer flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear All</span>
                    </button>
                  </div>

                  {relevantAdminNotifs.slice(0, 20).map((notif) => {
                    const isLocked = notif.action === 'locked';

                    return (
                      <div
                        key={notif.id}
                        id={`notif-admin-${notif.id}`}
                        className={`p-4 rounded-2xl border transition-all ${
                          !notif.read
                            ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm'
                            : 'bg-[#090d16] border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isLocked
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {isLocked ? (
                                <Lock className="w-5 h-5" />
                              ) : (
                                <Unlock className="w-5 h-5" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded uppercase ${
                                    isLocked
                                      ? 'bg-red-500/20 text-red-300'
                                      : 'bg-emerald-500/20 text-emerald-300'
                                  }`}
                                >
                                  {isLocked ? 'DOOR LOCKED' : 'DOOR UNLOCKED'}
                                </span>
                                <span className="text-xs sm:text-sm font-mono text-slate-400">
                                  {notif.timestamp}
                                </span>
                              </div>
                              <p className="text-sm sm:text-base text-white mt-1">
                                <strong className="text-cyan-300 font-bold">{notif.username}</strong>{' '}
                                ({notif.userRole}) {notif.action} {notif.doorName}
                              </p>
                            </div>
                          </div>

                          {!notif.read && (
                            <button
                              type="button"
                              onClick={() => markAdminNotificationAsRead(notif.id)}
                              className="text-cyan-400 hover:text-cyan-300 p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-500/40 transition cursor-pointer shrink-0"
                              title="Mark as read"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {isAdmin && (activeTab === 'all' || activeTab === 'approvals') && (
            <>
              {pendingApprovals.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-mono text-slate-400 uppercase tracking-wider px-1">
                    <span className="flex items-center gap-2 font-bold">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <span>Pending Account Approvals</span>
                    </span>
                    <span className="font-semibold">{pendingApprovals.length} pending</span>
                  </div>

                  {pendingApprovals.map((req) => (
                    <div
                      key={req.username}
                      className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-500/50 space-y-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg uppercase border border-emerald-500/30">
                          NEW REGISTRATION
                        </span>
                        <span className="text-xs sm:text-sm font-mono text-slate-400">
                          {req.requestedAt || 'Recent'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base sm:text-lg text-white font-bold">
                          {req.username}
                        </h4>
                        <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
                          Requesting clearance for: <strong className="text-emerald-300">{req.type === 'admin' ? 'Administrator' : 'Standard User Access'}</strong>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => rejectRequest(req.username)}
                          className="h-11 px-3 rounded-xl border-2 border-red-500/40 text-red-400 text-sm font-bold hover:bg-red-950/40 transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => approveRequest(req.username)}
                          className="h-11 px-3 rounded-xl bg-emerald-500 text-slate-950 text-sm font-black hover:bg-emerald-400 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Approve Account</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {totalCount === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-800/60 flex items-center justify-center text-slate-400 border border-slate-700">
                <Bell className="w-7 h-7" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white">No active notifications</h4>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                You're all caught up! New room handovers, emergency alarms, and lock alerts will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
