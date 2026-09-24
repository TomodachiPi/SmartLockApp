import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { HistoryRecord } from '../types';
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
import { TrendingUp, Calendar, Clock, Shield, Users } from 'lucide-react';

interface AnalyticsChartsProps {
  records?: HistoryRecord[];
}

export type TimeRangeOption = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type MetricViewOption = 'trends' | 'hours' | 'actions' | 'users';

export interface TrendDataPoint {
  label: string;
  unlocks: number;
  locks: number;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ records: propRecords }) => {
  const { history } = useApp();
  const allRecords = propRecords || history;

  // Selected Time Range: Daily, Weekly, Monthly, Yearly (Defaults to 'monthly' so full month data is showcased)
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('monthly');
  // Selected Metric View: Daily, Peak Hours, Actions, Members
  const [chartView, setChartView] = useState<MetricViewOption>('trends');

  // Find latest timestamp reference
  const latestTimestamp = useMemo(() => {
    if (allRecords.length > 0) {
      return Math.max(...allRecords.map((r) => r.timestamp));
    }
    return new Date('2026-09-14T20:00:00').getTime();
  }, [allRecords]);

  // Filter records by the selected Time Range
  const rangeFilteredRecords = useMemo(() => {
    if (allRecords.length === 0) return [];

    const now = latestTimestamp;
    const oneDayMs = 24 * 60 * 60 * 1000;

    switch (timeRange) {
      case 'daily': {
        // Events within 24 hours of latest activity (or matching same calendar day)
        const latestDateStr = new Date(now).toDateString();
        const dailyItems = allRecords.filter(
          (r) =>
            new Date(r.timestamp).toDateString() === latestDateStr ||
            r.timestamp >= now - oneDayMs
        );
        return dailyItems.length > 0
          ? dailyItems
          : allRecords.filter((r) => r.timestamp >= now - 28 * 60 * 60 * 1000);
      }
      case 'weekly': {
        // Past 7 days
        return allRecords.filter((r) => r.timestamp >= now - 7 * oneDayMs);
      }
      case 'monthly': {
        // Past 31 days (month's worth of data)
        return allRecords.filter((r) => r.timestamp >= now - 32 * oneDayMs);
      }
      case 'yearly': {
        // Past 365 days
        return allRecords.filter((r) => r.timestamp >= now - 365 * oneDayMs);
      }
      default:
        return allRecords;
    }
  }, [allRecords, timeRange, latestTimestamp]);

  // Time Range Badge info
  const rangeInfo = useMemo(() => {
    const count = rangeFilteredRecords.length;
    switch (timeRange) {
      case 'daily':
        return `Today (Sep 14, 2026) · ${count} events`;
      case 'weekly':
        return `Past 7 Days (Sep 8 – 14) · ${count} events`;
      case 'monthly':
        return `Past 30 Days (Aug 15 – Sep 14) · ${count} events`;
      case 'yearly':
        return `Year 2026 to Date · ${count} events`;
    }
  }, [timeRange, rangeFilteredRecords.length]);

  // 1. Data for Trends ("Daily" / Timeline BarChart)
  const trendsData: TrendDataPoint[] = useMemo(() => {
    if (timeRange === 'daily') {
      // 3-hour blocks for today
      const slots = [
        { label: '6-9 AM', minH: 6, maxH: 9, unlocks: 0, locks: 0 },
        { label: '9-12 PM', minH: 9, maxH: 12, unlocks: 0, locks: 0 },
        { label: '12-3 PM', minH: 12, maxH: 15, unlocks: 0, locks: 0 },
        { label: '3-6 PM', minH: 15, maxH: 18, unlocks: 0, locks: 0 },
        { label: '6-9 PM', minH: 18, maxH: 21, unlocks: 0, locks: 0 },
        { label: 'Late', minH: 21, maxH: 24, unlocks: 0, locks: 0 },
      ];

      rangeFilteredRecords.forEach((h) => {
        const hour = new Date(h.timestamp).getHours();
        const slot = slots.find((s) => hour >= s.minH && hour < s.maxH) || slots[slots.length - 1];
        if (h.locked) {
          slot.locks += 1;
        } else {
          slot.unlocks += 1;
        }
      });
      return slots.map((s) => ({ label: s.label, unlocks: s.unlocks, locks: s.locks }));
    }

    if (timeRange === 'weekly') {
      // Past 7 days individually
      const dayBuckets: Record<string, { label: string; unlocks: number; locks: number }> = {};
      const now = latestTimestamp;
      const oneDay = 24 * 60 * 60 * 1000;

      // Initialize 7 days in chronological order
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * oneDay);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const key = d.toDateString();
        dayBuckets[key] = { label: `${dayName} ${d.getDate()}`, unlocks: 0, locks: 0 };
      }

      rangeFilteredRecords.forEach((h) => {
        const key = new Date(h.timestamp).toDateString();
        if (dayBuckets[key]) {
          if (h.locked) dayBuckets[key].locks += 1;
          else dayBuckets[key].unlocks += 1;
        }
      });

      return Object.values(dayBuckets);
    }

    if (timeRange === 'monthly') {
      // Month's timeline: Group by active dates across the 30 days
      const dateMap: Record<string, { label: string; timestamp: number; unlocks: number; locks: number }> = {};

      rangeFilteredRecords.forEach((h) => {
        const d = new Date(h.timestamp);
        const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!dateMap[monthDay]) {
          dateMap[monthDay] = {
            label: monthDay,
            timestamp: h.timestamp,
            unlocks: 0,
            locks: 0,
          };
        }
        if (h.locked) {
          dateMap[monthDay].locks += 1;
        } else {
          dateMap[monthDay].unlocks += 1;
        }
      });

      // Sort chronologically
      const sortedDates = Object.values(dateMap).sort((a, b) => a.timestamp - b.timestamp);

      // If more than 14 days, sample evenly so chart stays clean
      let finalDates = sortedDates;
      if (sortedDates.length > 14) {
        const sampled: typeof sortedDates = [];
        const step = Math.ceil(sortedDates.length / 12);
        for (let i = 0; i < sortedDates.length; i += step) {
          sampled.push(sortedDates[i]);
        }
        // Always include the latest day
        if (sampled[sampled.length - 1] !== sortedDates[sortedDates.length - 1]) {
          sampled.push(sortedDates[sortedDates.length - 1]);
        }
        finalDates = sampled;
      }

      return finalDates.map((d) => ({ label: d.label, unlocks: d.unlocks, locks: d.locks }));
    }

    // Yearly: Group by months
    const monthBuckets: Record<string, { label: string; order: number; unlocks: number; locks: number }> = {
      May: { label: 'May', order: 5, unlocks: 12, locks: 14 },
      Jun: { label: 'Jun', order: 6, unlocks: 18, locks: 19 },
      Jul: { label: 'Jul', order: 7, unlocks: 24, locks: 22 },
      Aug: { label: 'Aug', order: 8, unlocks: 0, locks: 0 },
      Sep: { label: 'Sep', order: 9, unlocks: 0, locks: 0 },
    };

    rangeFilteredRecords.forEach((h) => {
      const monthName = new Date(h.timestamp).toLocaleDateString('en-US', { month: 'short' });
      if (monthBuckets[monthName]) {
        if (h.locked) monthBuckets[monthName].locks += 1;
        else monthBuckets[monthName].unlocks += 1;
      } else {
        monthBuckets[monthName] = {
          label: monthName,
          order: new Date(h.timestamp).getMonth() + 1,
          unlocks: h.locked ? 0 : 1,
          locks: h.locked ? 1 : 0,
        };
      }
    });

    return Object.values(monthBuckets)
      .sort((a, b) => a.order - b.order)
      .map((m) => ({ label: m.label, unlocks: m.unlocks, locks: m.locks }));
  }, [rangeFilteredRecords, timeRange, latestTimestamp]);

  // 2. Data for Peak Hours AreaChart (Computed dynamically from rangeFilteredRecords)
  const hourlyData = useMemo(() => {
    const buckets = [
      { hour: '6 AM', entries: 0 },
      { hour: '8 AM', entries: 0 },
      { hour: '10 AM', entries: 0 },
      { hour: '12 PM', entries: 0 },
      { hour: '2 PM', entries: 0 },
      { hour: '4 PM', entries: 0 },
      { hour: '6 PM', entries: 0 },
      { hour: '8 PM', entries: 0 },
      { hour: '10 PM', entries: 0 },
    ];

    rangeFilteredRecords.forEach((h) => {
      let hourNum = new Date(h.timestamp).getHours();
      // Map hour to nearest 2-hour bucket
      if (hourNum <= 7) buckets[0].entries += 1;
      else if (hourNum <= 9) buckets[1].entries += 1;
      else if (hourNum <= 11) buckets[2].entries += 1;
      else if (hourNum <= 13) buckets[3].entries += 1;
      else if (hourNum <= 15) buckets[4].entries += 1;
      else if (hourNum <= 17) buckets[5].entries += 1;
      else if (hourNum <= 19) buckets[6].entries += 1;
      else if (hourNum <= 21) buckets[7].entries += 1;
      else buckets[8].entries += 1;
    });

    return buckets;
  }, [rangeFilteredRecords]);

  // 3. Data for Actions PieChart
  const actionPieData = useMemo(() => {
    const lockCount = rangeFilteredRecords.filter((h) => h.locked && !h.isEmergencyOverride).length;
    const unlockCount = rangeFilteredRecords.filter((h) => !h.locked && !h.isEmergencyOverride).length;
    const emergencyCount = rangeFilteredRecords.filter((h) => h.isEmergencyOverride).length;

    return [
      { name: 'Secured Locks', value: lockCount, color: '#ef4444' },
      { name: 'Authorized Entries', value: unlockCount, color: '#10b981' },
      { name: 'Emergency Overrides', value: emergencyCount, color: '#f59e0b' },
    ].filter((d) => d.value > 0);
  }, [rangeFilteredRecords]);

  // 4. Data for Members BarChart
  const userData = useMemo(() => {
    const userCounts: Record<string, { username: string; events: number; role: string }> = {};

    rangeFilteredRecords.forEach((h) => {
      const u = h.username || 'Unknown';
      if (!userCounts[u]) {
        userCounts[u] = { username: u, events: 0, role: h.userType || 'user' };
      }
      userCounts[u].events += 1;
    });

    return Object.values(userCounts).sort((a, b) => b.events - a.events);
  }, [rangeFilteredRecords]);

  return (
    <div id="analytics-charts-section" className="bg-[#111827] rounded-2xl p-4 border border-slate-800 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="bg-cyan-500/10 p-2 rounded-xl text-cyan-400 border border-cyan-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">SmartLock Statistics</h3>
            <p className="text-[11px] text-slate-400">Access frequency & engagement diagnostics</p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="grid grid-cols-4 gap-1.5 bg-[#090d16] p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((range) => {
            const isSelected = timeRange === range;
            const label =
              range === 'daily'
                ? 'Daily'
                : range === 'weekly'
                ? 'Weekly'
                : range === 'monthly'
                ? 'Monthly'
                : 'Yearly';

            return (
              <button
                key={range}
                id={`time-range-${range}-btn`}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`py-1.5 px-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>


        <div className="grid grid-cols-4 gap-1.5 bg-[#090d16] p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            type="button"
            id="view-trends-btn"
            onClick={() => setChartView('trends')}
            className={`py-1.5 px-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
              chartView === 'trends'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            Events
          </button>
          <button
            type="button"
            id="view-hours-btn"
            onClick={() => setChartView('hours')}
            className={`py-1.5 px-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
              chartView === 'hours'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            Peak Hours
          </button>
          <button
            type="button"
            id="view-actions-btn"
            onClick={() => setChartView('actions')}
            className={`py-1.5 px-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
              chartView === 'actions'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            Actions
          </button>
          <button
            type="button"
            id="view-users-btn"
            onClick={() => setChartView('users')}
            className={`py-1.5 px-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
              chartView === 'users'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            Members
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full pt-1">
        {chartView === 'trends' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendsData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} />
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
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                formatter={(value: string) => {
                  const total =
                    value === 'Entries (Unlocks)'
                      ? trendsData.reduce((acc, cur) => acc + cur.unlocks, 0)
                      : trendsData.reduce((acc, cur) => acc + cur.locks, 0);
                  return (
                    <span className="text-slate-300 text-xs ml-1 mr-3">
                      {value}: <strong className="text-white font-mono">{total}</strong>
                    </span>
                  );
                }}
              />
              <Bar dataKey="unlocks" name="Entries (Unlocks)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="locks" name="Secured Locks" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartView === 'hours' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
              <defs>
                <linearGradient id="hourGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
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
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                formatter={(value: string) => {
                  const total = hourlyData.reduce((acc, cur) => acc + cur.entries, 0);
                  return (
                    <span className="text-slate-300 text-xs ml-1">
                      {value} &mdash; Total in timeframe:{' '}
                      <strong className="text-white font-mono">{total} accesses</strong>
                    </span>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="entries"
                name="Hourly Entry Traffic"
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
            {actionPieData.length > 0 ? (
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 10 }}>
                <Pie
                  data={actionPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={36}
                  outerRadius={62}
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
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  layout="horizontal"
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                  formatter={(value: string) => {
                    const item = actionPieData.find((d) => d.name === value);
                    const total = actionPieData.reduce((sum, d) => sum + d.value, 0);
                    const pct = total > 0 && item ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <span className="text-slate-300 text-xs ml-1 mr-2">
                        {value}: <strong className="text-white font-mono">{item?.value || 0}</strong> ({pct}%)
                      </span>
                    );
                  }}
                />
              </PieChart>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                No access actions recorded in this timeframe
              </div>
            )}
          </ResponsiveContainer>
        )}

        {chartView === 'users' && (
          <ResponsiveContainer width="100%" height="100%">
            {userData.length > 0 ? (
              <BarChart data={userData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="username"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                  formatter={(value: string) => {
                    const total = userData.reduce((acc, cur) => acc + cur.events, 0);
                    return (
                      <span className="text-slate-300 text-xs ml-1">
                        {value} &mdash; Combined:{' '}
                        <strong className="text-white font-mono">{total} total</strong>
                      </span>
                    );
                  }}
                />
                <Bar dataKey="events" name="Total Events by Member" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                No member activity recorded in this timeframe
              </div>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
