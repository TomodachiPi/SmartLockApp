import React from 'react';
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
  ArrowRight,
} from 'lucide-react';

interface AdminNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminNotificationsModal: React.FC<AdminNotificationsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    adminNotifications,
    markAdminNotificationAsRead,
    clearAllAdminNotifications,
    setActiveTab,
  } = useApp();

  if (!isOpen) return null;

  return (
    <div
      id="admin-notifications-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="admin-notifications-modal"
        className="w-full max-w-md bg-gradient-to-b from-[#111827] to-[#0a0f1d] border border-cyan-500/40 rounded-3xl p-5 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-white relative overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-red-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Admin Lock Alerts</h3>
              <p className="text-xs text-slate-400 font-mono">
                {adminNotifications.filter((n) => !n.read).length} unread notifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {adminNotifications.length > 0 && (
              <button
                id="clear-all-admin-notifs-btn"
                type="button"
                onClick={clearAllAdminNotifications}
                className="text-[11px] font-mono text-slate-400 hover:text-red-400 transition p-1.5 flex items-center gap-1 cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              id="close-admin-notifs-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List of Alerts */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {adminNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Bell className="w-8 h-8 mx-auto opacity-30 text-slate-500" />
              <p className="text-xs font-mono">No admin notifications recorded yet.</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Admins receive automatic alerts whenever a user locks or unlocks the smartlock or
                accepts a room access transfer.
              </p>
            </div>
          ) : (
            adminNotifications.map((notif) => {
              const isLocked = notif.action === 'locked';

              return (
                <div
                  key={notif.id}
                  id={`admin-notif-item-${notif.id}`}
                  className={`p-3 rounded-2xl border transition-all ${
                    !notif.read
                      ? 'bg-cyan-950/20 border-cyan-500/40 shadow-sm'
                      : 'bg-[#090d16] border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                          isLocked
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
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
                            {isLocked ? 'DOOR LOCKED' : 'DOOR UNLOCKED'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {notif.timestamp}
                          </span>
                        </div>

                        <p className="text-xs text-white mt-1">
                          <strong className="text-cyan-300 font-bold">{notif.username}</strong> (
                          {notif.userRole}) {notif.action} <span>{notif.doorName}</span>.
                        </p>
                      </div>
                    </div>

                    {!notif.read && (
                      <button
                        id={`mark-read-btn-${notif.id}`}
                        type="button"
                        onClick={() => markAdminNotificationAsRead(notif.id)}
                        className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition shrink-0 p-1 cursor-pointer"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            id="view-activity-logs-btn"
            type="button"
            onClick={() => {
              onClose();
              setActiveTab('history');
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <span>View Full Activity Audit Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            id="close-admin-modal-footer-btn"
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
