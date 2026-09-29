import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, ShieldAlert } from 'lucide-react';

export const EmergencyBanner: React.FC = () => {
  const { emergencyAlerts, resolveEmergency, currentUser } = useApp();

  if (currentUser?.type !== 'admin') return null;

  const activeAlerts = emergencyAlerts.filter((a) => !a.resolved);

  if (activeAlerts.length === 0) return null;

  return (
    <div id="emergency-alerts-container" className="mx-4 mt-2 space-y-2.5">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          id={`emergency-alert-${alert.id}`}
          className="bg-gradient-to-r from-red-950/85 to-[#1e0e13] border-2 border-red-500 rounded-2xl p-4 shadow-[0_0_25px_rgba(239,68,68,0.35)] text-white animate-pulse-slow"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="bg-red-500 p-2.5 rounded-xl text-slate-950 mt-0.5 shrink-0 shadow-lg">
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-red-500 text-slate-950 text-xs font-mono font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                    EMERGENCY OVERRIDE
                  </span>
                  <span className="text-xs font-mono text-slate-400">{alert.timestamp}</span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white mt-1">
                  <span className="text-red-400 font-mono font-extrabold">SmartLock Unlocked!</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 mt-1">
                  <strong className="text-white">Trigger:</strong> {alert.reason}
                </p>
                {alert.notes && (
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                    "{alert.notes}"
                  </p>
                )}
              </div>
            </div>

            {currentUser?.type === 'admin' ? (
              <button
                id={`resolve-emergency-btn-${alert.id}`}
                onClick={() => resolveEmergency(alert.id)}
                className="bg-red-500 hover:bg-red-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all shadow shrink-0 flex items-center gap-1.5 cursor-pointer min-h-[40px]"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Clear Alert</span>
              </button>
            ) : (
              <span className="text-xs font-mono bg-red-500/20 text-red-300 px-2.5 py-1.5 rounded-lg text-right shrink-0 border border-red-500/40 font-bold">
                Admin Alerted
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
