import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthScreen } from './components/AuthScreen';
import { LockScreen } from './components/LockScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { ScheduleScreen } from './components/ScheduleScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { Navbar } from './components/Navbar';

const MainAppContent: React.FC = () => {
  const { currentUser, activeTab } = useApp();

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-[#05070d] text-white flex flex-col justify-center items-center p-4">
        <AuthScreen />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white flex flex-col items-center justify-start">
      {/* Mobile-first simulated shell for authentic mobile app UX, max-w-md for smartphone/tablet */}
      <div className="w-full max-w-md min-h-screen bg-[#090d16] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col relative border-x border-slate-800/80">
        {/* Main Content View with scroll */}
        <main className="flex-1 overflow-y-auto pb-20">
          {activeTab === 'lock' && <LockScreen />}
          {activeTab === 'history' && <HistoryScreen />}
          {activeTab === 'schedule' && <ScheduleScreen />}
          {(activeTab === 'settings' || activeTab === 'users') && <SettingsScreen />}
        </main>

        {/* Sticky Bottom Navigation Bar */}
        <Navbar />
      </div>
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}

export default App;
