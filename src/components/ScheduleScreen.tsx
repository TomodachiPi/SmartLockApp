import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ScheduleModal } from './ScheduleModal';
import { Calendar, Clock, BookOpen, Trash2, Plus, User, Sparkles, Filter, CheckCircle2 } from 'lucide-react';

export const ScheduleScreen: React.FC = () => {
  const { labNotes, deleteLabNote, currentUser } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = currentUser?.type === 'admin';

  const filteredNotes = labNotes.filter((note) => {
    const matchesFilter =
      filterMode === 'all' || note.username.toLowerCase() === currentUser?.username.toLowerCase();
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.username.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div id="schedule-screen" className="flex flex-col w-full pb-8 space-y-4">
      {/* Sticky Header with Title and Add Button */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 pt-3 pb-3 border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white tracking-tight">Reservation Requests</h2>
          </div>
          <p className="text-xs text-slate-400">Request access from administrators</p>
        </div>

        <button
          id="add-schedule-note-header-btn"
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Request Schedule</span>
        </button>
      </div>

      <div className="px-4 space-y-4">

      {/* Filter and Search Bar */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Filter by request title, additional notes, or user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#111827] border border-slate-800 focus:border-cyan-500 text-white px-3.5 py-2 rounded-xl text-xs focus:outline-none placeholder:text-slate-500 transition-colors"
        />

        <div className="flex bg-[#111827] p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Requests ({labNotes.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('mine')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filterMode === 'mine'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            My Requests ({labNotes.filter((n) => n.username.toLowerCase() === currentUser?.username.toLowerCase()).length})
          </button>
        </div>
      </div>

      {/* Schedules List */}
      {filteredNotes.length === 0 ? (
        <div className="bg-[#111827] rounded-2xl p-8 text-center border border-slate-800 space-y-3">
          <div className="bg-cyan-500/10 p-3 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-cyan-400 border border-cyan-500/20">
            <Calendar className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">No active schedule requests</h4>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            {searchQuery
              ? 'No request matched your query filter.'
              : 'Add a new schedule request to reserve a schedule for lock access.'}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            Request Schedule Access
          </button>
        </div>
      ) : (
        <div id="schedules-notes-list" className="space-y-3">
          {filteredNotes.map((note) => {
            const isOwner = note.username.toLowerCase() === currentUser?.username.toLowerCase();
            const canDelete = isAdmin || isOwner;

            return (
              <div
                key={note.id}
                id={`note-card-${note.id}`}
                className="bg-[#111827] rounded-2xl p-4 border border-slate-800 hover:border-slate-700 shadow-md transition-all space-y-3 relative overflow-hidden"
              >
                {/* Header with Title and Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-wide">{note.title}</h3>
                    </div>

                    <div className="flex items-center gap-1.5 text-[12px] text-slate-400 mt-0.5">
                      <User className="w-3 h-3 text-cyan-400" />
                      <span>Request from {note.username}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[12px] text-slate-400 mt-0.5">
                      <span className="font-mono text-[12px] text-slate-500">
                        Booked {note.createdDate}
                      </span>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      id={`delete-note-btn-${note.id}`}
                      onClick={() => deleteLabNote(note.id)}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/40 transition-colors cursor-pointer"
                      title="Cancel reservation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Purpose Note Box */}
                <p className="text-xs text-slate-300 bg-[#090d16] p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                  {note.purpose}
                </p>

                {/* Footer Time and Date */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{note.startTime} — {note.endTime}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{note.date}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Schedule Modal */}
      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      </div>
    </div>
  );
};
