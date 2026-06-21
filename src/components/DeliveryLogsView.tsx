import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  SlidersHorizontal, 
  CheckCircle2, 
  Layers, 
  MousePointerClick, 
  UserX, 
  Calendar, 
  Wifi, 
  Webhook, 
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Activity,
  ArrowRight,
  Clock
} from 'lucide-react';
import { CampaignEvent } from '../types';

interface DeliveryLogsViewProps {
  campaigns: { id: string; name: string }[];
}

export default function DeliveryLogsView({ campaigns }: DeliveryLogsViewProps) {
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchEvents = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
        setLastRefreshTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (error) {
      console.error('Error fetching delivery events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    
    // Auto-refresh events every 5 seconds for live feedback
    const refreshInterval = setInterval(() => {
      fetchEvents(true);
    }, 5000);
    
    return () => clearInterval(refreshInterval);
  }, [fetchEvents]);

  // Humanize time difference helper
  const formatEventTime = (timestamp: string | Date) => {
    const dateObj = new Date(timestamp);
    if (isNaN(dateObj.getTime())) return 'Unknown time';
    
    // Check if it's today
    const now = new Date();
    const isToday = dateObj.toDateString() === now.toDateString();
    
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (isToday) {
      return `Today at ${timeStr}`;
    }
    
    return `${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${timeStr}`;
  };

  // Filter logic
  const filteredEvents = events.filter(ev => {
    // 1. Search Query
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      ev.name.toLowerCase().includes(searchLower) ||
      ev.email.toLowerCase().includes(searchLower) ||
      ev.campaignId.toLowerCase().includes(searchLower);
      
    // 2. Event Type Filter
    const matchesType = selectedEventType === 'all' || ev.eventType === selectedEventType;
    
    // 3. Campaign Filter
    const matchesCampaign = selectedCampaignId === 'all' || ev.campaignId === selectedCampaignId;
    
    // 4. Timeframe Filter
    let matchesTimeframe = true;
    if (selectedTimeframe !== 'all') {
      const evDate = new Date(ev.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - evDate.getTime();
      
      if (selectedTimeframe === '24h') {
        matchesTimeframe = diffMs <= 24 * 60 * 60 * 1000;
      } else if (selectedTimeframe === '7d') {
        matchesTimeframe = diffMs <= 7 * 24 * 60 * 60 * 1000;
      } else if (selectedTimeframe === '30d') {
        matchesTimeframe = diffMs <= 30 * 24 * 60 * 60 * 1000;
      }
    }
    
    return matchesSearch && matchesType && matchesCampaign && matchesTimeframe;
  });

  // Export filtered logs to CSV
  const handleCSVExport = () => {
    if (filteredEvents.length === 0) return;
    
    const headers = ['Event ID', 'Recipient Name', 'Recipient Email', 'Campaign ID', 'Event Type', 'Timestamp', 'Target Link'];
    const rows = filteredEvents.map(ev => [
      ev.id || ev._id || '',
      ev.name,
      ev.email,
      ev.campaignId,
      ev.eventType.toUpperCase(),
      new Date(ev.timestamp).toISOString(),
      ev.url || ''
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `IGI_SMTP_Delivery_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats Aggregations
  const totalCount = filteredEvents.length;
  const deliveredCount = filteredEvents.filter(e => e.eventType === 'delivered').length;
  const opensCount = filteredEvents.filter(e => e.eventType === 'open').length;
  const clicksCount = filteredEvents.filter(e => e.eventType === 'click').length;
  const unsubCount = filteredEvents.filter(e => e.eventType === 'unsubscribe').length;

  // Pagination bounds
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEvents.slice(indexOfFirstItem, indexOfLastItem);

  const getEventBadgeStyles = (type: string) => {
    switch (type) {
      case 'delivered':
        return {
          bg: 'bg-blue-50/70 border-blue-200/40 text-[#000066]',
          label: 'DELIVERED',
          dot: 'bg-[#000066]'
        };
      case 'open':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          label: 'OPENED',
          dot: 'bg-emerald-505 bg-emerald-600'
        };
      case 'click':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          label: 'CLICKED',
          dot: 'bg-amber-500'
        };
      case 'unsubscribe':
        return {
          bg: 'bg-rose-50 border-rose-200 text-[#FF0000]',
          label: 'OPT-OUT',
          dot: 'bg-[#FF0000]'
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-200 text-slate-700',
          label: 'EVENT',
          dot: 'bg-slate-500'
        };
    }
  };

  return (
    <div id="delivery-logs-view-root" className="space-y-6 select-none font-sans animate-(fade-in-shimmer)">
      {/* Visual Welcome Ribbon Box */}
      <div className="bg-gradient-to-r from-[#000066] to-[#1a1a8a] text-white p-6 md:p-8 rounded-3xl shadow-sm border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-indigo-300 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest text-[#CCCCCC] uppercase bg-white/10 px-2.5 py-0.5 rounded-full">Telemetry Terminal</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight font-sans">Corporate Delivery Audit Matrix</h2>
          <p className="text-xs text-indigo-100 max-w-xl font-medium">Verify progressive SMTP warning outputs, trace recipient open rates, and trace Webhook delivery logs directly synced with the IGI Cloud gateway.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button 
            onClick={() => fetchEvents(true)}
            disabled={refreshing}
            className={`flex items-center gap-2 bg-white text-[#000066] px-4.5 py-3 rounded-xl text-xs font-bold shadow-md hover:bg-indigo-50 transition-all select-none cursor-pointer border border-transparent disabled:opacity-60`}
          >
            {refreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-[#000066] border-t-transparent rounded-full animate-spin"></div>
                <span>Refreshing Live Feed...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-[#000066]" />
                <span>Refresh Live Feed</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 text-[10px] text-indigo-200 font-medium bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
            <Clock className="w-3.5 h-3.5" />
            <span>Last: {lastRefreshTime || '—'}</span>
          </div>
        </div>

        {/* Backdrop branding ambient element */}
        <div className="absolute right-[-40px] top-[-30px] opacity-10 pointer-events-none">
          <img 
            src="https://www.iginigeria.com/wp-content/uploads/2019/06/logo-69x50.png" 
            alt="IGI logo template placeholder" 
            className="w-56 h-auto grayscale filter invert brightness-200"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Aggregate Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Logs */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Filtered Events</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-slate-800">{totalCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold font-mono">records</span>
          </div>
        </div>

        {/* Delivered Stats */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-[#000066]" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-[#000066]">{deliveredCount}</span>
            {totalCount > 0 && (
              <span className="text-[10px] text-indigo-505 font-bold font-sans">({Math.round((deliveredCount / totalCount) * 100)}%)</span>
            )}
          </div>
        </div>

        {/* Opens Stats */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Unique Opens</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-emerald-600">{opensCount}</span>
            {totalCount > 0 && (
              <span className="text-[10px] text-emerald-600 font-bold font-sans">({Math.round((opensCount / totalCount) * 100)}%)</span>
            )}
          </div>
        </div>

        {/* Clicks Stats */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="block text-[10px] uppercase font-black tracking-wider text-slate-400">CTA Click Hits</span>
            <MousePointerClick className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-amber-600">{clicksCount}</span>
            {totalCount > 0 && (
              <span className="text-[10px] text-amber-600 font-bold font-sans">({Math.round((clicksCount / totalCount) * 100)}%)</span>
            )}
          </div>
        </div>

        {/* Opt-out Stats */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs col-span-2 md:col-span-1">
          <div className="flex justify-between items-start">
            <span className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Opt-outs</span>
            <UserX className="w-4 h-4 text-[#FF0000]" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-[#FF0000]">{unsubCount}</span>
            {totalCount > 0 && (
              <span className="text-[10px] text-red-500 font-bold font-sans">({Math.round((unsubCount / totalCount) * 100)}%)</span>
            )}
          </div>
        </div>
      </div>

      {/* Control Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 self-start md:self-auto">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-650">Advanced Filter Engine</h3>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto self-end md:self-auto">
            {filteredEvents.length > 0 && (
              <button 
                onClick={handleCSVExport}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer w-full md:w-auto justify-center"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Filtered logs to CSV</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Query */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-450 absolute left-3.5 top-3" />
            <input 
              type="text" 
              placeholder="Search recipient, email, code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border border-slate-200 bg-white rounded-xl h-10 pl-10 pr-4 text-xs font-semibold focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Event Type */}
          <div className="relative">
            <select
              value={selectedEventType}
              onChange={(e) => {
                setSelectedEventType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border border-slate-200 bg-white rounded-xl h-10 px-3.5 text-xs font-bold focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all appearance-none cursor-pointer text-slate-700"
            >
              <option value="all">🛡️ All Event Actions</option>
              <option value="delivered">📥 Delivered</option>
              <option value="open">👁️ Opened</option>
              <option value="click">🖱️ CTA Link Clicked</option>
              <option value="unsubscribe">🚫 Unsubscribed</option>
            </select>
            <div className="absolute right-3.5 top-3.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-400"></div>
          </div>

          {/* Campaigns */}
          <div className="relative">
            <select
              value={selectedCampaignId}
              onChange={(e) => {
                setSelectedCampaignId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border border-slate-200 bg-white rounded-xl h-10 px-3.5 text-xs font-bold focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all appearance-none cursor-pointer text-slate-700 max-w-full truncate"
            >
              <option value="all">📦 All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="absolute right-3.5 top-3.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-400"></div>
          </div>

          {/* Timeframe settings */}
          <div className="relative">
            <select
              value={selectedTimeframe}
              onChange={(e) => {
                setSelectedTimeframe(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border border-slate-200 bg-white rounded-xl h-10 px-3.5 text-xs font-bold focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all appearance-none cursor-pointer text-slate-700"
            >
              <option value="all">⏳ All Logs History</option>
              <option value="24h">🕒 Last 24 Hours</option>
              <option value="7d">🗓️ Last 7 Days</option>
              <option value="30d">📆 Last 30 Days</option>
            </select>
            <div className="absolute right-3.5 top-3.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-400"></div>
          </div>
        </div>
      </div>

      {/* Main Core Feed Table Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-[#000066]/10 border-t-[#000066] rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-bold tracking-tight">Syncing IGI SMTP real-time delivery audit entries...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-12 h-12 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Webhook className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800">No Webhook Logs Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">Adjust filters above or click <strong>Refresh Live Feed</strong> to pull the latest delivery logs from the database.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-[#eff4fd]/45 border-b border-indigo-100/30 text-[9px] font-black uppercase tracking-wider text-slate-500 select-none">
                <tr>
                  <th className="px-6 py-4.5">Recipient Profile</th>
                  <th className="px-6 py-4.5">Source Campaign</th>
                  <th className="px-6 py-4.5">Event Action Status</th>
                  <th className="px-6 py-4.5">Delivery Context</th>
                  <th className="px-6 py-4.5 text-right">Audit Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {currentItems.map((item, idx) => {
                  const badge = getEventBadgeStyles(item.eventType);
                  const matchingCampName = campaigns.find(c => c.id === item.campaignId)?.name || item.campaignId;
                  
                  // Generate initials
                  const initials = item.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
                  const colors = ['bg-[#000066]', 'bg-[#1e3a8a]', 'bg-indigo-600', 'bg-slate-700', 'bg-sky-700'];
                  const avatarColor = colors[Math.abs(item.email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length];

                  return (
                    <tr key={item.id || item._id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${avatarColor} text-white font-extrabold text-[10px] flex items-center justify-center border border-white shadow-xs`}>
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900 tracking-tight">{item.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 font-semibold leading-none mt-0.5">{item.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="font-bold text-slate-800 line-clamp-1 max-w-44 leading-snug" title={matchingCampName}>
                          {matchingCampName}
                        </span>
                        <span className="text-[9px] font-mono text-slate-450 block mt-0.5 font-bold uppercase tracking-wider">{item.campaignId}</span>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold border uppercase tracking-wider ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4.5">
                        {item.eventType === 'click' && item.url ? (
                          <div className="space-y-1">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Destination Target URL</span>
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#000066] hover:underline font-bold text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-100 px-2 py-0.5 rounded max-w-56 truncate"
                            >
                              <ExternalLink className="w-3 h-3 text-[#000066] shrink-0" />
                              <span className="truncate">{item.url}</span>
                            </a>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-medium">
                            {item.eventType === 'unsubscribe' ? (
                              <span className="text-[#FF0000] font-bold">Automatic Opt-out loop executed</span>
                            ) : item.eventType === 'open' ? (
                              <span className="text-emerald-700 font-medium font-mono text-[9px]">User Agent: Mozilla Webkit / Blink</span>
                            ) : (
                              <span className="text-[#000066] font-medium font-mono text-[9px]">Relay Port: 465 (TLS Handshake)</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        <span className="font-semibold text-slate-800 block text-[11px]">{formatEventTime(item.timestamp)}</span>
                        <span className="text-[9px] font-mono text-slate-400 block mt-0.5">UTC Dynamic Zone</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Dynamic Pagination Controls Row */}
        {!loading && filteredEvents.length > 0 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 select-none bg-slate-50/20">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalCount)} of {totalCount} records
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentPage === page
                      ? 'bg-[#000066] text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
