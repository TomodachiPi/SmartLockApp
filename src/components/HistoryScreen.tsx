import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsCharts } from './AnalyticsCharts';
import { TimeCard } from './TimeCard';
import { HistoryRecord } from '../types';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  BarChart2,
  Calendar,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

export const HistoryScreen: React.FC = () => {
  const { history, deleteHistory, currentUser } = useApp();
  const isAdmin = currentUser?.type === 'admin';

  const [showCharts, setShowCharts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'unlocked' | 'locked' | 'transfer' | 'emergency'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Helper to test if a record represents a room transfer handover
  const isTransferRecord = (item: HistoryRecord) => {
    const notesLower = (item.notes || '').toLowerCase();
    return (
      notesLower.includes('relinquish') ||
      notesLower.includes('transferred to') ||
      notesLower.includes('gained room') ||
      notesLower.includes('gained custody') ||
      notesLower.includes('gained access') ||
      notesLower.includes('transferred from') ||
      notesLower.includes('room custody') ||
      notesLower.includes('room transfer') ||
      notesLower.includes('handed over') ||
      notesLower.includes('custody transfer')
    );
  };

  // Admin or normal user: all users can see all access history logs, strictly ordered newest first
  const relevantHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      const timeA =
        typeof a.timestamp === 'number' && !isNaN(a.timestamp) && a.timestamp > 0
          ? a.timestamp
          : Date.parse(a.date) || Date.now();
      const timeB =
        typeof b.timestamp === 'number' && !isNaN(b.timestamp) && b.timestamp > 0
          ? b.timestamp
          : Date.parse(b.date) || Date.now();
      return timeB - timeA;
    });
  }, [history]);

  // Filtering
  const filteredHistory = useMemo(() => {
    return relevantHistory.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.username.toLowerCase().includes(q) ||
        item.permission.toLowerCase().includes(q) ||
        item.date.toLowerCase().includes(q) ||
        item.startingTime.toLowerCase().includes(q) ||
        item.endingTime.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      let matchesAction = true;
      const isTransfer = isTransferRecord(item);
      const isEmergency = !!item.isEmergencyOverride;

      if (actionFilter === 'locked') {
        matchesAction = item.locked && !isEmergency && !isTransfer;
      } else if (actionFilter === 'unlocked') {
        matchesAction = !item.locked && !isEmergency && !isTransfer;
      } else if (actionFilter === 'transfer') {
        matchesAction = isTransfer && !isEmergency;
      } else if (actionFilter === 'emergency') {
        matchesAction = isEmergency;
      }

      let matchesRole = true;
      if (roleFilter !== 'all') {
        matchesRole = item.userType === roleFilter;
      }

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
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 pt-3.5 pb-3.5 border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              Access History {isAdmin && "& Analytics"}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            View SmartLock Unit's Activity History
          </p>
        </div>

        {isAdmin && (
          <button
            id="toggle-analytics-btn"
            onClick={() => setShowCharts(!showCharts)}
            className={`text-xs sm:text-sm px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[40px] ${
              showCharts
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-[#111827] text-cyan-400 border border-cyan-500/30 hover:bg-[#1e293b]'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>{showCharts ? 'Hide Analytics' : 'Show Analytics'}</span>
          </button>
        )}
      </div>

      <div className="px-4 space-y-4">
        {isAdmin && showCharts && (
          <>
            <AnalyticsCharts records={relevantHistory} />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="bg-[#111827] p-2.5 sm:p-3 rounded-2xl border border-slate-800 text-center">
                <p className="text-[11px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Locks</p>
                <p className="text-base sm:text-lg md:text-xl font-black font-mono text-red-400 mt-0.5">
                  {relevantHistory.filter((h) => h.locked && !h.isEmergencyOverride && !isTransferRecord(h)).length}
                </p>
              </div>
              <div className="bg-[#111827] p-2.5 sm:p-3 rounded-2xl border border-slate-800 text-center">
                <p className="text-[11px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Unlocks</p>
                <p className="text-base sm:text-lg md:text-xl font-black font-mono text-emerald-400 mt-0.5">
                  {relevantHistory.filter((h) => !h.locked && !h.isEmergencyOverride && !isTransferRecord(h)).length}
                </p>
              </div>
              <div className="bg-[#111827] p-2.5 sm:p-3 rounded-2xl border border-slate-800 text-center">
                <p className="text-[11px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Transfers</p>
                <p className="text-base sm:text-lg md:text-xl font-black font-mono text-cyan-400 mt-0.5">
                  {relevantHistory.filter((h) => isTransferRecord(h) && !h.isEmergencyOverride).length}
                </p>
              </div>
              <div className="bg-[#111827] p-2.5 sm:p-3 rounded-2xl border border-slate-800 text-center">
                <p className="text-[11px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Overrides</p>
                <p className="text-base sm:text-lg md:text-xl font-black font-mono text-amber-400 mt-0.5">
                  {relevantHistory.filter((h) => !!h.isEmergencyOverride).length}
                </p>
              </div>
              <div className="bg-[#111827] p-2.5 sm:p-3 rounded-2xl border border-slate-800 text-center col-span-2 sm:col-span-1">
                <p className="text-[11px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Total</p>
                <p className="text-base sm:text-lg md:text-xl font-black font-mono text-white mt-0.5">{relevantHistory.length}</p>
              </div>
            </div>
          </>
        )}

        {/* Global Search & Filter Controls */}
        <div className="bg-[#111827] rounded-2xl p-4 border border-slate-800 space-y-3.5 shadow-md">
          {/* Global Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              id="global-search-input"
              type="text"
              placeholder="Search user, date, or event..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 text-white pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none placeholder:text-slate-500 transition-colors min-h-[44px]"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1.5 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-mono text-slate-400 uppercase font-semibold mr-1">Event:</span>
              {(['all', 'unlocked', 'locked', 'transfer', 'emergency'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setActionFilter(filter);
                    setCurrentPage(1);
                  }}
                  className={`text-xs sm:text-sm font-mono px-3.5 py-2 rounded-xl border transition-all cursor-pointer capitalize min-h-[38px] ${
                    actionFilter === filter
                      ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 font-bold shadow-sm'
                      : 'bg-[#090d16] text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {filter === 'all'
                    ? 'All'
                    : filter === 'transfer'
                    ? 'Transfers'
                    : filter}
                </button>
              ))}
            </div>

            {(searchQuery || actionFilter !== 'all' || roleFilter !== 'all') && (
              <button
                onClick={resetFilters}
                className="text-xs sm:text-sm font-mono text-cyan-400 hover:underline flex items-center gap-1.5 cursor-pointer ml-auto py-1 font-bold"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* History Records List */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs sm:text-sm font-mono text-slate-400">
              Showing <span className="text-white font-bold">{paginatedHistory.length}</span> of {totalRecords} events
            </p>

            {isAdmin && (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="text-xs sm:text-sm font-mono text-red-400/90 hover:text-red-300 flex items-center gap-1.5 cursor-pointer transition-colors py-1.5 font-bold"
              >
                <Trash2 className="w-4 h-4" />
                <span>Purge Logs</span>
              </button>
            )}
          </div>

          {paginatedHistory.length === 0 ? (
            <div className="bg-[#111827] rounded-2xl p-8 text-center border border-slate-800 space-y-3">
              <Calendar className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-base sm:text-lg font-bold text-white">No activity events found</h4>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
                Try adjusting your search query or resetting the event filter.
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
                timestamp={item.timestamp}
              />
            ))
          )}

          {/* Pagination Navigation Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-[#111827] px-4 py-3 rounded-2xl border border-slate-800 text-xs sm:text-sm font-mono">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 font-bold"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Prev</span>
              </button>

              <span className="text-slate-300 font-semibold">
                Page <span className="font-bold text-cyan-400">{currentPage}</span> of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 font-bold"
              >
                <span>Next</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="bg-[#111827] max-w-sm w-full p-5 rounded-3xl border border-slate-800 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-base sm:text-lg font-bold text-white">Purge All Activity Logs?</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                This action permanently clears the local activity records and cannot be undone.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 bg-[#1e293b] text-slate-300 rounded-xl text-xs sm:text-sm font-bold hover:bg-[#334155] cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteHistory();
                    setShowConfirmModal(false);
                  }}
                  className="flex-1 py-3 bg-red-500 text-slate-950 rounded-xl text-xs sm:text-sm font-black hover:bg-red-400 cursor-pointer min-h-[44px]"
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
