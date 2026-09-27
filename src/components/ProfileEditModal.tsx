import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { KeyRound, Sparkles, Check, X, AlertCircle } from 'lucide-react';
import { AVATAR_ICONS, parseAvatarIndex, getAvatarByIndex } from '../data/avatarIcons';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'password' | 'icon' | 'photo';
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'password',
}) => {
  const { currentUser, updatePassword, updateAvatar } = useApp();

  const normalizedTab = defaultTab === 'password' ? 'password' : 'icon';
  const [activeTab, setActiveTab] = useState<'password' | 'icon'>(normalizedTab);

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Avatar Icon selection state (index 0 - 9)
  const [selectedIconIndex, setSelectedIconIndex] = useState<number>(() => {
    return parseAvatarIndex(currentUser?.avatarIndex ?? currentUser?.avatarUrl);
  });
  const [iconSuccess, setIconSuccess] = useState(false);
  const wasOpenRef = useRef(false);

  // Keep state in sync whenever modal opens
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setActiveTab(defaultTab === 'password' ? 'password' : 'icon');
      const currentIdx = parseAvatarIndex(currentUser?.avatarIndex ?? currentUser?.avatarUrl);
      setSelectedIconIndex(currentIdx);
      setPasswordError('');
      setPasswordSuccess(false);
      setIconSuccess(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else if (isOpen) {
      if (currentUser) {
        const currentIdx = parseAvatarIndex(currentUser.avatarIndex ?? currentUser.avatarUrl);
        setSelectedIconIndex(currentIdx);
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, defaultTab, currentUser?.avatarIndex, currentUser?.avatarUrl]);

  if (!isOpen) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    const result = updatePassword(oldPassword, newPassword);
    if (!result.success) {
      setPasswordError(result.error || 'Failed to update password');
    } else {
      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(false);
        onClose();
      }, 1500);
    }
  };

  const handleSelectIcon = (index: number) => {
    setSelectedIconIndex(index);
    // Instantly persist the selected avatar icon index
    /*
    updateAvatar(index);
    setIconSuccess(true);
    setTimeout(() => {
      setIconSuccess(false);
    }, 2500);
    */
  };

  const handleSaveIcon = () => {
    updateAvatar(selectedIconIndex);
    setIconSuccess(true);
    setTimeout(() => {
      setIconSuccess(false);
      onClose();
    }, 800);
  };

  const currentOption = AVATAR_ICONS[selectedIconIndex] || AVATAR_ICONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div
        id="profile-edit-modal"
        className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(6,182,212,0.15)] text-white space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">Account & Profile</h3>
            <p className="text-xs text-slate-400">Change password or choose your account icon</p>
          </div>
          <button
            type="button"
            id="close-profile-edit-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#090d16] p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            type="button"
            id="tab-edit-password-btn"
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'password'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Password</span>
          </button>
          <button
            type="button"
            id="tab-edit-icon-btn"
            onClick={() => setActiveTab('icon')}
            className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'icon'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Profile Icon</span>
          </button>
        </div>

        {activeTab === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Current Password:
              </label>
              <input
                id="old-password-input"
                type="password"
                placeholder="Enter current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                New Password:
              </label>
              <input
                id="new-password-input"
                type="password"
                placeholder="Enter new password (min 4 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm New Password:
              </label>
              <input
                id="confirm-password-input"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-800 focus:border-cyan-500 text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none transition-colors"
                required
              />
            </div>

            {passwordError && (
              <div className="bg-red-500/15 border border-red-500/40 text-red-300 p-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Password successfully updated!</span>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-[#1e293b] hover:bg-[#334155] text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-password-btn"
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-2.5 rounded-xl text-xs tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Live Preview Card */}
            <div className="flex items-center gap-4 p-3 bg-[#090d16] rounded-xl border border-slate-800">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-emerald-400 flex items-center justify-center p-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] overflow-hidden">
                  <img
                    id="selected-avatar-preview-img"
                    src={getAvatarByIndex(selectedIconIndex)}
                    alt={currentOption.name}
                    className="w-full h-full object-contain drop-shadow"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shadow">
                  #{selectedIconIndex}
                </div>
              </div>
              <div className="flex-1 min-w-0">

                <h4 className="text-sm font-bold text-white truncate">{currentOption.name}</h4>
                <p className="text-xs text-slate-400 truncate">{currentOption.description}</p>
              </div>
            </div>

            {/* 10 Avatar Choices Grid */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                Choose an Icon:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {AVATAR_ICONS.map((opt) => {
                  const isSelected = selectedIconIndex === opt.index;
                  return (
                    <button
                      key={opt.index}
                      type="button"
                      id={`avatar-choice-btn-${opt.index}`}
                      onClick={() => handleSelectIcon(opt.index)}
                      className={`relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-105'
                          : 'bg-[#090d16] border-slate-800 hover:border-slate-600 hover:bg-slate-800/50'
                      }`}
                      title={`${opt.name} - ${opt.description}`}
                    >
                      {/* Checkmark bubble */}
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 bg-emerald-400 text-slate-950 rounded-full w-4 h-4 flex items-center justify-center shadow">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}

                      <div className="w-9 h-9 flex items-center justify-center p-1 rounded-lg bg-slate-900/60">
                        <img
                          src={opt.src}
                          alt={opt.name}
                          className="w-full h-full object-contain transition-transform group-hover:scale-110"
                        />
                      </div>
                      <span
                        className={`text-[10px] mt-1 font-mono truncate max-w-full text-center ${
                          isSelected ? 'text-emerald-300 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {opt.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {iconSuccess && (
              <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Profile icon #{selectedIconIndex} saved & synced to all devices!</span>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-[#1e293b] hover:bg-[#334155] text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                id="save-avatar-icon-btn"
                onClick={handleSaveIcon}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-2.5 rounded-xl text-xs tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
              >
                Save Icon
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileEditModal;
