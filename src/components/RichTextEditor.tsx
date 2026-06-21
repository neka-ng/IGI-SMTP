import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CustomFont } from '../types';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// Predefined font size options
const FONT_SIZES = ['8px','9px','10px','11px','12px','13px','14px','15px','16px','18px','20px','22px','24px','26px','28px','32px','36px','40px','48px','56px','64px','72px'];

// System fonts available by default
const SYSTEM_FONTS = [
  { name: 'Segoe UI', family: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif' },
  { name: 'Arial', family: 'Arial, Helvetica, sans-serif' },
  { name: 'Verdana', family: 'Verdana, Geneva, sans-serif' },
  { name: 'Tahoma', family: 'Tahoma, Geneva, sans-serif' },
  { name: 'Trebuchet MS', family: "'Trebuchet MS', 'Lucida Sans Unicode', sans-serif" },
  { name: 'Times New Roman', family: "'Times New Roman', Times, serif" },
  { name: 'Georgia', family: 'Georgia, serif' },
  { name: 'Garamond', family: 'Garamond, serif' },
  { name: 'Courier New', family: "'Courier New', Courier, monospace" },
  { name: 'Lucida Console', family: "'Lucida Console', Monaco, monospace" },
  { name: 'Impact', family: 'Impact, Haettenschweiler, sans-serif' },
  { name: 'Comic Sans MS', family: "'Comic Sans MS', cursive, sans-serif" },
];

const LINE_HEIGHTS = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.5, 3.0];

type ToolbarSection = 'basic' | 'heading' | 'list' | 'align' | 'insert' | 'history';

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showAddFontDialog, setShowAddFontDialog] = useState(false);
  const [newFontName, setNewFontName] = useState('');
  const [newFontFamily, setNewFontFamily] = useState('');
  const [newFontUrl, setNewFontUrl] = useState('');
  const [newFontCategory, setNewFontCategory] = useState('sans-serif');
  const [activeFont, setActiveFont] = useState('Segoe UI');
  const [activeFontSize, setActiveFontSize] = useState('15px');
  const [activeLineHeight, setActiveLineHeight] = useState(1.6);
  const [imageWidth, setImageWidth] = useState('100%');
  const [imageAlign, setImageAlign] = useState('center');
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    orderedList: false,
    unorderedList: false,
    justifyLeft: true,
    justifyCenter: false,
    justifyRight: false,
  });
  const fontPickerRef = useRef<HTMLDivElement>(null);
  const sizePickerRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const bgColorPickerRef = useRef<HTMLDivElement>(null);

  // Load custom fonts from backend
  useEffect(() => {
    fetch('/api/fonts')
      .then(res => res.json())
      .then((fonts: CustomFont[]) => {
        setCustomFonts(fonts.filter(f => f.isActive));
        // Inject active custom fonts as <style>
        const styleId = 'rte-custom-fonts';
        const existing = document.getElementById(styleId);
        if (existing) existing.remove();
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = fonts
          .filter(f => f.isActive && f.url)
          .map(f => `@font-face { font-family: '${f.family}'; src: url('${f.url}') format('${f.format}'); font-weight: ${f.weight}; font-style: ${f.style}; }`)
          .join('\n');
        document.head.appendChild(style);
      })
      .catch(() => {});
  }, []);

  // Initialize editor content when value changes externally
  useEffect(() => {
    if (editorRef.current && value && !isInitialized) {
      editorRef.current.innerHTML = value;
      setIsInitialized(true);
    }
  }, [value, isInitialized]);

  // Update parent when content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Track active formatting
  const updateActiveFormatting = useCallback(() => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    
    // Check font name
    const fontName = document.queryCommandValue('fontName');
    if (fontName) {
      const matched = SYSTEM_FONTS.find(f => f.family.includes(fontName) || fontName.includes(f.name));
      if (matched) setActiveFont(matched.name);
    }

    // Check font size
    const fontSize = document.queryCommandValue('fontSize');
    if (fontSize) {
      const sizeMap: Record<string, string> = { '1': '10px', '2': '13px', '3': '15px', '4': '18px', '5': '24px', '6': '32px', '7': '48px' };
      setActiveFontSize(sizeMap[fontSize] || '15px');
    }
  }, []);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleInput();
    editorRef.current?.focus();
    updateActiveFormatting();
  }, [handleInput, updateActiveFormatting]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'b' || key === 'i' || key === 'u') {
        e.preventDefault();
        exec(key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'underline');
        return;
      }
      if (key === 'y') { e.preventDefault(); exec('redo'); return; }
      if (key === 'z') {
        e.preventDefault();
        exec(e.shiftKey ? 'redo' : 'undo');
        return;
      }
      if (key === 'k') { e.preventDefault(); setShowLinkDialog(true); return; }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      exec(e.shiftKey ? 'outdent' : 'indent');
    }
  }, [exec]);

  const handleFontSelect = useCallback((family: string) => {
    exec('fontName', family);
    setShowFontPicker(false);
    setActiveFont(family.split(',')[0].replace(/['"]/g, '').trim());
  }, [exec]);

  const handleSizeSelect = useCallback((size: string) => {
    const sizeMap: Record<string, string> = { '8px': '1','9px': '1','10px': '1','11px': '1','12px': '2','13px': '2','14px': '2','15px': '3','16px': '3','18px': '4','20px': '4','22px': '4','24px': '5','26px': '5','28px': '5','32px': '6','36px': '6','40px': '6','48px': '7','56px': '7','64px': '7','72px': '7' };
    exec('fontSize', sizeMap[size] || '3');
    setActiveFontSize(size);
    setShowSizePicker(false);
  }, [exec]);

  const handleInsertLink = useCallback(() => {
    if (linkUrl) {
      const fullLink = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      exec('createLink', fullLink);
      setShowLinkDialog(false);
      setLinkUrl('');
      setLinkText('');
    }
  }, [linkUrl, exec]);

  const handleInsertImage = useCallback(async () => {
    let url = imageUrl;
    if (imageFile) {
      try {
        const arrayBuffer = await imageFile.arrayBuffer();
        const res = await fetch(`/api/upload?filetype=${encodeURIComponent(file.type || 'application/octet-stream')}`, {
          method: 'POST',
          body: new Uint8Array(arrayBuffer),
          headers: { 'Content-Type': 'application/octet-stream' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.url) url = data.url;
        }
      } catch (e) {
        console.warn('Image upload failed', e);
      }
    }
    if (url) {
      const alignStyle = imageAlign === 'center' ? 'display:block;margin:0 auto;' : imageAlign === 'right' ? 'display:block;margin-left:auto;' : 'display:block;margin-right:auto;';
      exec('insertHTML', `<img src="${url}" style="max-width:${imageWidth};height:auto;${alignStyle}border-radius:8px;" alt="image" />`);
    }
    setShowImageDialog(false);
    setImageUrl('');
    setImageFile(null);
    setImageWidth('100%');
    setImageAlign('center');
  }, [imageUrl, imageFile, imageWidth, imageAlign, exec]);

  const handleAddCustomFont = useCallback(async () => {
    if (!newFontName || !newFontFamily) return;
    try {
      const res = await fetch('/api/fonts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFontName,
          family: newFontFamily,
          url: newFontUrl || undefined,
          category: newFontCategory,
        }),
      });
      if (!res.ok) throw new Error('Failed to add font');
      const font = await res.json();
      setCustomFonts(prev => [...prev, font]);
      // Inject @font-face if URL provided
      if (newFontUrl) {
        const styleId = 'rte-custom-fonts';
        const existing = document.getElementById(styleId);
        if (existing) existing.remove();
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `@font-face { font-family: '${newFontFamily}'; src: url('${newFontUrl}') format('woff2'); font-weight: normal; font-style: normal; }`;
        document.head.appendChild(style);
      }
      setShowAddFontDialog(false);
      setNewFontName('');
      setNewFontFamily('');
      setNewFontUrl('');
    } catch (err: any) {
      console.error('Failed to add custom font:', err);
    }
  }, [newFontName, newFontFamily, newFontUrl, newFontCategory]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fontPickerRef.current && !fontPickerRef.current.contains(e.target as Node)) setShowFontPicker(false);
      if (sizePickerRef.current && !sizePickerRef.current.contains(e.target as Node)) setShowSizePicker(false);
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) setShowColorPicker(false);
      if (bgColorPickerRef.current && !bgColorPickerRef.current.contains(e.target as Node)) setShowBgColorPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get the current selection text for link dialog
  const handleOpenLinkDialog = useCallback(() => {
    const sel = window.getSelection();
    setLinkText(sel?.toString() || '');
    setLinkUrl('');
    setShowLinkDialog(true);
  }, []);

  // Toolbar button component
  const ToolbarBtn = ({ onClick, title, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`px-1.5 py-1 text-xs rounded hover:bg-slate-200 transition-colors min-w-[28px] text-center leading-tight ${
        active ? 'bg-slate-200 text-slate-900 shadow-inner' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );

  // Color swatches for quick pick
  const SWATCHES = ['#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#d9d9d9','#efefef','#f3f3f3','#ffffff','#980000','#ff0000','#ff9900','#ffff00','#00ff00','#00ffff','#4a86e8','#0000ff','#9900ff','#ff00ff','#e6b8af','#f4cccc','#fce5cd','#fff2cc','#d9ead3','#d0e0e3','#c9daf8','#cfe2f3','#d9d2e9','#ead1dc','#dd7e6b','#ea9999','#f9cb9c','#ffe599','#b6d7a8','#a2c4c9','#a4c2f4','#9fc5e8','#b4a7d6','#d5a6bd','#cc4125','#e06666','#f6b26b','#ffd966','#93c47d','#76a5af','#6d9eeb','#6fa8dc','#8e7cc3','#c27ba0','#a61c00','#cc0000','#e69138','#f1c232','#6aa84f','#45818e','#3c78d8','#3d85c6','#674ea7','#a64d79','#85200c','#990000','#b45f06','#bf9000','#38761d','#134f5c','#1155cc','#0b5394','#351c75','#741b47','#5b0f00','#660000','#783f04','#7f6000','#274e13','#0c343d','#1c4587','#073763','#20124d','#4c1130'];

  // Color picker popup
  const ColorPickerPopup = ({ onSelect, onClose }: { onSelect: (color: string) => void; onClose: () => void }) => (
    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 w-[230px]">
      <div className="grid grid-cols-10 gap-1">
        {SWATCHES.map((color, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { onSelect(color); onClose(); }}
            className="w-5 h-5 rounded border border-slate-100 hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1 pt-2 border-t border-slate-100">
        <span className="text-[9px] text-slate-400">Custom:</span>
        <input
          type="color"
          onChange={(e) => { onSelect(e.target.value); onClose(); }}
          className="w-7 h-7 p-0 border-0 cursor-pointer"
        />
      </div>
    </div>
  );

  return (
    <div className="rich-text-editor border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Toolbar - Modern design with grouped sections */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-slate-50 border-b border-slate-200 select-none">
        
        {/* Font Family */}
        <div ref={fontPickerRef} className="relative">
          <button
            type="button"
            title="Font Family"
            onClick={() => setShowFontPicker(!showFontPicker)}
            className="px-2 py-1 text-[11px] font-medium rounded hover:bg-slate-200 text-slate-700 min-w-[90px] text-left truncate flex items-center gap-1"
          >
            <svg className="w-3 h-3 opacity-50 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
            <span className="truncate">{activeFont}</span>
          </button>
          {showFontPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-[200px] max-h-[280px] overflow-y-auto">
              <div className="p-1.5 border-b border-slate-100">
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-2 py-1">System Fonts</div>
                {SYSTEM_FONTS.map((font) => (
                  <button
                    key={font.name}
                    type="button"
                    onClick={() => handleFontSelect(font.family)}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 transition-colors ${activeFont === font.name ? 'bg-slate-100 text-[#000066] font-semibold' : 'text-slate-700'}`}
                    style={{ fontFamily: font.family }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
              {customFonts.length > 0 && (
                <div className="p-1.5 border-b border-slate-100">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-2 py-1">Custom Fonts</div>
                  {customFonts.map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => handleFontSelect(font.family)}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 transition-colors ${activeFont === font.name ? 'bg-slate-100 text-[#000066] font-semibold' : 'text-slate-700'}`}
                      style={{ fontFamily: font.family }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddFontDialog(true)}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-[#4f46e5] hover:bg-indigo-50 rounded-lg font-medium"
                >
                  + Add Custom Font
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Font Size */}
        <div ref={sizePickerRef} className="relative">
          <button
            type="button"
            title="Font Size"
            onClick={() => setShowSizePicker(!showSizePicker)}
            className="px-2 py-1 text-[11px] font-medium rounded hover:bg-slate-200 text-slate-700 min-w-[50px] text-center"
          >
            {activeFontSize}
          </button>
          {showSizePicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-[80px] max-h-[220px] overflow-y-auto">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSizeSelect(size)}
                  className={`w-full text-center px-2 py-1 text-xs hover:bg-slate-100 transition-colors ${activeFontSize === size ? 'bg-slate-100 text-[#000066] font-semibold' : 'text-slate-700'}`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Text Color */}
        <div ref={colorPickerRef} className="relative">
          <button
            type="button"
            title="Text Color"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="px-1.5 py-1 rounded hover:bg-slate-200 transition-colors relative"
          >
            <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4L4 20h2l1.5-4h9L18 20h2L13 4h-2zm-3 12l3.5-9.5L15 16H8z"/></svg>
          </button>
          {showColorPicker && (
            <ColorPickerPopup
              onSelect={(color) => { exec('foreColor', color); }}
              onClose={() => setShowColorPicker(false)}
            />
          )}
        </div>

        {/* Background Color */}
        <div ref={bgColorPickerRef} className="relative">
          <button
            type="button"
            title="Highlight / Background Color"
            onClick={() => setShowBgColorPicker(!showBgColorPicker)}
            className="px-1.5 py-1 rounded hover:bg-slate-200 transition-colors relative"
          >
            <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M8 2l4 4M2 7l4-4m4 12l6-6-4-4-6 6 4 4z"/></svg>
          </button>
          {showBgColorPicker && (
            <ColorPickerPopup
              onSelect={(color) => { exec('hiliteColor', color); }}
              onClose={() => setShowBgColorPicker(false)}
            />
          )}
        </div>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Basic formatting */}
        <ToolbarBtn onClick={() => exec('bold')} title="Bold (Ctrl+B)" active={formatState.bold}>
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('italic')} title="Italic (Ctrl+I)" active={formatState.italic}>
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('underline')} title="Underline (Ctrl+U)" active={formatState.underline}>
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('strikeThrough')} title="Strikethrough" active={formatState.strike}>
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('superscript')} title="Superscript">
          <span className="text-[10px] font-bold">X<sup>2</sup></span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('subscript')} title="Subscript">
          <span className="text-[10px] font-bold">X<sub>2</sub></span>
        </ToolbarBtn>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Headings */}
        <ToolbarBtn onClick={() => exec('formatBlock', '<h1>')} title="Heading 1">
          <span className="text-[11px] font-bold">H1</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('formatBlock', '<h2>')} title="Heading 2">
          <span className="text-[11px] font-bold">H2</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('formatBlock', '<h3>')} title="Heading 3">
          <span className="text-[11px] font-bold">H3</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('formatBlock', '<h4>')} title="Heading 4">
          <span className="text-[10px] font-bold">H4</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('formatBlock', '<p>')} title="Paragraph">
          <span className="text-[10px] font-medium">P</span>
        </ToolbarBtn>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Lists */}
        <ToolbarBtn onClick={() => exec('insertUnorderedList')} title="Bullet List" active={formatState.unorderedList}>
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('insertOrderedList')} title="Numbered List" active={formatState.orderedList}>
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
        </ToolbarBtn>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Indent/Outdent */}
        <ToolbarBtn onClick={() => exec('indent')} title="Increase Indent">
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('outdent')} title="Decrease Indent">
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M11 7h10v2H11V7zm0 4h10v2H11v-2zm0 4h10v2H11v-2zM3 3v2h18V3H3zm0 8v8l4-4-4-4z"/></svg>
        </ToolbarBtn>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Alignment */}
        <ToolbarBtn onClick={() => exec('justifyLeft')} title="Align Left" active={formatState.justifyLeft}>
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('justifyCenter')} title="Align Center" active={formatState.justifyCenter}>
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('justifyRight')} title="Align Right" active={formatState.justifyRight}>
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg>
        </ToolbarBtn>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Line Height */}
        <div className="relative group">
          <button
            type="button"
            title="Line Height"
            className="px-1.5 py-1 text-[10px] rounded hover:bg-slate-200 text-slate-600 transition-colors font-medium"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3" y2="18"/><polyline points="3 8 5 6 3 4"/></svg>
          </button>
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 hidden group-hover:block min-w-[100px]">
            {LINE_HEIGHTS.map((lh) => (
              <button
                key={lh}
                type="button"
                onClick={() => { exec('lineHeight', String(lh)); setActiveLineHeight(lh); }}
                className={`w-full text-left px-3 py-1 text-xs hover:bg-slate-100 ${activeLineHeight === lh ? 'bg-slate-100 text-[#000066]' : 'text-slate-700'}`}
              >
                {lh}x
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Insert Link */}
        <ToolbarBtn onClick={handleOpenLinkDialog} title="Insert Link (Ctrl+K)">
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </ToolbarBtn>

        {/* Insert Table */}
        <ToolbarBtn onClick={() => exec('insertHTML', '<table style="border-collapse:collapse;width:100%;margin:8px 0;"><tbody><tr><td style="border:1px solid #ccc;padding:8px;">&nbsp;</td><td style="border:1px solid #ccc;padding:8px;">&nbsp;</td><td style="border:1px solid #ccc;padding:8px;">&nbsp;</td></tr><tr><td style="border:1px solid #ccc;padding:8px;">&nbsp;</td><td style="border:1px solid #ccc;padding:8px;">&nbsp;</td><td style="border:1px solid #ccc;padding:8px;">&nbsp;</td></tr></tbody></table>')} title="Insert Table (3x3)">
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        </ToolbarBtn>

        {/* Insert Image */}
        <ToolbarBtn onClick={() => setShowImageDialog(true)} title="Insert Image">
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </ToolbarBtn>

        {/* Code Block */}
        <ToolbarBtn onClick={() => exec('formatBlock', '<pre>')} title="Code Block">
          <span className="text-[11px] font-mono font-bold">{'</>'}</span>
        </ToolbarBtn>

        {/* Blockquote */}
        <ToolbarBtn onClick={() => exec('formatBlock', '<blockquote>')} title="Blockquote">
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z"/></svg>
        </ToolbarBtn>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Undo / Redo */}
        <ToolbarBtn onClick={() => exec('undo')} title="Undo (Ctrl+Z)">
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('redo')} title="Redo (Ctrl+Y)">
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </ToolbarBtn>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Clear Formatting */}
        <ToolbarBtn onClick={() => exec('removeFormat')} title="Clear Formatting">
          <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 4l-4 16m4-16l4 16M6 8h4m10 4h-4"/></svg>
        </ToolbarBtn>
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="flex items-center gap-2 p-2 bg-slate-100 border-b border-slate-200 text-xs">
          <span className="text-slate-500 font-medium text-[10px] uppercase tracking-wider">Link:</span>
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#000066]/20"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleInsertLink(); if (e.key === 'Escape') setShowLinkDialog(false); }}
          />
          <button onClick={handleInsertLink} className="bg-[#000066] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase">Apply</button>
          <button onClick={() => setShowLinkDialog(false)} className="text-slate-400 px-2 py-1.5 hover:text-slate-600">Cancel</button>
        </div>
      )}

      {/* Image Dialog */}
      {showImageDialog && (
        <div className="p-3 bg-slate-100 border-b border-slate-200 text-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium text-[10px] uppercase tracking-wider w-16">Image URL:</span>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#000066]/20"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleInsertImage(); if (e.key === 'Escape') setShowImageDialog(false); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium text-[10px] uppercase tracking-wider w-16">Upload:</span>
            <input
              type="file"
              accept="image/*"
              className="text-[11px]"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImageFile(file);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium text-[10px] uppercase tracking-wider w-16">Width:</span>
            <select
              value={imageWidth || '100%'}
              onChange={(e) => setImageWidth(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none"
            >
              <option value="100%">Full Width</option>
              <option value="75%">75%</option>
              <option value="50%">50%</option>
              <option value="25%">25%</option>
              <option value="auto">Auto</option>
            </select>
            <span className="text-slate-500 font-medium text-[10px] uppercase tracking-wider w-16">Align:</span>
            <select
              value={imageAlign || 'center'}
              onChange={(e) => setImageAlign(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowImageDialog(false); setImageUrl(''); setImageFile(null); setImageWidth('100%'); setImageAlign('center'); }} className="text-slate-400 px-3 py-1.5 hover:text-slate-600 text-[10px] font-bold uppercase">Cancel</button>
            <button onClick={handleInsertImage} className="bg-[#000066] text-white px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase">Insert Image</button>
          </div>
        </div>
      )}

      {/* Custom Font Dialog */}
      {showAddFontDialog && (
        <div className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center" onClick={() => setShowAddFontDialog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[380px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Custom Font</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Font Name</label>
                <input type="text" value={newFontName} onChange={(e) => setNewFontName(e.target.value)} placeholder="e.g. Open Sans" className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none focus:ring-2 focus:ring-[#000066]/10" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">CSS Font Family</label>
                <input type="text" value={newFontFamily} onChange={(e) => setNewFontFamily(e.target.value)} placeholder="e.g. 'Open Sans', sans-serif" className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none focus:ring-2 focus:ring-[#000066]/10 font-mono" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Font URL (optional)</label>
                <input type="text" value={newFontUrl} onChange={(e) => setNewFontUrl(e.target.value)} placeholder="https://fonts.cdn... /woff2 URL" className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none focus:ring-2 focus:ring-[#000066]/10 font-mono" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Category</label>
                <select value={newFontCategory} onChange={(e) => setNewFontCategory(e.target.value)} className="w-full border border-slate-200 rounded-lg h-9 px-3 text-xs outline-none">
                  <option value="sans-serif">Sans Serif</option>
                  <option value="serif">Serif</option>
                  <option value="monospace">Monospace</option>
                  <option value="display">Display</option>
                  <option value="handwriting">Handwriting</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowAddFontDialog(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button
                onClick={handleAddCustomFont}
                disabled={!newFontName || !newFontFamily}
                className="px-5 py-2 text-xs font-bold text-white bg-[#000066] rounded-lg hover:bg-[#000044] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Font
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={updateActiveFormatting}
        className="p-4 min-h-[180px] max-h-[400px] overflow-y-auto text-sm text-slate-800 outline-none focus:ring-1 focus:ring-[#000066]/10 leading-relaxed"
        data-placeholder="Start typing your rich text content here..."
      />
    </div>
  );
};

export default RichTextEditor;