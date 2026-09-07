import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { KeyRound, Camera, Upload, Check, X, AlertCircle } from 'lucide-react';
import user_png from './../assets/images/user.png';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'password' | 'photo';
}

const sampleAvatars = [
  user_png,
  user_png,
  user_png,
  user_png,
  user_png,
  user_png,
];

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'password',
}) => {
  const { currentUser, updatePassword, updateAvatar } = useApp();

  const [activeTab, setActiveTab] = useState<'password' | 'photo'>(defaultTab);

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Photo state
  const [selectedPhoto, setSelectedPhoto] = useState(currentUser?.avatarUrl || '');
  const [photoSuccess, setPhotoSuccess] = useState(false);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setSelectedPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = () => {
    if (!selectedPhoto) return;
    updateAvatar(selectedPhoto);
    setPhotoSuccess(true);
    setTimeout(() => {
      setPhotoSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div
        id="profile-edit-modal"
        className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(6,182,212,0.15)] text-white space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">Account & Credentials</h3>
            <p className="text-xs text-slate-400">Edit password and account profile photo</p>
          </div>
          <button
            type="button"
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
            onClick={() => setActiveTab('photo')}
            className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'photo'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Profile Photo</span>
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
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-2.5 rounded-xl text-xs tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="relative">
                <img
                  src={selectedPhoto || user_png}
                  alt="Profile Photo Preview"
                  className="w-20 h-20 rounded-full object-cover border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                />
              </div>
              <p className="text-xs text-slate-400 font-mono">Profile Photo Preview</p>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Upload from Device:
              </label>
              <label className="flex items-center justify-center gap-2 w-full p-2.5 bg-[#090d16] border border-dashed border-slate-700 hover:border-emerald-500 rounded-xl text-xs text-slate-300 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Choose photo file (PNG, JPG)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {photoSuccess && (
              <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Profile photo successfully updated!</span>
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
                type="button"
                onClick={handleSavePhoto}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-2.5 rounded-xl text-xs tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
              >
                Save Photo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
