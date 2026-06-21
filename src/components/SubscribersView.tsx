/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  CheckCircle, 
  VolumeX, 
  AlertCircle,
  X,
  Upload,
  FileSpreadsheet,
  Check,
  Edit,
  Users
} from 'lucide-react';
import { Subscriber, SubscriberStatus } from '../types';

interface SubscribersViewProps {
  subscribers: Subscriber[];
  onAddSubscriber: (newSub: Omit<Subscriber, 'id' | 'dateAdded'>) => void;
  onAddSubscribers: (newSubs: Omit<Subscriber, 'id' | 'dateAdded'>[]) => void;
  onRemoveSubscriber: (id: string) => void;
  onUpdateSubscriber: (updatedSub: Subscriber) => void;
}

export default function SubscribersView({
  subscribers,
  onAddSubscriber,
  onAddSubscribers,
  onRemoveSubscriber,
  onUpdateSubscriber
}: SubscribersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('ALL');
  const [selectedRosterFilter, setSelectedRosterFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('NEWEST');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Edit States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatus, setEditStatus] = useState<SubscriberStatus>('Active');
  const [editPlan, setEditPlan] = useState('');
  const [editRoster, setEditRoster] = useState('General');
  const [editError, setEditError] = useState('');
  
   // Bulk Selection States
   const [selectedIds, setSelectedIds] = useState<string[]>([]);
   const [isBulkActionModal, setIsBulkActionModal] = useState(false);
   const [bulkActionType, setBulkActionType] = useState<'delete' | 'status' | 'roster'>('delete');
   const [bulkStatusValue, setBulkStatusValue] = useState<SubscriberStatus>('Active');
   const [bulkRosterValue, setBulkRosterValue] = useState('General');
   const [showCsvSample, setShowCsvSample] = useState(false);

   // CSV & Raw Paste Import States
   const [isImportModalOpen, setIsImportModalOpen] = useState(false);
   const [importTab, setImportTab] = useState<'csv' | 'paste'>('csv');
   const [pastedRawText, setPastedRawText] = useState('');
   const [importDefaultRoster, setImportDefaultRoster] = useState('Imported');
   const [parsedSubscribers, setParsedSubscribers] = useState<Omit<Subscriber, 'id' | 'dateAdded'>[]>([]);
   const [importStatusMessage, setImportStatusMessage] = useState('');
   const [importError, setImportError] = useState('');
   const fileInputRef = useRef<HTMLInputElement>(null);

   const handleSelectAll = () => {
     if (selectedIds.length === paginatedSubscribers.length) {
       setSelectedIds([]);
     } else {
       setSelectedIds(paginatedSubscribers.map(s => s.id));
     }
   };

   const handleSelectOne = (id: string) => {
     if (selectedIds.includes(id)) {
       setSelectedIds(selectedIds.filter(sid => sid !== id));
     } else {
       setSelectedIds([...selectedIds, id]);
     }
   };

   const handleBulkDelete = async () => {
     try {
       const res = await fetch('/api/subscribers/bulk-delete', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ ids: selectedIds })
       });
       if (res.ok) {
         // Remove from local state
         selectedIds.forEach(id => onRemoveSubscriber(id));
         setSelectedIds([]);
         setIsBulkActionModal(false);
         return;
       }
     } catch (e) {
       console.error('Bulk delete failed:', e);
     }
     // Fallback: remove one by one
     selectedIds.forEach(id => onRemoveSubscriber(id));
     setSelectedIds([]);
     setIsBulkActionModal(false);
   };

   const handleBulkUpdate = async () => {
     const updates: Record<string, any> = {};
     if (bulkActionType === 'status') updates.status = bulkStatusValue;
     if (bulkActionType === 'roster') { updates.roster = bulkRosterValue; updates.rosterName = bulkRosterValue; }

     try {
       const res = await fetch('/api/subscribers/bulk-update', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ ids: selectedIds, updates })
       });
       if (res.ok) {
         // Update local state
         selectedIds.forEach(id => {
           const sub = subscribers.find(s => s.id === id);
           if (sub) onUpdateSubscriber({ ...sub, ...updates });
         });
         setSelectedIds([]);
         setIsBulkActionModal(false);
         return;
       }
     } catch (e) {
       console.error('Bulk update failed:', e);
     }
     // Fallback
     selectedIds.forEach(id => {
       const sub = subscribers.find(s => s.id === id);
       if (sub) onUpdateSubscriber({ ...sub, ...updates });
     });
     setSelectedIds([]);
     setIsBulkActionModal(false);
   };

  // Extract unique rosters dynamically
  const uniqueRosters = React.useMemo(() => {
    const rosters = new Set<string>();
    subscribers.forEach(s => {
      rosters.add(s.roster || 'General');
    });
    return Array.from(rosters);
  }, [subscribers]);

  // Intelligent parser for raw email pasting & text dropping
  const parsePastedEmails = (text: string, defaultRosterName: string): Omit<Subscriber, 'id' | 'dateAdded'>[] => {
    if (!text.trim()) return [];
    // Split by newlines, commas, semicolons, brackets, tabs or spaces
    const tokens = text.split(/[\r\n,;]+/).map(t => t.trim()).filter(t => t.length > 0);
    const results: Omit<Subscriber, 'id' | 'dateAdded'>[] = [];
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

    tokens.forEach(token => {
      const matches = token.match(emailRegex);
      if (matches && matches.length > 0) {
        matches.forEach(email => {
          let name = '';
          // Extract any possible prefix/name token
          const cleanToken = token.replace(email, '').replace(/[<>'"()[\]]/g, '').trim();
          if (cleanToken && cleanToken.length > 1) {
            name = cleanToken;
          } else {
            name = email.split('@')[0];
          }
          results.push({
            name,
            email,
            status: 'Active',
            roster: defaultRosterName,
            rosterName: defaultRosterName
          });
        });
      } else {
        // Fallback check on whitespace
        const parts = token.split(/\s+/);
        parts.forEach(part => {
          const cleanPart = part.replace(/[<>'"()[\]]/g, '').trim();
          if (cleanPart.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            const name = cleanPart.split('@')[0];
            results.push({
              name,
              email: cleanPart,
              status: 'Active',
              roster: defaultRosterName,
              rosterName: defaultRosterName
            });
          }
        });
      }
    });

    // Deduplicate parsed results by email
    const seen = new Set<string>();
    return results.filter(item => {
      const emailLower = item.email.toLowerCase();
      if (seen.has(emailLower)) return false;
      seen.add(emailLower);
      return true;
    });
  };

  const handlePastedTextChange = (text: string, defaultRosterName: string = importDefaultRoster) => {
    setPastedRawText(text);
    if (!text.trim()) {
      setParsedSubscribers([]);
      setImportError('');
      setImportStatusMessage('');
      return;
    }

    const list = parsePastedEmails(text, defaultRosterName);
    if (list.length === 0) {
      setImportError('No valid email addresses detected in the pasted text.');
      setImportStatusMessage('');
      setParsedSubscribers([]);
    } else {
      setParsedSubscribers(list);
      setImportError('');
      setImportStatusMessage(`Intelligently detected ${list.length} email addresses! See the parsed preview table below.`);
    }
  };
  
  // Field States for Add Modal
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newStatus, setNewStatus] = useState<SubscriberStatus>('Active');
  const [newPlan, setNewPlan] = useState('Free');
  const [newRoster, setNewRoster] = useState('General');
  const [addError, setAddError] = useState('');

  // Filtering & Sorting Logic
  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = 
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.plan && sub.plan.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sub.roster && sub.roster.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = selectedStatusFilter === 'ALL' || sub.status.toUpperCase() === selectedStatusFilter;
    const matchesPlan = selectedPlanFilter === 'ALL' || (sub.plan || 'Free').toUpperCase() === selectedPlanFilter.toUpperCase();
    const matchesRoster = selectedRosterFilter === 'ALL' || (sub.roster || 'General').toLowerCase() === selectedRosterFilter.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesPlan && matchesRoster;
  }).sort((a, b) => {
    if (sortBy === 'NAME_ASC') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'NAME_DESC') {
      return b.name.localeCompare(a.name);
    }
    if (sortBy === 'OLDEST') {
      return a.id.localeCompare(b.id);
    }
    // Default NEWEST
    return b.id.localeCompare(a.id);
  });

  // Pagination Parameters
  const itemsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(filteredSubscribers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSubscribers = filteredSubscribers.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Compute live counts
  const totalCount = subscribers.length;
  const activeCount = subscribers.filter(s => s.status === 'Active').length;
  const unsubscribedCount = subscribers.filter(s => s.status === 'Unsubscribed').length;
  const activeRate = totalCount > 0 ? ((activeCount / totalCount) * 100).toFixed(1) : '0';

  // Handle subscriber save
  const handleSaveSubscriber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setAddError('All fields are required.');
      return;
    }
    if (!newEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setAddError('Please check email format.');
      return;
    }

    onAddSubscriber({
      name: newName,
      email: newEmail,
      status: newStatus,
      plan: newPlan,
      roster: newRoster || 'General',
      rosterName: newRoster || 'General'
    });

    // Reset fields and close
    setNewName('');
    setNewEmail('');
    setNewStatus('Active');
    setNewPlan('Free');
    setNewRoster('General');
    setAddError('');
    setIsAddModalOpen(false);
    setCurrentPage(1); // switch back to first page to see the added user
  };

  const handleOpenEditModal = (sub: Subscriber) => {
    setEditingSubscriber(sub);
    setEditName(sub.name);
    setEditEmail(sub.email);
    setEditStatus(sub.status);
    setEditPlan(sub.plan || 'Free');
    setEditRoster(sub.roster || 'General');
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleUpdateSubscriberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubscriber) return;
    if (!editName.trim() || !editEmail.trim()) {
      setEditError('All fields are required.');
      return;
    }
    if (!editEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setEditError('Please check email format.');
      return;
    }

    onUpdateSubscriber({
      ...editingSubscriber,
      name: editName,
      email: editEmail,
      status: editStatus,
      plan: editPlan,
      roster: editRoster || 'General',
      rosterName: editRoster || 'General',
      initials: editName.split(' ').map((n) => n.charAt(0)).join('').toUpperCase()
    });

    setIsEditModalOpen(false);
    setEditingSubscriber(null);
  };

  // CSV Import Parser
  const parseCSV = (text: string, defaultRosterName: string = importDefaultRoster): Omit<Subscriber, 'id' | 'dateAdded'>[] => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];

    // Parse lines, taking care of naive split or quoted values
    const rows = lines.map(line => {
      const cells: string[] = [];
      let currentCell = '';
      let insideQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          cells.push(currentCell.trim());
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim());
      return cells;
    });

    if (rows.length === 0) return [];

    let startIdx = 0;
    let nameColIdx = 0;
    let emailColIdx = 1;
    let statusColIdx = 2;
    let planColIdx = -1;
    let rosterColIdx = -1;

    const firstRow = rows[0];
    const hasHeader = firstRow.some(cell => {
      const l = cell.toLowerCase();
      return l.includes('name') || l.includes('email') || l.includes('mail') || l.includes('status');
    });

    if (hasHeader) {
      startIdx = 1;
      firstRow.forEach((cell, idx) => {
        const l = cell.toLowerCase();
        if (l.includes('email') || l.includes('mail')) {
          emailColIdx = idx;
        } else if (l.includes('name')) {
          nameColIdx = idx;
        } else if (l.includes('status')) {
          statusColIdx = idx;
        } else if (l.includes('plan') || l.includes('category') || l.includes('tier') || l.includes('class')) {
          planColIdx = idx;
        } else if (l.includes('roster') || l.includes('list') || l.includes('group') || l.includes('segment')) {
          rosterColIdx = idx;
        }
      });
    } else {
      firstRow.forEach((cell, idx) => {
        if (cell.includes('@')) {
          emailColIdx = idx;
          nameColIdx = idx === 0 ? 1 : 0;
        }
      });
    }

    const results: Omit<Subscriber, 'id' | 'dateAdded'>[] = [];
    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 1 || (row.length === 1 && !row[0])) continue;
      
      let email = row[emailColIdx] || '';
      let name = row[nameColIdx] || '';
      let rawStatus = row[statusColIdx] || 'Active';
      let rawPlan = planColIdx !== -1 ? row[planColIdx] || 'Free' : 'Free';
      let rawRoster = rosterColIdx !== -1 ? row[rosterColIdx] || defaultRosterName : defaultRosterName;

      email = email.replace(/^["']|["']$/g, '').trim();
      name = name.replace(/^["']|["']$/g, '').trim();
      rawStatus = rawStatus.replace(/^["']|["']$/g, '').trim();
      rawPlan = rawPlan.replace(/^["']|["']$/g, '').trim();
      rawRoster = rawRoster.replace(/^["']|["']$/g, '').trim();

      if (email && email.includes('@')) {
        if (!name) {
          name = email.split('@')[0];
        }
        
        let status: SubscriberStatus = 'Active';
        const cleanStatus = rawStatus.toLowerCase();
        if (cleanStatus.includes('unsub')) {
          status = 'Unsubscribed';
        } else if (cleanStatus.includes('dormant') || cleanStatus.includes('stale')) {
          status = 'Dormant';
        }

        results.push({ name, email, status, plan: rawPlan || 'Free', roster: rawRoster || defaultRosterName, rosterName: rawRoster || defaultRosterName });
      }
    }

    return results;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processCSVFile(file);
  };

  const processCSVFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setImportError('Invalid file format. Please upload or select a valid .csv file.');
      setParsedSubscribers([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setImportError('Failed to read the file or the file is empty.');
          setParsedSubscribers([]);
          return;
        }

        const list = parseCSV(text, importDefaultRoster);
        if (list.length === 0) {
          setImportError('No valid contacts found in CSV. Expected headers representing "name" and "email", or at least columns containing an email check.');
          setParsedSubscribers([]);
        } else {
          setParsedSubscribers(list);
          setImportError('');
          setImportStatusMessage(`Intelligently detected and parsed ${list.length} subscribers! See the preview below.`);
        }
      } catch (err) {
        setImportError('An error occurred while parsing the CSV file.');
        setParsedSubscribers([]);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processCSVFile(file);
  };

  const handleConfirmBulkImport = () => {
    if (parsedSubscribers.length === 0) return;
    onAddSubscribers(parsedSubscribers);
    setIsImportModalOpen(false);
    setParsedSubscribers([]);
    setPastedRawText('');
    setImportTab('csv');
    setImportStatusMessage('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-16 font-sans">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 font-sans">Subscribers</h1>
          <p className="text-slate-500 text-sm mt-1">Manage network communication list routing &amp; opt-ins</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              setParsedSubscribers([]);
              setImportError('');
              setImportStatusMessage('');
              setIsImportModalOpen(true);
            }}
            className="border-2 border-[#000066]/20 hover:border-[#000066]/40 text-[#000066] hover:bg-[#000066]/5 flex items-center gap-2 px-6 py-3 rounded-full font-sans text-xs font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer bg-white"
          >
            <Upload className="w-4 h-4 font-black" />
            Import CSV
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#000066] hover:bg-[#000044] text-white flex items-center gap-2 px-6 py-3.5 rounded-full font-sans text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#000066]/15 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 font-black" />
            Add Subscriber
          </button>
        </div>
      </div>

      {/* Stats Summary Grid matching designed layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Subscribers */}
        <div className="bg-white p-6.5 rounded-3xl border border-slate-100 shadow-xs hover:translate-y-[-2px] hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Subscribers</span>
            <span className="p-3 bg-[#000066]/5 text-[#000066] rounded-2xl">
              <Plus className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-end gap-3 mt-4">
            <h2 className="text-3xl font-extrabold text-slate-900">{totalCount}</h2>
            <span className="text-emerald-600 font-bold text-xs flex items-center mb-1 bg-emerald-50 px-2.5 py-1 rounded-full">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              +12.5%
            </span>
          </div>
        </div>

        {/* Active Rate */}
        <div className="bg-white p-6.5 rounded-3xl border border-slate-100 shadow-xs hover:translate-y-[-2px] hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Routing Rate</span>
            <span className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-end gap-3 mt-4">
            <h2 className="text-3xl font-extrabold text-slate-900">{activeCount}</h2>
            <span className="text-[#000066] font-bold text-xs flex items-center mb-1 bg-[#000066]/5 px-2.5 py-1 rounded-full">
              {activeRate}% Valid
            </span>
          </div>
        </div>

        {/* Unsubscribed count */}
        <div className="bg-white p-6.5 rounded-3xl border border-slate-100 shadow-xs hover:translate-y-[-2px] hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Unsubscribed</span>
            <span className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <VolumeX className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-end gap-3 mt-4">
            <h2 className="text-3xl font-extrabold text-slate-900">{unsubscribedCount}</h2>
            <span className="text-amber-600 font-bold text-xs flex items-center mb-1 bg-amber-50 px-2.5 py-1 rounded-full">
              Stable Rate
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Management Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-slate-50/40">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative border border-slate-200 rounded-full h-11 flex items-center px-4.5 bg-white w-full sm:w-72 shadow-inner focus-within:ring-2 focus-within:ring-[#000066]/10 focus-within:border-[#000066] transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search name, email, plan..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="bg-transparent border-none text-slate-700 outline-none text-sm w-full placeholder-slate-400 focus:ring-0"
              />
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-4 h-11">
              <Filter className="w-4 h-4 text-slate-400 mr-1.5" />
              <select
                value={selectedStatusFilter}
                onChange={(e) => { setSelectedStatusFilter(e.target.value); setCurrentPage(1); }}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-600 border-none outline-none focus:ring-0 bg-transparent pr-8 cursor-pointer"
              >
                <option value="ALL">ALL STATUSES</option>
                <option value="ACTIVE">ACTIVE ONLY</option>
                <option value="UNSUBSCRIBED">BANNED/OPT-OUT</option>
                <option value="DORMANT">DORMANT IP</option>
              </select>
            </div>

            {/* Roster Filter Dropdown */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-4 h-11">
              <Filter className="w-4 h-4 text-slate-400 mr-1.5" />
              <select
                value={selectedRosterFilter}
                onChange={(e) => { setSelectedRosterFilter(e.target.value); setCurrentPage(1); }}
                className="text-[10px] font-bold uppercase tracking-widest text-[#000066] border-none outline-none focus:ring-0 bg-transparent pr-8 cursor-pointer font-extrabold"
              >
                <option value="ALL">ALL ROSTERS</option>
                {uniqueRosters.map((rosterName) => (
                  <option key={rosterName} value={rosterName.toUpperCase()}>{rosterName.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Plan / Category Filter Dropdown */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-4 h-11">
              <Filter className="w-4 h-4 text-slate-400 mr-1.5" />
              <select
                value={selectedPlanFilter}
                onChange={(e) => { setSelectedPlanFilter(e.target.value); setCurrentPage(1); }}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-600 border-none outline-none focus:ring-0 bg-transparent pr-8 cursor-pointer"
              >
                <option value="ALL">ALL CATEGORIES/PLANS</option>
                <option value="FREE">FREE TIER</option>
                <option value="STANDARD">STANDARD TIER</option>
                <option value="PREMIUM">PREMIUM TIER</option>
                <option value="ENTERPRISE">ENTERPRISE TIER</option>
              </select>
            </div>

            {/* Sorting Select option */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-4 h-11">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-600 border-none outline-none focus:ring-0 bg-transparent pr-8 cursor-pointer"
              >
                <option value="NEWEST">SORT: NEWEST</option>
                <option value="OLDEST">SORT: OLDEST</option>
                <option value="NAME_ASC">NAME: A-Z</option>
                <option value="NAME_DESC">NAME: Z-A</option>
              </select>
            </div>
          </div>

          <div className="text-slate-400 text-xs font-semibold ml-auto xl:ml-0">
            Roster: {filteredSubscribers.length} filtered items
          </div>
        </div>

        {/* Bulk Action Toolbar – appears when any rows are selected */}
        {selectedIds.length > 0 && (
          <div className="p-4 bg-[#000066]/5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-slate-700">
              <span>{selectedIds.length} selected</span>
              <button
                onClick={() => { setBulkActionType('delete'); setIsBulkActionModal(true); }}
                className="flex items-center gap-1 text-rose-600 hover:text-rose-700"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button
                onClick={() => { setBulkActionType('status'); setIsBulkActionModal(true); }}
                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
              >
                <CheckCircle className="w-4 h-4" /> Change Status
              </button>
              <button
                onClick={() => { setBulkActionType('roster'); setIsBulkActionModal(true); }}
                className="flex items-center gap-1 text-[#000066] hover:text-[#000088]"
              >
                <Users className="w-4 h-4" /> Change Roster
              </button>
            </div>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Subscribers Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#eff4fd]/20 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-[#4f46e5]">
              <tr>
                <th className="px-6 py-4.5">Roster Profile</th>
                <th className="px-6 py-4.5">Route Email Address</th>
                <th className="px-6 py-4.5">Roster Group</th>
                <th className="px-6 py-4.5">Validation Link</th>
                <th className="px-6 py-4.5">Category / Plan</th>
                <th className="px-6 py-4.5">Roster Name</th>
                <th className="px-6 py-4.5 text-right">Roster Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {paginatedSubscribers.length > 0 ? (
                paginatedSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        {sub.avatarUrl ? (
                          <div className="w-10 h-10 rounded-full select-none overflow-hidden outline outline-2 outline-transparent group-hover:outline-[#4f46e5]/25 transition-all">
                            <img 
                              src={sub.avatarUrl} 
                              alt={sub.name}
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs shadow-inner">
                            {sub.initials || sub.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-extrabold text-slate-800 text-sm font-sans">{sub.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-sm text-slate-500 font-medium">
                      {sub.email}
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 text-[#000066] border border-slate-200">
                        {sub.roster || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border leading-none ${
                        sub.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : sub.status === 'Unsubscribed'
                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border leading-none ${
                        (sub.plan || 'Free').toLowerCase() === 'enterprise'
                          ? 'bg-violet-50 text-violet-700 border-violet-100'
                          : (sub.plan || 'Free').toLowerCase() === 'premium'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : (sub.plan || 'Free').toLowerCase() === 'standard'
                          ? 'bg-sky-50 text-sky-700 border-sky-105'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {sub.plan || 'Free'}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-sm text-slate-500 font-semibold font-sans">
                      {sub.rosterName || sub.roster || 'General'}
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <button 
                          onClick={() => handleOpenEditModal(sub)}
                          title="Edit subscriber record"
                          className="p-2 hover:bg-[#000066]/5 text-slate-400 hover:text-[#000066] rounded-xl transition-all cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onRemoveSubscriber(sub.id)}
                          title="Delete subscriber log"
                          className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    No directory logs found matching this query filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredSubscribers.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredSubscribers.length)} of {filteredSubscribers.length} total entries
          </span>

          <div className="flex items-center gap-2 select-none">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageIdx) => (
                <button
                  key={pageIdx}
                  onClick={() => handlePageChange(pageIdx)}
                  className={`w-8 h-8 rounded-xl text-xs font-extrabold leading-none transition-all cursor-pointer ${
                    currentPage === pageIdx
                      ? 'bg-[#000066] text-white shadow shadow-[#000066]/25'
                      : 'hover:bg-slate-55 hover:text-slate-905 text-slate-650 bg-white border border-slate-100'
                  }`}
                >
                  {pageIdx}
                </button>
              ))}
            </div>

            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Subscriber Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-(fade-in-shimmer)">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden shrink-0 animate-scale-up">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#000066]" />
                Add New Subscriber Log
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSubscriber} className="p-6 space-y-4">
              {addError && (
                <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                   <AlertCircle className="w-4.5 h-4.5" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl h-11 px-4 text-sm focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. alex.rivera@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl h-11 px-4 text-sm focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all font-mono"
                  required
                />
              </div>

               {/* Status */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Roster Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as SubscriberStatus)}
                  className="w-full border border-slate-200 rounded-xl h-11 px-3 text-sm focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all cursor-pointer"
                >
                  <option value="Active">Active (Clear delivery route)</option>
                  <option value="Unsubscribed">Unsubscribed (Ban routing)</option>
                  <option value="Dormant">Dormant (Stale node address)</option>
                </select>
              </div>

              {/* Roster Name / Group */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Roster Name / Group</label>
                <input
                  type="text"
                  placeholder="e.g. General, Enterprise, Marketing"
                  value={newRoster}
                  onChange={(e) => setNewRoster(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl h-11 px-4 text-sm focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all"
                  required
                />
              </div>

              {/* Category / Plan */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Category / Plan</label>
                <div className="flex gap-2">
                  <select
                    value={['Free', 'Standard', 'Premium', 'Enterprise'].includes(newPlan) ? newPlan : 'Custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Custom') {
                        setNewPlan('');
                      } else {
                        setNewPlan(val);
                      }
                    }}
                    className="flex-1 border border-slate-200 rounded-xl h-11 px-3 text-sm focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all cursor-pointer"
                  >
                    <option value="Free">Free</option>
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Custom">Custom...</option>
                  </select>
                  {!['Free', 'Standard', 'Premium', 'Enterprise'].includes(newPlan) || newPlan === '' ? (
                    <input
                      type="text"
                      placeholder="Type custom name"
                      value={newPlan}
                      onChange={(e) => setNewPlan(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-xl h-11 px-4 text-sm focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all"
                      required
                    />
                  ) : null}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 h-11 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-full bg-[#000066] hover:bg-[#000044] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#000066]/10 cursor-pointer"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subscriber Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-(fade-in-shimmer)">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden shrink-0 animate-scale-up">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#000066]" />
                Modify Subscriber Record
              </h3>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingSubscriber(null);
                }}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateSubscriberSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                   <AlertCircle className="w-4.5 h-4.5" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl h-11 px-4 text-sm focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. alex.rivera@example.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl h-11 px-4 text-sm focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all font-mono"
                  required
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Roster Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as SubscriberStatus)}
                  className="w-full border border-[#cbd5e1] rounded-xl h-11 px-3 text-sm focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all cursor-pointer"
                >
                  <option value="Active">Active (Clear delivery route)</option>
                  <option value="Unsubscribed">Unsubscribed (Ban routing)</option>
                  <option value="Dormant">Dormant (Stale node address)</option>
                </select>
              </div>

              {/* Roster Name / Group */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Roster Name / Group</label>
                <input
                  type="text"
                  placeholder="e.g. General, Enterprise, Marketing"
                  value={editRoster}
                  onChange={(e) => setEditRoster(e.target.value)}
                  className="w-full border border-[#cbd5e1] rounded-xl h-11 px-4 text-sm focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all"
                  required
                />
              </div>

              {/* Category / Plan */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Category / Plan</label>
                <div className="flex gap-2">
                  <select
                    value={['Free', 'Standard', 'Premium', 'Enterprise'].includes(editPlan) ? editPlan : 'Custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Custom') {
                        setEditPlan('');
                      } else {
                        setEditPlan(val);
                      }
                    }}
                    className="flex-1 border border-[#cbd5e1] rounded-xl h-11 px-3 text-sm focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all cursor-pointer"
                  >
                    <option value="Free">Free</option>
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Custom">Custom...</option>
                  </select>
                  {!['Free', 'Standard', 'Premium', 'Enterprise'].includes(editPlan) || editPlan === '' ? (
                    <input
                      type="text"
                      placeholder="Type custom name"
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-xl h-11 px-4 text-sm focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all"
                      required
                    />
                  ) : null}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingSubscriber(null);
                  }}
                  className="flex-1 h-11 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-full bg-[#000066] hover:bg-[#000044] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#000066]/10 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import CSV / Paste Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-(fade-in-shimmer)">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden shrink-0 animate-scale-up">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#000066]" />
                Bulk Import Subscribers
              </h3>
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedSubscribers([]);
                  setPastedRawText('');
                  setImportTab('csv');
                  setImportError('');
                  setImportStatusMessage('');
                }}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input tabs */}
            <div className="px-6 flex border-b border-slate-100 bg-slate-50/15">
              <button
                type="button"
                onClick={() => {
                  setImportTab('csv');
                  setParsedSubscribers([]);
                  setImportError('');
                  setImportStatusMessage('');
                  setPastedRawText('');
                }}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                  importTab === 'csv'
                    ? 'border-[#000066] text-[#000066] font-extrabold'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Upload CSV File
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportTab('paste');
                  setParsedSubscribers([]);
                  setImportError('');
                  setImportStatusMessage('');
                  if (pastedRawText) {
                    handlePastedTextChange(pastedRawText);
                  }
                }}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                  importTab === 'paste'
                    ? 'border-[#000066] text-[#000066] font-extrabold'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Paste Raw Emails / Text
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Import Roster Name Input */}
              <div className="space-y-1 bg-[#eff4fd]/30 p-4 rounded-2xl border border-slate-100">
                <label className="block text-[10px] font-black text-[#000066] uppercase tracking-wider mb-1">
                  Mailing Roster Target Group
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Imported, Marketing, Newsletter"
                    value={importDefaultRoster}
                    onChange={(e) => {
                      const newRosterVal = e.target.value;
                      setImportDefaultRoster(newRosterVal);
                      
                      // Also directly update already parsed members dynamically so the preview changes in real-time
                      setParsedSubscribers(prev => prev.map(sub => ({
                        ...sub,
                        roster: newRosterVal || 'Imported',
                        rosterName: newRosterVal || 'Imported'
                      })));
                    }}
                    className="w-full border border-slate-200 bg-white rounded-xl h-10 px-4 text-xs font-bold focus:ring-4 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1 leading-none">
                  All imported subscribers will default to this roster unless specified inside your CSV file.
                </p>
              </div>

              {importTab === 'csv' ? (
                /* Drag and Drop Zone */
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#000066]/30 hover:border-[#000066] bg-slate-50 hover:bg-[#000066]/5 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-2 group"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept=".csv"
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                  <Upload className="w-10 h-10 text-[#000066]/65 group-hover:text-[#000066] mx-auto animate-pulse transition-colors" />
                  <p className="text-sm font-bold text-slate-800">
                    Drag and drop your subscriber .csv file here, or <span className="text-[#000066] underline">browse device</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Expected column headers: <code className="bg-slate-200/50 px-1.5 py-0.5 rounded font-mono">name</code>, <code className="bg-slate-200/50 px-1.5 py-0.5 rounded font-mono">email</code>, and optional <code className="bg-slate-200/50 px-1.5 py-0.5 rounded font-mono">status</code>
                  </p>
                </div>
              ) : (
                /* Text Area Zone */
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Paste raw message transcripts, email lists, or recipient rosters</label>
                  <div className="flex bg-slate-50 rounded-2xl border border-slate-200 p-3.5 focus-within:border-[#000066]/60 transition-colors">
                    <textarea
                      value={pastedRawText}
                      onChange={(e) => handlePastedTextChange(e.target.value)}
                      placeholder={`Paste email lists here...\n\nExample formats:\n- single_email@domain.com\n- Full Name <contact@corp.com>\n- client@info.org, admin@site.io`}
                      className="w-full text-xs font-mono h-28 border-none bg-transparent outline-none resize-none placeholder-slate-400 text-slate-800 leading-normal"
                      onDragOver={handleDragOver}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const val = ev.target?.result as string;
                            if (val) {
                              handlePastedTextChange(val);
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Delimiters automatically handled. Drag and drop any raw text file directly into this zone to auto-analyze!
                  </p>
                </div>
              )}

              {/* Status and Error Banners */}
              {importError && (
                <div className="bg-rose-50 text-rose-700 border border-rose-100 p-4 rounded-2xl text-xs font-semibold flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importStatusMessage && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-4 rounded-2xl text-xs font-semibold flex items-start gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>{importStatusMessage}</span>
                </div>
              )}

              {/* Sample format tooltip */}
              {parsedSubscribers.length === 0 && !importError && importTab === 'csv' && (
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Sample CSV Template Structure</span>
                  <pre className="text-[10px] font-mono text-slate-650 bg-white border border-slate-100 p-2.5 rounded-xl block leading-normal">
                    Name,Email,Status{"\n"}
                    Alex Rivera,alex@domain.com,Active{"\n"}
                    Jordan Black,jordan@io.org,Unsubscribed
                  </pre>
                </div>
              )}

              {/* Parsed entries preview scroll area */}
              {parsedSubscribers.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Parsed Roster Preview ({parsedSubscribers.length} total)</span>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100/85 sticky top-0 border-b border-slate-200 font-bold text-slate-500">
                        <tr>
                          <th className="px-4 py-2">Name</th>
                          <th className="px-4 py-2">Email Address</th>
                          <th className="px-4 py-2">Roster Group</th>
                          <th className="px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedSubscribers.slice(0, 500).map((pSub, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 font-bold text-slate-800">{pSub.name}</td>
                            <td className="px-4 py-2 font-mono text-slate-500">{pSub.email}</td>
                            <td className="px-4 py-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-[#000066] border border-slate-200">
                                {pSub.roster || 'Imported'}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider leading-none border ${
                                pSub.status === 'Active' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : pSub.status === 'Unsubscribed'
                                  ? 'bg-rose-50 text-rose-700 border-rose-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {pSub.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedSubscribers.length > 500 && (
                    <p className="text-[10px] text-slate-400 text-center italic">Only showing first 500 entries in preview window.</p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-250 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedSubscribers([]);
                  setPastedRawText('');
                  setImportTab('csv');
                  setImportError('');
                  setImportStatusMessage('');
                }}
                className="h-11 rounded-full px-6 border border-slate-200 hover:bg-white text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedSubscribers.length === 0}
                onClick={handleConfirmBulkImport}
                className="h-11 rounded-full px-6 bg-[#000066] hover:bg-[#000044] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:pointer-events-none shadow-md shadow-[#000066]/10 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4.5 h-4.5" />
                Confirm &amp; Register {parsedSubscribers.length > 0 ? `(${parsedSubscribers.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
