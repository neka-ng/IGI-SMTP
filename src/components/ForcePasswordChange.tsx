/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, AlertCircle, Check } from 'lucide-react';

interface ForcePasswordChangeProps {
  email: string;
  onPasswordChanged: () => void;
  onLogout: () => void;
}

export default function ForcePasswordChange({ email, onPasswordChanged, onLogout }: ForcePasswordChangeProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/first-login', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => onPasswordChanged(), 1500);
      } else {
        setError(data.error || 'Failed to change password.');
      }
    } catch (e: any) {
      setError(`Network error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[200]">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-scale-up">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-black text-slate-900">Password Changed!</h3>
          <p className="text-sm text-slate-500 mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[200]">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#000066]/5 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-[#000066]" />
          </div>
          <h3 className="text-lg font-black text-slate-900">Change Your Password</h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            This is your first login. You must change your password before accessing the platform.
          </p>
          <p className="text-xs text-slate-400 mt-2 font-mono">{email}</p>
        </div>

        <div className="px-8 pb-6 space-y-4">
          <div className="space-y-1">
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">New Password</label>
            <input
              type="password"
              placeholder="At least 4 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-xl h-10 px-3.5 text-sm focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all font-mono"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Confirm New Password</label>
            <input
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-xl h-10 px-3.5 text-sm focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all font-mono"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl text-xs flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving || !newPassword || !confirmPassword}
            className="w-full h-11 rounded-full bg-[#000066] hover:bg-[#000044] disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#000066]/10"
          >
            {saving ? 'Changing...' : 'Change Password'}
          </button>

          <button
            onClick={onLogout}
            className="w-full text-center text-xs text-slate-400 hover:text-red-500 font-bold uppercase tracking-wider py-2 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}