import React from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export const EmergencyBanner: React.FC = () => {
  const { emergencyAlerts, resolveEmergency, currentUser } = useApp();

  const activeAlerts = emergencyAlerts.filter((a) => !a.resolved);

  if (activeAlerts.length === 0) return null;

  return (
    <div id="emergency-alerts-container" className="mx-4 mt-2 space-y-2">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          id={`emergency-alert-${alert.id}`}
          className="bg-gradient-to-r from-red-950/80 to-[#1e0e13] border-2 border-red-500 rounded-2xl p-3.5 shadow-[0_0_25px_rgba(239,68,68,0.35)] text-white animate-pulse-slow"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="bg-red-500 p-2 rounded-xl text-slate-950 mt-0.5 shrink-0 shadow-lg">
                <ShieldAlert className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-red-500 text-slate-950 text-[9px] font-mono font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                    EMERGENCY OVERRIDE
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">{alert.timestamp}</span>
                </div>
                <h4 className="text-sm font-bold text-white mt-1">
                  <span className="text-red-400 font-mono font-extrabold">SmartLock Unlocked!</span>
                </h4>
                <p className="text-xs text-slate-200 mt-0.5">
                  <strong>Trigger:</strong> {alert.reason}
                </p>
                {alert.notes && (
                  <p className="text-xs text-slate-400 mt-0.5 italic">
                    "{alert.notes}"
                  </p>
                )}
              </div>
            </div>

            {currentUser?.type === 'admin' ? (
              <button
                id={`resolve-emergency-btn-${alert.id}`}
                onClick={() => resolveEmergency(alert.id)}
                className="bg-red-500 hover:bg-red-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Clear Alert
              </button>
            ) : (
              <span className="text-[10px] font-mono bg-red-500/20 text-red-300 px-2 py-1 rounded-lg text-right shrink-0 border border-red-500/30">
                Admin Alerted
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
