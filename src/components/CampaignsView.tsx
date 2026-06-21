/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Filter, 
  Search, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Play,
  RotateCcw,
  BarChart3
} from 'lucide-react';
import { Campaign } from '../types';
import CampaignReportModal from './CampaignReportModal';

interface CampaignsViewProps {
  campaigns: Campaign[];
  onCreateCampaignClick: () => void;
  onCampaignClick: (campaign: Campaign) => void;
  onRemoveCampaign: (id: string) => void;
  onRetryCampaign?: (id: string) => void;
}

export default function CampaignsView({
  campaigns,
  onCreateCampaignClick,
  onCampaignClick,
  onRemoveCampaign,
  onRetryCampaign
}: CampaignsViewProps) {
  const [filterTab, setFilterTab] = useState<'ALL' | 'DRAFT' | 'SENDING' | 'SENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [reportCampaign, setReportCampaign] = useState<Campaign | null>(null);

  // Filtering Logic
  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.subjectLine && c.subjectLine.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filterTab === 'ALL') return matchesSearch;
    return matchesSearch && c.status === filterTab;
  });

  // Calculate high-level stats aggregated
  const totalCampaigns = campaigns.length;
  const sentCount = campaigns.filter(c => c.status === 'SENT').length;
  const sendingCount = campaigns.filter(c => c.status === 'SENDING').length;
  const draftCount = campaigns.filter(c => c.status === 'DRAFT').length;

  const totalDeliveredSum = campaigns
    .filter(c => c.status === 'SENT')
    .reduce((acc, curr) => acc + curr.recipients, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-16 font-sans">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 font-sans">Campaigns</h1>
          <p className="text-slate-500 text-sm mt-1">Configure bulk broadcast pipelines and track delivery states</p>
        </div>
        
        <button
          onClick={onCreateCampaignClick}
          className="bg-[#000066] hover:bg-[#000044] text-white flex items-center gap-2 px-6 py-3.5 rounded-full font-sans text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#000066]/15 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 font-black" />
          Create Campaign
        </button>
      </div>

      {/* Aggregate Stats - Refactored as independent Bento Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs text-center md:text-left hover:translate-y-[-2px] hover:shadow-md transition-all duration-300">
          <div className="text-3xl font-black text-slate-900">{totalCampaigns}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Total Logs</div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs text-center md:text-left hover:translate-y-[-2px] hover:shadow-md transition-all duration-300">
          <div className="text-3xl font-black text-emerald-600">{sentCount}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Sent Broadcasts</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs text-center md:text-left hover:translate-y-[-2px] hover:shadow-md transition-all duration-300">
          <div className="text-3xl font-black text-[#000066] animate-pulse">{sendingCount}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Sending Streams</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs text-center md:text-left hover:translate-y-[-2px] hover:shadow-md transition-all duration-300">
          <div className="text-3xl font-black text-slate-500">{draftCount}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Draft Blueprints</div>
        </div>
      </div>

      {/* Primary Campaigns Content Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        
        {/* Navigation Tabs and Toolbar */}
        <div className="border-b border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center p-5 bg-slate-50/40 gap-4">
          
          {/* Filtering tabs */}
          <div className="flex bg-slate-100/80 p-1 rounded-2xl gap-1 border border-slate-200/50 self-start">
            {(['ALL', 'SENT', 'SENDING', 'DRAFT'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-4 py-2 rounded-xl font-sans text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer ${
                  filterTab === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-505 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Interactive Search Tool */}
          <div className="relative border border-slate-200 bg-white rounded-full h-11 flex items-center px-4.5 shadow-inner w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-slate-700 outline-none text-sm w-full focus:ring-0 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Campaign List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans select-none">
            <thead className="bg-[#eff4fd]/20 border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-[#4f46e5]">
              <tr>
                <th className="px-6 py-4.5">Pipeline Broadcast Name</th>
                <th className="px-6 py-4.5 text-center">Status</th>
                <th className="px-6 py-4.5 text-right">Scope Recipients</th>
                <th className="px-6 py-4.5">Average Open Rate</th>
                <th className="px-6 py-4.5 text-right">Created On</th>
                <th className="px-6 py-4.5 text-right">Release</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((camp) => (
                  <tr 
                    key={camp.id}
                    onClick={() => onCampaignClick(camp)}
                    className="hover:bg-slate-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4.5">
                      <div className="text-sm font-bold text-slate-805 group-hover:text-[#000066] transition-colors">
                        {camp.name}
                      </div>
                      <div className="text-[11px] text-slate-400 italic truncate w-72 mt-0.5">
                        {camp.subjectLine || 'No subject configured'}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-center">
                       <span className={`inline-flex items-center px-2.5 py-1 text-[9px] font-bold rounded-full uppercase tracking-wider border ${
                        camp.status === 'SENT'
                          ? 'bg-emerald-50 text-emerald-750 border-emerald-100'
                          : camp.status === 'SENDING'
                          ? 'bg-[#000066]/5 text-[#000066] border-[#000066]/15 animate-pulse'
                          : 'bg-slate-50 text-slate-550 border-slate-100'
                      }`}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right font-medium text-slate-650 text-sm">
                      {camp.recipients > 0 ? camp.recipients.toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4.5">
                      {camp.openRate !== null ? (
                        <div className="flex items-center gap-2.5">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#000066] rounded-full" 
                              style={{ width: `${camp.openRate}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-slate-500">{camp.openRate}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unprocessed</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 text-right text-xs text-slate-450">
                      {camp.createdDate}
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReportCampaign(camp);
                          }}
                          className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all cursor-pointer"
                          title="View Campaign Report"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        {camp.status !== 'SENT' && onRetryCampaign && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetryCampaign(camp.id);
                            }}
                            className="p-2 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-xl transition-all cursor-pointer"
                            title="Retry / Resend Campaign"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveCampaign(camp.id);
                          }}
                          className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    No matching pipelines located.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Report Modal */}
      {reportCampaign && (
        <CampaignReportModal
          campaign={reportCampaign}
          onClose={() => setReportCampaign(null)}
        />
      )}
    </div>
  );
}
