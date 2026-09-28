import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  X,
  CheckCircle2,
  Lock,
  Unlock,
  Trash2,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="admin-notifications-modal"
        className="w-full max-w-lg bg-gradient-to-b from-[#111827] via-[#0d1322] to-[#0a0f1d] border-2 border-cyan-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-white relative overflow-hidden max-h-[88vh] flex flex-col"
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-red-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Admin Lock Alerts</h3>
              <p className="text-xs sm:text-sm text-slate-400 font-mono">
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
                className="text-xs sm:text-sm font-mono text-slate-400 hover:text-red-400 transition p-2 flex items-center gap-1.5 cursor-pointer font-bold"
                title="Clear all notifications"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear</span>
              </button>
            )}
            <button
              id="close-admin-notifs-btn"
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of Alerts */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 no-scrollbar">
          {adminNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-800/60 flex items-center justify-center text-slate-500 border border-slate-700">
                <Bell className="w-7 h-7 opacity-40" />
              </div>
              <p className="text-sm sm:text-base font-bold text-white">No admin notifications recorded yet</p>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                Admins receive automatic alerts whenever any user locks, unlocks, or transfers smartlock custody.
              </p>
            </div>
          ) : (
            adminNotifications.map((notif) => {
              const isLocked = notif.action === 'locked';

              return (
                <div
                  key={notif.id}
                  id={`admin-notif-item-${notif.id}`}
                  className={`p-4 rounded-2xl border transition-all ${
                    !notif.read
                      ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm'
                      : 'bg-[#090d16] border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isLocked
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
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
                        className="text-cyan-400 hover:text-cyan-300 p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-500/40 transition shrink-0 cursor-pointer"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            id="view-activity-logs-btn"
            type="button"
            onClick={() => {
              onClose();
              setActiveTab('history');
            }}
            className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>View Full Activity Log</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            id="close-admin-modal-footer-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-200 transition cursor-pointer min-h-[40px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
