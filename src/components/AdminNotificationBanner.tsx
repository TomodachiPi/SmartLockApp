import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AdminNotificationsModal } from './AdminNotificationsModal';
import { Bell, Lock, Unlock, Check, X, ShieldAlert, ExternalLink } from 'lucide-react';

export const AdminNotificationBanner: React.FC = () => {
  const { adminNotifications, markAdminNotificationAsRead, currentUser } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (currentUser?.type !== 'admin') return null;

  const unreadAlerts = adminNotifications.filter((n) => !n.read);
  if (unreadAlerts.length === 0) return null;

  const latestAlert = unreadAlerts[0];
  const isLocked = latestAlert.action === 'locked';

  return (
    <>
      <div id="admin-lock-notifications-banner" className="mx-4 mt-2">
        <div
          className={`p-3 rounded-2xl border transition-all shadow-lg flex items-center justify-between gap-3 ${
            isLocked
              ? 'bg-gradient-to-r from-red-950/70 via-[#1f1017] to-[#0f172a] border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
              : 'bg-gradient-to-r from-emerald-950/70 via-[#0e221d] to-[#0f172a] border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isLocked
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.2 rounded bg-white/10 text-white">
                  ADMIN NOTIFICATION
                </span>
                <span className="text-[10px] font-mono text-slate-400">{latestAlert.timestamp}</span>
              </div>
              <p className="text-xs text-white truncate font-medium mt-0.5">
                <strong className={isLocked ? 'text-red-300' : 'text-emerald-300'}>
                  {latestAlert.username}
                </strong>{' '}
                {latestAlert.action} {latestAlert.doorName}
                {unreadAlerts.length > 1 && (
                  <span className="text-[10px] text-cyan-400 font-mono ml-1.5">
                    (+{unreadAlerts.length - 1} more)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="view-admin-alerts-btn"
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-300 hover:text-white text-[11px] font-mono font-bold transition flex items-center gap-1 cursor-pointer border border-slate-700"
            >
              <span>View</span>
              <ExternalLink className="w-3 h-3" />
            </button>

            <button
              id="dismiss-admin-alert-btn"
              type="button"
              onClick={() => markAdminNotificationAsRead(latestAlert.id)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <AdminNotificationsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
