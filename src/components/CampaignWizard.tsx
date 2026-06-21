/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Rocket, 
  Mail, 
  ShieldAlert, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft, 
  Layers, 
  Plus, 
  X, 
  MoveUp, 
  MoveDown, 
  Trash2, 
  Sparkles, 
  Smartphone, 
  Laptop, 
  Calendar,
  AlertCircle,
  Send,
  FileText,
  Grid3X3
} from 'lucide-react';
import { Campaign, SubscriberList, EmailTemplate, EmailElement, EmailElementType, Subscriber, EmailFooter } from '../types';
import { INITIAL_LISTS, INITIAL_TEMPLATES } from '../data';

interface CampaignWizardProps {
  subscribers: Subscriber[];
  onSaveCampaign: (campaign: Omit<Campaign, 'id' | 'createdDate'>) => void;
  onCancel: () => void;
}

export default function CampaignWizard({ subscribers, onSaveCampaign, onCancel }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 3.5 | 4>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- STEP 1: CAMPAIGN DETAILS ---
  const [campaignName, setCampaignName] = useState('Weekly Update - Nov Week 4');
  const [subjectLine, setSubjectLine] = useState('Weekly Update Nov Week 4: System Infrastructure Logs');
  const [senderName, setSenderName] = useState('IGI Infrastructure Team');
  const [replyTo, setReplyTo] = useState('support@igi-smtp.enterprise');
  const [abTestEnabled, setAbTestEnabled] = useState(false);

  // --- STEP 2: SELECT RECIPIENTS ---
  const lists = React.useMemo(() => {
    const rosterMap: Record<string, { name: string; count: number; activeCount: number }> = {};
    
    subscribers.forEach(sub => {
      const rosterName = sub.roster || 'General';
      const key = rosterName.trim();
      if (!rosterMap[key]) {
        rosterMap[key] = {
          name: key,
          count: 0,
          activeCount: 0
        };
      }
      rosterMap[key].count++;
      if (sub.status === 'Active') {
        rosterMap[key].activeCount++;
      }
    });

    if (Object.keys(rosterMap).length === 0) {
      rosterMap['General'] = {
        name: 'General',
        count: 0,
        activeCount: 0
      };
    }

    return Object.values(rosterMap).map((item) => ({
      id: item.name,
      name: `${item.name} Roster`,
      description: `Real-time segment containing ${item.activeCount} active mail delivery nodes.`,
      subscribersCount: item.count,
      status: 'ACTIVE' as const
    }));
  }, [subscribers]);

  const [selectedListIds, setSelectedListIds] = useState<string[]>(['General']);
  const [totalRecipients, setTotalRecipients] = useState(0);

  // Re-calculate combined recipients dynamically when selections shift
  useEffect(() => {
    const total = lists
      .filter((l) => selectedListIds.includes(l.id))
      .reduce((acc, curr) => acc + curr.subscribersCount, 0);
    setTotalRecipients(total);
  }, [selectedListIds, lists]);

  // --- FOOTER SELECTION ---
  const [availableFooters, setAvailableFooters] = useState<EmailFooter[]>([]);
  const [selectedFooterId, setSelectedFooterId] = useState<string | null>(null);
  const [showFooterBuilder, setShowFooterBuilder] = useState(false);
  const [footerDraft, setFooterDraft] = useState<any>(null);

  React.useEffect(() => {
    fetch('/api/footers')
      .then(res => res.json())
      .then((data: EmailFooter[]) => setAvailableFooters(data))
      .catch(() => {});
  }, []);

  const handleOpenFooterBuilder = () => {
    setFooterDraft({
      name: `Footer ${availableFooters.length + 1}`,
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
    });
    setShowFooterBuilder(true);
  };

  const handleSaveFooter = async () => {
    if (!footerDraft?.name?.trim()) return;
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

  // --- STEP 3: TEMPLATE SELECTION ---
  const [templates, setTemplates] = useState<EmailTemplate[]>(INITIAL_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState('tmpl-weekly');

  // Fetch templates from API on mount
  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch('/api/templates');
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
          // Set the first template as default if available
          if (data.length > 0) {
            setSelectedTemplateId(data[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to load templates; using defaults:', err);
      }
    }
    loadTemplates();
  }, []);

  // --- STEP 3.5: TEMPLATE CONTENT DESIGNER ---
  const [emailElements, setEmailElements] = useState<EmailElement[]>([]);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);

  // Copy elements from chosen template when entering Editor
  useEffect(() => {
    if (currentStep === 3.5) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template && emailElements.length === 0) {
        setEmailElements(JSON.parse(JSON.stringify(template.elements)));
      }
    }
  }, [currentStep, selectedTemplateId, templates]);

  // Reset email elements if they choose a different template later
  const handleTemplateSelect = (id: string) => {
    setSelectedTemplateId(id);
    setEmailElements([]); // trigger reset so next step fetches the new template elements
  };

  // Content Editor manipulations
  const handleAddElement = (type: EmailElementType) => {
    const newId = `el-${type}-${Date.now()}`;
    let baseProps: Record<string, any> = {};

    switch (type) {
      case 'text':
        baseProps = { text: 'Edit this text blocks properties.', fontSize: '15px', color: '#171c22', paddingY: 12, paddingX: 20 };
        break;
      case 'html':
        baseProps = { htmlScript: '<div style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 16px; border-radius: 8px; font-family: sans-serif; text-align: center;"><p style="margin: 0; font-size: 14px; font-weight: bold; color: #000066;">Custom Code Block</p><p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">You can paste custom raw HTML or script tags here.</p></div>' };
        break;
      case 'button':
        baseProps = { text: 'Action Link Button', url: 'https://igi-smtp.io', bg: '#4f46e5', color: '#ffffff', paddingY: 10, paddingX: 24, cornerRadius: 20 };
        break;
      case 'image':
        baseProps = { imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w1NjI0NmV8MHwxfHNlYXJjaHwzfHxkYXNoYm9hcmQlMjBhbmFseXRpY3N8ZW58MHx8fHwxNzAzNTI5NjY0fDA&ixlib=rb-4.0.3&q=80&w=1080', paddingY: 8, paddingX: 24 };
        break;
      case 'spacer':
        baseProps = { height: 24 };
        break;
      case 'divider':
        baseProps = { color: '#eaeef7' };
        break;
    }

    const newElement: EmailElement = { id: newId, type, properties: baseProps };
    setEmailElements([...emailElements, newElement]);
    setActiveElementId(newId);
    showToast('New dynamic block added. Edit settings side.');
  };

  const handleUpdateActiveElement = (properties: Record<string, any>) => {
    if (!activeElementId) return;
    setEmailElements(
      emailElements.map((el) => {
        if (el.id === activeElementId) {
          return { ...el, properties: { ...el.properties, ...properties } };
        }
        return el;
      })
    );
  };

  const handleRemoveElement = (id: string) => {
    setEmailElements(emailElements.filter((el) => el.id !== id));
    if (activeElementId === id) setActiveElementId(null);
    showToast('Element removed from canvas.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // --- STEP 4: FINAL DELIVERY & SCHEDULE PREVIEW ---
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [sendStrategy, setSendStrategy] = useState<'IMMEDIATE' | 'SCHEDULED'>('IMMEDIATE');
  const [scheduleDate, setScheduleDate] = useState('2026-06-05');
  const [scheduleTime, setScheduleTime] = useState('14:00');
  const [rateThrottling, setRateThrottling] = useState(true);
  const [autoResendUnopened, setAutoResendUnopened] = useState(false);

  // --- SEND TEST EMAIL MODAL ---
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      showToast('Enter a valid email address');
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/campaigns/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          subject: subjectLine,
          html: buildTestEmailHtml()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.method === 'microsoft_graph') {
          showToast(`Test email sent successfully to ${testEmail} via Microsoft Graph`);
        } else if (data.method === 'simulated') {
          showToast(`Test email simulated for ${testEmail} — configure Microsoft 365 credentials for real delivery`);
        } else {
          showToast(`Test email sent to ${testEmail}`);
        }
        setIsTestModalOpen(false);
        setTestEmail('');
      } else {
        showToast('Failed to send test email: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
    setIsSendingTest(false);
  };

  const buildTestEmailHtml = () => {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#000066;padding:24px;text-align:center"><span style="color:#fff;font-weight:bold;font-size:18px;letter-spacing:2px">IGI SMTP TEST</span></div>
      <div style="padding:24px;background:#fff">
        <h2 style="color:#000066;margin:0 0 12px">${subjectLine}</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6">This is a test email from ${campaignName} by ${senderName}.</p>
        <div style="margin:16px 0">${emailElements.map(el => {
          if (el.type === 'text') return `<p style="font-size:${el.properties.fontSize||'14px'};color:${el.properties.color||'#171c22'};padding:${el.properties.paddingY||12}px ${el.properties.paddingX||20}px">${el.properties.text||''}</p>`;
          if (el.type === 'button') return `<a href="${el.properties.url||'#'}" style="display:inline-block;background:${el.properties.bg||'#4f46e5'};color:${el.properties.color||'#fff'};padding:10px 24px;border-radius:${el.properties.cornerRadius||20}px;text-decoration:none;font-weight:bold">${el.properties.text||'Button'}</a>`;
          if (el.type === 'divider') return `<hr style="border:0;border-top:1px solid ${el.properties.color||'#eaeef7'};margin:12px 0"/>`;
          if (el.type === 'image') return `<img src="${el.properties.imageUrl||''}" style="max-width:100%;border-radius:8px" alt="test image"/>`;
          if (el.type === 'spacer') return `<div style="height:${el.properties.height||24}px"></div>`;
          if (el.type === 'html') return el.properties.htmlScript || '';
          if (el.type === 'richtext') return el.properties.content || '';
          return '';
        }).join('')}</div>
      </div>
      <div style="padding:16px;text-align:center;font-size:10px;color:#94a3b8">Sent via IGI SMTP Broadcast Platform</div>
    </div>`;
  };

  const handleConfirmSubmit = () => {
    const selectedFooter = availableFooters.find(f => f.id === selectedFooterId) || null;
    onSaveCampaign({
      name: campaignName,
      status: sendStrategy === 'IMMEDIATE' ? 'SENDING' : 'QUEUED',
      recipients: totalRecipients,
      openRate: sendStrategy === 'IMMEDIATE' ? 0 : null,
      subjectLine,
      senderName,
      replyTo,
      templateId: selectedTemplateId,
      // CRITICAL: Include the customized email elements designed in Step 3.5
      // Without this, the backend has no idea what content to actually render into the email
      emailElements: emailElements,
      targetLists: selectedListIds,
      scheduledAt: sendStrategy === 'SCHEDULED' ? `${scheduleDate} ${scheduleTime} (UTC)` : undefined,
      rateThrottling: rateThrottling,
      autoResendUnopened: autoResendUnopened,
      selectedFooterId: selectedFooterId || undefined,
      footerData: selectedFooter
    });
  };

  const activeElement = emailElements.find((el) => el.id === activeElementId);

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-16 font-sans">
      {/* Dynamic Toast Success */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white font-semibold text-xs uppercase tracking-wider px-5 py-3.5 rounded-lg z-[110] shadow-xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Steps Navigation Wizard Banner */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-[#000066]/5 text-[#000066] rounded-xl">
              <Mail className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">Create Delivery pipeline</h2>
              <p className="text-slate-400 text-xs mt-0.5 font-medium uppercase tracking-widest">Setup step: {currentStep} of 4</p>
            </div>
          </div>

          {/* Core Visual Progress Markers */}
          <div className="flex items-center gap-1.5 md:gap-3 shrink-0 select-none">
            <button 
              onClick={() => setCurrentStep(1)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                currentStep === 1 
                  ? 'bg-[#000066] text-white shadow shadow-[#000066]/20' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              1
            </button>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            
            <button 
              disabled={!campaignName}
              onClick={() => setCurrentStep(2)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                currentStep === 2 
                  ? 'bg-[#000066] text-white shadow' 
                  : currentStep > 2 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-slate-100 text-slate-350 disabled:opacity-40 cursor-not-allowed'
              }`}
            >
              2
            </button>
            <ChevronRight className="w-4 h-4 text-slate-300" />

            <button 
              disabled={selectedListIds.length === 0}
              onClick={() => setCurrentStep(3)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                currentStep === 3 || currentStep === 3.5
                  ? 'bg-[#000066] text-white shadow' 
                  : currentStep > 3.5 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-slate-100 text-slate-350 disabled:opacity-40 cursor-not-allowed'
              }`}
            >
              3
            </button>
            <ChevronRight className="w-4 h-4 text-slate-300" />

            <button 
              disabled={emailElements.length === 0}
              onClick={() => setCurrentStep(4)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                currentStep === 4 
                  ? 'bg-[#000066] text-white shadow' 
                  : 'bg-slate-100 text-slate-350 disabled:opacity-40 cursor-not-allowed'
              }`}
            >
              4
            </button>
          </div>
        </div>
      </div>

      {/* --- STEP 1: SETUP BROADCAST DETAILS --- */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Fields Column */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-md">
            <h3 className="text-base font-bold text-[#121c2b] uppercase tracking-widest border-b border-slate-100 pb-3">
              Configure Stream Headers
            </h3>

            {/* Campaign Name */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Internal Campaign Name
              </label>
              <input
                type="text"
                placeholder="Name of this broadcast stream log"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl h-11 px-4 text-sm focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all font-sans"
              />
              <p className="text-[10px] text-slate-400">Only visible inside the administrative delivery logs dashboard.</p>
            </div>

            {/* Subject Line & AB Test Toggle */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Recipient Subject Line
                </label>
                <button
                  type="button"
                  onClick={() => setAbTestEnabled(!abTestEnabled)}
                  className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full inline-flex items-center gap-1 leading-none cursor-pointer ${
                    abTestEnabled ? 'bg-[#000066] text-white shadow-xs' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {abTestEnabled ? 'A/B Test Enabled' : 'Configure A/B Subject'}
                </button>
              </div>
              <input
                type="text"
                placeholder="The core hook message in the recipients inbox"
                value={subjectLine}
                onChange={(e) => setSubjectLine(e.target.value)}
                className="w-full border border-slate-200 rounded-xl h-11 px-4 text-sm focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all font-sans"
              />
              
              {abTestEnabled && (
                <div className="p-4 bg-[#000066]/5 border border-[#000066]/10 rounded-2xl space-y-2 animate-scale-up">
                  <label className="block text-[10px] font-bold text-[#000066] uppercase tracking-widest leading-none">
                    Subject Variant B
                  </label>
                  <input
                    type="text"
                    defaultValue="The next generation of elite precision SMTP release v2."
                    className="w-full border border-slate-200 rounded-xl h-10 px-4 text-xs focus:ring-1 focus:ring-[#000066] outline-none bg-white"
                  />
                  <p className="text-[9px] text-[#000066]/80">50% of subscribers will dynamically receive Variant B during warming.</p>
                </div>
              )}
            </div>

            {/* Sender and ReplyTo Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Sender From Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Infrastructure Response Team"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl h-11 px-4 text-sm focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Sender Email (Reply-To)
                </label>
                <input
                  type="email"
                  placeholder="support@domain.com"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl h-11 px-4 text-sm focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none transition-all font-mono"
                />
              </div>
            </div>

            {/* Actions Panel */}
            <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
              <button
                type="button"
                onClick={onCancel}
                className="text-slate-400 hover:text-slate-800 font-bold text-xs uppercase tracking-widest h-11 px-6 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                Cancel Draft
              </button>
              
              <button
                type="button"
                disabled={!campaignName || !subjectLine || !senderName}
                onClick={() => setCurrentStep(2)}
                className="bg-[#000066] hover:bg-[#000044] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-widest h-11 px-8 rounded-full transition-all active:scale-95 disabled:pointer-events-none shadow-md shadow-[#000066]/15 cursor-pointer"
              >
                Next: Choose Recipients
              </button>
            </div>
          </div>

          {/* Right Verification Checklist Sidebar */}
          <div className="space-y-6">
            {/* DKIM / SPF Checklist block */}
            <div className="bg-slate-900 text-white rounded-3xl shadow-xl p-6 border border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#4f46e5] border-b border-slate-800 pb-3 mb-4">
                Sender Authenticity Check
              </h4>
              
              <div className="space-y-3.5">
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold">CNAME RECORD RESOLVED</span>
                    <span className="block text-[10px] text-slate-400">node-k1.smtp.igi-smtp.io</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold">SPF RECORD RESOLVED</span>
                    <span className="block text-[10px] text-slate-400">v=spf1 include:_spf.igi.email</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold">DKIM ALIGNMENT VALID</span>
                    <span className="block text-[10px] text-slate-400">igi_k1._domainkey.smtp.igi</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/40 border border-slate-800 p-3 rounded mt-5 text-[10px] text-slate-400 leading-relaxed font-mono">
                <span className="font-extrabold text-emerald-400">SSL ENCRYPTED SECURE:</span>
                <p className="mt-1">Relay streams validated 100% compliant. Safe for bulk dispatch delivery ratios.</p>
              </div>
            </div>

            {/* Pro Tips Alert */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5">
              <h5 className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-1 mb-2">
                <Sparkles className="w-4 h-4" />
                Optimizing Conversions
              </h5>
              <p className="text-xs text-emerald-700 leading-relaxed font-sans">
                A/B Dynamic testing decreases initial spam classification by up to 21% by spreading semantic frequency arrays. Highly recommended for list rosters larger than 5,000 subnets.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- STEP 2: SELECT RECIPIENTS --- */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-md">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#121c2b] font-sans">Select Subscriber Lists</h3>
              <p className="text-xs text-slate-400 mt-1">Combine target lists. Combined scope computed below.</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-150 px-4 py-2 rounded-xl text-right">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Combined Target Scope</span>
              <span className="block text-xl font-extrabold text-[#4f46e5] mt-1">
                {totalRecipients.toLocaleString()} Recipients
              </span>
            </div>
          </div>

          {/* List Checker List Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left font-sans select-none">
              <thead className="bg-[#eff4fd]/50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 text-center w-16">Route</th>
                  <th className="px-6 py-4">Roster Name</th>
                  <th className="px-6 py-4">Scope Description</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lists.map((list) => {
                  const isChecked = selectedListIds.includes(list.id);
                  return (
                    <tr 
                      key={list.id}
                      onClick={() => {
                        if (selectedListIds.includes(list.id)) {
                          setSelectedListIds(selectedListIds.filter((id) => id !== list.id));
                        } else {
                          setSelectedListIds([...selectedListIds, list.id]);
                        }
                      }}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedListIds([...selectedListIds, list.id]);
                            } else {
                              setSelectedListIds(selectedListIds.filter((id) => id !== list.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-[#000066] border-slate-300 focus:ring-0 cursor-pointer accent-[#000066]"
                        />
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="font-bold text-[#121c2b] text-sm">{list.name}</span>
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{list.id}</span>
                      </td>
                      <td className="px-6 py-4.5 text-xs text-slate-500 max-w-sm font-medium">
                        {list.description}
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                          list.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {list.status}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right font-bold text-slate-700 text-sm">
                        {list.subscribersCount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Stepper actions footer */}
          <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="border border-slate-200 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest h-11 px-6 rounded hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back: Config setup
            </button>
            
            <button
              type="button"
              disabled={selectedListIds.length === 0}
              onClick={() => setCurrentStep(3)}
              className="bg-[#000066] hover:bg-[#000044] disabled:bg-slate-250 disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-widest h-11 px-8 rounded-full transition-all active:scale-95 disabled:pointer-events-none shadow-md shadow-[#000066]/15 flex items-center gap-1.5 cursor-pointer"
            >
              Continue: Layout
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* --- FOOTER SELECTOR (GLOBAL, BETWEEN STEPS) --- */}
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
                <input type="text" value={footerDraft?.name || ''} onChange={(e) => setFooterDraft({ ...footerDraft, name: e.target.value })} className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Description</label>
                <input type="text" value={footerDraft?.description || ''} onChange={(e) => setFooterDraft({ ...footerDraft, description: e.target.value })} className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Background Color</label>
                <input type="color" value={(footerDraft?.background || {}).color || '#ffffff'} onChange={(e) => setFooterDraft({ ...footerDraft, background: { ...(footerDraft?.background || {}), color: e.target.value } })} className="w-10 h-10 border rounded cursor-pointer p-0" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Company Name</label>
                <input type="text" value={(footerDraft?.zones || []).find((z: any) => z.type === 'header')?.companyName || ''} onChange={(e) => {
                  const zones = (footerDraft?.zones || []).map((z: any) => z.type === 'header' ? { ...z, companyName: e.target.value } : z);
                  setFooterDraft({ ...footerDraft, zones });
                }} className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Address</label>
                <input type="text" value={(footerDraft?.zones || []).find((z: any) => z.type === 'contact')?.address || ''} onChange={(e) => {
                  const zones = (footerDraft?.zones || []).map((z: any) => z.type === 'contact' ? { ...z, address: e.target.value } : z);
                  setFooterDraft({ ...footerDraft, zones });
                }} className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</label>
                <input type="text" value={(footerDraft?.zones || []).find((z: any) => z.type === 'contact')?.phone || ''} onChange={(e) => {
                  const zones = (footerDraft?.zones || []).map((z: any) => z.type === 'contact' ? { ...z, phone: e.target.value } : z);
                  setFooterDraft({ ...footerDraft, zones });
                }} className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Website</label>
                <input type="text" value={(footerDraft?.zones || []).find((z: any) => z.type === 'contact')?.website || ''} onChange={(e) => {
                  const zones = (footerDraft?.zones || []).map((z: any) => z.type === 'contact' ? { ...z, website: e.target.value } : z);
                  setFooterDraft({ ...footerDraft, zones });
                }} className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Copyright Text</label>
                <input type="text" value={(footerDraft?.zones || []).find((z: any) => z.type === 'legal')?.copyrightText || ''} onChange={(e) => {
                  const zones = (footerDraft?.zones || []).map((z: any) => z.type === 'legal' ? { ...z, copyrightText: e.target.value } : z);
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

      {/* --- STEP 3: CHOOSE TEMPLATE --- */}
      {currentStep === 3 && (
        <div className="bg-white rounded-xl border border-slate-205 p-6 md:p-8 space-y-6 shadow-md">
          <div>
            <h3 className="text-lg font-bold text-[#121c2b] font-sans">Choose Broadcast Template</h3>
            <p className="text-xs text-slate-400 mt-1">Select structural layout to customize. You will customize elements inside step 3.5.</p>
          </div>

          {/* Template Choices Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {templates.map((tmpl) => {
              const works = tmpl.id === selectedTemplateId;
              const hasImg = tmpl.thumbnailUrl || tmpl.id !== 'tmpl-blank';
              return (
                <div
                  key={tmpl.id}
                  onClick={() => handleTemplateSelect(tmpl.id)}
                  className={`border-3 rounded-2xl overflow-hidden cursor-pointer flex flex-col group transition-all relative ${
                    works 
                      ? 'border-[#4f46e5] shadow-lg scale-102' 
                      : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
                  }`}
                >
                  <div className="aspect-[3/4] bg-slate-100 flex items-center justify-center relative overflow-hidden">
                    {hasImg ? (
                      <img 
                        src={tmpl.thumbnailUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w1NjI0NmV8MHwxfHNlYXJjaHwzfHxkYXNoYm9hcmQlMjBhbmFseXRpY3N8ZW58MHx8fHwxNzAzNTI5NjY0fDA&ixlib=rb-4.0.3&q=80&w=1080"} 
                        alt={tmpl.thumbnailAlt}
                        className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:opacity-100 transition-all scale-100"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 text-center select-none p-4">
                        <Layers className="w-12 h-12 text-slate-350 mb-3" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Empty Workspace</span>
                      </div>
                    )}
                    
                    {works && (
                      <div className="absolute top-3 left-3 bg-[#4f46e5] text-white px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow">
                        SELECTED
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-slate-100 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 font-sans mb-1">{tmpl.name}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{tmpl.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stepper actions footer */}
          <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="border border-slate-200 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest h-11 px-6 rounded hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back: Recipients
            </button>
            
            <button
              type="button"
              onClick={() => setCurrentStep(3.5)}
              className="bg-[#000066] hover:bg-[#000044] text-white font-bold text-xs uppercase tracking-widest h-11 px-8 rounded-full transition-all active:scale-95 shadow-md shadow-[#000066]/15 flex items-center gap-1.5 cursor-pointer"
            >
              Next: Customize content
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 3.5: FULLY INTERACTIVE EMAIL TEMPLATE BUILDER --- */}
      {currentStep === 3.5 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex justify-between items-center shadow-md">
            <div>
              <h3 className="text-base font-bold text-slate-900">Custom Content Builder Workspace</h3>
              <p className="text-xs text-slate-400 mt-0.5">Drag to assemble blocks. Highlight center block elements to edit contextual values.</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsTestModalOpen(true)}
                className="border border-slate-200 text-slate-600 hover:text-slate-800 font-bold text-xs uppercase tracking-widest h-10 px-4 rounded hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send Test
              </button>
              <button
                type="button"
                onClick={() => showToast('Draft template saved successfully.')}
                className="bg-slate-900 text-white font-bold text-xs uppercase tracking-widest h-10 px-5 rounded hover:bg-slate-950 transition-all active:scale-95"
              >
                Save layout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
            {/* Left elements palette */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-inner space-y-4 h-fit">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2.5">
                Dynamic Blocks Palette
              </h4>
              
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
                {([
                  { type: 'text', label: 'Text block' },
                  { type: 'image', label: 'Graphic Image' },
                  { type: 'button', label: 'Action Button' },
                  { type: 'html', label: 'HTML Custom Script' },
                  { type: 'spacer', label: 'Pillar Spacer' },
                  { type: 'divider', label: 'Solid Divider' }
                ] as const).map((block) => (
                  <button
                    key={block.type}
                    onClick={() => handleAddElement(block.type)}
                    className="flex lg:w-full items-center gap-2.5 border border-dashed border-slate-250 p-3 rounded-xl text-slate-600 text-xs font-semibold hover:border-[#000066] hover:text-[#000066] hover:bg-[#000066]/5 text-left transition-colors cursor-pointer group"
                  >
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-[#000066]" />
                    <span>{block.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Center Preview Canvas stream representing actual dynamic components */}
            <div className="lg:col-span-2 bg-[#eaeef7]/40 border-2 border-dashed border-slate-300 rounded-xl p-4 md:p-8 flex flex-col items-center justify-start overflow-y-auto min-h-[500px]">
              <div className="max-w-md w-full bg-white shadow-lg rounded-xl border border-slate-150 overflow-hidden flex flex-col">
                {/* Header branding placeholder in email */}
                <div className="bg-slate-900 p-4 text-center select-none">
                  <span className="text-white text-base tracking-widest font-black uppercase text-center block">
                    IGI Relay Newsletter
                  </span>
                </div>

                {/* Elements stream inside physical email simulation */}
                <div className="space-y-1.5 p-4 bg-white min-h-[300px]">
                  {emailElements.length > 0 ? (
                    emailElements.map((el, idx) => {
                      const isActive = activeElementId === el.id;
                      return (
                        <div
                          key={el.id}
                          onClick={() => setActiveElementId(el.id)}
                          className={`relative group rounded-xl transition-all cursor-pointer select-none py-1 ${
                            isActive 
                              ? 'ring-2 ring-[#000066] bg-[#000066]/5' 
                              : 'hover:ring-1 hover:ring-slate-350 hover:bg-slate-50/50'
                          }`}
                        >
                          {/* Element rendering wrappers */}
                          {el.type === 'text' && (
                            <div 
                              style={{ 
                                padding: `${el.properties.paddingY || 12}px ${el.properties.paddingX || 20}px`, 
                                fontSize: el.properties.fontSize || '15px', 
                                color: el.properties.color || '#171c22'
                              }}
                              className="font-sans font-medium whitespace-pre-wrap select-none leading-relaxed"
                            >
                              {el.properties.text || 'Add custom content text.'}
                            </div>
                          )}

                           {el.type === 'button' && (
                            <div 
                              style={{ 
                                padding: `${el.properties.paddingY || 10}px ${el.properties.paddingX || 24}px`, 
                                textAlign: 'center'
                              }}
                            >
                              <span 
                                style={{ 
                                  backgroundColor: el.properties.bg || '#4f46e5', 
                                  color: el.properties.color || '#ffffff',
                                  borderRadius: `${el.properties.cornerRadius || 20}px`
                                }}
                                className="px-5 py-2.5 text-xs font-bold font-sans inline-block select-none shadow"
                              >
                                {el.properties.text || 'Action Button'}
                              </span>
                            </div>
                          )}

                          {el.type === 'image' && (
                            <div 
                              style={{ 
                                padding: `${el.properties.paddingY || 8}px ${el.properties.paddingX || 24}px` 
                              }}
                              className="text-center"
                            >
                              <img 
                                src={el.properties.imageUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w1NjI0NmV8MHwxfHNlYXJjaHwzf|..."} 
                                alt="Newsletter segment" 
                                className="w-full max-h-56 object-cover rounded shadow-xs"
                              />
                            </div>
                          )}

                          {el.type === 'spacer' && (
                            <div style={{ height: `${el.properties.height || 24}px` }} className="bg-slate-50/50 flex items-center justify-center border-y border-dashed border-slate-100 select-none">
                              <span className="text-[9px] font-bold text-slate-300 font-mono">Pillar Spacer: {el.properties.height}px</span>
                            </div>
                          )}

                          {el.type === 'divider' && (
                            <div className="py-2.5 px-4 select-none">
                              <hr style={{ borderColor: el.properties.color || '#eaeef7' }} />
                            </div>
                          )}

                          {el.type === 'html' && (
                            <div className="py-2.5 px-4 leading-normal select-text font-sans">
                              <div dangerouslySetInnerHTML={{ __html: el.properties.htmlScript || '<div style="padding: 12px; color: #94a3b8; font-size: 11px; text-align: center; border: 1px dashed #cbd5e1; border-radius: 6px;">HTML Script element is empty. Select to edit.</div>' }} />
                            </div>
                          )}

                          {/* Float hovering controller overlay block */}
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center bg-white border border-slate-200 p-1 rounded-md shadow gap-1 z-30 opacity-90 hover:opacity-100">
                            {/* Move Up */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (idx === 0) return;
                                const clone = [...emailElements];
                                const temp = clone[idx];
                                clone[idx] = clone[idx - 1];
                                clone[idx - 1] = temp;
                                setEmailElements(clone);
                              }}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors"
                              title="Shift Up"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Move Down */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (idx === emailElements.length - 1) return;
                                const clone = [...emailElements];
                                const temp = clone[idx];
                                clone[idx] = clone[idx + 1];
                                clone[idx + 1] = temp;
                                setEmailElements(clone);
                              }}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors"
                              title="Shift Down"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveElement(el.id);
                              }}
                              className="p-1 hover:bg-red-50 text-slate-100 hover:text-red-650 rounded transition-colors"
                              title="Delete Block"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-16 text-center text-slate-400 text-sm">
                      Select elements from left to build format stream!
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-4 border-t border-slate-100 text-[10px] text-slate-400 font-mono text-center select-none">
                  Unsubscribe • Change system profile preferences
                </div>
              </div>
            </div>

            {/* Right Context settings editor block depending on active item details */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-md flex flex-col justify-between items-stretch">
              {activeElement ? (
                <div className="space-y-5 flex-1">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#4f46e5] flex items-center gap-1 font-sans">
                      <Sparkles className="w-4 h-4 text-[#4f46e5]" />
                      Block Properties
                    </h4>
                    <span className="text-[9px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500 capitalize">{activeElement.type} block</span>
                  </div>

                  {/* Properties form fields */}
                  {activeElement.type === 'text' && (
                    <div className="space-y-4">
                      {/* Text Value */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Paragraph Text</label>
                        <textarea
                          rows={4}
                          value={activeElement.properties.text || ''}
                          onChange={(e) => handleUpdateActiveElement({ text: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none font-sans bg-white"
                        />
                      </div>

                      {/* Font Size select */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Font Size</label>
                        <select
                          value={activeElement.properties.fontSize || '15px'}
                          onChange={(e) => handleUpdateActiveElement({ fontSize: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none bg-white font-sans"
                        >
                          <option value="12px">XS paragraph (12px)</option>
                          <option value="14px">Regular Body (14px)</option>
                          <option value="16px">Bold Standard (16px)</option>
                          <option value="20px">Sub Header H2 (20px)</option>
                          <option value="26px">Section H1 (26px)</option>
                        </select>
                      </div>

                      {/* Color code */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hex Text Color</label>
                        <input
                          type="text"
                          value={activeElement.properties.color || '#171c22'}
                          onChange={(e) => handleUpdateActiveElement({ color: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl h-11 px-3 text-xs font-mono focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {activeElement.type === 'button' && (
                    <div className="space-y-4">
                      {/* Label */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Button Label</label>
                        <input
                          type="text"
                          value={activeElement.properties.text || 'Action Button'}
                          onChange={(e) => handleUpdateActiveElement({ text: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl h-11 px-4 text-xs focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none bg-white font-sans"
                        />
                      </div>

                      {/* Url link */}
                      <div className="space-y-1 font-mono">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Target Web URL</label>
                        <input
                          type="text"
                          value={activeElement.properties.url || 'https://igi-smtp.io'}
                          onChange={(e) => handleUpdateActiveElement({ url: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl h-11 px-4 text-xs focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none bg-white font-sans"
                        />
                      </div>

                      {/* Background Color */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Button Background Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={activeElement.properties.bg || '#000066'}
                            onChange={(e) => handleUpdateActiveElement({ bg: e.target.value })}
                            className="w-11 h-11 border border-slate-200 rounded-xl p-1 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={activeElement.properties.bg || '#000066'}
                            onChange={(e) => handleUpdateActiveElement({ bg: e.target.value })}
                            className="flex-1 w-full border border-slate-200 rounded-xl px-4 h-11 text-xs font-mono focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none bg-white"
                          />
                        </div>
                      </div>

                      {/* Rounded corner slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Corner Radius</label>
                          <span className="text-[10px] font-semibold text-slate-500">{activeElement.properties.cornerRadius || 20}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="30"
                          value={activeElement.properties.cornerRadius || 20}
                          onChange={(e) => handleUpdateActiveElement({ cornerRadius: Number(e.target.value) })}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#000066]"
                        />
                      </div>
                    </div>
                  )}

                   {activeElement.type === 'image' && (
                     <div className="space-y-4">
                       {/* File Upload Input */}
                       <div className="space-y-1">
                         <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Upload Image / GIF / Video</label>
                         <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-slate-200 rounded-xl p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                           <input
                             type="file"
                             accept="image/*,video/*,.gif"
                             onChange={async (e) => {
                               const file = e.target.files?.[0];
                               if (file) {
                                 // Validate file size (10MB limit)
                                 if (file.size > 10 * 1024 * 1024) {
                                   showToast('File size exceeds 10MB limit');
                                   return;
                                 }
                                 
                                 try {
                                   const arrayBuffer = await file.arrayBuffer();
                                   const response = await fetch(`/api/upload?filetype=${encodeURIComponent(file.type || 'application/octet-stream')}`, {
                                     method: 'POST',
                                     body: new Uint8Array(arrayBuffer),
                                     headers: {
                                       'Content-Type': 'application/octet-stream'
                                     }
                                   });
                                   
                                   if (!response.ok) {
                                     showToast('Upload failed: ' + response.statusText);
                                     return;
                                   }
                                   
                                   const data = await response.json() as any;
                                   if (data.success && data.url) {
                                     handleUpdateActiveElement({ imageUrl: data.url });
                                     showToast(`✅ Uploaded: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
                                   } else {
                                     showToast('Upload error: No URL returned');
                                   }
                                 } catch (err: any) {
                                   showToast('Upload error: ' + err.message);
                                 }
                               }
                             }}
                             className="hidden"
                           />
                           <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                             <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Click to Upload</span>
                             <span className="text-[9px] text-slate-400">or drag & drop</span>
                             <span className="text-[8px] text-slate-350 mt-0.5">PNG, JPG, GIF, MP4 • Max 10MB</span>
                           </div>
                         </label>
                       </div>

                       {/* Image Source URL Alternative */}
                       <div className="space-y-1 font-mono">
                         <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Or Paste Image URL</label>
                         <textarea
                           rows={3}
                           value={activeElement.properties.imageUrl || ''}
                           onChange={(e) => handleUpdateActiveElement({ imageUrl: e.target.value })}
                           className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none bg-white"
                           placeholder="https://example.com/image.jpg"
                         />
                       </div>

                       {/* Image Preview */}
                       {activeElement.properties.imageUrl && (
                         <div className="space-y-1.5">
                           <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Preview</span>
                           <div className="w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center max-h-48">
                             <img 
                               src={activeElement.properties.imageUrl} 
                               alt="preview" 
                               className="max-w-full max-h-48 object-contain"
                               onError={() => showToast('Failed to load image preview')}
                             />
                           </div>
                         </div>
                       )}
                     </div>
                   )}

                  {activeElement.type === 'spacer' && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Spacer Height</label>
                          <span className="text-[10px] font-semibold text-slate-500">{activeElement.properties.height || 24}px</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="120"
                          value={activeElement.properties.height || 24}
                          onChange={(e) => handleUpdateActiveElement({ height: Number(e.target.value) })}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#000066]"
                        />
                      </div>
                    </div>
                  )}

                  {activeElement.type === 'divider' && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Line Divider Color</label>
                        <input
                          type="text"
                          value={activeElement.properties.color || '#eaeef7'}
                          onChange={(e) => handleUpdateActiveElement({ color: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl h-11 px-4 text-xs font-mono focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {activeElement.type === 'html' && (
                    <div className="space-y-4 font-sans">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          <span>Raw HTML Script Markup</span>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateActiveElement({ 
                                htmlScript: '<div style="background: linear-gradient(135deg, #0f172a, #1e293b); color: #f8fafc; border: 1px solid #334155; padding: 22px; border-radius: 16px; font-family: sans-serif; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); text-align: left;">\n  <span style="font-size: 10px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; font-weight: bold; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase;">Node System Notice</span>\n  <h4 style="margin: 12px 0 6px; font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: -0.025em;">IGI-SMTP Cloud Engine Reboot</h4>\n  <p style="margin: 0 0 14px; font-size: 12px; line-height: 1.6; color: #94a3b8;">Primary routing protocols in the Frankfurt block will migrate serverless telemetry databases on Thursday UTC.</p>\n  <a href="https://igi-smtp.io" style="display:inline-block; font-size: 11px; font-weight: bold; text-decoration: none; background: #ef4444; color:#ffffff; padding: 8px 16px; border-radius: 8px; transition: transform 0.2s;">View Cluster Deployment Details</a>\n</div>' 
                              });
                              showToast("Applied custom dark SMTP notification card!");
                            }}
                            className="text-[#4f46e5] font-extrabold cursor-pointer hover:underline uppercase text-[9px] bg-[#4f46e5]/5 px-2 py-0.5 rounded"
                          >
                            Demo Card
                          </button>
                        </div>
                        <textarea
                          rows={11}
                          value={activeElement.properties.htmlScript || ''}
                          onChange={(e) => handleUpdateActiveElement({ htmlScript: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl p-3 text-[10px] font-mono focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none bg-slate-900 text-slate-100 placeholder-slate-700 leading-normal"
                          placeholder={`<div style="background: #f1f5f9; padding: 10px;">Your custom HTML body script</div>`}
                        />
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-[10px] text-slate-400 leading-relaxed font-sans">
                        <span className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Developer Guidelines</span>
                        <ul className="list-disc pl-3.5 space-y-1">
                          <li>Include inline styles for reliable email client layouts</li>
                          <li>External widgets, scripts, and inputs are safe to embed here</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Remove CTA */}
                  <div className="pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleRemoveElement(activeElement.id)}
                      className="w-full border border-red-200 text-red-500 hover:text-red-700 hover:bg-red-50 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      Delete Block element
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center select-none">
                  <Sparkles className="w-10 h-10 text-slate-350 stroke-[1.5] mb-2.5 animate-pulse text-[#000066]" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#000066] mb-1">Select an item</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans max-w-[180px]">Highlight elements on preview canvas to unlock properties drawer.</p>
                </div>
              )}
            </div>
          </div>

          {/* Stepper actions footer */}
          <div className="pt-6 border-t border-slate-100 flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="border border-slate-200 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest h-11 px-6 rounded hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back: Template
            </button>
            
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="bg-[#000066] hover:bg-[#000044] text-white font-bold text-xs uppercase tracking-widest h-11 px-8 rounded-full transition-all active:scale-95 shadow-md shadow-[#000066]/15 flex items-center gap-1.5 cursor-pointer"
            >
              Next: Review &amp; Send
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 4: FINAL DELIVERY REVIEW & PREVIEW ACCORDIONS --- */}
      {currentStep === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Columns layout: Details summary and Desktop/Mobile Simulator Grid */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Setup specs card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md space-y-4">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3 mb-2">
                Pipeline Broadcast Checklist
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-0.5">Campaign Name</span>
                  <span className="block font-bold text-slate-800">{campaignName}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-0.5">Sender Identity</span>
                  <span className="block font-bold text-slate-800">{senderName} &lt;{replyTo}&gt;</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-0.5">Roster Scope</span>
                  <span className="block font-bold text-[#000066]">{totalRecipients.toLocaleString()} Recipients mapped</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-widest text-[9px] mb-0.5">Primary Hook Subject</span>
                  <span className="block font-bold text-slate-800 truncate max-w-sm">{subjectLine}</span>
                </div>
              </div>
            </div>

            {/* Desktop / Mobile Device preview Simulator */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
                <span className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Rendering Simulator</span>
                
                {/* Switcher tabs */}
                <div className="flex bg-slate-200/50 p-0.5 rounded-md gap-0.5 border border-slate-205 select-none">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded transition-all flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${
                      previewDevice === 'desktop'
                        ? 'bg-white text-slate-900 shadow-xs animate-none'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Desktop UI</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded transition-all flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${
                      previewDevice === 'mobile'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile Screen</span>
                  </button>
                </div>
              </div>

              {/* Physical viewport container simulation wrapper */}
              <div className="p-8 bg-slate-100 flex justify-center items-start overflow-y-auto max-h-[500px]">
                <div 
                  className={`bg-white shadow-2xl rounded-2xl border border-slate-250 transition-all duration-300 overflow-hidden ${
                    previewDevice === 'mobile' ? 'max-w-[340px] w-full' : 'max-w-xl w-full'
                  }`}
                >
                  {/* Email Simulator headers */}
                  <div className="bg-slate-100 border-b border-slate-200 p-3 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-400"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                    <span className="ml-2 text-[10px] text-slate-400 font-mono italic truncate">support@domain.io</span>
                  </div>

                  <div className="bg-slate-50 p-4 border-b border-slate-200">
                    <div className="text-xs font-bold text-slate-800 font-sans">
                      Subject: <span className="font-medium text-slate-500">{subjectLine}</span>
                    </div>
                  </div>

                  {/* HTML rendered frame client stream representing designed components */}
                  <div className="bg-white">
                    <div className="bg-slate-900 p-3 text-center">
                      <span className="text-white text-xs tracking-widest font-bold uppercase text-center block leading-none">
                        IGI Newsletter
                      </span>
                    </div>
                    
                    <div className="p-4 space-y-2">
                      {emailElements.map((el) => (
                        <div key={el.id}>
                          {el.type === 'text' && (
                            <div 
                              style={{ 
                                padding: `${previewDevice === 'mobile' ? (el.properties.paddingY || 12) / 2 : el.properties.paddingY || 12}px ${previewDevice === 'mobile' ? (el.properties.paddingX || 20) / 2 : el.properties.paddingX || 20}px`,
                                fontSize: previewDevice === 'mobile' ? '12px' : el.properties.fontSize || '15px', 
                                color: el.properties.color || '#171c22'
                              }}
                              className="font-sans font-medium whitespace-pre-wrap leading-relaxed select-none text-[13px]"
                            >
                              {el.properties.text || 'Paragraph details.'}
                            </div>
                          )}

                          {el.type === 'button' && (
                            <div className="text-center py-2">
                              <span 
                                style={{ 
                                  backgroundColor: el.properties.bg || '#4f46e5', 
                                  color: el.properties.color || '#ffffff',
                                  borderRadius: `${el.properties.cornerRadius || 20}px`
                                }}
                                className="px-5 py-2 text-[10px] font-bold font-sans inline-block shadow-sm"
                              >
                                {el.properties.text || 'Action Button'}
                              </span>
                            </div>
                          )}

                          {el.type === 'image' && (
                            <div className="text-center py-1.5">
                              <img 
                                src={el.properties.imageUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w1NjI0NmV8MHwxfHNlYXJjaHwzf|..."} 
                                alt="graphic template segment" 
                                className="w-full max-h-40 object-cover rounded shadow-xs"
                              />
                            </div>
                          )}

                          {el.type === 'spacer' && (
                            <div style={{ height: `${previewDevice === 'mobile' ? (el.properties.height || 24) / 2 : el.properties.height || 24}px` }}></div>
                          )}

                          {el.type === 'divider' && (
                            <div className="py-2 px-3">
                              <hr style={{ borderColor: el.properties.color || '#eaeef7' }} />
                            </div>
                          )}

                          {el.type === 'html' && (
                            <div className="py-2 px-3 leading-normal font-sans text-left select-text">
                              <div dangerouslySetInnerHTML={{ __html: el.properties.htmlScript || '<p>HTML block is empty</p>' }} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50 p-4 border-t border-slate-100 text-[9px] text-slate-400 font-mono text-center">
                      Unsubscribe • Change preferences
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column Layout: Scheduler and triggers */}
          <div className="space-y-6">
            
            {/* Scheduler setup card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md space-y-4 font-sans">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#4f46e5] border-b border-slate-100 pb-3">
                Broadcast Timing
              </h4>

              <div className="space-y-3">
                {/* Immediate Option */}
                <label className="flex items-start gap-3 p-3.5 border border-slate-150 rounded-xl hover:bg-slate-50 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="timingStrategy"
                    checked={sendStrategy === 'IMMEDIATE'}
                    onChange={() => setSendStrategy('IMMEDIATE')}
                    className="mt-1 w-4 h-4 text-[#4f46e5] border-slate-300 cursor-pointer accent-[#4f46e5]"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-905">Send Immediately</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">Warming IP sequence fires immediately upon scheduling confirmation.</span>
                  </div>
                </label>

                {/* Scheduled Option */}
                <label className="flex items-start gap-3 p-3.5 border border-slate-150 rounded-xl hover:bg-slate-50 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="timingStrategy"
                    checked={sendStrategy === 'SCHEDULED'}
                    onChange={() => setSendStrategy('SCHEDULED')}
                    className="mt-1 w-4 h-4 text-[#4f46e5] border-slate-300 cursor-pointer accent-[#4f46e5]"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-905">Schedule for Later</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">Queue broadcast stream inside chron tables for a calendar event.</span>
                  </div>
                </label>
              </div>

              {/* Scheduled Date/Time Inputs if active */}
              {sendStrategy === 'SCHEDULED' && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-3 border border-slate-150 animate-scale-up font-sans">
                  <div className="space-y-1 font-sans">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-450 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Dispatch Date
                    </label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl h-11 px-3 text-xs bg-white outline-none focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-455">Dispatch Time (UTC)</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl h-11 px-3 text-xs bg-white outline-none focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Delivery throttle controls */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md space-y-4 font-sans">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#000066] border-b border-slate-100 pb-3">
                Intelligent Delivery Controls
              </h4>

              <div className="space-y-4 text-xs font-sans">
                {/* Rate limit throttling */}
                <div className="flex items-center justify-between pb-1">
                  <div className="space-y-0.5 pr-2">
                    <span className="block font-bold text-slate-805 leading-none">Smart Rate Throttling</span>
                    <span className="block text-[10px] text-slate-400 mt-1">Distribute package delivery across 2 hours to avoid cold server threshold blocks.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRateThrottling(!rateThrottling)}
                    className={`w-10 h-5.5 rounded-full relative p-0.5 transition-colors duration-200 cursor-pointer ${
                      rateThrottling ? 'bg-[#000066]' : 'bg-slate-200'
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 bg-white rounded-full shadow transition-transform duration-200 ${
                      rateThrottling ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Auto Resend */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="space-y-0.5 pr-2">
                    <span className="block font-bold text-slate-805 leading-none">Auto-Resend Variant</span>
                    <span className="block text-[10px] text-slate-400 mt-1">Resend a secondary subject line automatically to users who do not open after 48 hours.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoResendUnopened(!autoResendUnopened)}
                    className={`w-10 h-5.5 rounded-full relative p-0.5 transition-colors duration-200 cursor-pointer ${
                      autoResendUnopened ? 'bg-[#000066]' : 'bg-slate-200'
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 bg-white rounded-full shadow transition-transform duration-200 ${
                      autoResendUnopened ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Launch validation alarm box */}
            <div className="bg-rose-50 text-rose-950 border border-rose-100 p-4.5 rounded-2xl space-y-2">
              <div className="flex items-start gap-2 text-xs font-bold uppercase tracking-wider text-[#FF0000] leading-none mb-1">
                <AlertCircle className="w-5 h-5 text-[#FF0000]" />
                Infrastructure Warn Guard
              </div>
              <p className="text-xs text-rose-800 leading-relaxed font-sans">
                Review email elements and text layouts carefully. Once confirmed, this pipeline will warm SMTP circuits immediately. Operations are irreversible once packages are validated on public IP routes.
              </p>
            </div>

            {/* Send Test Email Button */}
            <button
              type="button"
              onClick={() => setIsTestModalOpen(true)}
              className="w-full border border-[#000066] text-[#000066] hover:bg-[#000066]/5 py-3 px-6 rounded-full font-sans text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              SEND TEST EMAIL
            </button>

            {/* Huge Rocket confirm CTAs */}
            <div className="space-y-3.5">
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="w-full bg-[#000066] hover:bg-[#000044] text-white py-4 px-6 rounded-full font-sans text-xs font-black uppercase tracking-widest shadow-xl shadow-[#000066]/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Rocket className="w-5 h-5 animate-pulse" />
                CONFIRM & SCHEDULE ROTING MATRIX
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3.5)}
                className="w-full border border-slate-200 hover:border-slate-350 text-slate-500 hover:text-slate-850 bg-white py-3 px-6 rounded-lg font-sans text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Content Editor
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- SEND TEST EMAIL MODAL --- */}
      {isTestModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setIsTestModalOpen(false)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Send Test Email</h3>
              <button onClick={() => setIsTestModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter an email address to receive a test preview of this campaign. The test email includes all your designed content blocks.
            </p>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recipient Email</label>
              <input
                type="email"
                placeholder="you@domain.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-xl h-11 px-4 text-sm focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendTestEmail(); }}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="flex-1 border border-slate-200 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest h-11 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTestEmail}
                disabled={isSendingTest || !testEmail.includes('@')}
                className="flex-1 bg-[#000066] hover:bg-[#000044] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-widest h-11 rounded shadow-md flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingTest ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
