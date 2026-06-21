/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Rocket, 
  Mail, 
  Database, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  ShieldAlert,
  Server,
  Activity,
  Clock,
  RefreshCw,
  Signal,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  Zap
} from 'lucide-react';
import { Campaign, Subscriber } from '../types';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface DashboardViewProps {
  subscribers: Subscriber[];
  campaigns: Campaign[];
  listsCount: number;
  dbStatus: { connected: boolean; mode: string; hasUri: boolean } | null;
  onRefreshDbStatus: () => Promise<void>;
  onCreateCampaignClick: () => void;
  onViewAllCampaigns: () => void;
  onCampaignClick: (campaign: Campaign) => void;
}

export default function DashboardView({
  subscribers,
  campaigns,
  listsCount,
  dbStatus,
  onRefreshDbStatus,
  onCreateCampaignClick,
  onViewAllCampaigns,
  onCampaignClick
}: DashboardViewProps) {
  const [engagementTrends, setEngagementTrends] = useState<{ date: string; opens: number; clicks: number; delivered: number }[]>([]);

  useEffect(() => {
    let active = true;
    async function fetchTrends() {
      try {
        const res = await fetch('/api/analytics/engagement-trends');
        if (res.ok && active) {
          const data = await res.json();
          setEngagementTrends(data);
        }
      } catch (err) {
        console.error("Failed to load engagement trends:", err);
      }
    }
    fetchTrends();
    return () => {
      active = false;
    };
  }, []);

  // Performance metrics state
  const [performance, setPerformance] = useState<{ sends: number; opens: number; clicks: number; bounce: number; bounceRate: number; spam: number; spamRate: number; openRate: number; clickRate: number; delivered: number } | null>(null);

  // Hourly trends state
  const [hourlyTrendsData, setHourlyTrendsData] = useState<{ hour: string; sent: number; opened: number; clicked: number }[]>([]);

  // System health state
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Fetch performance metrics with auto-refresh every 10 seconds
  const fetchPerformance = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/performance');
      if (res.ok) {
        const data = await res.json();
        setPerformance(data);
      }
    } catch (e) {
      console.error('Failed to load performance data', e);
    }
  }, []);

  // Fetch hourly trends
  const fetchHourly = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/hourly-trends');
      if (res.ok) {
        const data = await res.json();
        setHourlyTrendsData(data);
      }
    } catch (e) {
      console.error('Failed to load hourly trends', e);
    }
  }, []);

  // Fetch system health
  const fetchSystemHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/system-health');
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      }
    } catch (e) {
      console.error('Failed to load system health', e);
    }
  }, []);

  // Initial fetches
  useEffect(() => {
    fetchPerformance();
    fetchHourly();
    fetchSystemHealth();
  }, [fetchPerformance, fetchHourly, fetchSystemHealth]);

  // Auto-refresh performance and system health every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPerformance();
      fetchSystemHealth();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchPerformance, fetchSystemHealth]);

  // Growth Data from 1st Nov to 30th Nov
  const growthData = [
    { label: '01 Nov', height: '30%', val: '3,240' },
    { label: '04 Nov', height: '35%', val: '4,103' },
    { label: '08 Nov', height: '45%', val: '5,540' },
    { label: '12 Nov', height: '40%', val: '5,120' },
    { label: '15 Nov', height: '55%', val: '6,800' },
    { label: '19 Nov', height: '70%', val: '8,410' },
    { label: '23 Nov', height: '85%', val: '10,950', peak: true },
    { label: '27 Nov', height: '80%', val: '9,890' },
    { label: '30 Nov', height: '95%', val: '12,456' }
  ];

  const totalSubscribersCount = subscribers.length;
  // Dynamic metrics: Active campaigns are those with status SENDING or QUEUED
  const activeCampaignsCount = campaigns.filter(c => c.status === 'SENDING' || c.status === 'QUEUED').length;
  
  // Total emails sent (sum of SENT campaigns)
  const totalEmailsSent = campaigns
    .filter(c => c.status === 'SENT')
    .reduce((acc, curr) => acc + curr.recipients, 0);

  // Format uptime helper
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Calculate max value for dynamic progress bar widths
  const maxPerformanceValue = performance ? Math.max(performance.sends, performance.opens, performance.clicks, 1) : 1;

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 font-sans">Workspace</h1>
          <p className="text-slate-500 text-sm mt-1">Good morning. Here is your real-time infrastructure overview.</p>
        </div>
        
        <button
          onClick={onCreateCampaignClick}
          className="bg-[#000066] text-white hover:bg-[#000044] transition-all px-6 py-3.5 rounded-full font-sans text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#000066]/15 active:scale-95 cursor-pointer"
        >
          Create Campaign
        </button>
      </div>

      {/* Stats Cards Grid - Bento Grid Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Subscribers Card */}
        <div className="bg-white p-6.5 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between hover:translate-y-[-2px] hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <span className="p-3 bg-[#000066]/5 text-[#000066] rounded-2xl">
              <Users className="w-5 h-5" />
            </span>
            <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12%
            </span>
          </div>
          <div>
            <div className="text-4xl font-extrabold tracking-tight text-slate-900">
              {totalSubscribersCount.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
              Total Subscribers
            </div>
          </div>
        </div>

        {/* Active Campaigns Card */}
        <div className="bg-white p-6.5 rounded-3xl border border-slate-100 shadow-xs hover:translate-y-[-2px] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <span className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Rocket className="w-5 h-5" />
            </span>
            <span className="text-[#000066] bg-[#000066]/5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Live
            </span>
          </div>
          <div>
            <div className="text-4xl font-extrabold tracking-tight text-slate-900">
              {activeCampaignsCount}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
              Active Campaigns
            </div>
          </div>
        </div>

        {/* Total Emails Sent Card */}
        <div className="bg-white p-6.5 rounded-3xl border border-slate-100 shadow-xs hover:translate-y-[-2px] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <Mail className="w-5 h-5" />
            </span>
            <span className="text-rose-600 bg-rose-50 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              -2.4%
            </span>
          </div>
          <div>
            <div className="text-4xl font-extrabold tracking-tight text-slate-900">
              {totalEmailsSent.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
              Emails Delivered
            </div>
          </div>
        </div>

        {/* Active Lists Card */}
        <div className="bg-white p-6.5 rounded-3xl border border-slate-100 shadow-xs hover:translate-y-[-2px] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <span className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Database className="w-5 h-5" />
            </span>
            <span className="text-slate-500 bg-slate-50 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Secure
            </span>
          </div>
          <div>
            <div className="text-4xl font-extrabold tracking-tight text-slate-900">
              {listsCount}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
              Active Lists
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Engagement Trends Chart */}
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-900 font-sans">Campaign Engagement Trends</h3>
              <p className="text-xs text-slate-400">Evolution of aggregate read loops (opens) and action hits (clicks) over time</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#000066] bg-[#000066]/5 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#4f46e5] animate-ping"></span>
              <span>Live Telemetry Dynamics</span>
            </div>
          </div>

          <div className="h-56 w-full text-xs font-sans pr-4 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={engagementTrends.length > 0 ? engagementTrends : [
                  { date: 'Nov 24', opens: 25, clicks: 8, delivered: 30 },
                  { date: 'Nov 25', opens: 38, clicks: 12, delivered: 42 },
                  { date: 'Nov 26', opens: 32, clicks: 10, delivered: 38 },
                  { date: 'Nov 27', opens: 45, clicks: 15, delivered: 50 },
                  { date: 'Nov 28', opens: 55, clicks: 19, delivered: 60 },
                  { date: 'Nov 29', opens: 48, clicks: 16, delivered: 55 },
                  { date: 'Nov 30', opens: 65, clicks: 23, delivered: 70 }
                ]}
                margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorEngagementOpens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorEngagementClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 650 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '16px', 
                    border: 'none', 
                    color: '#f8fafc',
                    fontFamily: 'Inter, sans-serif',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }} 
                  itemStyle={{ color: '#cbd5e1', fontSize: '11px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 700, marginBottom: '4px', fontSize: '11px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
                />
                <Area 
                  name="Opens (Telemetry)" 
                  type="monotone" 
                  dataKey="opens" 
                  stroke="#4f46e5" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorEngagementOpens)" 
                />
                <Area 
                  name="Clicks (Action Loops)" 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorEngagementClicks)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Panel - Now fully dynamic with live data */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 font-sans">Performance</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Live</span>
              </div>
            </div>
            <div className="space-y-5">
              {/* Sends Progress - Dynamic */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivered</span>
                  <span className="text-xs font-extrabold text-slate-900">
                    {performance ? `${(performance.delivered || performance.sends).toLocaleString()}` : '—'}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-900 rounded-full transition-all duration-500" 
                    style={{ width: performance ? `${Math.round(((performance.delivered || performance.sends) / maxPerformanceValue) * 100)}%` : '0%' }}
                  ></div>
                </div>
              </div>

              {/* Opens Progress - Dynamic */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Opens</span>
                  <span className="text-xs font-extrabold text-slate-900">
                    {performance ? `${performance.opens.toLocaleString()}` : '—'}
                    {performance && performance.openRate ? <span className="text-[10px] text-slate-400 font-medium ml-1">({performance.openRate}%)</span> : null}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#4f46e5] rounded-full transition-all duration-500" 
                    style={{ width: performance ? `${Math.round((performance.opens / maxPerformanceValue) * 100)}%` : '0%' }}
                  ></div>
                </div>
              </div>

              {/* Clicks Progress - Dynamic */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clicks</span>
                  <span className="text-xs font-extrabold text-[#4f46e5]">
                    {performance ? `${performance.clicks.toLocaleString()}` : '—'}
                    {performance && performance.clickRate ? <span className="text-[10px] text-slate-400 font-medium ml-1">({performance.clickRate}%)</span> : null}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                    style={{ width: performance ? `${Math.round((performance.clicks / maxPerformanceValue) * 100)}%` : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Bounce & Spam rates from live data */}
          <div className="mt-8 pt-6 border-t border-slate-105">
            <div className="flex gap-4">
              <div className="flex-1 text-center">
                <div className="text-xl font-extrabold text-slate-900">
                  {performance ? `${performance.bounceRate}%` : '—'}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bounce</div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                  ({performance ? (performance.bounce || 0).toLocaleString() : '0'} events)
                </div>
              </div>
              <div className="flex-1 text-center border-l border-slate-100">
                <div className="text-xl font-extrabold text-[#4f46e5]">
                  {performance ? `${performance.spamRate}%` : '—'}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Spam</div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                  ({performance ? (performance.spam || 0).toLocaleString() : '0'} events)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Engagement Trends Visualizer */}
      <div id="hourly-trends-visualizer" className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-sans">Hourly Dispatch & Engagement</h3>
            <p className="text-xs text-slate-400">Monitoring real-time node throughput, reads, and CTR loops over the last 24 hours</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-[#000066]/5 text-[#000066] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Live SMTP Pipe</span>
          </div>
        </div>

        <div className="h-72 w-full pr-4 text-xs font-sans">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={hourlyTrendsData}
              margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000066" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#000066" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorClicked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF0000" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#FF0000" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="hour" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 650 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderRadius: '16px', 
                  border: 'none', 
                  color: '#f8fafc',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }} 
                itemStyle={{ color: '#cbd5e1', fontSize: '11px' }}
                labelStyle={{ color: '#94a3b8', fontWeight: 700, marginBottom: '4px', fontSize: '11px' }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
              />
              <Area 
                name="Dispatched Emails" 
                type="monotone" 
                dataKey="sent" 
                stroke="#000066" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorSent)" 
              />
              <Area 
                name="Email Opens" 
                type="monotone" 
                dataKey="opened" 
                stroke="#4f46e5" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorOpened)" 
              />
              <Area 
                name="Link Clicks" 
                type="monotone" 
                dataKey="clicked" 
                stroke="#FF0000" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorClicked)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Campaigns Table Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-5.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
          <h3 className="text-lg font-bold text-slate-900">Recent Campaigns</h3>
          <button 
            onClick={onViewAllCampaigns}
            className="text-[#4f46e5] hover:text-[#4338ca] font-sans font-bold text-xs uppercase tracking-widest flex items-center gap-1 hover:underline transition-colors cursor-pointer"
          >
            View All <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans">
            <thead className="bg-slate-50/30 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Recipients</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 tracking-wider">Open Rate</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 tracking-wider text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.slice(0, 5).map((campaign) => (
                <tr 
                  key={campaign.id} 
                  onClick={() => onCampaignClick(campaign)}
                  className="hover:bg-slate-50/40 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4.5">
                    <div className="text-sm font-bold text-slate-800 group-hover:text-[#4f46e5] transition-colors">
                      {campaign.name}
                    </div>
                    {campaign.subjectLine && (
                      <div className="text-[11px] text-slate-400 italic truncate w-72 mt-0.5">
                        {campaign.subjectLine}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4.5">
                    <span className={`inline-flex items-center px-2.5 py-1 text-[9px] font-bold rounded-full uppercase tracking-wider border ${
                      campaign.status === 'SENT'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : campaign.status === 'SENDING'
                        ? 'bg-[#000066]/5 text-[#000066] border-[#000066]/10 animate-pulse'
                        : campaign.status === 'QUEUED'
                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4.5 text-right font-medium text-slate-600 text-sm">
                    {campaign.recipients.toLocaleString()}
                  </td>
                  <td className="px-6 py-4.5">
                    {campaign.openRate !== null ? (
                      <div className="flex items-center gap-2.5">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#000066]" 
                            style={{ width: `${campaign.openRate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{campaign.openRate}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4.5 text-right text-xs text-slate-450">
                    {campaign.createdDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live SMTP Node Telemetry Panel - Replaces the old footer */}
      <div className="relative py-8 px-8 overflow-hidden rounded-3xl bg-slate-900 text-white shadow-sm border border-slate-8af">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-[#000066]/40 text-[#3b82f6] rounded-xl border border-blue-500/20">
                <Server className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-lg font-bold tracking-tight font-sans text-white">
                  Live SMTP Node Telemetry
                </h4>
                <p className="text-slate-400 text-sm">
                  Real-time infrastructure health, throughput, and delivery pipeline insights
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-3 rounded-2xl flex-shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">System Status</div>
                <div className="text-xs font-extrabold text-emerald-400">
                  {systemHealth?.dbConnected ? 'All Nodes Operational' : 'Degraded Mode'}
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Throughput */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Throughput</span>
              </div>
              <div className="text-xl font-extrabold text-white">
                {systemHealth ? `${systemHealth.throughput}/s` : '—'}
              </div>
              <div className="text-[9px] text-slate-500 mt-1 font-medium">Emails per second (5min avg)</div>
            </div>

            {/* Queue Depth */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Queue</span>
              </div>
              <div className="text-xl font-extrabold text-white">
                {systemHealth ? systemHealth.queueDepth : '—'}
              </div>
              <div className="text-[9px] text-slate-500 mt-1 font-medium">Pending campaigns in queue</div>
            </div>

            {/* Total Events */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Signal className="w-4 h-4 text-emerald-400" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Processed</span>
              </div>
              <div className="text-xl font-extrabold text-white">
                {systemHealth ? systemHealth.totalEvents.toLocaleString() : '—'}
              </div>
              <div className="text-[9px] text-slate-500 mt-1 font-medium">Total events processed</div>
            </div>

            {/* Uptime */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Uptime</span>
              </div>
              <div className="text-xl font-extrabold text-white">
                {systemHealth ? formatUptime(systemHealth.uptime) : '—'}
              </div>
              <div className="text-[9px] text-slate-500 mt-1 font-medium">Server running time</div>
            </div>
          </div>

          {/* Node Statuses */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* IP Reputation */}
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${systemHealth?.nodes?.ipReputation?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'} flex-shrink-0`}></div>
              <div>
                <div className="text-[10px] font-bold text-slate-300">IP Reputation</div>
                <div className="text-[9px] text-slate-500">{systemHealth?.nodes?.ipReputation?.score || '—'}% Score</div>
              </div>
            </div>

            {/* SPF/DKIM */}
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${systemHealth?.nodes?.spfDkim?.status === 'verified' ? 'bg-emerald-500' : 'bg-amber-500'} flex-shrink-0`}></div>
              <div>
                <div className="text-[10px] font-bold text-slate-300">SPF / DKIM</div>
                <div className="text-[9px] text-slate-500">{systemHealth?.nodes?.spfDkim?.status === 'verified' ? 'Verified' : 'Pending'}</div>
              </div>
            </div>

            {/* SMTP Relay */}
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${systemHealth?.nodes?.smtpRelay?.status === 'operational' ? 'bg-emerald-500' : 'bg-rose-500'} flex-shrink-0`}></div>
              <div>
                <div className="text-[10px] font-bold text-slate-300">SMTP Relay</div>
                <div className="text-[9px] text-slate-500">{systemHealth?.nodes?.smtpRelay?.latency || '—'} latency</div>
              </div>
            </div>

            {/* Queue Health */}
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${systemHealth?.nodes?.queue?.status === 'normal' ? 'bg-emerald-500' : systemHealth?.nodes?.queue?.status === 'elevated' ? 'bg-amber-500' : 'bg-slate-500'} flex-shrink-0`}></div>
              <div>
                <div className="text-[10px] font-bold text-slate-300">Queue Health</div>
                <div className="text-[9px] text-slate-500 capitalize">{systemHealth?.nodes?.queue?.status || 'Unknown'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}