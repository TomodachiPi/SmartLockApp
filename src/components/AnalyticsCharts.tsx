import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity } from 'lucide-react';

export const AnalyticsCharts: React.FC = () => {
  const { history } = useApp();
  const [chartView, setChartView] = useState<'trends' | 'hours' | 'users' | 'actions'>('trends');

  // Compute daily events
  const dailyCounts: Record<string, { date: string; locks: number; unlocks: number; emergencies: number }> = {};
  history.forEach((h) => {
    const d = h.date || 'Recent';
    if (!dailyCounts[d]) {
      dailyCounts[d] = { date: d, locks: 0, unlocks: 0, emergencies: 0 };
    }
    if (h.isEmergencyOverride) {
      dailyCounts[d].emergencies += 1;
    } else if (h.locked) {
      dailyCounts[d].locks += 1;
    } else {
      dailyCounts[d].unlocks += 1;
    }
  });
  const dailyData = Object.values(dailyCounts).slice(0, 7).reverse();

  // Compute user counts
  const userCounts: Record<string, { username: string; events: number; role: string }> = {};
  history.forEach((h) => {
    const u = h.username || 'Unknown';
    if (!userCounts[u]) {
      userCounts[u] = { username: u, events: 0, role: h.userType || 'user' };
    }
    userCounts[u].events += 1;
  });
  const userData = Object.values(userCounts).sort((a, b) => b.events - a.events);

  // Compute actions pie data
  const lockCount = history.filter((h) => h.locked && !h.isEmergencyOverride).length;
  const unlockCount = history.filter((h) => !h.locked && !h.isEmergencyOverride).length;
  const emergencyCount = history.filter((h) => h.isEmergencyOverride).length;

  const actionPieData = [
    { name: 'Secured Locks', value: lockCount || 1, color: '#ef4444' },
    { name: 'Authorized Entries', value: unlockCount || 1, color: '#10b981' },
    { name: 'Emergency Overrides', value: emergencyCount, color: '#f59e0b' },
  ].filter((d) => d.value > 0);

  // Hourly curve
  const hourlyData = [
    { hour: '6 AM', entries: 1 },
    { hour: '8 AM', entries: 4 },
    { hour: '10 AM', entries: 8 },
    { hour: '12 PM', entries: 6 },
    { hour: '2 PM', entries: 9 },
    { hour: '4 PM', entries: 7 },
    { hour: '6 PM', entries: 5 },
    { hour: '8 PM', entries: 3 },
    { hour: '10 PM', entries: 1 },
  ];

  return (
    <div id="analytics-charts-section" className="bg-[#111827] rounded-2xl p-4 border border-slate-800 space-y-4 shadow-xl">
      {/* Header & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="bg-cyan-500/10 p-1.5 rounded-xl text-cyan-400 border border-cyan-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">SmartLock Statistics</h3>
            <p className="text-[11px] text-slate-400">Access frequency & engagement diagnostics</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
        <div className="flex bg-[#090d16] p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setChartView('trends')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              chartView === 'trends' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setChartView('hours')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              chartView === 'hours' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Peak Hours
          </button>
          <button
            type="button"
            onClick={() => setChartView('actions')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              chartView === 'actions' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Actions
          </button>
          <button
            type="button"
            onClick={() => setChartView('users')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              chartView === 'users' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Members
          </button>
        </div>
      </div>
      

      {/* Chart Canvas */}
      <div className="h-48 w-full">
        {chartView === 'trends' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#090d16',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="unlocks" name="Entries" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="locks" name="Locks" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartView === 'hours' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="hourGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#090d16',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
              <Area
                type="monotone"
                dataKey="entries"
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#hourGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {chartView === 'actions' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={actionPieData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={65}
                paddingAngle={4}
                dataKey="value"
              >
                {actionPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#090d16',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        {chartView === 'users' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={userData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="username" stroke="#64748b" fontSize={10} tickLine={false} width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#090d16',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="events" name="Total Events" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
