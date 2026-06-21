/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Layers, MousePointerClick, UserX, Send, ExternalLink, Activity } from 'lucide-react';
import { Campaign } from '../types';

interface CampaignReportModalProps {
  campaign: Campaign;
  onClose: () => void;
}

interface TrackingData {
  metrics: {
    delivered: number;
    opens: number;
    clicks: number;
    unsubscribes: number;
    openRate: number;
    clickRate: number;
  };
  lists: {
    deliveredList: { name: string; email: string; timestamp: string }[];
    openedList: { name: string; email: string; timestamp: string }[];
    clickedList: { name: string; email: string; timestamp: string; url?: string }[];
    unsubscribedList: { name: string; email: string; timestamp: string }[];
  };
  eventsTimeline: any[];
}

export default function CampaignReportModal({ campaign, onClose }: CampaignReportModalProps) {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchReport() {
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}/tracking`);
        if (!res.ok) throw new Error('Failed to load tracking data');
        const data = await res.json();
        if (active) {
          setTracking(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      }
    }
    fetchReport();
    return () => { active = false; };
  }, [campaign.id]);

  const metrics = tracking?.metrics;
  const totalRecipients = campaign.recipients || metrics?.delivered || 0;
  const delivered = metrics?.delivered || 0;
  const opens = metrics?.opens || 0;
  const clicks = metrics?.clicks || 0;
  const unsubscribes = metrics?.unsubscribes || 0;
  const deliveryRatio = totalRecipients > 0 ? (delivered / totalRecipients) * 100 : 0;
  const failedRatio = totalRecipients > 0 ? ((totalRecipients - delivered) / totalRecipients) * 100 : 0;
  const openRate = metrics?.openRate || 0;
  const clickRate = metrics?.clickRate || 0;

  // Chart dimensions
  const chartW = 240;
  const chartH = 140;
  const barColors = ['#000066', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-(fade-in-shimmer) select-none">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-5xl w-full overflow-hidden shrink-0 animate-scale-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/40 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-[#000066]/5 text-[#000066] rounded-2xl border border-slate-200/50">
              <Activity className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-sans leading-none">
                Campaign Performance Report
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 font-bold">
                {campaign.name} — {campaign.subjectLine || 'No subject'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-4 border-[#000066]/10 border-t-[#000066] rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-bold">Generating campaign report...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <p className="text-sm text-slate-600">{error}</p>
              <p className="text-xs text-slate-400">Tracking data may not be available yet for this campaign.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#eff4fd]/40 border border-[#000066]/5 p-4 rounded-2xl">
                  <div className="text-2xl font-black text-[#000066]">{totalRecipients}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Recipients</div>
                </div>
                <div className="bg-emerald-50/40 border border-emerald-500/10 p-4 rounded-2xl">
                  <div className="text-2xl font-black text-emerald-600">{delivered}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Delivered</div>
                </div>
                <div className="bg-amber-50/30 border border-amber-500/10 p-4 rounded-2xl">
                  <div className="text-2xl font-black text-amber-600">{totalRecipients - delivered}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Failed / Bounced</div>
                </div>
                <div className="bg-rose-50/30 border border-rose-500/10 p-4 rounded-2xl">
                  <div className="text-2xl font-black text-rose-600">{unsubscribes}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Unsubscribed</div>
                </div>
              </div>

              {/* Ratio Bars */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Delivery Ratio */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Delivery vs Failure Ratio</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-emerald-600">Delivered</span>
                        <span>{deliveryRatio.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${deliveryRatio}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-red-500">Failed / Undelivered</span>
                        <span>{failedRatio.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full transition-all duration-700" style={{ width: `${failedRatio}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Engagement Ratio */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Engagement Feedback Ratios</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-[#000066]">Open Rate</span>
                        <span>{openRate}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#000066] rounded-full transition-all duration-700" style={{ width: `${openRate}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-amber-600">Click Rate</span>
                        <span>{clickRate}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${clickRate}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-rose-600">Unsubscribe Rate</span>
                        <span>{totalRecipients > 0 ? ((unsubscribes / totalRecipients) * 100).toFixed(1) : '0'}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full transition-all duration-700" style={{ width: `${totalRecipients > 0 ? (unsubscribes / totalRecipients) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Performance Bars */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">📊 Performance Metrics Overview</h4>
                
                {/* Horizontal bar chart */}
                <div className="space-y-4">
                  {[
                    { label: 'Delivered', value: delivered, max: totalRecipients || 1, color: '#10b981' },
                    { label: 'Opened', value: opens, max: totalRecipients || 1, color: '#000066' },
                    { label: 'Clicked', value: clicks, max: totalRecipients || 1, color: '#f59e0b' },
                    { label: 'Unsubscribed', value: unsubscribes, max: totalRecipients || 1, color: '#ef4444' },
                  ].map((item) => {
                    const pct = Math.min(100, (item.value / item.max) * 100);
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-500 w-24 shrink-0 uppercase tracking-wider">{item.label}</span>
                        <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 flex items-center justify-end px-2"
                            style={{ width: `${pct}%`, backgroundColor: item.color }}
                          >
                            <span className="text-[8px] font-bold text-white drop-shadow-sm">{item.value}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-600 w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Engagement Funnel Visualization */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">🔁 Engagement Funnel (Relative to Total Sent)</h4>
                <div className="flex items-end justify-center gap-4 h-40 px-4">
                  {[
                    { label: 'Sent', value: totalRecipients, color: '#94a3b8' },
                    { label: 'Delivered', value: delivered, color: '#10b981' },
                    { label: 'Opened', value: opens, color: '#000066' },
                    { label: 'Clicked', value: clicks, color: '#f59e0b' },
                    { label: 'Unsub', value: unsubscribes, color: '#ef4444' },
                  ].map((item) => {
                    const maxVal = totalRecipients || 1;
                    const pct = Math.max(2, (item.value / maxVal) * 100);
                    const barH = Math.max(8, (pct / 100) * chartH);
                    return (
                      <div key={item.label} className="flex flex-col items-center gap-1.5">
                        <span className="text-[9px] font-bold font-mono text-slate-600">{item.value}</span>
                        <div
                          className="w-12 rounded-md transition-all duration-700"
                          style={{ height: `${barH}px`, backgroundColor: item.color }}
                        ></div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider text-center">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Breakdown of delivered list */}  
              {tracking?.lists.deliveredList && tracking.lists.deliveredList.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Recent Delivery Activity</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {tracking.lists.deliveredList.slice(0, 10).map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-lg text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-medium text-slate-700">{item.name}</span>
                          <span className="text-slate-400 font-mono">({item.email})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="bg-[#000066] hover:bg-[#000044] text-white font-bold text-xs uppercase tracking-widest h-11 px-6 rounded-full transition-all cursor-pointer shadow-md shadow-[#000066]/10"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}