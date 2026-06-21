/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileText, Eye, Edit3, Layers, Plus, Trash2, X, Grid3X3 } from 'lucide-react';
import { EmailTemplate, EmailFooter } from '../types';
import FooterBuilderView from './FooterBuilderView';

interface TemplatesViewProps {
  templates: EmailTemplate[];
  onEditTemplate: (tmpl: EmailTemplate) => void;
  onCreateTemplate?: () => void;
}

type Tab = 'templates' | 'footers';

export default function TemplatesView({ templates, onEditTemplate, onCreateTemplate }: TemplatesViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [footers, setFooters] = useState<EmailFooter[]>([]);
  const [editingFooter, setEditingFooter] = useState<EmailFooter | null>(null);

  React.useEffect(() => {
    if (activeTab === 'footers') {
      fetch('/api/footers')
        .then(res => res.json())
        .then((data: EmailFooter[]) => setFooters(data))
        .catch(() => {});
    }
  }, [activeTab]);

  const handleSaveFooter = async (footer: EmailFooter) => {
    const isEdit = !!(editingFooter && editingFooter.id);
    const url = isEdit ? `/api/footers/${editingFooter.id}` : '/api/footers';
    const method = isEdit ? 'PUT' : 'POST';
    const body = isEdit ? footer : {
      name: footer.name,
      description: footer.description,
      thumbnailUrl: footer.thumbnailUrl,
      background: footer.background,
      layout: footer.layout,
      zones: footer.zones,
      isActive: footer.isActive,
      createdById: footer.createdById,
    };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const saved = await res.json();
      setFooters(prev => isEdit ? prev.map(f => f.id === saved.id ? saved : f) : [saved, ...prev]);
      setEditingFooter(null);
    }
  };

  const handleDeleteFooter = async (id: string) => {
    const res = await fetch(`/api/footers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setFooters(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        // Optionally refresh or notify parent
        setDeletingId(null);
        window.location.reload(); // Simple refresh for now
      }
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-16 font-sans">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'templates' ? 'bg-[#000066] text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 inline mr-1.5" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('footers')}
          className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'footers' ? 'bg-[#000066] text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Grid3X3 className="w-3.5 h-3.5 inline mr-1.5" />
          Footers
        </button>
      </div>

      {activeTab === 'templates' ? (
        <>
          {/* View Header with Create Button */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">Email Templates</h1>
              <p className="text-slate-500 text-sm mt-1">Pre-configured blueprints mapping transactional and bulk layouts</p>
            </div>
            <button
              onClick={onCreateTemplate}
              className="bg-[#000066] hover:bg-[#000044] text-white font-bold text-xs uppercase tracking-widest h-11 px-6 rounded-full transition-all active:scale-95 shadow-md shadow-[#000066]/10 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {templates.map((tmpl) => {
          const hasImage = tmpl.thumbnailUrl || tmpl.id !== 'tmpl-blank';
          const totalElements = tmpl.elements.length;

          return (
            <div 
              key={tmpl.id}
              className="bg-white rounded-xl border border-slate-200/60 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group relative"
            >
                {/* Graphic container */}
              <div className="aspect-[3/4] bg-slate-100 flex items-center justify-center relative overflow-hidden cursor-pointer" onClick={() => onEditTemplate(tmpl)}>
                {hasImage ? (
                  <img 
                    src={tmpl.thumbnailUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w1NjI0NmV8MHwxfHNlYXJjaHwzfHxkYXNoYm9hcmQlMjBhbmFseXRpY3N8ZW58MHx8fHwxNzAzNTI5NjY0fDA&ixlib=rb-4.0.3&q=80&w=1080"} 
                    alt={tmpl.thumbnailAlt || tmpl.name}
                    className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 scale-100 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-6 text-center select-none">
                    <Layers className="w-14 h-14 text-slate-350 stroke-[1.2] mb-3 group-hover:text-[#000066] group-hover:scale-110 transition-all duration-300" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-500">Choose blank canvas</span>
                  </div>
                )}
                
                {/* Floating status */}
                <div className="absolute top-4 right-4 bg-slate-900/40 backdrop-blur-xs text-[9px] font-bold uppercase tracking-wider text-white px-2.5 py-0.5 rounded-full">
                  {totalElements} Elements
                </div>
  
                {/* Overlaid edit state on hover */}
                <div className="absolute inset-0 bg-[#000066]/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white text-slate-900 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-black/15 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <Edit3 className="w-4 h-4 text-[#000066]" />
                    Edit Template
                  </div>
                </div>
              </div>
  
              {/* Metadata details */}
              <div className="p-5 flex-1 flex flex-col justify-between border-t border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#000066] transition-colors font-sans mb-1">{tmpl.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{tmpl.description}</p>
                </div>
  
                <div className="pt-4 mt-4 border-t border-slate-50 flex items-center justify-between text-[11px] uppercase tracking-widest font-bold text-slate-500">
                  <span className="text-slate-400 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    Layout {tmpl.id.startsWith('tmpl-') ? tmpl.id.split('-')[1] : 'custom'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(tmpl.id);
                    }}
                    className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Delete Confirmation Modal */}
              {deletingId === tmpl.id && (
                <div className="absolute inset-0 bg-slate-900/60 rounded-xl flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-5 shadow-xl border border-slate-200 space-y-4 max-w-xs">
                    <h4 className="font-bold text-slate-900">Delete Template?</h4>
                    <p className="text-sm text-slate-600">Are you sure you want to delete "{tmpl.name}"? This cannot be undone.</p>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(tmpl.id)}
                        className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
        </>
      ) : (
        <>
          {editingFooter ? (
            <FooterBuilderView
              footer={editingFooter}
              onSave={handleSaveFooter}
              onCancel={() => setEditingFooter(null)}
              onDelete={editingFooter.id ? handleDeleteFooter : undefined}
            />
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">Email Footers</h1>
                  <p className="text-slate-500 text-sm mt-1">Customizable footer designs with social icons, contact info and branding</p>
                </div>
                <button
                  onClick={() => setEditingFooter({ id: '', name: '', description: '', thumbnailUrl: '', background: { type: 'solid', color: '#ffffff', opacity: 1 }, layout: { maxWidth: '600px', centerAligned: true, paddingY: 40, paddingX: 24, borderWidth: 0, borderColor: '#eaeef7', borderStyle: 'solid', borderRadius: 0, shadow: false, shadowIntensity: 'subtle' }, zones: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as EmailFooter)}
                  className="bg-[#000066] hover:bg-[#000044] text-white font-bold text-xs uppercase tracking-widest h-11 px-6 rounded-full transition-all active:scale-95 shadow-md shadow-[#000066]/10 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Footer
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {footers.map((footer) => (
                  <div
                    key={footer.id}
                    className="bg-white rounded-xl border border-slate-200/60 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col group"
                  >
                    <div
                      className="aspect-[3/2] bg-slate-50 relative overflow-hidden cursor-pointer border-b border-slate-100"
                      onClick={() => setEditingFooter(footer)}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundColor: footer.background.type === 'solid' ? (footer.background.color || '#ffffff') : '#f8fafc',
                            opacity: footer.background.opacity ?? 1,
                          }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-[#000066]/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white text-slate-900 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-black/15">
                          <Edit3 className="w-4 h-4 text-[#000066]" />
                          Edit Footer
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{footer.name}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{footer.description}</p>
                      </div>
                      <div className="pt-3 mt-3 border-t border-slate-50 flex items-center justify-between text-[11px] uppercase tracking-widest font-bold text-slate-500">
                        <span className="text-slate-400">{footer.zones?.length || 0} Zones</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(footer.id);
                          }}
                          className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete footer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {footers.length === 0 && (
                  <div className="col-span-full text-center text-slate-400 py-12">
                    <Grid3X3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm">No footers created yet</p>
                    <button onClick={() => setEditingFooter({ id: '', name: '', description: '', thumbnailUrl: '', background: { type: 'solid', color: '#ffffff', opacity: 1 }, layout: { maxWidth: '600px', centerAligned: true, paddingY: 40, paddingX: 24, borderWidth: 0, borderColor: '#eaeef7', borderStyle: 'solid', borderRadius: 0, shadow: false, shadowIntensity: 'subtle' }, zones: [], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as EmailFooter)} className="mt-3 px-4 py-2 bg-[#000066] text-white rounded-lg text-xs font-bold">Create your first footer</button>
                  </div>
                )}
              </div>
            </>
          )}

          {deletingId && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100]">
              <div className="bg-white rounded-xl p-6 shadow-xl border border-slate-200 space-y-4 max-w-sm">
                <h4 className="font-bold text-slate-900 text-lg">Delete Footer?</h4>
                <p className="text-sm text-slate-600">Are you sure? This cannot be undone.</p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setDeletingId(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                  <button onClick={async () => { await handleDeleteFooter(deletingId); setDeletingId(null); }} className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded">Delete</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
