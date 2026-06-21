/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ChevronLeft,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Sparkles,
  Save,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Upload,
  Type,
  Grid3X3
} from 'lucide-react';
import { EmailTemplate, EmailElement, EmailElementType, EmailFooter } from '../types';
import RichTextEditor from './RichTextEditor';
import ColorPicker from './ColorPicker';

interface TemplateEditorViewProps {
  template: EmailTemplate;
  onSaveTemplate: (updated: EmailTemplate) => void;
  onCancel: () => void;
}

export default function TemplateEditorView({ template, onSaveTemplate, onCancel }: TemplateEditorViewProps) {
  const [templateName, setTemplateName] = useState(template.name);
  const [templateDescription, setTemplateDescription] = useState(template.description);
  const [emailElements, setEmailElements] = useState<EmailElement[]>(template.elements || []);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'blocks' | 'wordpad'>('blocks');
  const [wordPadContent, setWordPadContent] = useState(
    template.elements?.find(el => el.type === 'richtext')?.properties?.content || '<p>Start typing your email content here...</p>'
  );

  const [selectedFooterId, setSelectedFooterId] = useState<string | null>(null);
  const [availableFooters, setAvailableFooters] = useState<EmailFooter[]>([]);

  React.useEffect(() => {
    fetch('/api/footers')
      .then(res => res.json())
      .then((data: EmailFooter[]) => setAvailableFooters(data))
      .catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddElement = (type: EmailElementType) => {
    const newId = `el-${type}-${Date.now()}`;
    let baseProps: Record<string, any> = {};

    switch (type) {
      case 'text':
        baseProps = { text: 'Edit this text block.', fontSize: '15px', color: '#171c22', bgColor: 'transparent', textAlign: 'left', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', lineHeight: '1.6', paddingY: 12, paddingX: 20 };
        break;
      case 'html':
        baseProps = { htmlScript: '<div style="padding: 16px; text-align: center;">Custom HTML</div>' };
        break;
      case 'button':
        baseProps = { text: 'Action Button', url: 'https://example.com', bg: '#4f46e5', color: '#ffffff', fontSize: '14px', paddingY: 10, paddingX: 24, cornerRadius: 20, textAlign: 'center' };
        break;
      case 'image':
        baseProps = { imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080', altText: '', width: '100%', height: 'auto', paddingY: 8, paddingX: 24, textAlign: 'center' };
        break;
      case 'spacer':
        baseProps = { height: 24 };
        break;
      case 'divider':
        baseProps = { color: '#eaeef7' };
        break;
      case 'richtext':
        baseProps = { content: '<p>Rich text content</p>' };
        break;
    }

    const newElement: EmailElement = { id: newId, type, properties: baseProps };
    setEmailElements([...emailElements, newElement]);
    setActiveElementId(newId);
    showToast('Block added to template');
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
    showToast('Block removed');
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds 10MB limit');
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const response = await fetch(`/api/upload?filetype=${encodeURIComponent(file.type || 'application/octet-stream')}`, {
        method: 'POST',
        body: new Uint8Array(arrayBuffer),
        headers: { 'Content-Type': 'application/octet-stream' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.url) {
          handleUpdateActiveElement({ imageUrl: data.url });
          showToast(`Uploaded: ${file.name}`);
        }
      }
    } catch (err: any) {
      showToast('Upload failed: ' + err.message);
    }
  };

  const handleSave = () => {
    let elementsToSave = emailElements;
    if (editorMode === 'wordpad') {
      // Convert word pad content to one richtext element
      const wordPadElement: EmailElement = {
        id: 'el-wordpad-1',
        type: 'richtext',
        properties: { content: wordPadContent }
      };
      elementsToSave = [wordPadElement];
    }
    const selectedFooter = availableFooters.find(f => f.id === selectedFooterId) || null;
    onSaveTemplate({
      ...template,
      name: templateName,
      description: templateDescription,
      elements: elementsToSave,
      selectedFooterId: selectedFooterId || undefined,
      footerData: selectedFooter
    });
  };

  const activeElement = emailElements.find((el) => el.id === activeElementId);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16 font-sans">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white font-semibold text-xs uppercase tracking-wider px-5 py-3.5 rounded-lg z-[110] shadow-xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Edit Template</h2>
          <p className="text-slate-400 text-sm mt-1">Customize this template and save for reuse in campaigns</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Mode Switcher */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-md flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-2">Editor Mode:</span>
        <button
          onClick={() => setEditorMode('blocks')}
          className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            editorMode === 'blocks' ? 'bg-[#000066] text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Type className="w-3.5 h-3.5 inline mr-1.5" />
          Drag-and-Drop Blocks
        </button>
        <button
          onClick={() => setEditorMode('wordpad')}
          className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            editorMode === 'wordpad' ? 'bg-[#000066] text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 inline mr-1.5" />
          Word-Pad Editor
        </button>
      </div>

      {/* Template Metadata */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md space-y-4">
        <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3">Template Details</h3>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Template Name</label>
          <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="w-full border border-slate-200 rounded-xl h-11 px-4 text-sm focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none" />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
          <textarea rows={2} value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none" placeholder="Describe this template for easy identification" />
        </div>
      </div>

      {/* Footer Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-[#4f46e5]" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Template Footer</h3>
          </div>
          {selectedFooterId && (
            <button onClick={() => setSelectedFooterId(null)} className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase">Remove</button>
          )}
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

      {editorMode === 'blocks' ? (
        /* --- DRAG-AND-DROP BLOCKS MODE --- */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
          {/* Left: Elements Palette */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-md space-y-4 h-fit">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2.5">Blocks</h4>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
              {([
                { type: 'text', label: 'Text' },
                { type: 'image', label: 'Image' },
                { type: 'button', label: 'Button' },
                { type: 'html', label: 'HTML' },
                { type: 'spacer', label: 'Spacer' },
                { type: 'divider', label: 'Divider' },
                { type: 'richtext', label: 'Rich Text' }
              ] as const).map((block) => (
                <button
                  key={block.type}
                  onClick={() => handleAddElement(block.type)}
                  className="flex items-center gap-2 border border-dashed border-slate-250 p-3 rounded-xl text-slate-600 text-xs font-semibold hover:border-[#000066] hover:text-[#000066] hover:bg-[#000066]/5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>{block.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Center: Canvas Preview */}
          <div className="lg:col-span-2 bg-[#eaeef7]/40 border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-start overflow-y-auto min-h-[500px]">
            <div className="max-w-md w-full bg-white shadow-lg rounded-xl border border-slate-150 overflow-hidden flex flex-col">
              <div className="bg-slate-900 p-4 text-center select-none">
                <span className="text-white text-sm font-bold tracking-widest uppercase">Email Template</span>
              </div>
              <div className="space-y-1.5 p-4 bg-white min-h-[300px]">
                {emailElements.length > 0 ? (
                  emailElements.map((el, idx) => {
                    const isActive = activeElementId === el.id;
                    return (
                      <div
                        key={el.id}
                        onClick={() => setActiveElementId(el.id)}
                        className={`relative group rounded-xl transition-all cursor-pointer py-1 ${
                          isActive ? 'ring-2 ring-[#000066] bg-[#000066]/5' : 'hover:ring-1 hover:ring-slate-350'
                        }`}
                      >
                        {el.type === 'text' && (
                          <div
                            style={{
                              padding: `${el.properties.paddingY || 12}px ${el.properties.paddingX || 20}px`,
                              fontSize: el.properties.fontSize || '15px',
                              color: el.properties.color || '#171c22',
                              backgroundColor: el.properties.bgColor || 'transparent',
                              textAlign: (el.properties.textAlign as any) || 'left',
                              fontWeight: el.properties.fontWeight || 'normal',
                              fontStyle: el.properties.fontStyle || 'normal',
                              textDecoration: el.properties.textDecoration || 'none',
                              lineHeight: el.properties.lineHeight || '1.6'
                            }}
                            className="font-sans font-medium whitespace-pre-wrap select-none"
                          >
                            {el.properties.text || 'Text block'}
                          </div>
                        )}

                        {el.type === 'button' && (
                          <div style={{ padding: `${el.properties.paddingY || 10}px ${el.properties.paddingX || 24}px`, textAlign: (el.properties.textAlign as any) || 'center' }}>
                            <span
                              style={{
                                backgroundColor: el.properties.bg || '#4f46e5',
                                color: el.properties.color || '#ffffff',
                                borderRadius: `${el.properties.cornerRadius || 20}px`,
                                fontSize: el.properties.fontSize || '14px'
                              }}
                              className="px-5 py-2 text-xs font-bold inline-block"
                            >
                              {el.properties.text || 'Button'}
                            </span>
                          </div>
                        )}

                        {el.type === 'image' && (
                          <div style={{ padding: `${el.properties.paddingY || 8}px ${el.properties.paddingX || 24}px`, textAlign: (el.properties.textAlign as any) || 'center' }}>
                            <img
                              src={el.properties.imageUrl || 'https://via.placeholder.com/300x150'}
                              alt={el.properties.altText || 'img'}
                              style={{ width: el.properties.width || '100%', height: el.properties.height || 'auto' }}
                              className="max-h-48 object-cover rounded"
                            />
                          </div>
                        )}

                        {el.type === 'spacer' && (
                          <div style={{ height: `${el.properties.height || 24}px` }} className="bg-slate-50 border-y border-dashed border-slate-100"></div>
                        )}

                        {el.type === 'divider' && (
                          <div className="py-2.5 px-4"><hr style={{ borderColor: el.properties.color || '#eaeef7' }} /></div>
                        )}

                        {el.type === 'html' && (
                          <div className="py-2.5 px-4"><div dangerouslySetInnerHTML={{ __html: el.properties.htmlScript || '<p>HTML</p>' }} /></div>
                        )}

                        {el.type === 'richtext' && (
                          <div className="py-2.5 px-4"><div dangerouslySetInnerHTML={{ __html: el.properties.content || '<p>Rich text content</p>' }} /></div>
                        )}

                        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); if (idx > 0) { const c = [...emailElements]; [c[idx], c[idx-1]] = [c[idx-1], c[idx]]; setEmailElements(c); } }} className="p-1 hover:bg-slate-100 text-slate-400 rounded"><MoveUp className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); if (idx < emailElements.length - 1) { const c = [...emailElements]; [c[idx], c[idx+1]] = [c[idx+1], c[idx]]; setEmailElements(c); } }} className="p-1 hover:bg-slate-100 text-slate-400 rounded"><MoveDown className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveElement(el.id); }} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 text-sm">Add blocks to start building</div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Properties Editor */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-md flex flex-col h-fit">
            {activeElement ? (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#4f46e5] flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    Properties
                  </h4>
                </div>

                {/* --- TEXT BLOCK PROPERTIES --- */}
                {activeElement.type === 'text' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Text Content</label>
                      <textarea rows={3} value={activeElement.properties.text || ''} onChange={(e) => handleUpdateActiveElement({ text: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#000066]/10" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Font Size</label>
                      <select value={activeElement.properties.fontSize || '15px'} onChange={(e) => handleUpdateActiveElement({ fontSize: e.target.value })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none">
                        <option value="10px">10px</option>
                        <option value="12px">12px</option>
                        <option value="14px">14px</option>
                        <option value="15px">Regular (15px)</option>
                        <option value="16px">16px</option>
                        <option value="18px">Large (18px)</option>
                        <option value="20px">20px</option>
                        <option value="24px">XL (24px)</option>
                        <option value="28px">28px</option>
                        <option value="32px">32px</option>
                      </select>
                    </div>
                    <ColorPicker value={activeElement.properties.color || '#171c22'} onChange={(v) => handleUpdateActiveElement({ color: v })} label="Text Color" />
                    <ColorPicker value={activeElement.properties.bgColor || 'transparent'} onChange={(v) => handleUpdateActiveElement({ bgColor: v })} label="Background Color" />
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Text Alignment</label>
                      <div className="flex gap-1">
                        {[{ key: 'left', icon: AlignLeft }, { key: 'center', icon: AlignCenter }, { key: 'right', icon: AlignRight }].map(({ key, icon: Icon }) => (
                          <button
                            key={key}
                            onClick={() => handleUpdateActiveElement({ textAlign: key })}
                            className={`p-2 rounded-lg text-xs border transition-all ${activeElement.properties.textAlign === key ? 'bg-[#000066] text-white border-[#000066]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Font Weight</label>
                      <select value={activeElement.properties.fontWeight || 'normal'} onChange={(e) => handleUpdateActiveElement({ fontWeight: e.target.value })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none">
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                        <option value="lighter">Light</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Text Style</label>
                      <div className="flex gap-1">
                        {[{ key: 'normal', icon: Bold, active: activeElement.properties.fontStyle !== 'italic' && activeElement.properties.fontWeight !== 'bold' }, { key: 'italic', icon: Italic }, { key: 'underline', icon: Underline }].map(({ key, icon: Icon }) => {
                          const isActive = key === 'italic' ? activeElement.properties.fontStyle === 'italic' :
                            key === 'underline' ? activeElement.properties.textDecoration === 'underline' :
                            activeElement.properties.fontStyle !== 'italic' && activeElement.properties.fontWeight !== 'bold' && key === 'normal';
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                if (key === 'normal') handleUpdateActiveElement({ fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none' });
                                else if (key === 'italic') handleUpdateActiveElement({ fontStyle: activeElement.properties.fontStyle === 'italic' ? 'normal' : 'italic' });
                                else if (key === 'underline') handleUpdateActiveElement({ textDecoration: activeElement.properties.textDecoration === 'underline' ? 'none' : 'underline' });
                              }}
                              className={`p-2 rounded-lg text-xs border transition-all ${isActive ? 'bg-[#000066] text-white border-[#000066]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Line Height: {activeElement.properties.lineHeight || '1.6'}</label>
                      <input type="range" min="1" max="3" step="0.1" value={parseFloat(activeElement.properties.lineHeight || '1.6')} onChange={(e) => handleUpdateActiveElement({ lineHeight: e.target.value })} className="w-full" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Padding Y: {activeElement.properties.paddingY || 12}px</label>
                      <input type="range" min="0" max="60" value={activeElement.properties.paddingY || 12} onChange={(e) => handleUpdateActiveElement({ paddingY: Number(e.target.value) })} className="w-full" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Padding X: {activeElement.properties.paddingX || 20}px</label>
                      <input type="range" min="0" max="60" value={activeElement.properties.paddingX || 20} onChange={(e) => handleUpdateActiveElement({ paddingX: Number(e.target.value) })} className="w-full" />
                    </div>
                  </div>
                )}

                {/* --- BUTTON BLOCK PROPERTIES --- */}
                {activeElement.type === 'button' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Label</label>
                      <input type="text" value={activeElement.properties.text || ''} onChange={(e) => handleUpdateActiveElement({ text: e.target.value })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">URL</label>
                      <input type="text" value={activeElement.properties.url || ''} onChange={(e) => handleUpdateActiveElement({ url: e.target.value })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none font-mono" />
                    </div>
                    <ColorPicker value={activeElement.properties.bg || '#4f46e5'} onChange={(v) => handleUpdateActiveElement({ bg: v })} label="Background Color" />
                    <ColorPicker value={activeElement.properties.color || '#ffffff'} onChange={(v) => handleUpdateActiveElement({ color: v })} label="Text Color" />
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Font Size</label>
                      <select value={activeElement.properties.fontSize || '14px'} onChange={(e) => handleUpdateActiveElement({ fontSize: e.target.value })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none">
                        <option value="10px">10px</option>
                        <option value="12px">12px</option>
                        <option value="14px">Regular (14px)</option>
                        <option value="16px">16px</option>
                        <option value="18px">18px</option>
                        <option value="20px">20px</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Border Radius: {activeElement.properties.cornerRadius || 20}px</label>
                      <input type="range" min="0" max="40" value={activeElement.properties.cornerRadius || 20} onChange={(e) => handleUpdateActiveElement({ cornerRadius: Number(e.target.value) })} className="w-full" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Alignment</label>
                      <div className="flex gap-1">
                        {[{ key: 'left', icon: AlignLeft }, { key: 'center', icon: AlignCenter }, { key: 'right', icon: AlignRight }].map(({ key, icon: Icon }) => (
                          <button
                            key={key}
                            onClick={() => handleUpdateActiveElement({ textAlign: key })}
                            className={`p-2 rounded-lg text-xs border transition-all ${activeElement.properties.textAlign === key ? 'bg-[#000066] text-white border-[#000066]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Padding Y: {activeElement.properties.paddingY || 10}px</label>
                      <input type="range" min="0" max="40" value={activeElement.properties.paddingY || 10} onChange={(e) => handleUpdateActiveElement({ paddingY: Number(e.target.value) })} className="w-full" />
                    </div>
                  </div>
                )}

                {/* --- IMAGE BLOCK PROPERTIES --- */}
                {activeElement.type === 'image' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Image URL</label>
                      <textarea rows={2} value={activeElement.properties.imageUrl || ''} onChange={(e) => handleUpdateActiveElement({ imageUrl: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none font-mono" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Upload Image</label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={async (e) => { if (e.target.files?.[0]) await handleFileUpload(e.target.files[0]); }}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-300 rounded-xl p-4 text-xs text-slate-500 hover:border-[#000066] hover:text-[#000066] transition-colors flex flex-col items-center gap-1"
                      >
                        <Upload className="w-5 h-5" />
                        <span className="font-bold">Click to Upload</span>
                        <span className="text-[9px] text-slate-400">PNG, JPG, GIF • Max 10MB</span>
                      </button>
                    </div>
                    {activeElement.properties.imageUrl && (
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Preview</label>
                        <div className="w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center max-h-36">
                          <img src={activeElement.properties.imageUrl} alt="preview" className="max-w-full max-h-36 object-contain" />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Alt Text</label>
                      <input type="text" value={activeElement.properties.altText || ''} onChange={(e) => handleUpdateActiveElement({ altText: e.target.value })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none" placeholder="Describe the image" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Width</label>
                      <select value={activeElement.properties.width || '100%'} onChange={(e) => handleUpdateActiveElement({ width: e.target.value })} className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none">
                        <option value="100%">Full Width (100%)</option>
                        <option value="75%">75%</option>
                        <option value="50%">Half (50%)</option>
                        <option value="25%">25%</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Alignment</label>
                      <div className="flex gap-1">
                        {[{ key: 'left', icon: AlignLeft }, { key: 'center', icon: AlignCenter }, { key: 'right', icon: AlignRight }].map(({ key, icon: Icon }) => (
                          <button
                            key={key}
                            onClick={() => handleUpdateActiveElement({ textAlign: key })}
                            className={`p-2 rounded-lg text-xs border transition-all ${activeElement.properties.textAlign === key ? 'bg-[#000066] text-white border-[#000066]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- HTML BLOCK PROPERTIES --- */}
                {activeElement.type === 'html' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">HTML Code</label>
                      <button
                        onClick={() => {
                          const demoHtml = '<div style="background: linear-gradient(135deg, #0f172a, #1e293b); color: #f8fafc; border: 1px solid #334155; padding: 22px; border-radius: 16px; font-family: sans-serif; text-align: left;">' +
                            '<span style="font-size: 10px; background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 3px 8px; border-radius: 9999px;">Node Notice</span>' +
                            '<h4 style="margin: 12px 0 6px; font-size: 16px; color: #ffffff;">IGI-SMTP Cloud Reboot</h4>' +
                            '<p style="font-size: 12px; color: #94a3b8;">Primary routing protocols in Frankfurt block will migrate.</p>' +
                            '</div>';
                          handleUpdateActiveElement({ htmlScript: demoHtml });
                        }}
                        className="text-[9px] font-bold text-[#4f46e5] hover:underline bg-[#4f46e5]/5 px-2 py-0.5 rounded"
                      >
                        Demo Card
                      </button>
                    </div>
                    <textarea
                      rows={10}
                      value={activeElement.properties.htmlScript || ''}
                      onChange={(e) => handleUpdateActiveElement({ htmlScript: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-3 text-[10px] font-mono focus:ring-2 focus:ring-[#000066]/10 focus:border-[#000066] outline-none bg-slate-900 text-slate-100 placeholder-slate-700 leading-normal"
                      placeholder="<div>Your HTML code here</div>"
                    />
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-[10px] text-slate-400 leading-relaxed">
                      <span className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Developer Guidelines</span>
                      <ul className="list-disc pl-3.5 space-y-1">
                        <li>Include inline styles for reliable email client layouts</li>
                        <li>External widgets, scripts, and inputs are safe to embed here</li>
                      </ul>
                    </div>
                    {activeElement.properties.htmlScript && (
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Live Preview</label>
                        <div className="border border-slate-200 rounded-xl p-4 bg-white">
                          <div dangerouslySetInnerHTML={{ __html: activeElement.properties.htmlScript }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- RICH TEXT BLOCK PROPERTIES --- */}
                {activeElement.type === 'richtext' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rich Text Content</label>
                      <div className="rich-text-property-editor">
                        <RichTextEditor
                          value={activeElement.properties.content || '<p>Rich text content</p>'}
                          onChange={(html) => handleUpdateActiveElement({ content: html })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* --- SPACER BLOCK PROPERTIES --- */}
                {activeElement.type === 'spacer' && (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Height: {activeElement.properties.height || 24}px</label>
                    <input type="range" min="10" max="120" value={activeElement.properties.height || 24} onChange={(e) => handleUpdateActiveElement({ height: Number(e.target.value) })} className="w-full" />
                  </div>
                )}

                {/* --- DIVIDER BLOCK PROPERTIES --- */}
                {activeElement.type === 'divider' && (
                  <div>
                    <ColorPicker value={activeElement.properties.color || '#eaeef7'} onChange={(v) => handleUpdateActiveElement({ color: v })} label="Divider Color" />
                  </div>
                )}

                <button onClick={() => handleRemoveElement(activeElement.id)} className="w-full border border-red-200 text-red-500 py-2 rounded-lg text-xs font-bold uppercase mt-4">Remove Block</button>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-[10px]">Select a block to edit</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* --- WORD-PAD MODE --- */
        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Word-Pad Editor</span>
              <span className="px-2.5 py-1 bg-[#000066]/5 text-[#000066] text-[10px] font-bold rounded-full">
                WYSIWYG
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400 font-medium">
                <span className="font-bold text-slate-600">{wordPadContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length}</span> words
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                <span className="font-bold text-slate-600">{wordPadContent.replace(/<[^>]*>/g, '').length}</span> chars
              </span>
              <button
                type="button"
                onClick={() => setWordPadContent('<p style="font-family: \'Segoe UI\', Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #171c22;">Start typing your email content here...</p>')}
                className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Reset to default"
              >
                Reset
              </button>
            </div>
          </div>
          {/* Inline Word-Pad toolbar */}
          <RichTextEditor value={wordPadContent} onChange={setWordPadContent} />
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>💡 Tip: Use the toolbar above to format your email body. This creates one rich text block for the entire email.</span>
            <span className="text-slate-300">Content is preserved when switching modes</span>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex gap-3 justify-between">
        <button onClick={onCancel} className="border border-slate-200 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest h-11 px-6 rounded hover:bg-slate-50">
          <ChevronLeft className="w-4 h-4 inline mr-1" />
          Cancel
        </button>
        <button onClick={handleSave} className="bg-[#000066] hover:bg-[#000044] text-white font-bold text-xs uppercase tracking-widest h-11 px-8 rounded-full shadow-md">
          <Save className="w-4 h-4 inline mr-1" />
          Save Template
        </button>
      </div>
    </div>
  );
}