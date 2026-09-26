import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { useApp } from '../context/AppContext';
import {
  Upload,
  UserPlus,
  UserCheck,
  UserCog,
  X,
  KeyRound,
  Shield,
  Clock,
  Sparkles,
  Camera,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Mail,
  User,
} from 'lucide-react';
import user_png from './../assets/images/user.png';

interface UserManagementModalProps {
  isSelf: boolean;
  isOpen: boolean;
  onClose: () => void;
  userToEdit: Profile | null;
  onSaveUser: (
    userData: {
      username: string;
      password?: string;
      type: 'admin' | 'user';
      permission: string;
      email?: string;
      avatarUrl?: string;
      time?: number[];
    },
    isEditing: boolean,
    originalUsername?: string
  ) => { success: boolean; error?: string };
  onDeleteUser?: (username: string) => { success: boolean; error?: string };
}

const sampleAvatars = [
  user_png,
  user_png,
  user_png,
  user_png,
  user_png,
  user_png
];

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isSelf,
  isOpen,
  onClose,
  userToEdit,
  onSaveUser,
  onDeleteUser,
}) => {
  const { currentUser } = useApp();
  const isEditing = !!userToEdit;

  const isSelfAccount = isSelf || (!!currentUser && !!userToEdit && (userToEdit.username.toLowerCase() === currentUser.username.toLowerCase()));
  const isAdministratorAccount = !!userToEdit && (userToEdit.username.toLowerCase() === 'administrator');
  const canDelete = isEditing && !isSelfAccount && !isAdministratorAccount && !!onDeleteUser;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [permission, setPermission] = useState('Standard User Access');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(sampleAvatars[0]);
  const [selectedPhoto, setSelectedPhoto] = useState(avatarUrl || '');
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [showCustomAvatar, setShowCustomAvatar] = useState(false);

  // Time clearance schedule preset
  const [clearancePreset, setClearancePreset] = useState<'24_7' | 'standard' | 'extended' | 'morning' | 'custom'>('standard');
  const [customStartHour, setCustomStartHour] = useState('08:00');
  const [customEndHour, setCustomEndHour] = useState('18:00');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setUsername(userToEdit.username);
      setPassword(''); // Keep blank unless admin wants to overwrite
      setRole(userToEdit.type);
      setPermission(userToEdit.permission || (userToEdit.type === 'admin' ? 'Admin Privilege' : 'Standard User Access'));
      setEmail(userToEdit.email || `${userToEdit.username.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`);
      setAvatarUrl(userToEdit.avatarUrl || sampleAvatars[0]);
      
      // Map user's clearance time
      if (userToEdit.type === 'admin' || (userToEdit.time && userToEdit.time[0] === 0 && userToEdit.time[1] >= 1440)) {
        setClearancePreset('24_7');
      } else if (userToEdit.time && userToEdit.time[0] === 600 && userToEdit.time[1] === 780) {
        setClearancePreset('morning');
      } else {
        setClearancePreset('standard');
      }
    } else {
      // Defaults for new user
      setUsername('');
      setPassword('');
      setRole('user');
      setPermission('Standard User Access');
      setEmail('');
      setAvatarUrl(sampleAvatars[Math.floor(Math.random() * sampleAvatars.length)]);
      setClearancePreset('standard');
    }
    setErrorMessage(null);
    setIsConfirmingDelete(false);
    setShowCustomAvatar(false);
    setCustomAvatarInput('');
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('Please provide a valid username.');
      return;
    }

    if (!isEditing && (!password || password.length < 4)) {
      setErrorMessage('New users require a password of at least 4 characters.');
      return;
    }

    if (isEditing && password && password.length < 4) {
      setErrorMessage('New password must be at least 4 characters long.');
      return;
    }

    // Calculate time array
    let timeRange: number[] = [480, 1080];
    if (role === 'admin' || clearancePreset === '24_7') {
      timeRange = [0, 1440];
    } else if (clearancePreset === 'morning') {
      timeRange = [600, 780]; // 10 AM to 1 PM
    } else if (clearancePreset === 'extended') {
      timeRange = [420, 1320]; // 7 AM to 10 PM
    } else if (clearancePreset === 'custom') {
      const [sH, sM] = customStartHour.split(':').map(Number);
      const [eH, eM] = customEndHour.split(':').map(Number);
      timeRange = [sH * 60 + sM, eH * 60 + eM];
    }

    const payload: {
      username: string;
      password?: string;
      type: 'admin' | 'user';
      permission: string;
      email?: string;
      avatarUrl?: string;
      time?: number[];
    } = {
      username: cleanUsername,
      type: role,
      permission: role === 'admin' ? 'Admin Privilege' : permission,
      email: email.trim() || `${cleanUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}@lab.smartlock.io`,
      avatarUrl: customAvatarInput.trim() || avatarUrl,
      time: timeRange,
    };

    if (password) {
      payload.password = password;
    }

    const result = onSaveUser(payload, isEditing, userToEdit?.username);
    if (!result.success) {
      setErrorMessage(result.error || 'Failed to save user profile.');
      return;
    }

    onClose();
  };

  const handleDelete = () => {
    if (!userToEdit || !onDeleteUser) return;
    if (isSelfAccount) {
      setErrorMessage('You cannot delete your own account.');
      setIsConfirmingDelete(false);
      return;
    }
    if (isAdministratorAccount) {
      setErrorMessage('The primary Administrator account cannot be deleted.');
      setIsConfirmingDelete(false);
      return;
    }
    const result = onDeleteUser(userToEdit.username);
    if (!result.success) {
      setErrorMessage(result.error || 'Failed to delete user profile.');
      setIsConfirmingDelete(false);
      return;
    }
    onClose();
  };

  return (
    <div
      id="user-management-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        id="user-management-modal-container"
        className="bg-[#111827] w-full max-w-lg rounded-2xl border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#090d16]/90">
          <div className="flex items-center gap-2.5">
            <div className="bg-cyan-500/10 p-2 rounded-xl text-cyan-400 border border-cyan-500/20">
              {isEditing ? <UserCog className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {isEditing ? `Modify Profile: ${userToEdit.username}` : 'Creating a New Profile'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {isEditing
                  ? 'Manage existing profile details and settings'
                  : 'Create new profile details and settings'}
              </p>
            </div>
          </div>
          <button
            id="close-user-management-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 bg-red-500/15 border border-red-500/40 text-red-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Avatar Selector */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              Profile Photo
            </label>
            <div className="flex items-center gap-3">
              <img
                src={customAvatarInput || avatarUrl}
                alt="Profile Photo Preview"
                className="w-14 h-14 rounded-full object-cover border-2 border-cyan-400 shadow-md shrink-0"
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <label className="flex items-center justify-center gap-2 w-full p-2.5 bg-[#090d16] border border-dashed border-slate-700 hover:border-emerald-500 rounded-xl text-xs text-slate-300 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Upload Photo from Device (PNG, JPG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                Username
              </label>
              <input
                id="admin-user-input-username"
                type="text"
                required
                placeholder="e.g., Dr. Jane Doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                Email
              </label>
              <input
                id="admin-user-input-email"
                type="email"
                placeholder="user@smartlock.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Role & Access Tier */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Account Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="admin-select-role-user"
                onClick={() => {
                  setRole('user');
                  setPermission('Standard User Access');
                }}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  role === 'user'
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-white shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                    : 'bg-[#0f172a] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>Standard User</span>
                    {role === 'user' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">Restricted access</p>
                </div>
              </button>

              <button
                type="button"
                id="admin-select-role-admin"
                onClick={() => {
                  setRole('admin');
                  setPermission('Admin Privilege');
                  setClearancePreset('24_7');
                }}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  role === 'admin'
                    ? 'bg-red-500/15 border-red-500/60 text-white shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                    : 'bg-[#0f172a] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>Administrator</span>
                    {role === 'admin' && (
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">Full access</p>
                </div>
              </button>
            </div>
          </div>

          {/* Password Setup */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                {isEditing ? 'Overwrite Password (Optional)' : 'New Password:'}
              </span>
              {isEditing && <span className="text-[10px] font-mono text-slate-500">Leave blank to keep current</span>}
            </label>
            <input
              id="admin-user-input-password"
              type="text"
              placeholder={isEditing ? 'Enter new password to overwrite existing password...' : 'Please input atleast 8 characters...'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {canDelete && (
            <div className="pt-2 border-t border-slate-800/80">
              {!isConfirmingDelete ? (
                <button
                  type="button"
                  id="admin-delete-user-trigger-btn"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="w-full py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete User Profile & Revoke Access</span>
                </button>
              ) : (
                <div className="bg-red-500/15 border border-red-500/40 p-3 rounded-xl space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2 text-red-300 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Confirm Profile Deletion for "{userToEdit?.username}"?</span>
                  </div>
                  <p className="text-[11px] text-red-200">
                    This will immediately remove the user's account. This action cannot be undone.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      id="admin-confirm-delete-user-btn"
                      onClick={handleDelete}
                      className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow"
                    >
                      Yes, Permanently Delete
                    </button>
                    <button
                      type="button"
                      id="admin-cancel-delete-user-btn"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              id="admin-cancel-user-modal-btn"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="admin-save-user-submit-btn"
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Save Changes' : 'Create & Enroll User'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
