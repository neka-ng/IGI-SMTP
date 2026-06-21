/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Save,
  Trash2,
  Plus,
  Image,
  Type,
  Globe,
  Mail,
  Phone,
  Share2,
  Settings2,
  Palette,
  Rows3,
  Columns3,
  Link,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
} from 'lucide-react';
import {
  EmailFooter,
  FooterZone,
  SocialLink,
  BackgroundStyle,
  FooterLayout,
  BackgroundType,
  PatternPreset,
} from '../types';

interface FooterBuilderViewProps {
  footer?: EmailFooter | null;
  onSave: (footer: EmailFooter) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

const DEFAULT_BACKGROUND: BackgroundStyle = {
  type: 'solid',
  color: '#ffffff',
  opacity: 1,
};

const DEFAULT_LAYOUT: FooterLayout = {
  maxWidth: '600px',
  centerAligned: true,
  paddingY: 40,
  paddingX: 24,
  borderWidth: 0,
  borderColor: '#eaeef7',
  borderStyle: 'solid',
  borderRadius: 0,
  shadow: false,
  shadowIntensity: 'subtle',
};

const SOCIAL_PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2', hoverColor: '#1060c0' },
  { id: 'twitter', name: 'X (Twitter)', icon: Twitter, color: '#000000', hoverColor: '#333333' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', hoverColor: '#c0354d' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', hoverColor: '#084e96' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000', hoverColor: '#cc0000' },
  { id: 'whatsapp', name: 'WhatsApp', color: '#25D366', hoverColor: '#1da851' },
  { id: 'tiktok', name: 'TikTok', color: '#000000', hoverColor: '#333333' },
  { id: 'pinterest', name: 'Pinterest', color: '#E60023', hoverColor: '#c0001d' },
];

const PATTERN_PRESETS: { value: PatternPreset; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'dots', label: 'Dots' },
  { value: 'stripes', label: 'Stripes' },
  { value: 'diagonal', label: 'Diagonal' },
  { value: 'grid', label: 'Grid' },
  { value: 'checkerboard', label: 'Checkerboard' },
  { value: 'zigzag', label: 'Zigzag' },
];

export default function FooterBuilderView({ footer, onSave, onCancel, onDelete }: FooterBuilderViewProps) {
  const [name, setName] = useState(footer?.name || '');
  const [description, setDescription] = useState(footer?.description || '');
  const [background, setBackground] = useState<BackgroundStyle>(footer?.background || DEFAULT_BACKGROUND);
  const [layout, setLayout] = useState<FooterLayout>(footer?.layout || DEFAULT_LAYOUT);
  const [zones, setZones] = useState<FooterZone[]>(footer?.zones || []);
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (footer) {
      setName(footer.name);
      setDescription(footer.description || '');
      setBackground(footer.background || DEFAULT_BACKGROUND);
      setLayout(footer.layout || DEFAULT_LAYOUT);
      setZones(footer.zones || []);
    }
  }, [footer]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- Zone helpers ---
  const updateZone = (zoneId: string, patch: Partial<FooterZone>) => {
    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, ...patch } : z));
  };

  const addZone = (type: FooterZone['type']) => {
    const newZone: FooterZone = {
      id: `zone-${Date.now()}`,
      type,
      enabled: true,
    };
    if (type === 'header') {
      newZone.companyName = 'Your Company';
    } else if (type === 'body') {
      newZone.content = '<p style="text-align: center; color: #64748b; font-size: 13px;">Thank you for being a valued subscriber.</p>';
    } else if (type === 'social') {
      newZone.socialLinks = [];
      newZone.socialColumns = 4;
    } else if (type === 'contact') {
      newZone.address = '123 Business Ave, City, Country';
      newZone.phone = '+1 234 567 890';
      newZone.website = 'https://example.com';
    } else if (type === 'legal') {
      newZone.copyrightText = `© ${new Date().getFullYear()} Company. All rights reserved.`;
      newZone.showUnsubscribe = true;
      newZone.unsubscribeText = 'Unsubscribe';
    }
    setZones(prev => [...prev, newZone]);
  };

  const removeZone = (zoneId: string) => {
    setZones(prev => prev.filter(z => z.id !== zoneId));
  };

  const addSocialLink = (zoneId: string) => {
    const platform = SOCIAL_PLATFORMS[0];
    const newLink: SocialLink = {
      id: `social-${Date.now()}`,
      platform: platform.id,
      url: '',
      color: platform.color,
      hoverColor: platform.hoverColor,
      size: 'md',
    };
    const zone = zones.find(z => z.id === zoneId);
    if (zone && zone.socialLinks) {
      updateZone(zoneId, { socialLinks: [...zone.socialLinks, newLink] });
    }
  };

  const updateSocialLink = (zoneId: string, linkId: string, patch: Partial<SocialLink>) => {
    const zone = zones.find(z => z.id === zoneId);
    if (zone && zone.socialLinks) {
      updateZone(zoneId, {
        socialLinks: zone.socialLinks.map(l => l.id === linkId ? { ...l, ...patch } : l),
      });
    }
  };

  const removeSocialLink = (zoneId: string, linkId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (zone && zone.socialLinks) {
      updateZone(zoneId, { socialLinks: zone.socialLinks.filter(l => l.id !== linkId) });
    }
  };

  // --- Background preview helper ---
  const getBackgroundStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = { opacity: background.opacity ?? 1 };
    switch (background.type) {
      case 'solid':
        base.backgroundColor = background.color || '#ffffff';
        break;
      case 'gradient':
        base.background = `linear-gradient(${background.gradientDirection || '180deg'}, ${background.gradientFrom || '#000066'}, ${background.gradientTo || '#ffffff'})`;
        break;
      case 'image':
        base.backgroundImage = `url(${background.imageUrl || ''})`;
        base.backgroundSize = background.imageSize || 'cover';
        base.backgroundPosition = background.imagePosition || 'center';
        break;
      case 'pattern':
        base.backgroundColor = background.patternBg || '#ffffff';
        // inline pattern via SVG data URI
        const color = background.patternColor || '#000066';
        let patternSvg = '';
        switch (background.pattern) {
          case 'dots':
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="2" cy="2" r="1.5" fill="${color}"/></svg>`;
            break;
          case 'stripes':
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><line x1="0" y1="0" x2="20" y2="20" stroke="${color}" stroke-width="1"/></svg>`;
            break;
          case 'diagonal':
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><line x1="0" y1="20" x2="20" y2="0" stroke="${color}" stroke-width="1"/></svg>`;
            break;
          case 'grid':
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="${color}" stroke-width="1"/></svg>`;
            break;
          case 'checkerboard':
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="10" height="10" fill="${color}"/><rect x="10" y="10" width="10" height="10" fill="${color}"/></svg>`;
            break;
          case 'zigzag':
            patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><polyline points="0 10 5 0 10 10 15 0 20 10" fill="none" stroke="${color}" stroke-width="1"/></svg>`;
            break;
          default:
            break;
        }
        if (patternSvg) {
          const encoded = encodeURIComponent(patternSvg);
          base.backgroundImage = `url("data:image/svg+xml;utf8,${encoded}")`;
        }
        break;
      default:
        break;
    }
    return base;
  };

  const handleSave = () => {
    if (!name.trim()) {
      showToast('Footer name is required');
      return;
    }
    const payload: EmailFooter = {
      id: footer?.id || `ftr-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      thumbnailUrl: footer?.thumbnailUrl || '',
      background,
      layout,
      zones,
      isActive: true,
      createdAt: footer?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: footer?.createdById,
    };
    onSave(payload);
  };

  const handleDelete = () => {
    if (footer?.id && onDelete) {
      onDelete(footer.id);
    }
  };

  // --- Rich text editor for body zone ---
  const RichTextZoneEditor = ({ zone }: { zone: FooterZone }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (editorRef.current && zone.content && !editorRef.current.hasChildNodes()) {
        editorRef.current.innerHTML = zone.content;
      }
    }, [zone.content]);

    const handleInput = () => {
      if (editorRef.current) {
        updateZone(zone.id, { content: editorRef.current.innerHTML });
      }
    };

    const exec = (command: string, value?: string) => {
      document.execCommand(command, false, value);
      handleInput();
      editorRef.current?.focus();
    };

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-slate-50 border-b border-slate-200">
          {(['bold', 'italic', 'underline'] as const).map(cmd => (
            <button key={cmd} type="button" onClick={() => exec(cmd)} className="px-1.5 py-1 text-xs rounded hover:bg-slate-200 text-slate-600">
              <span className="font-bold">{cmd === 'bold' ? 'B' : cmd === 'italic' ? 'I' : 'U'}</span>
            </button>
          ))}
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          {(['left', 'center', 'right'] as const).map(align => (
            <button key={align} type="button" onClick={() => exec('justify' + align.charAt(0).toUpperCase() + align.slice(1))} className="px-1.5 py-1 text-xs rounded hover:bg-slate-200 text-slate-600">
              {align === 'left' ? '⯇' : align === 'center' ? '⯈' : '⯈'}
            </button>
          ))}
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <input
            type="color"
            className="w-7 h-7 p-0 border-0 cursor-pointer"
            onChange={(e) => exec('foreColor', e.target.value)}
            title="Text Color"
          />
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleInput}
          className="p-3 min-h-[100px] max-h-[200px] overflow-y-auto text-xs text-slate-700 outline-none leading-relaxed"
          dangerouslySetInnerHTML={zone.content ? { __html: zone.content } : undefined}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16 font-sans">
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white font-semibold text-xs uppercase tracking-wider px-5 py-3.5 rounded-lg z-[110] shadow-xl animate-bounce">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Footer Builder</h2>
          <p className="text-slate-400 text-sm mt-1">Design a custom footer for your emails</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Meta */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md space-y-4">
        <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">Footer Details</h3>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-200 rounded-xl h-11 px-4 text-sm focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none" placeholder="My Footer" />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none" placeholder="Optional description" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Settings Panels */}
        <div className="space-y-6">
          {/* Background Studio */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Palette className="w-4 h-4 text-[#4f46e5]" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#4f46e5]">Background Studio</h4>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Type</label>
              <select
                value={background.type}
                onChange={(e) => setBackground({ ...background, type: e.target.value as BackgroundType })}
                className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none"
              >
                <option value="solid">Solid Color</option>
                <option value="gradient">Gradient</option>
                <option value="image">Image</option>
                <option value="pattern">Pattern</option>
              </select>
            </div>

            {background.type === 'solid' && (
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Color</label>
                <input type="color" value={background.color || '#ffffff'} onChange={(e) => setBackground({ ...background, color: e.target.value })} className="w-full h-9 p-0 border-0 cursor-pointer rounded" />
              </div>
            )}

            {background.type === 'gradient' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">From</label>
                    <input type="color" value={background.gradientFrom || '#000066'} onChange={(e) => setBackground({ ...background, gradientFrom: e.target.value })} className="w-full h-9 p-0 border-0 cursor-pointer rounded" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">To</label>
                    <input type="color" value={background.gradientTo || '#ffffff'} onChange={(e) => setBackground({ ...background, gradientTo: e.target.value })} className="w-full h-9 p-0 border-0 cursor-pointer rounded" />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Direction</label>
                  <select value={background.gradientDirection || '180deg'} onChange={(e) => setBackground({ ...background, gradientDirection: e.target.value })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none">
                    <option value="90deg">90°</option>
                    <option value="135deg">135°</option>
                    <option value="180deg">180°</option>
                    <option value="225deg">225°</option>
                    <option value="270deg">270°</option>
                  </select>
                </div>
              </div>
            )}

            {background.type === 'image' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Image URL</label>
                  <input type="text" value={background.imageUrl || ''} onChange={(e) => setBackground({ ...background, imageUrl: e.target.value })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none font-mono" placeholder="https://..." />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Position</label>
                    <select value={background.imagePosition || 'center'} onChange={(e) => setBackground({ ...background, imagePosition: e.target.value })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none">
                      <option value="center">Center</option>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Size</label>
                    <select value={background.imageSize || 'cover'} onChange={(e) => setBackground({ ...background, imageSize: e.target.value as any })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none">
                      <option value="cover">Cover</option>
                      <option value="contain">Contain</option>
                      <option value="auto">Auto</option>
                      <option value="repeat">Repeat</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {background.type === 'pattern' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Preset</label>
                  <select value={background.pattern || 'none'} onChange={(e) => setBackground({ ...background, pattern: e.target.value as PatternPreset })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none">
                    {PATTERN_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pattern Color</label>
                    <input type="color" value={background.patternColor || '#000066'} onChange={(e) => setBackground({ ...background, patternColor: e.target.value })} className="w-full h-9 p-0 border-0 cursor-pointer rounded" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Background</label>
                    <input type="color" value={background.patternBg || '#ffffff'} onChange={(e) => setBackground({ ...background, patternBg: e.target.value })} className="w-full h-9 p-0 border-0 cursor-pointer rounded" />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Opacity: {Math.round((background.opacity ?? 1) * 100)}%</label>
              <input type="range" min="0" max="1" step="0.05" value={background.opacity ?? 1} onChange={(e) => setBackground({ ...background, opacity: parseFloat(e.target.value) })} className="w-full" />
            </div>
          </div>

          {/* Container Settings */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Settings2 className="w-4 h-4 text-[#4f46e5]" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#4f46e5]">Container Settings</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Max Width</label>
                <select value={layout.maxWidth} onChange={(e) => setLayout({ ...layout, maxWidth: e.target.value as any })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none">
                  <option value="600px">600px</option>
                  <option value="640px">640px</option>
                  <option value="720px">720px</option>
                  <option value="full">Full Width</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Align</label>
                <select value={layout.centerAligned ? 'center' : 'left'} onChange={(e) => setLayout({ ...layout, centerAligned: e.target.value === 'center' })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none">
                  <option value="center">Center</option>
                  <option value="left">Left</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Padding Y: {layout.paddingY}px</label>
                <input type="range" min="0" max="80" value={layout.paddingY} onChange={(e) => setLayout({ ...layout, paddingY: Number(e.target.value) })} className="w-full" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Padding X: {layout.paddingX}px</label>
                <input type="range" min="0" max="60" value={layout.paddingX} onChange={(e) => setLayout({ ...layout, paddingX: Number(e.target.value) })} className="w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Border Width: {layout.borderWidth}px</label>
                <input type="range" min="0" max="5" value={layout.borderWidth} onChange={(e) => setLayout({ ...layout, borderWidth: Number(e.target.value) })} className="w-full" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Border Color</label>
                <input type="color" value={layout.borderColor} onChange={(e) => setLayout({ ...layout, borderColor: e.target.value })} className="w-full h-9 p-0 border-0 cursor-pointer rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Border Style</label>
                <select value={layout.borderStyle} onChange={(e) => setLayout({ ...layout, borderStyle: e.target.value as any })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none">
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Radius: {layout.borderRadius}px</label>
                <input type="range" min="0" max="30" value={layout.borderRadius} onChange={(e) => setLayout({ ...layout, borderRadius: Number(e.target.value) })} className="w-full" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={layout.shadow} onChange={(e) => setLayout({ ...layout, shadow: e.target.checked })} className="rounded border-slate-300" />
              <label className="text-[11px] font-medium text-slate-700">Drop Shadow</label>
              {layout.shadow && (
                <select value={layout.shadowIntensity} onChange={(e) => setLayout({ ...layout, shadowIntensity: e.target.value as any })} className="ml-auto border border-slate-200 rounded-lg h-8 px-2 text-xs outline-none">
                  <option value="subtle">Subtle</option>
                  <option value="medium">Medium</option>
                  <option value="strong">Strong</option>
                </select>
              )}
            </div>
          </div>

          {/* Zones Management */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Rows3 className="w-4 h-4 text-[#4f46e5]" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#4f46e5]">Zones</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['header', 'body', 'social', 'contact', 'legal'] as const).map(type => (
                <button key={type} onClick={() => addZone(type)} className="px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs text-slate-600 hover:border-[#000066] hover:text-[#000066] transition-colors">
                  + {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {zones.map(zone => (
                <div key={zone.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={zone.enabled} onChange={(e) => updateZone(zone.id, { enabled: e.target.checked })} className="rounded border-slate-300" />
                      <span className="text-xs font-bold text-slate-700 uppercase">{zone.type} Zone</span>
                    </div>
                    <button onClick={() => removeZone(zone.id)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>

                  {zone.type === 'header' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Company Name</label>
                        <input type="text" value={zone.companyName || ''} onChange={(e) => updateZone(zone.id, { companyName: e.target.value })} className="w-full border border-slate-200 rounded-lg h-8 px-2 text-xs outline-none" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Logo URL</label>
                        <input type="text" value={zone.logoUrl || ''} onChange={(e) => updateZone(zone.id, { logoUrl: e.target.value })} className="w-full border border-slate-200 rounded-lg h-8 px-2 text-xs outline-none font-mono" />
                      </div>
                    </div>
                  )}

                  {zone.type === 'body' && (
                    <RichTextZoneEditor zone={zone} />
                  )}

                  {zone.type === 'social' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Columns:</label>
                        <select value={zone.socialColumns || 4} onChange={(e) => updateZone(zone.id, { socialColumns: Number(e.target.value) as any })} className="border border-slate-200 rounded h-7 px-1 text-xs outline-none">
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                          <option value="6">6</option>
                        </select>
                      </div>
                      {(zone.socialLinks || []).map(link => {
                        const platform = SOCIAL_PLATFORMS.find(p => p.id === link.platform) || SOCIAL_PLATFORMS[0];
                        const IconComp = platform.icon;
                        return (
                          <div key={link.id} className="flex items-center gap-2 p-2 border border-slate-100 rounded-lg">
                            {IconComp ? <IconComp className="w-4 h-4" style={{ color: link.color }} /> : <Share2 className="w-4 h-4" style={{ color: link.color }} />}
                            <select value={link.platform} onChange={(e) => updateSocialLink(zone.id, link.id, { platform: e.target.value, color: SOCIAL_PLATFORMS.find(p => p.id === e.target.value)?.color || link.color, hoverColor: SOCIAL_PLATFORMS.find(p => p.id === e.target.value)?.hoverColor || link.hoverColor })} className="border border-slate-200 rounded h-7 px-1 text-xs outline-none flex-1">
                              {SOCIAL_PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <input type="text" value={link.url} onChange={(e) => updateSocialLink(zone.id, link.id, { url: e.target.value })} className="flex-1 border border-slate-200 rounded h-7 px-2 text-xs outline-none font-mono" placeholder="https://..." />
                            <input type="color" value={link.color} onChange={(e) => updateSocialLink(zone.id, link.id, { color: e.target.value })} className="w-7 h-7 p-0 border-0 cursor-pointer rounded" />
                            <select value={link.size} onChange={(e) => updateSocialLink(zone.id, link.id, { size: e.target.value as any })} className="border border-slate-200 rounded h-7 px-1 text-xs outline-none">
                              <option value="sm">S</option>
                              <option value="md">M</option>
                              <option value="lg">L</option>
                            </select>
                            <button onClick={() => removeSocialLink(zone.id, link.id)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        );
                      })}
                      <button onClick={() => addSocialLink(zone.id)} className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs text-slate-600 hover:border-[#000066] hover:text-[#000066] transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Social Icon
                      </button>
                    </div>
                  )}

                  {zone.type === 'contact' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Address</label>
                        <input type="text" value={zone.address || ''} onChange={(e) => updateZone(zone.id, { address: e.target.value })} className="w-full border border-slate-200 rounded-lg h-8 px-2 text-xs outline-none" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</label>
                        <input type="text" value={zone.phone || ''} onChange={(e) => updateZone(zone.id, { phone: e.target.value })} className="w-full border border-slate-200 rounded-lg h-8 px-2 text-xs outline-none" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Website</label>
                        <input type="text" value={zone.website || ''} onChange={(e) => updateZone(zone.id, { website: e.target.value })} className="w-full border border-slate-200 rounded-lg h-8 px-2 text-xs outline-none font-mono" />
                      </div>
                    </div>
                  )}

                  {zone.type === 'legal' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Copyright Text</label>
                        <input type="text" value={zone.copyrightText || ''} onChange={(e) => updateZone(zone.id, { copyrightText: e.target.value })} className="w-full border border-slate-200 rounded-lg h-8 px-2 text-xs outline-none" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={zone.showUnsubscribe} onChange={(e) => updateZone(zone.id, { showUnsubscribe: e.target.checked })} className="rounded border-slate-300" />
                        <label className="text-[11px] font-medium text-slate-700">Show Unsubscribe Link</label>
                      </div>
                      {zone.showUnsubscribe && (
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unsubscribe Text</label>
                          <input type="text" value={zone.unsubscribeText || ''} onChange={(e) => updateZone(zone.id, { unsubscribeText: e.target.value })} className="w-full border border-slate-200 rounded-lg h-8 px-2 text-xs outline-none" />
                        </div>
                      )}
                    </div>
                  )}

                  {zone.type === 'custom' && (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Custom HTML</label>
                      <textarea rows={4} value={zone.customHtml || ''} onChange={(e) => updateZone(zone.id, { customHtml: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-[10px] font-mono outline-none" placeholder="<div>...</div>" />
                    </div>
                  )}
                </div>
              ))}
              {zones.length === 0 && (
                <div className="text-center text-slate-400 py-4 text-[10px]">No zones added yet. Use the buttons above to add zones.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-md space-y-4 h-fit lg:sticky lg:top-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Preview</h4>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {/* Mock email client chrome */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
              <div className="h-2 w-24 bg-slate-300 rounded mb-1.5" />
              <div className="h-2 w-16 bg-slate-200 rounded" />
            </div>
            <div className="bg-[#f8fafc] p-4">
              <div
                style={getBackgroundStyle()}
                className={`mx-auto ${layout.centerAligned ? 'mx-auto' : ''}`}
              >
                <div
                  className={`${layout.maxWidth === 'full' ? 'w-full' : 'max-w-' + layout.maxWidth} mx-auto`}
                  style={{
                    padding: `${layout.paddingY}px ${layout.paddingX}px`,
                    border: layout.borderWidth > 0 ? `${layout.borderWidth}px ${layout.borderStyle} ${layout.borderColor}` : 'none',
                    borderRadius: layout.borderRadius,
                    boxShadow: layout.shadow ? (layout.shadowIntensity === 'subtle' ? '0 2px 8px rgba(0,0,0,0.06)' : layout.shadowIntensity === 'medium' ? '0 4px 12px rgba(0,0,0,0.1)' : '0 8px 24px rgba(0,0,0,0.15)') : 'none',
                  }}
                >
                  {zones.filter(z => z.enabled).map(zone => (
                    <div key={zone.id} className="mb-3 last:mb-0">
                      {zone.type === 'header' && (
                        <div className="text-center">
                          {zone.logoUrl && <img src={zone.logoUrl} alt="logo" className="max-h-10 mx-auto mb-2" />}
                          {zone.companyName && <p className="text-sm font-bold text-slate-800">{zone.companyName}</p>}
                        </div>
                      )}
                      {zone.type === 'body' && (
                        <div className="text-center text-slate-600 text-[13px] leading-relaxed" dangerouslySetInnerHTML={{ __html: zone.content || '<p>Footer content</p>' }} />
                      )}
                      {zone.type === 'social' && (
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${zone.socialColumns || 4}, 1fr)`, gap: '8px' }}>
                          {(zone.socialLinks || []).map(link => {
                            const platform = SOCIAL_PLATFORMS.find(p => p.id === link.platform);
                            const IconComp = platform?.icon;
                            return (
                              <a key={link.id} href={link.url || '#'} target="_blank" rel="noopener noreferrer" style={{ color: link.color, fontSize: link.size === 'lg' ? 24 : link.size === 'md' ? 20 : 16, textAlign: 'center', display: 'block', textDecoration: 'none' }}>
                                {IconComp ? <IconComp className="mx-auto" style={{ width: link.size === 'lg' ? 28 : link.size === 'md' ? 22 : 18, height: link.size === 'lg' ? 28 : link.size === 'md' ? 22 : 18 }} /> : link.platform}
                              </a>
                            );
                          })}
                        </div>
                      )}
                      {zone.type === 'contact' && (
                        <div className="text-center text-slate-500 text-[11px] space-y-1">
                          {zone.address && <p>{zone.address}</p>}
                          {(zone.phone || zone.website) && (
                            <p>
                              {zone.phone && <span>{zone.phone}</span>}
                              {zone.phone && zone.website && <span> • </span>}
                              {zone.website && <a href={zone.website} className="underline" style={{ color: '#000066' }}>{zone.website}</a>}
                            </p>
                          )}
                        </div>
                      )}
                      {zone.type === 'legal' && (
                        <div className="text-center text-slate-400 text-[10px]">
                          <p>{zone.copyrightText}</p>
                          {zone.showUnsubscribe && <p className="mt-1"><a href="#" className="underline" style={{ color: '#000066' }}>{zone.unsubscribeText}</a></p>}
                        </div>
                      )}
                      {zone.type === 'custom' && (
                        <div dangerouslySetInnerHTML={{ __html: zone.customHtml || '' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-between">
        <div>
          {footer?.id && onDelete && (
            <button onClick={handleDelete} className="border border-red-200 text-red-500 hover:text-red-600 font-bold text-xs uppercase tracking-widest h-11 px-6 rounded hover:bg-red-50">
              <Trash2 className="w-4 h-4 inline mr-1" /> Delete
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="border border-slate-200 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest h-11 px-6 rounded hover:bg-slate-50">
            <ChevronLeft className="w-4 h-4 inline mr-1" /> Cancel
          </button>
          <button onClick={handleSave} className="bg-[#000066] hover:bg-[#000044] text-white font-bold text-xs uppercase tracking-widest h-11 px-8 rounded-full shadow-md">
            <Save className="w-4 h-4 inline mr-1" /> Save Footer
          </button>
        </div>
      </div>
    </div>
  );
}