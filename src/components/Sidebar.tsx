/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Send, 
  Users, 
  FileText, 
  LogOut,
  History,
  Shield,
  Key
} from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  user?: UserProfile | null;
}

export default function Sidebar({ currentTab, onTabChange, onLogout, user }: SidebarProps) {
  const isSuperAdmin = user?.role === 'super-admin';
  const allowedModules = user?.allowedModules || ['dashboard', 'compose', 'campaigns', 'subscribers', 'templates', 'logs', 'api-keys'];

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
    // Compose should appear right after Dashboard
    { id: 'compose', name: 'Compose', icon: Send, module: 'compose' },
    { id: 'campaigns', name: 'Campaigns', icon: Send, module: 'campaigns' },
    { id: 'subscribers', name: 'Subscribers', icon: Users, module: 'subscribers' },
    { id: 'templates', name: 'Templates', icon: FileText, module: 'templates' },
    { id: 'logs', name: 'Delivery Logs', icon: History, module: 'logs' },
    { id: 'api-keys', name: 'API Keys', icon: Key, module: 'api-keys' },
  ];

  // Super-admin sees the Users Management item
  if (isSuperAdmin) {
    menuItems.push({ id: 'users', name: 'Users', icon: Shield, module: 'users' });
  }

  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase().slice(0, 2)
    : (user?.email?.charAt(0).toUpperCase() || 'U');

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 hidden md:flex flex-col bg-white text-slate-700 shadow-sm z-50 select-none pb-8 border-r border-slate-200">
      {/* Brand Header */}
      <div className="p-6 pb-6 border-b border-[#CCCCCC] relative">
        <div className="flex items-center gap-3">
          <img 
            src="https://www.iginigeria.com/wp-content/uploads/2019/06/logo-69x50.png" 
            alt="IGI logo" 
            className="h-9 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Navigation Links — only show modules the user has access to */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems
          .filter(item => isSuperAdmin || allowedModules.includes(item.module))
          .map((item) => {
          const Icon = item.icon;
          const hasAccess = true; // Filtered above; all items shown have access
          const isActive = currentTab === item.id || (item.id === 'campaigns' && currentTab.startsWith('campaign'));
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-sans text-[11px] uppercase tracking-wider font-bold transition-all duration-200 text-left cursor-pointer ${
                isActive
                  ? 'bg-[#000066] text-white shadow-lg shadow-[#000066]/20 translate-x-1'
                  : 'hover:bg-slate-50 text-slate-500 hover:text-[#000066]'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : ''}`} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div className="mt-auto px-6 pt-6 border-t border-[#CCCCCC]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#000066]/10 text-[#000066] flex items-center justify-center font-bold select-none text-sm border border-[#000066]/20">
            {userInitials}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-slate-900 text-xs font-sans truncate">{user?.name || 'User'}</span>
            <span className="text-[10px] text-slate-400 truncate w-32">{user?.email || ''}</span>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 text-slate-400 hover:text-red-500 font-bold uppercase tracking-wider text-[10px] transition-colors py-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}