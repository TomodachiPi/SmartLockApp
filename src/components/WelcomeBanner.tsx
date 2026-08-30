import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, X, ShieldCheck } from 'lucide-react';

export const WelcomeBanner: React.FC = () => {
  const { welcomeMessage, dismissWelcomeMessage, currentUser } = useApp();

  useEffect(() => {
    if (welcomeMessage) {
      const timer = setTimeout(() => {
        dismissWelcomeMessage();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [welcomeMessage, dismissWelcomeMessage]);

  if (!welcomeMessage || !currentUser) return null;

  const isAdmin = currentUser.type === 'admin';

  return (
    <div
      id="welcome-greeting-banner"
      className={`mx-4 mt-2 p-3.5 rounded-2xl border flex items-center justify-between shadow-xl transition-all animate-fade-in ${
        isAdmin
          ? 'bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0c4a6e] border-cyan-500/50 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)]'
          : 'bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#064e3b] border-emerald-500/50 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-xl border ${
            isAdmin
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide">
            {welcomeMessage}
          </p>
          <p className="text-xs text-slate-300 font-mono">
            {isAdmin ? 'Hello Admin' : 'Hello User'}
          </p>
        </div>
      </div>

      <button
        id="dismiss-welcome-btn"
        onClick={dismissWelcomeMessage}
        className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
