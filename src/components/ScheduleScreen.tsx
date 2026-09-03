import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LabNoteSchedule } from '../types';
import { ScheduleModal } from './ScheduleModal';
import { Calendar, Clock, Trash2, Plus, User, Edit3, Shield } from 'lucide-react';

export const ScheduleScreen: React.FC = () => {
  const { labNotes, deleteLabNote, currentUser } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNoteToEdit, setSelectedNoteToEdit] = useState<LabNoteSchedule | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = currentUser?.type === 'admin';

  const filteredNotes = labNotes.filter((note) => {
    const matchesFilter =
      filterMode === 'all' || note.username.toLowerCase() === currentUser?.username.toLowerCase();
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.purpose ? note.purpose.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
      note.username.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleOpenNewRequest = () => {
    setSelectedNoteToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditRequest = (note: LabNoteSchedule) => {
    setSelectedNoteToEdit(note);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNoteToEdit(null);
  };

  return (
    <div id="schedule-screen" className="flex flex-col w-full pb-8 space-y-4">
      {/* Sticky Header with Title and Add Button */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 pt-3 pb-3 border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white tracking-tight">Schedule Access Requests</h2>
          </div>
          <p className="text-xs text-slate-400">
            {isAdmin
              ? `Manage all user's access schedule requests`
              : 'Manage your access schedule requests'}
          </p>
        </div>

        <button
          id="add-schedule-note-header-btn"
          onClick={handleOpenNewRequest}
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
              onClick={handleOpenNewRequest}
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
              const canEdit = isAdmin || isOwner;
              const canDelete = isAdmin || isOwner;

              return (
                <div
                  key={note.id}
                  id={`note-card-${note.id}`}
                  className="bg-[#111827] rounded-2xl p-4 border border-slate-800 hover:border-slate-700 shadow-md transition-all space-y-3 relative overflow-hidden"
                >
                  {/* Header with Title and Action Buttons (Edit + Delete) */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white tracking-wide">{note.title}</h3>
                        {isOwner && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            Your Request
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                        <User className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>
                          Request from <strong className="text-slate-200">{note.username}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-mono">
                        <span>Booked {note.createdDate}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {canEdit && (
                        <button
                          id={`edit-note-btn-${note.id}`}
                          onClick={() => handleOpenEditRequest(note)}
                          className="text-slate-400 hover:text-cyan-300 p-1.5 rounded-lg hover:bg-cyan-950/40 transition-colors cursor-pointer"
                          title={isAdmin && !isOwner ? `Edit ${note.username}'s reservation (Admin)` : 'Edit your reservation'}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          id={`delete-note-btn-${note.id}`}
                          onClick={() => deleteLabNote(note.id)}
                          className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/40 transition-colors cursor-pointer"
                          title={isAdmin && !isOwner ? `Cancel ${note.username}'s reservation (Admin)` : 'Cancel reservation'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Purpose Note Box (only if provided) */}
                  {note.purpose ? (
                    <p className="text-xs text-slate-300 bg-[#090d16] p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                      {note.purpose}
                    </p>
                  ) : null}

                  {/* Footer Time and Date */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{note.startTime} to {note.endTime}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>
                        {note.startDate && note.endDate && note.startDate !== note.endDate
                          ? `${note.startDate} to ${note.endDate}`
                          : note.startDate || note.date}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Schedule Request / Edit Modal */}
        <ScheduleModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          noteToEdit={selectedNoteToEdit}
        />
      </div>
    </div>
  );
};
