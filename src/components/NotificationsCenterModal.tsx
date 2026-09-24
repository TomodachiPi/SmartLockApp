import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  X,
  CheckCircle2,
  Lock,
  Unlock,
  Trash2,
  Clock,
  Shield,
  ShieldAlert,
  DoorOpen,
  KeyRound,
  ArrowRightLeft,
  Check,
  XCircle,
  AlertTriangle,
  UserCheck,
  CheckCheck,
} from 'lucide-react';
import user_png from '../assets/images/user.png';

interface NotificationsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTransferReview?: (transferId: string) => void;
}

type TabFilter = 'all' | 'transfers' | 'emergencies' | 'events' | 'approvals';

export const NotificationsCenterModal: React.FC<NotificationsCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenTransferReview,
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
    activeRoomHolder,
  } = useApp();

  const [activeTab, setActiveTabFilter] = useState<TabFilter>('all');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdmin = currentUser?.type === 'admin';
  const currentUsernameLower = (currentUser?.username || '').toLowerCase();

  // 1. Filter room transfers relevant to this user
  // Transferred to this user OR requested from this user
  const relevantTransfers = roomTransfers.filter(
    (t) =>
      t.toUsername.toLowerCase() === currentUsernameLower ||
      t.fromUsername.toLowerCase() === currentUsernameLower
  );
  const pendingTransfers = relevantTransfers.filter((t) => t.status === 'pending');

  // 2. Filter emergencies
  const activeEmergencies = emergencyAlerts.filter((a) => !a.resolved);

  // 3. Admin lock events (only relevant to admin or unread)
  const unreadAdminNotifs = adminNotifications.filter((n) => !n.read);
  const relevantAdminNotifs = isAdmin ? adminNotifications : [];

  // 4. Profile approvals (admin only)
  const pendingApprovals = isAdmin ? profileRequests : [];

  // Total active/unread notification count
  const totalCount =
    pendingTransfers.length +
    activeEmergencies.length +
    (isAdmin ? unreadAdminNotifs.length + pendingApprovals.length : 0);

  const handleAcceptTransfer = (transferId: string, isAccessRequest: boolean, otherUser: string) => {
    respondToRoomTransfer(transferId, true);
    setActionSuccessMsg(
      isAccessRequest
        ? `Room custody transferred to ${otherUser}! Other pending requests cleared.`
        : `Room access accepted! You are now the active room session holder.`
    );
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleDeclineTransfer = (transferId: string) => {
    respondToRoomTransfer(transferId, false);
    setActionSuccessMsg('Request declined.');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="notifications-center-modal"
        className="w-full max-w-lg bg-gradient-to-b from-[#111827] via-[#0d1322] to-[#090d16] border border-cyan-500/40 rounded-3xl p-5 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-white relative overflow-hidden max-h-[88vh] flex flex-col"
      >
        {/* Glowing Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-md">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Notifications & Alerts
                </h3>
                {totalCount > 0 ? (
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950">
                    {totalCount} Active
                  </span>
                ) : (
                  <span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Access transfers, emergencies & system logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && unreadAdminNotifs.length > 0 && (
              <button
                id="notifs-mark-all-read-btn"
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition px-2 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-1 cursor-pointer"
                title="Mark all activity logs as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark Read</span>
              </button>
            )}
            <button
              id="close-notifications-center-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Success Toast Notice */}
        {actionSuccessMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{actionSuccessMsg}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto border-b border-slate-800/80 text-[11px] font-mono no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTabFilter('all')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'all'
                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            All ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTabFilter('transfers')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'transfers'
                ? 'bg-amber-500/30 text-amber-200 border border-amber-400 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ArrowRightLeft className="w-3 h-3" />
            <span>Room Access</span>
            {pendingTransfers.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center">
                {pendingTransfers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTabFilter('emergencies')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'emergencies'
                ? 'bg-red-500/30 text-red-200 border border-red-400 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Emergencies</span>
            {activeEmergencies.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white font-black text-[9px] flex items-center justify-center">
                {activeEmergencies.length}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTabFilter('events')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'events'
                  ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Lock Logs</span>
              {unreadAdminNotifs.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 font-black text-[9px] flex items-center justify-center">
                  {unreadAdminNotifs.length}
                </span>
              )}
            </button>
          )}

          {isAdmin && pendingApprovals.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTabFilter('approvals')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'approvals'
                  ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>Approvals</span>
              <span className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 font-black text-[9px] flex items-center justify-center">
                {pendingApprovals.length}
              </span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-3 no-scrollbar">
          {(activeTab === 'all' || activeTab === 'transfers') && (
            <>
              {relevantTransfers.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                      <span>Room Access & Transfers</span>
                    </span>
                    <span>{relevantTransfers.length} request(s)</span>
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
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isPending
                            ? isAccessRequest
                              ? 'bg-gradient-to-r from-amber-950/40 via-[#161d2d] to-[#0d1424] border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                              : 'bg-gradient-to-r from-cyan-950/40 via-[#0e1d2e] to-[#0d1424] border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                            : 'bg-[#090d16] border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="relative shrink-0 mt-0.5">
                              <img
                                src={fromUserObj?.avatarUrl || user_png}
                                alt={transfer.fromUsername}
                                className="w-10 h-10 rounded-full object-cover border-2 border-cyan-500/40"
                              />
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${
                                  isAccessRequest
                                    ? 'bg-amber-400 text-slate-950'
                                    : 'bg-cyan-400 text-slate-950'
                                }`}
                              >
                                {isAccessRequest ? 'REQ' : 'TRF'}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                                    isAccessRequest
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  }`}
                                >
                                  {isAccessRequest ? 'ACCESS REQUEST' : 'TRANSFER OFFER'}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {transfer.timestamp}
                                </span>
                              </div>

                              <p className="text-xs text-white">
                                <strong className="text-cyan-300 font-bold">
                                  {transfer.fromUsername}
                                </strong>{' '}
                                ({transfer.fromUserRole}){' '}
                                {isAccessRequest
                                  ? 'is requesting room access custody from '
                                  : 'wants to transfer room access custody to '}
                                <strong className="text-white font-bold">
                                  {isRecipient ? 'You' : transfer.toUsername}
                                </strong>
                              </p>

                              {transfer.notes && (
                                <p className="text-[11px] text-slate-300/90 italic bg-slate-900/50 p-1.5 rounded-lg border border-slate-800">
                                  "{transfer.notes}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            {isPending && isRecipient ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDeclineTransfer(transfer.id)}
                                  className="px-2.5 py-1.5 rounded-xl border border-red-500/40 hover:bg-red-950/40 text-red-400 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="Decline"
                                >
                                  <X className="w-3.5 h-3.5" />
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
                                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-[11px] font-black transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center gap-1 cursor-pointer"
                                  title="Approve / Accept Access"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{isAccessRequest ? 'Approve' : 'Accept'}</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                                    transfer.status === 'accepted'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : transfer.status === 'declined'
                                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}
                                >
                                  {transfer.status === 'pending'
                                    ? 'Awaiting Approval'
                                    : transfer.status}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => dismissRoomTransfer(transfer.id)}
                                  className="text-slate-500 hover:text-slate-300 p-1 transition cursor-pointer"
                                  title="Dismiss notification"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
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
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      <span>Emergency Overrides & Alarms</span>
                    </span>
                    <span>{activeEmergencies.length} active</span>
                  </div>

                  {emergencyAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      id={`notif-emergency-${alert.id}`}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        !alert.resolved
                          ? 'bg-gradient-to-r from-red-950/80 via-[#1f0e13] to-[#0e1320] border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                          : 'bg-[#090d16] border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                              !alert.resolved
                                ? 'bg-red-500 text-slate-950'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                                  !alert.resolved
                                    ? 'bg-red-500 text-slate-950'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {!alert.resolved ? 'EMERGENCY OVERRIDE' : 'RESOLVED'}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {alert.timestamp}
                              </span>
                            </div>

                            <p className="text-xs text-white font-medium mt-1">
                              <strong>Trigger:</strong> {alert.reason}
                            </p>
                            {alert.notes && (
                              <p className="text-[11px] text-slate-300 italic mt-0.5">
                                "{alert.notes}"
                              </p>
                            )}
                          </div>
                        </div>

                        {!alert.resolved && isAdmin ? (
                          <button
                            type="button"
                            onClick={() => resolveEmergency(alert.id)}
                            className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-400 text-slate-950 text-xs font-black transition-all shadow shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Clear Alert</span>
                          </button>
                        ) : !alert.resolved ? (
                          <span className="text-[10px] font-mono bg-red-500/20 text-red-300 px-2 py-1 rounded-lg border border-red-500/30 shrink-0">
                            Active Override
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {isAdmin && (activeTab === 'all' || activeTab === 'events') && (
            <>
              {relevantAdminNotifs.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Lock & Unlock Events</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={clearAllAdminNotifications}
                        className="text-[10px] text-slate-400 hover:text-red-400 transition cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear All</span>
                      </button>
                    </div>
                  </div>

                  {relevantAdminNotifs.slice(0, 15).map((notif) => {
                    const isLocked = notif.action === 'locked';

                    return (
                      <div
                        key={notif.id}
                        id={`notif-admin-${notif.id}`}
                        className={`p-3 rounded-2xl border transition-all ${
                          !notif.read
                            ? 'bg-cyan-950/20 border-cyan-500/40'
                            : 'bg-[#090d16] border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`p-1.5 rounded-xl shrink-0 ${
                                isLocked
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {isLocked ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                                    isLocked
                                      ? 'bg-red-500/20 text-red-300'
                                      : 'bg-emerald-500/20 text-emerald-300'
                                  }`}
                                >
                                  {isLocked ? 'LOCKED' : 'UNLOCKED'}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {notif.timestamp}
                                </span>
                              </div>
                              <p className="text-xs text-white mt-0.5">
                                <strong className="text-cyan-300">{notif.username}</strong> (
                                {notif.userRole}) {notif.action} {notif.doorName}
                              </p>
                            </div>
                          </div>

                          {!notif.read && (
                            <button
                              type="button"
                              onClick={() => markAdminNotificationAsRead(notif.id)}
                              className="text-cyan-400 hover:text-cyan-300 p-1 transition cursor-pointer"
                              title="Mark as read"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
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
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pending Profile Approvals</span>
                    </span>
                    <span>{pendingApprovals.length} pending</span>
                  </div>

                  {pendingApprovals.map((req) => (
                    <div
                      key={req.username}
                      className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded uppercase">
                            USER REGISTRATION
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {req.requestedAt || 'Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-white mt-0.5 font-bold">
                          {req.username}
                          <span className="text-slate-400 font-normal ml-1">
                            requesting {req.type === 'admin' ? 'Administrator Role' : 'Standard User Access'}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => rejectRequest(req.username)}
                          className="px-2.5 py-1 rounded-lg border border-red-500/40 text-red-400 text-xs font-bold hover:bg-red-950/40 transition cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => approveRequest(req.username)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-black hover:bg-emerald-400 transition cursor-pointer"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
