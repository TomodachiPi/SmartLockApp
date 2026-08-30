import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  DoorClosed,
  DoorOpen,
  CheckCircle2,
  Lock,
  Unlock,
  Radio,
  Wifi,
  BatteryCharging,
  Cpu,
  Shield,
  X,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface DoorSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDoorId?: string;
  onSelectDoor?: (doorId: string, doorName: string) => void;
}

interface DoorOption {
  id: string;
  name: string;
  code: string;
  room: string;
  status: 'online' | 'maintenance' | 'offline';
  description: string;
  battery: string;
  signal: string;
  isCurrentDefault?: boolean;
}

const availableDoors: DoorOption[] = [
  {
    id: 'lab-door-1',
    name: 'Laboratory Door 1',
    code: 'LAB-DOOR-1A',
    room: 'East Building Room 1',
    status: 'online',
    description: 'For Natural Science Classes',
    battery: '98%',
    signal: '-42 dBm',
    isCurrentDefault: true,
  },
  {
    id: 'lab-door-2',
    name: 'Laboratory Door 2',
    code: 'LAB-DOOR-2A',
    room: 'East Building Room 2',
    status: 'maintenance',
    description: 'For Computer Science Classes',
    battery: '92%',
    signal: '-68 dBm',
  },
  {
    id: 'lab-door-3',
    name: 'Classroom Door 1',
    code: 'CLASS-DOOR-1A',
    room: 'West Building',
    status: 'offline',
    description: 'Ultra-low temperature storage security lock. Offline in demo mode.',
    battery: '85%',
    signal: 'Offline',
  },
];

export const DoorSelectModal: React.FC<DoorSelectModalProps> = ({
  isOpen,
  onClose,
  selectedDoorId = 'lab-door-1',
  onSelectDoor,
}) => {
  const { locked, toggleLock, changing } = useApp();
  const [activeSelected, setActiveSelected] = useState(selectedDoorId);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = (door: DoorOption) => {
    if (door.status !== 'online') {
      setStatusMessage(`Notice: ${door.name} is currently in ${door.status} mode.`);
      return;
    }
    setActiveSelected(door.id);
    if (onSelectDoor) {
      onSelectDoor(door.id, door.name);
    }
    setStatusMessage(`Selected lock switched to ${door.name}`);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div
      id="door-select-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        id="door-select-modal-container"
        className="bg-[#111827] w-full max-w-md rounded-2xl border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#090d16]/80">
          <div className="flex items-center gap-2.5">
            <div className="bg-cyan-500/10 p-2 rounded-xl text-cyan-400 border border-cyan-500/20">
              <DoorClosed className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">SmartLock Unit Selection</h3>
            </div>
          </div>
          <button
            id="close-door-select-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {statusMessage && (
          <div className="mx-4 mt-3 p-2.5 bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            Choose which smart lock unit for user to lock and unlock:
          </p>

          <div className="space-y-3">
            {availableDoors.map((door) => {
              const isSelected = activeSelected === door.id;
              const isOnline = door.status === 'online';

              return (
                <div
                  key={door.id}
                  id={`door-option-${door.id}`}
                  onClick={() => handleSelect(door)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-[#142032] border-cyan-500/70 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                      : isOnline
                      ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
                      : 'bg-[#0b0f19] border-slate-800/60 opacity-65'
                  }`}
                >
                  {/* Selected Indicator Glow */}
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-xl ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                            : isOnline
                            ? 'bg-slate-800 text-cyan-400'
                            : 'bg-slate-900 text-slate-500'
                        }`}
                      >
                        {isSelected && !locked ? (
                          <DoorOpen className="w-4 h-4" />
                        ) : (
                          <DoorClosed className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{door.name}</h4>
                          {isSelected && (
                            <span className="text-[9px] font-mono font-black bg-cyan-500 text-slate-950 px-2 py-0.5 rounded-full">
                              SELECTED
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-cyan-400 font-mono">{door.code} • {door.room}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-bold border ${
                        isOnline
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : door.status === 'maintenance'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {door.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{door.description}</p>

                  {/* Telemetry & Quick Action Bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-cyan-400" />
                        {door.signal}
                      </span>
                      <span className="flex items-center gap-1">
                        <BatteryCharging className="w-3 h-3 text-emerald-400" />
                        {door.battery}
                      </span>
                    </div>

                    {isSelected && isOnline && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex items-center gap-1 font-bold ${
                            locked ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          {locked ? 'CURRENTLY LOCKED' : 'CURRENTLY UNLOCKED'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#090d16]/80 flex justify-end gap-2">
          <button
            id="close-door-modal-footer-btn"
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer transition-all"
          >
            Confirm Target Portal
          </button>
        </div>
      </div>
    </div>
  );
};
