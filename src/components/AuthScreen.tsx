import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DoorSelectModal } from './DoorSelectModal';
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  DoorClosed,
  ChevronRight,
} from 'lucide-react';
import padlock_png from "./../assets/images/padlock.png";

export const AuthScreen: React.FC = () => {
  const { login, registerRequest, registrationNotice, dismissRegistrationNotice, locked, syncAuthData } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showingLogin, setShowingLogin] = useState(true);
  const [selectedDoorName, setSelectedDoorName] = useState('Laboratory Door 1');
  const [isDoorModalOpen, setIsDoorModalOpen] = useState(false);

  const [showIncorrectUsername, setShowIncorrectUsername] = useState(false);
  const [showIncorrectPassword, setShowIncorrectPassword] = useState(false);
  const [showUsernameTaken, setShowUsernameTaken] = useState(false);

  // Sync user credentials and requests with ESP8266 continuously while on AuthScreen
  useEffect(() => {
    syncAuthData();
    const interval = setInterval(() => {
      syncAuthData();
    }, 4000);
    return () => clearInterval(interval);
  }, [syncAuthData]);

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
      syncAuthData();
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
            src={padlock_png}
            alt="SmartLock Padlock"
            className="w-36 h-36 sm:w-40 sm:h-40 object-contain relative drop-shadow-[0_10px_20px_rgba(6,182,212,0.3)]"
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">SmartLock</h1>
        <p className="text-sm font-mono text-cyan-400 mt-1 font-semibold">Created by Group No. 1</p>
        <p className="text-xs sm:text-sm font-mono text-slate-400 mt-0.5">
          It is currently {formattedTime}
        </p>
        <p className="text-xs sm:text-sm font-mono text-slate-400 mt-0.5">
          {formattedDate}
        </p>
      </div>

      {/* Target Door Selector Button */}
      <div className="w-full mb-5">
        <button
          id="auth-door-select-btn"
          type="button"
          onClick={() => setIsDoorModalOpen(true)}
          className="w-full bg-[#111827] hover:bg-[#162032] border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 flex items-center justify-between text-left transition-all duration-200 shadow-md group cursor-pointer min-h-[52px]"
        >
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/10 group-hover:bg-cyan-500/20 p-2.5 rounded-xl text-cyan-400 border border-cyan-500/30 transition-colors shrink-0">
              {locked ? <DoorClosed className="w-5 h-5 text-red-400" /> : <DoorClosed className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors block">
                {selectedDoorName}
              </span>
              <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 font-medium">
                <span className={locked ? 'text-red-400' : 'text-emerald-400'}>
                  {locked ? 'Currently Locked' : 'Currently Unlocked'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs sm:text-sm font-mono text-cyan-400 group-hover:translate-x-0.5 transition-transform shrink-0">
            <span className="font-bold">Select Lock</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Requested Post-Registration Notification Banner */}
      {registrationNotice && (
        <div
          id="registration-success-alert"
          className="w-full mb-5 bg-emerald-500/15 border border-emerald-500/50 text-white p-4 rounded-2xl shadow-lg flex items-start gap-3 animate-fade-in"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs sm:text-sm font-mono font-bold text-emerald-400 uppercase tracking-wider">
              Registration Successful!
            </h4>
            <p className="text-xs sm:text-sm text-slate-200 mt-0.5 leading-relaxed">
              {registrationNotice}
            </p>
          </div>
          <button
            onClick={dismissRegistrationNotice}
            className="text-slate-400 hover:text-white text-sm font-bold p-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Login vs Sign In Request Tabs */}
      <div
        id="auth-toggle-buttons"
        className="flex items-center justify-center w-full bg-[#111827] p-1.5 rounded-2xl border border-slate-800 mb-6 font-mono text-xs sm:text-sm"
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
          className={`flex-1 py-3 text-center font-bold rounded-xl transition-all cursor-pointer min-h-[44px] ${
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
          className={`flex-1 py-3 text-center font-bold rounded-xl transition-all cursor-pointer min-h-[44px] ${
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
              <label className="block text-xs sm:text-sm font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                Username:
              </label>
              <input
                id="login-username-input"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#111827] border border-slate-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-500 text-sm sm:text-base min-h-[48px]"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                Password:
              </label>
              <input
                id="login-password-input"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#111827] border border-slate-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-500 text-sm sm:text-base min-h-[48px]"
                required
              />
            </div>

            {/* Error notifications */}
            {showIncorrectUsername && (
              <div
                id="alert-user-not-found"
                className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 shadow-lg animate-fade-in"
              >
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                <span>Username not recognized in system database.</span>
              </div>
            )}

            {showIncorrectPassword && (
              <div
                id="alert-incorrect-password"
                className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 shadow-lg animate-fade-in"
              >
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                <span>Incorrect password. Please verify and try again.</span>
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-3.5 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer text-sm sm:text-base tracking-wide mt-2 min-h-[48px]"
            >
              Sign In to SmartLock
            </button>

            <div className="mt-4 p-3.5 bg-[#111827] border border-slate-800 rounded-2xl text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-1.5 text-white font-mono text-xs font-bold">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Quick Demo Accounts:</span>
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
              <label className="block text-xs sm:text-sm font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                Desired Username:
              </label>
              <input
                id="register-username-input"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#111827] border border-slate-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-500 text-sm sm:text-base min-h-[48px]"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                Create Password:
              </label>
              <input
                id="register-password-input"
                type="password"
                placeholder="Set secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#111827] border border-slate-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-500 text-sm sm:text-base min-h-[48px]"
                required
              />
            </div>

            {showUsernameTaken && (
              <div
                id="alert-username-taken"
                className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 shadow-lg animate-fade-in"
              >
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                <span>That username is already registered or requested.</span>
              </div>
            )}

            <button
              id="register-submit-btn"
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer text-sm sm:text-base tracking-wide mt-2 min-h-[48px]"
            >
              Submit Registration Request
            </button>
          </form>
        )}
      </div>

      <DoorSelectModal
        isOpen={isDoorModalOpen}
        onClose={() => setIsDoorModalOpen(false)}
        selectedDoorId="lab-door-1"
        onSelectDoor={(_doorId, doorName) => {
          setSelectedDoorName(doorName);
          setIsDoorModalOpen(false);
        }}
      />
    </div>
  );
};
