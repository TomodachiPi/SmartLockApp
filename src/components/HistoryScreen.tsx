import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsCharts } from './AnalyticsCharts';
import { TimeCard } from './TimeCard';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  BarChart2,
  Calendar,
  User,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const HistoryScreen: React.FC = () => {
  const { history, deleteHistory, currentUser } = useApp();
  const isAdmin = currentUser?.type === 'admin';

  const [showCharts, setShowCharts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'locked' | 'unlocked' | 'emergency'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Normal User recent visits vs Admin all records
  // All users, admin or not, can see who relinquished access and who gained access
  const relevantHistory = useMemo(() => {
    if (!isAdmin) {
      return history.filter((item) => {
        // Own user events
        if (item.username.toLowerCase() === currentUser?.username.toLowerCase()) {
          return true;
        }
        // Room transfer/handover logs: all users can see who relinquished access and who gained access
        const notesLower = (item.notes || '').toLowerCase();
        const isHandoverLog =
          notesLower.includes('relinquished room access') ||
          notesLower.includes('gained room access') ||
          notesLower.includes('relinquished') ||
          notesLower.includes('gained access');

        return isHandoverLog;
      });
    }
    return history;
  }, [history, isAdmin, currentUser]);

  // Filtering
  const filteredHistory = useMemo(() => {
    return relevantHistory.filter((item) => {
      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.username.toLowerCase().includes(q) ||
        item.permission.toLowerCase().includes(q) ||
        item.date.toLowerCase().includes(q) ||
        item.startingTime.toLowerCase().includes(q) ||
        item.endingTime.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      // Action match
      let matchesAction = true;
      if (actionFilter === 'locked') matchesAction = item.locked && !item.isEmergencyOverride;
      if (actionFilter === 'unlocked') matchesAction = !item.locked && !item.isEmergencyOverride;
      if (actionFilter === 'emergency') matchesAction = !!item.isEmergencyOverride;

      // Role match
      let matchesRole = true;
      if (roleFilter !== 'all') matchesRole = item.userType === roleFilter;

      return matchesSearch && matchesAction && matchesRole;
    });
  }, [relevantHistory, searchQuery, actionFilter, roleFilter]);

  // Pagination calculation
  const totalRecords = filteredHistory.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedHistory = filteredHistory.slice(startIndex, startIndex + pageSize);

  const resetFilters = () => {
    setSearchQuery('');
    setActionFilter('all');
    setRoleFilter('all');
    setCurrentPage(1);
  };

  return (
    <div id="history-screen" className="flex flex-col w-full pb-8 space-y-4">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 pt-3 pb-3 border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white tracking-tight">
              {isAdmin ? 'Access Log & Statistics' : 'Recent Visits & Statistics'}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            SmartLock Access History and Statistics
          </p>
        </div>

        {isAdmin && 
        <>
          <button
          id="toggle-analytics-btn"
          onClick={() => setShowCharts(!showCharts)}
          className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            showCharts
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'bg-[#111827] text-cyan-400 border border-cyan-500/30 hover:bg-[#1e293b]'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
            {showCharts ? 'Hide Visuals' : 'View Analytics'}
          </button>
        </>}
      </div>

      <div className="px-4 space-y-4">

      {isAdmin && showCharts && 
      <>
        <AnalyticsCharts records={relevantHistory} />
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-[#111827] p-3 rounded-2xl border border-slate-800 text-center">
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Events</p>
            <p className="text-xl font-black font-mono text-white mt-0.5">{relevantHistory.length}</p>
          </div>
          <div className="bg-[#111827] p-3 rounded-2xl border border-slate-800 text-center">
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Locks</p>
            <p className="text-xl font-black font-mono text-red-400 mt-0.5">
              {relevantHistory.filter((h) => h.locked && !h.isEmergencyOverride).length}
            </p>
          </div>
          <div className="bg-[#111827] p-3 rounded-2xl border border-slate-800 text-center">
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Unlocks</p>
            <p className="text-xl font-black font-mono text-emerald-400 mt-0.5">
              {relevantHistory.filter((h) => !h.locked && !h.isEmergencyOverride).length}
            </p>
          </div>
        </div>
      </>}

      {/* Global Search & Filter Controls */}
      <div className="bg-[#111827] rounded-2xl p-3.5 border border-slate-800 space-y-3 shadow-md">
        {/* Global Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            id="global-search-input"
            type="text"
            placeholder={isAdmin ? "Filter by user, date, timestamp, or notes..." : "Search your entries..."}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 text-white pl-10 pr-3.5 py-2 rounded-xl text-xs focus:outline-none placeholder:text-slate-500 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">Status:</span>
            {(['all', 'unlocked', 'locked', 'emergency'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setActionFilter(filter);
                  setCurrentPage(1);
                }}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer capitalize ${
                  actionFilter === filter
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                    : 'bg-[#090d16] text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {filter === 'all' ? 'All Events' : filter}
              </button>
            ))}
          </div>

          {(searchQuery || actionFilter !== 'all' || roleFilter !== 'all') && (
            <button
              onClick={resetFilters}
              className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* History Records List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-mono text-slate-400">
            Showing <span className="text-white font-bold">{paginatedHistory.length}</span> of {totalRecords} events
          </p>

          {isAdmin && (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="text-xs font-mono text-red-400/80 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Access Logs</span>
            </button>
          )}
        </div>

        {paginatedHistory.length === 0 ? (
          <div className="bg-[#111827] rounded-2xl p-8 text-center border border-slate-800 space-y-2">
            <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-white">No activity events found</h4>
            <p className="text-xs text-slate-400">
              Try adjusting your search criteria or clearing filters.
            </p>
          </div>
        ) : (
          paginatedHistory.map((item) => (
            <TimeCard
              key={item.id}
              username={item.username}
              permission={item.permission}
              locked={item.locked}
              startingTime={item.startingTime}
              endingTime={item.endingTime}
              date={item.date}
              notes={item.notes}
              isEmergencyOverride={item.isEmergencyOverride}
            />
          ))
        )}

        {/* Pagination Navigation Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-[#111827] px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-slate-300">
              Page <span className="font-bold text-cyan-400">{currentPage}</span> of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111827] max-w-sm w-full p-5 rounded-2xl border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Purge All Audit Logs?</h3>
            </div>
            <p className="text-xs text-slate-300">
              This action permanently removes all historical security engagement records and cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2 bg-[#1e293b] text-slate-300 rounded-xl text-xs font-bold hover:bg-[#334155] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteHistory();
                  setShowConfirmModal(false);
                }}
                className="flex-1 py-2 bg-red-500 hover:bg-red-400 text-slate-950 rounded-xl text-xs font-black cursor-pointer shadow"
              >
                Confirm Purge
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
