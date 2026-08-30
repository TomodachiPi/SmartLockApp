import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DoorSelectModal } from './DoorSelectModal';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Shield,
  Lock,
  Unlock,
  KeyRound,
  UserCheck,
  DoorClosed,
  Sliders,
  ChevronRight,
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, registerRequest, registrationNotice, dismissRegistrationNotice, locked } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showingLogin, setShowingLogin] = useState(true);
  const [selectedDoorId, setSelectedDoorId] = useState('lab-door-1');
  const [selectedDoorName, setSelectedDoorName] = useState('Laboratory Door 1');
  const [isDoorModalOpen, setIsDoorModalOpen] = useState(false);

  const [showIncorrectUsername, setShowIncorrectUsername] = useState(false);
  const [showIncorrectPassword, setShowIncorrectPassword] = useState(false);
  const [showUsernameTaken, setShowUsernameTaken] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowIncorrectUsername(false);
    setShowIncorrectPassword(false);

    if (!username.trim()) {
      setShowIncorrectUsername(true);
      return;
    }

    const res = login(username, password);
    if (!res.success) {
      if (res.error === 'user_not_found') {
        setShowIncorrectUsername(true);
      } else if (res.error === 'incorrect_password') {
        setShowIncorrectPassword(true);
      }
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowUsernameTaken(false);

    if (!username.trim() || !password.trim()) {
      return;
    }

    const res = registerRequest(username, password);
    if (!res.success) {
      if (res.error === 'username_taken') {
        setShowUsernameTaken(true);
      }
    } else {
      setUsername('');
      setPassword('');
      setShowingLogin(true); // Switch to login screen
    }
  };

  // Live formatted current date and time
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div id="auth-screen-container" className="flex flex-col items-center w-full px-4 py-8 max-w-md mx-auto">
      {/* Front Logo Header */}
      <div className="flex flex-col items-center text-center mt-2 mb-6">
        <div className="relative mb-3">
          <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full blur-xl opacity-30 animate-pulse-slow" />
          <img
            src="/images/padlock.png"
            alt="SmartLock Padlock"
            className="w-42 h-42 object-contain relative drop-shadow-[0_10px_20px_rgba(6,182,212,0.3)]"
          />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">SmartLock</h1>
        <p className="text-sm font-mono text-cyan-400 mt-1">Created by Group [NUMBER]</p>
        <p className="text-xs font-mono text-slate-400 mt-0.5">
          It is currently {formattedTime}
        </p>
        <p className="text-xs font-mono text-slate-400 mt-0.5">
          {formattedDate}
        </p>
      </div>

      {/* Target Door Selector Pushable Button & Telemetry */}
      <div className="w-full mb-5">
        <button
          id="auth-door-select-btn"
          type="button"
          onClick={() => setIsDoorModalOpen(true)}
          className="w-full bg-[#111827] hover:bg-[#162032] border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-3.5 flex items-center justify-between text-left transition-all duration-200 shadow-md group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/10 group-hover:bg-cyan-500/20 p-2.5 rounded-xl text-cyan-400 border border-cyan-500/30 transition-colors">
              {locked ? <DoorClosed className="w-5 h-5" /> : <DoorClosed className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {selectedDoorName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                <span className={locked ? 'text-red-400' : 'text-emerald-400'}>
                  {locked ? 'Currently Locked' : 'Currently Unlocked'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-mono text-cyan-400 group-hover:translate-x-0.5 transition-transform">
            <span className="text-[11px] font-bold">Select Lock</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Requested Post-Registration Notification Banner */}
      {registrationNotice && (
        <div
          id="registration-success-alert"
          className="w-full mb-5 bg-emerald-500/15 border border-emerald-500/50 text-white p-3.5 rounded-2xl shadow-lg flex items-start gap-3 animate-fade-in"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              Registration Successful!
            </h4>
            <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
              {registrationNotice}
            </p>
          </div>
          <button
            onClick={dismissRegistrationNotice}
            className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Login vs Sign In Request Tabs */}
      <div
        id="auth-toggle-buttons"
        className="flex items-center justify-center w-full bg-[#111827] p-1 rounded-2xl border border-slate-800 mb-6 font-mono text-xs"
      >
        <button
          id="toggle-login-tab"
          type="button"
          onClick={() => {
            setShowingLogin(true);
            setShowIncorrectUsername(false);
            setShowIncorrectPassword(false);
            setShowUsernameTaken(false);
          }}
          className={`flex-1 py-2.5 text-center font-bold rounded-xl transition-all cursor-pointer ${
            showingLogin
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Log in
        </button>

        <button
          id="toggle-signin-tab"
          type="button"
          onClick={() => {
            setShowingLogin(false);
            setShowIncorrectUsername(false);
            setShowIncorrectPassword(false);
            setShowUsernameTaken(false);
          }}
          className={`flex-1 py-2.5 text-center font-bold rounded-xl transition-all cursor-pointer ${
            !showingLogin
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Register Request
        </button>
      </div>

      {/* Form Content */}
      <div className="w-full">
        {showingLogin ? (
          <form onSubmit={handleLoginSubmit} id="login-form" className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Username:
              </label>
              <input
                id="login-username-input"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#111827] border border-slate-800 text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-500 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Password:
              </label>
              <input
                id="login-password-input"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#111827] border border-slate-800 text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-500 text-xs"
                required
              />
            </div>

            {/* Error notifications */}
            {showIncorrectUsername && (
              <div
                id="alert-user-not-found"
                className="bg-red-500/15 border border-red-500/40 text-red-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg animate-fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>Username not recognized in system database.</span>
              </div>
            )}

            {showIncorrectPassword && (
              <div
                id="alert-incorrect-password"
                className="bg-red-500/15 border border-red-500/40 text-red-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg animate-fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>Incorrect credentials for this account.</span>
              </div>
            )}

            <button
              id="login-submit-button"
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer mt-2"
            >
              <Lock className="w-4 h-4" />
              <span className="text-sm tracking-wide">Log in</span>
            </button>

            {/* Default credentials quick switcher */}
            <div className="mt-4 p-3.5 bg-[#111827] border border-slate-800 rounded-2xl text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-1.5 text-white font-mono text-[16px] font-bold">
                <span>(TAPNO LANG ALISTO AGDEBUG, REMINDER NGA IKATEN ETOY!!!)</span>
              </div>
              <div className="flex justify-between items-center bg-[#090d16] p-2 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-white font-bold block">Administrator</span>
                  <span className="text-cyan-400 font-mono text-[10px]">Pass: admin123 (Root Admin)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('Administrator');
                    setPassword('admin123');
                  }}
                  className="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors border border-cyan-500/30"
                >
                  Fill Admin
                </button>
              </div>
              <div className="flex justify-between items-center bg-[#090d16] p-2 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-white font-bold block">User123test</span>
                  <span className="text-emerald-400 font-mono text-[10px]">Pass: user (Standard User)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('User123test');
                    setPassword('user');
                  }}
                  className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors border border-emerald-500/30"
                >
                  Fill User
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} id="register-form" className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Requested Username / Handle:
              </label>
              <input
                id="register-username-input"
                type="text"
                placeholder="e.g. JohnDoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#111827] border border-slate-800 text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Create Account Password:
              </label>
              <input
                id="register-password-input"
                type="password"
                placeholder="Create passcode"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#111827] border border-slate-800 text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500 text-xs"
                required
              />
            </div>

            {showUsernameTaken && (
              <div
                id="alert-username-taken"
                className="bg-red-500/15 border border-red-500/40 text-red-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg animate-fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>Username already taken or pending administrator review!</span>
              </div>
            )}

            <button
              id="register-submit-button"
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer mt-2"
            >
              <UserCheck className="w-4 h-4" />
              <span className="text-sm tracking-wide">Submit Registration Request</span>
            </button>

            <p className="text-xs text-slate-400 text-center pt-1 leading-relaxed">
              New accounts will have to be reviewed by System Administrators before approval and creation.
            </p>
          </form>
        )}
      </div>

      {/* Target Door Selection & Actuator Control Modal */}
      <DoorSelectModal
        isOpen={isDoorModalOpen}
        onClose={() => setIsDoorModalOpen(false)}
        selectedDoorId={selectedDoorId}
        onSelectDoor={(id, name) => {
          setSelectedDoorId(id);
          setSelectedDoorName(name);
        }}
      />
    </div>
  );
};
