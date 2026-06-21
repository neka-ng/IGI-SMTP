import React, { useState, useEffect } from 'react';
import { Send, Users, Mail, CheckCircle, X, Grid3X3, Plus } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import { Subscriber, EmailFooter } from '../types';

const EMPTY_FOOTER = {
  name: '',
  description: '',
  background: { type: 'solid', color: '#ffffff', opacity: 1 },
  layout: { paddingX: 20, paddingY: 12, maxWidth: '600', centerAligned: true, borderWidth: 0, borderStyle: 'solid', borderColor: '#000000', borderRadius: 0, shadow: false, shadowIntensity: 'subtle' },
  zones: [
    { id: 'zone-header', type: 'header', enabled: true, logoUrl: '', companyName: '' },
    { id: 'zone-body', type: 'body', enabled: true, content: '' },
    { id: 'zone-social', type: 'social', enabled: true, socialColumns: 4, socialLinks: [] },
    { id: 'zone-contact', type: 'contact', enabled: true, address: '', phone: '', website: '' },
    { id: 'zone-legal', type: 'legal', enabled: true, copyrightText: '', showUnsubscribe: true, unsubscribeText: 'Unsubscribe' },
    { id: 'zone-custom', type: 'custom', enabled: true, customHtml: '' }
  ]
};

/**
 * Compose email view – allows any logged‑in user to compose an email and send it instantly.
 * Features:
 *   • Subject input
 *   • Receiver selection with three tabs (personal, group, individual)
 *   • Rich‑text editor (word‑pad mode) for the message body
 *   • Send button that posts to /api/compose/send and shows toast feedback
 */
export default function ComposeView({
  subscribers,
  onBack,
  onSendComplete,
}: {
  subscribers: Subscriber[];
  onBack: () => void;
  onSendComplete?: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [activeTab, setActiveTab] = useState<'personal' | 'group' | 'individual'>('personal');
  const [personalEmail, setPersonalEmail] = useState('');
  const [personalRecipientName, setPersonalRecipientName] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedSubscriberIds, setSelectedSubscriberIds] = useState<string[]>([]);
  const [filteredSubs, setFilteredSubs] = useState<Subscriber[]>(subscribers);
  const [message, setMessage] = useState('<p>Start typing your email...</p>');
  const [toast, setToast] = useState<string | null>(null);
  const [selectedFooterId, setSelectedFooterId] = useState<string | null>(null);
  const [availableFooters, setAvailableFooters] = useState<EmailFooter[]>([]);
  const [showFooterBuilder, setShowFooterBuilder] = useState(false);
  const [footerDraft, setFooterDraft] = useState<any>(EMPTY_FOOTER);

  // Derive group (roster) list from subscribers
  const groups = React.useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    subscribers.forEach((s) => {
      const grp = (s.roster || s.rosterName || 'General').trim();
      if (!map[grp]) map[grp] = { name: grp, count: 0 };
      map[grp].count++;
    });
    return Object.entries(map).map(([id, info]) => ({ id, name: info.name, count: info.count }));
  }, [subscribers]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * Build a lookup map from email → name using the subscribers array.
   * Used to attach names when picking receivers from group/individual tabs.
   */
  const nameByEmail = React.useMemo(() => {
    const map: Record<string, string> = {};
    subscribers.forEach((s) => {
      map[s.email.toLowerCase()] = s.name;
    });
    return map;
  }, [subscribers]);

  /**
   * Returns an array of { email, name } for every selected receiver.
   * For the 'personal' tab the recipient name comes from the dedicated input (or email prefix).
   */
  const gatherReceivers = (): { email: string; name: string }[] => {
    const entries = new Map<string, string>();
    if (activeTab === 'personal' && personalEmail) {
      const email = personalEmail.trim();
      const resolvedName = personalRecipientName.trim() || nameByEmail[email.toLowerCase()] || email.split('@')[0];
      entries.set(email.toLowerCase(), resolvedName);
    }
    if (activeTab === 'group') {
      groups
        .filter((g) => selectedGroupIds.includes(g.id))
        .forEach((g) => {
          subscribers
            .filter((s) => (s.roster || s.rosterName || 'General').trim() === g.id)
            .forEach((s) => {
              if (!entries.has(s.email.toLowerCase())) {
                entries.set(s.email.toLowerCase(), s.name);
              }
            });
        });
    }
    if (activeTab === 'individual') {
      subscribers
        .filter((s) => selectedSubscriberIds.includes(s.id))
        .forEach((s) => {
          if (!entries.has(s.email.toLowerCase())) {
            entries.set(s.email.toLowerCase(), s.name);
          }
        });
    }
    return Array.from(entries, ([email, name]) => ({ email, name }));
  };

  const handleSend = async () => {
    try {
      const receivers = gatherReceivers();
      if (!subject.trim() || receivers.length === 0) {
        showToast('Subject and at least one receiver are required');
        return;
      }
      const selectedFooter = availableFooters.find(f => f.id === selectedFooterId) || null;
      const res = await fetch('/api/compose/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, receivers, htmlContent: message, selectedFooterId: selectedFooterId || null, footerData: selectedFooter }),
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch (_) {
        // Non‑JSON response – fallback to plain text
        const text = await res.text();
        data.error = text || 'Unexpected response';
      }
      if (res.ok) {
        showToast(`Sent to ${data.sentCount ?? 0} recipients`);
        // Reset form fields
        setSubject('');
        setPersonalEmail('');
        setPersonalRecipientName('');
        setSelectedGroupIds([]);
        setSelectedSubscriberIds([]);
        setMessage('<p>Start typing your email...</p>');
        // Navigate to Delivery Logs after successful send
        if (onSendComplete) {
          setTimeout(() => onSendComplete(), 1000); // brief delay so toast is visible
        }
      } else {
        showToast(data.error || 'Failed to send');
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  // Update filtered list when subscriber data changes
  React.useEffect(() => {
    setFilteredSubs(subscribers);
  }, [subscribers]);

  // Load available footers
  React.useEffect(() => {
    fetch('/api/footers')
      .then(res => res.json())
      .then((data: EmailFooter[]) => setAvailableFooters(data))
      .catch(() => {});
  }, []);

  const handleOpenFooterBuilder = () => {
    setFooterDraft({ ...EMPTY_FOOTER, name: `Footer ${availableFooters.length + 1}` });
    setShowFooterBuilder(true);
  };

  const handleSaveFooter = async () => {
    if (!footerDraft.name.trim()) return;
    try {
      const res = await fetch('/api/footers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(footerDraft)
      });
      if (!res.ok) throw new Error('Failed to save footer');
      const saved = await res.json();
      setAvailableFooters(prev => [...prev, saved]);
      setSelectedFooterId(saved.id);
      setShowFooterBuilder(false);
      showToast('Footer saved');
    } catch (err: any) {
      showToast('Save failed: ' + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6 bg-white rounded-xl shadow-md">
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Compose Email</h2>
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full border border-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000066]/10"
        />
      </div>

      {/* Receiver tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        {['personal', 'group', 'individual'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-1 rounded-t ${activeTab === tab ? 'bg-[#000066] text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 border border-slate-200 rounded-b">
        {activeTab === 'personal' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Name</label>
              <input
                type="text"
                value={personalRecipientName}
                onChange={(e) => setPersonalRecipientName(e.target.value)}
                placeholder="John Doe"
                className="w-full border border-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000066]/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Email</label>
              <input
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full border border-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000066]/10"
              />
            </div>
          </div>
        )}
        {activeTab === 'group' && (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {groups.map((g) => (
              <label key={g.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedGroupIds.includes(g.id)}
                  onChange={(e) => {
                    setSelectedGroupIds((prev) =>
                      e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)
                    );
                  }}
                />
                <span>{g.name} ({g.count})</span>
              </label>
            ))}
          </div>
        )}
        {activeTab === 'individual' && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {/* Search input */}
            <input
              type="text"
              placeholder="Search subscribers..."
              className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#000066]/10"
              onChange={(e) => {
                const term = e.target.value.toLowerCase();
                setFilteredSubs(
                  subscribers.filter(
                    (s) => s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)
                  )
                );
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              {filteredSubs.map((s) => (
                <label key={s.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedSubscriberIds.includes(s.id)}
                    onChange={(e) => {
                      setSelectedSubscriberIds((prev) =>
                        e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                      );
                    }}
                  />
                  <span>{s.name} &lt;{s.email}&gt;</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rich text editor */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
        <RichTextEditor value={message} onChange={setMessage} />
      </div>

      {/* Footer Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-[#4f46e5]" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Email Footer</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleOpenFooterBuilder} className="text-[10px] font-bold text-[#000066] hover:text-[#000044] uppercase flex items-center gap-1"><Plus className="w-3 h-3" /> New Footer</button>
            {selectedFooterId && (
              <button onClick={() => setSelectedFooterId(null)} className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase">Remove</button>
            )}
          </div>
        </div>
        <select
          value={selectedFooterId || ''}
          onChange={(e) => setSelectedFooterId(e.target.value || null)}
          className="w-full border border-slate-200 rounded-lg h-10 px-3 text-xs outline-none focus:ring-2 focus:ring-[#000066]/10"
        >
          <option value="">— No Footer —</option>
          {availableFooters.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        {selectedFooterId && availableFooters.find(f => f.id === selectedFooterId)?.description && (
          <p className="text-[10px] text-slate-400">{availableFooters.find(f => f.id === selectedFooterId)?.description}</p>
        )}
      </div>

      {showFooterBuilder && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" onClick={() => setShowFooterBuilder(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900">Create Footer</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Footer Name</label>
                <input type="text" value={footerDraft.name} onChange={(e) => setFooterDraft({ ...footerDraft, name: e.target.value })} className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Description</label>
                <input type="text" value={footerDraft.description} onChange={(e) => setFooterDraft({ ...footerDraft, description: e.target.value })} className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Background Color</label>
                <input type="color" value={(footerDraft.background || {}).color || '#ffffff'} onChange={(e) => setFooterDraft({ ...footerDraft, background: { ...footerDraft.background, color: e.target.value } })} className="w-10 h-10 border rounded cursor-pointer p-0" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Company Name</label>
                <input type="text" value={(footerDraft.zones || []).find((z: any) => z.type === 'header')?.companyName || ''} onChange={(e) => {
                  const zones = (footerDraft.zones || []).map((z: any) => z.type === 'header' ? { ...z, companyName: e.target.value } : z);
                  setFooterDraft({ ...footerDraft, zones });
                }} className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Address</label>
                <input type="text" value={(footerDraft.zones || []).find((z: any) => z.type === 'contact')?.address || ''} onChange={(e) => {
                  const zones = (footerDraft.zones || []).map((z: any) => z.type === 'contact' ? { ...z, address: e.target.value } : z);
                  setFooterDraft({ ...footerDraft, zones });
                }} className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</label>
                <input type="text" value={(footerDraft.zones || []).find((z: any) => z.type === 'contact')?.phone || ''} onChange={(e) => {
                  const zones = (footerDraft.zones || []).map((z: any) => z.type === 'contact' ? { ...z, phone: e.target.value } : z);
                  setFooterDraft({ ...footerDraft, zones });
                }} className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Website</label>
                <input type="text" value={(footerDraft.zones || []).find((z: any) => z.type === 'contact')?.website || ''} onChange={(e) => {
                  const zones = (footerDraft.zones || []).map((z: any) => z.type === 'contact' ? { ...z, website: e.target.value } : z);
                  setFooterDraft({ ...footerDraft, zones });
                }} className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Copyright Text</label>
                <input type="text" value={(footerDraft.zones || []).find((z: any) => z.type === 'legal')?.copyrightText || ''} onChange={(e) => {
                  const zones = (footerDraft.zones || []).map((z: any) => z.type === 'legal' ? { ...z, copyrightText: e.target.value } : z);
                  setFooterDraft({ ...footerDraft, zones });
                }} className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowFooterBuilder(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={handleSaveFooter} className="px-4 py-2 text-xs font-bold text-white bg-[#000066] rounded-lg hover:bg-[#000044]">Save Footer</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          onClick={handleSend}
          className="px-5 py-2 bg-[#000066] text-white rounded hover:bg-[#000088] flex items-center gap-2"
        >
          <Send className="w-4 h-4" /> Send
        </button>
      </div>
    </div>
  );
}
