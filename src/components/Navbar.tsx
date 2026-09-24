import React from 'react';
import { useApp } from '../context/AppContext';
import { TabType } from '../types';
import { Lock, History, Calendar, SlidersHorizontal } from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    profileRequests,
    currentUser,
    emergencyAlerts,
    roomTransfers,
    adminNotifications,
  } = useApp();

  const isAdmin = currentUser?.type === 'admin';
  const unreadAlerts = emergencyAlerts.filter((a) => !a.resolved).length;
  const pendingRequests = profileRequests.length;
  const hasPendingTransfer = roomTransfers.some(
    (t) => t.toUsername.toLowerCase() === currentUser?.username.toLowerCase() && t.status === 'pending'
  );
  const unreadAdminNotifs = adminNotifications.filter((n) => !n.read).length;

  const navItems: { id: TabType; label: string; icon: any }[] = [
    { id: 'lock', label: 'Lock', icon: Lock },
    { id: 'history', label: 'Activity', icon: History },
    { id: 'schedule', label: 'Requests', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
  ];

  return (
    <nav
      id="bottom-navbar"
      className="sticky bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-2 pb-5 flex items-center justify-around shadow-[0_-10px_25px_rgba(0,0,0,0.5)]"
    >
      {navItems.map((item) => {
        const isActive = activeTab === item.id || (item.id === 'settings' && activeTab === 'users');
        const showBadge =
          (item.id === 'settings' && isAdmin && pendingRequests > 0) ||
          (item.id === 'lock' && (hasPendingTransfer || (isAdmin && unreadAlerts > 0))) ||
          (item.id === 'history' && isAdmin && unreadAdminNotifs > 0);

        const IconComponent = item.icon;

        return (
          <button
            key={item.id}
            id={`nav-${item.id}-btn`}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all duration-200 cursor-pointer relative group ${
              isActive ? 'opacity-100' : 'opacity-50 hover:opacity-85'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-105'
                    : 'text-slate-400 group-hover:text-white bg-slate-900/40 border border-transparent'
                }`}
              >
                <IconComponent className="w-5 h-5" />
              </div>
            </div>

            <span
              className={`text-[11px] mt-1 font-mono transition-colors ${
                isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 group-hover:text-white'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
