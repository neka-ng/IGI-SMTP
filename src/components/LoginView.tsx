/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'Login failed.');
      }
    } catch (e: any) {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center font-sans selection:bg-[#000066]/10 select-none">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img 
            src="https://www.iginigeria.com/wp-content/uploads/2019/06/logo-69x50.png" 
            alt="IGI logo" 
            className="h-10 w-auto object-contain bg-white p-1 rounded-xl shadow-xs"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <span className="text-sm font-black uppercase tracking-widest text-[#000066] leading-none">IGI SMTP</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Email Marketing Platform</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-md p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Sign in to access your email marketing dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="e.g. user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#000066] hover:bg-[#000044] text-white rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#000066]/10 hover:shadow-lg hover:shadow-[#000066]/20 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-[10px] text-slate-400 font-mono">
          <span>© 2026 IGI Enterprise Email Marketing Platform</span>
        </div>
      </div>
    </div>
  );
}