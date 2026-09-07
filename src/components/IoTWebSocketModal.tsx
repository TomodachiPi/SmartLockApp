import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Wifi,
  WifiOff,
  Radio,
  Send,
  RefreshCw,
  Sliders,
  X,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Terminal,
  Cpu,
  Zap,
} from 'lucide-react';

interface IoTWebSocketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IoTWebSocketModal: React.FC<IoTWebSocketModalProps> = ({ isOpen, onClose }) => {
  const {
    wsStatus,
    wsUrl,
    setWsUrl,
    reconnectWebSocket,
    isSimulatorActive,
    setIsSimulatorActive,
    wsLogs,
    clearWsLogs,
    sendCustomWsMessage,
    toggleLock,
    changing,
    locked,
    lockProgress,
    remainingLockTime,
  } = useApp();

  const [inputUrl, setInputUrl] = useState(wsUrl);
  const [customMsg, setCustomMsg] = useState('toggle');
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setWsUrl(inputUrl.trim());
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleSendTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    sendCustomWsMessage(customMsg.trim());
  };

  const statusBadge = () => {
    switch (wsStatus) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            ONLINE (CONNECTED)
          </span>
        );
      case 'simulated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            <Cpu className="w-3 h-3 text-cyan-400" />
            SIMULATOR ACTIVE
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
            CONNECTING...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
            <WifiOff className="w-3 h-3 text-rose-400" />
            DISCONNECTED / OFFLINE
          </span>
        );
    }
  };

  return (
    <div
      id="iot-websocket-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0d121f] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#090d16]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                SmartLock Connection Debug
              </h3>
            </div>
          </div>
          <button
            id="close-ws-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="bg-[#111726] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Device Connection</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
              <div className="bg-[#090d16] p-2.5 rounded-lg border border-slate-800">
                <span className="text-[18px] text-slate-400 block">Current Status</span>
                <span className={`text-[16px] font-bold ${locked ? 'text-red-400' : 'text-emerald-400'}`}>
                  {changing ? (locked ? 'UNLOCKING...' : 'LOCKING...') : locked ? 'LOCKED' : 'UNLOCKED'}
                </span>
              </div>
              <div className="bg-[#090d16] p-2.5 rounded-lg border border-slate-800">
                <span className="text-[18px] text-slate-400 block">Changing Progress</span>
                <span className="text-[16px] font-bold text-cyan-400">
                  {changing ? `${lockProgress}%` : 'Idle'}
                </span>
                {changing && remainingLockTime !== null && (
                  <span className="text-[16px] text-slate-400 block">
                    {remainingLockTime}s remaining
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center">
              <button
                id="ws-modal-toggle-lock-btn"
                onClick={toggleLock}
                disabled={changing}
                className={`gap-2 flex-1 py-2.5 px-4 rounded-xl font-mono text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  changing
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : locked
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{changing ? `SmartLock currently ${locked ? 'unlocking' : 'locking'}` : `Send "toggle" to ${locked ? 'UNLOCK' : 'LOCK'}`}</span>
              </button>
            </div>
          </div>

          {/* IoT Device Simulator Toggle */}
          <div className="bg-[#111726] border border-cyan-900/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <div>
                  <h4 className="text-xs font-bold text-white font-mono">IoT Hardware Simulator</h4>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="toggle-simulator-switch"
                  type="checkbox"
                  checked={isSimulatorActive}
                  onChange={(e) => setIsSimulatorActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
              </label>
            </div>
            {isSimulatorActive && (
              <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-lg p-2.5 text-[11px] font-mono text-cyan-300">
                SmartLock IoT device simulator is on...
              </div>
            )}
          </div>

          {/* WebSocket Server URL Configuration */}
          <div className="bg-[#111726] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="ws-url-input" className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                WebSocket URL
              </label>
            </div>

            <form onSubmit={handleSaveUrl} className="flex gap-2">
              <input
                id="ws-url-input"
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="ws://192.168.4.1/ws"
                className="flex-1 bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
              <button
                id="save-ws-url-btn"
                type="submit"
                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                Save & Connect
              </button>
            </form>

            {savedNotice && (
              <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> WebSocket address updated and reconnecting...
              </p>
            )}

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-mono text-slate-500 self-center">e.g.:</span>
              <button
                type="button"
                onClick={() => setInputUrl('ws://192.168.4.1/ws')}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                ws://192.168.4.1/ws (ESP8266 AP)
              </button>
              <button
                type="button"
                onClick={() => setInputUrl('ws://192.168.1.100/ws')}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                ws://192.168.1.100/ws (LAN)
              </button>
            </div>
            
            <div className="flex items-center justify-center">
              <button
                  id="reconnect-ws-btn"
                  onClick={reconnectWebSocket}
                  title="Reconnect WebSocket"
                  className="flex flex-1 items-center justify-center gap-3 p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl transition-colors cursor-pointer border border-slate-700"
                >
                <span>Reconnect</span>
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            
          </div>

          {/* Custom Message Sender */}
          <div className="bg-[#111726] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                Send String Command
              </span>
            </div>

            <form onSubmit={handleSendTest} className="flex gap-2">
              <input
                id="custom-ws-msg-input"
                type="text"
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder='Command (e.g. "toggle")'
                className="flex-1 bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
              <button
                id="send-custom-ws-btn"
                type="submit"
                disabled={changing}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>

          <div className="bg-[#090d16] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 bg-[#111726] border-b border-slate-800 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>WebSocket Logs ({wsLogs.length})</span>
              </div>
              <button
                onClick={clearWsLogs}
                className="text-[10px] hover:text-white transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="p-3 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1.5">
              {wsLogs.length === 0 ? (
                <p className="text-slate-600 italic">No WebSocket history. Do an action involving websockets to see it here</p>
              ) : (
                wsLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 leading-relaxed ${
                      log.type === 'send'
                        ? 'text-cyan-300'
                        : log.type === 'receive'
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    <span className="text-[9px] text-slate-600 shrink-0 select-none">
                      {log.timestamp}
                    </span>
                    <span
                      className={`px-1 rounded text-[9px] font-bold shrink-0 select-none ${
                        log.type === 'send'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : log.type === 'receive'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {log.type === 'send' ? 'OUT' : log.type === 'receive' ? 'IN' : 'SYS'}
                    </span>
                    <span className="break-all font-mono">{log.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
