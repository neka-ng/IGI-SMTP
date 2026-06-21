/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  X, 
  Trash2, 
  Shield, 
  User,
  AlertCircle,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserProfile, AVAILABLE_MODULES } from '../types';

interface UsersManagementViewProps {
  currentUser: UserProfile;
}

export default function UsersManagementView({ currentUser }: UsersManagementViewProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add user modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newModules, setNewModules] = useState<string[]>(['dashboard', 'compose', 'campaigns', 'subscribers', 'templates', 'logs', 'api-keys']);
  const [addingUser, setAddingUser] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // Edit modules modal
  const [editModulesUser, setEditModulesUser] = useState<UserProfile | null>(null);
  const [editModules, setEditModules] = useState<string[]>([]);
  const [savingModules, setSavingModules] = useState(false);
  const [modulesError, setModulesError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async () => {
    setAddError(null);
    setAddSuccess(null);
    if (!newEmail || !newPassword) {
      setAddError('Email and password are required.');
      return;
    }
    if (!newEmail.includes('@')) {
      setAddError('Invalid email address.');
      return;
    }

    setAddingUser(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          name: newName || newEmail.split('@')[0],
          password: newPassword,
          allowedModules: newModules,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAddSuccess(`User ${newEmail} created successfully!`);
        setNewEmail('');
        setNewName('');
        setNewPassword('');
        setNewModules(['dashboard', 'compose', 'campaigns', 'subscribers', 'templates', 'logs', 'api-keys']);
        loadUsers();
        setTimeout(() => {
          setIsAddModalOpen(false);
          setAddSuccess(null);
        }, 2000);
      } else {
        setAddError(data.error || 'Failed to create user.');
      }
    } catch (e: any) {
      setAddError(`Network error: ${e.message}`);
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user "${userEmail}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/auth/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        loadUsers();
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleOpenEditModules = (user: UserProfile) => {
    setEditModulesUser(user);
    setEditModules(user.allowedModules || []);
    setModulesError(null);
  };

  const handleSaveModules = async () => {
    if (!editModulesUser) return;
    setSavingModules(true);
    setModulesError(null);

    try {
      const res = await fetch(`/api/auth/users/${editModulesUser.id}/modules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedModules: editModules }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditModulesUser(null);
        loadUsers();
      } else {
        setModulesError(data.error || 'Failed to update permissions.');
      }
    } catch (e: any) {
      setModulesError(`Network error: ${e.message}`);
    } finally {
      setSavingModules(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setNewModules((prev) =>
      prev.includes(moduleId) ? prev.filter((m) => m !== moduleId) : [...prev, moduleId]
    );
  };

  const toggleEditModule = (moduleId: string) => {
    setEditModules((prev) =>
      prev.includes(moduleId) ? prev.filter((m) => m !== moduleId) : [...prev, moduleId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#000066]/10 border-t-[#000066] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#000066]/5 text-[#000066] rounded-2xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Users Management</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Super Admin — Manage platform users and permissions</p>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-[#000066] hover:bg-[#000044] text-white font-bold text-xs uppercase tracking-widest h-10 px-5 rounded-full transition-all cursor-pointer shadow-md shadow-[#000066]/10"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl text-xs flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-100">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Modules</th>
                <th className="px-5 py-4">Created</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs italic">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/40 transition-all">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#000066] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                          {u.name?.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2) || 'U'}
                        </div>
                        <span className="text-xs font-bold text-slate-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-mono text-slate-500">{u.email}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                        u.role === 'super-admin'
                          ? 'bg-[#000066]/5 text-[#000066] border border-[#000066]/10'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {u.role === 'super-admin' ? 'Super Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(u.allowedModules || []).length === 0 ? (
                          <span className="text-[9px] text-slate-400 italic">None</span>
                        ) : (
                          (u.allowedModules || []).map((mod) => (
                            <span key={mod} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[8px] font-bold uppercase">
                              {mod}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.role !== 'super-admin' && (
                          <>
                            <button
                              onClick={() => handleOpenEditModules(u)}
                              className="p-2 hover:bg-slate-100 text-slate-400 hover:text-[#000066] rounded-lg transition-all cursor-pointer"
                              title="Set module permissions"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="p-2 hover:bg-rose-50 text-slate-400 hover:text-red-500 rounded-lg transition-all cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {u.role === 'super-admin' && (
                          <span className="text-[9px] text-slate-400 italic px-2">Protected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#000066] flex items-center gap-2">
                <User className="w-5 h-5" />
                Add New User
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-slate-500 leading-relaxed">
                Create a new user. They will receive login credentials and be prompted to change their password on first login.
              </p>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl h-10 px-3.5 text-xs focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Display Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl h-10 px-3.5 text-xs focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Temporary Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Set initial password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl h-10 px-3.5 pr-10 text-xs focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Module Permissions */}
              <div className="space-y-2">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Module Access</label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_MODULES.map((mod) => (
                    <label
                      key={mod.id}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs ${
                        newModules.includes(mod.id)
                          ? 'border-[#000066]/20 bg-[#000066]/5 text-[#000066] font-bold'
                          : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={newModules.includes(mod.id)}
                        onChange={() => toggleModule(mod.id)}
                        className="sr-only"
                      />
                      {newModules.includes(mod.id) ? (
                        <Check className="w-3.5 h-3.5 text-[#000066]" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded border border-slate-300" />
                      )}
                      {mod.label}
                    </label>
                  ))}
                </div>
              </div>

              {addError && (
                <div className="p-3 rounded-xl text-xs flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-100">
                  <AlertCircle className="w-4 h-4" />
                  <span>{addError}</span>
                </div>
              )}

              {addSuccess && (
                <div className="p-3 rounded-xl text-xs flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <Check className="w-4 h-4" />
                  <span>{addSuccess}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-450 hover:text-slate-700 font-bold text-xs uppercase tracking-widest h-11 px-4.5 rounded-full transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={addingUser}
                className="bg-[#000066] hover:bg-[#000044] text-white disabled:opacity-50 font-bold text-xs uppercase tracking-widest h-11 px-6 rounded-full transition-all cursor-pointer shadow-md shadow-[#000066]/10"
              >
                {addingUser ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modules Modal */}
      {editModulesUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#000066] flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Module Permissions
              </h3>
              <button
                onClick={() => setEditModulesUser(null)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-[#000066] text-white flex items-center justify-center text-xs font-black">
                  {editModulesUser.name?.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2) || 'U'}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{editModulesUser.name}</p>
                  <p className="text-[10px] font-mono text-slate-400">{editModulesUser.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Select Accessible Modules</label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_MODULES.map((mod) => (
                    <label
                      key={mod.id}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs ${
                        editModules.includes(mod.id)
                          ? 'border-[#000066]/20 bg-[#000066]/5 text-[#000066] font-bold'
                          : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={editModules.includes(mod.id)}
                        onChange={() => toggleEditModule(mod.id)}
                        className="sr-only"
                      />
                      {editModules.includes(mod.id) ? (
                        <Check className="w-3.5 h-3.5 text-[#000066]" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded border border-slate-300" />
                      )}
                      {mod.label}
                    </label>
                  ))}
                </div>
              </div>

              {modulesError && (
                <div className="p-3 rounded-xl text-xs flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-100">
                  <AlertCircle className="w-4 h-4" />
                  <span>{modulesError}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                onClick={() => setEditModulesUser(null)}
                className="text-slate-450 hover:text-slate-700 font-bold text-xs uppercase tracking-widest h-11 px-4.5 rounded-full transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModules}
                disabled={savingModules}
                className="bg-[#000066] hover:bg-[#000044] text-white disabled:opacity-50 font-bold text-xs uppercase tracking-widest h-11 px-6 rounded-full transition-all cursor-pointer shadow-md shadow-[#000066]/10"
              >
                {savingModules ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}