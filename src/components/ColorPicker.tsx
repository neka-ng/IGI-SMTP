import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const presetColors = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
  '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
  '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130',
];

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</label>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-9 h-9 rounded-lg border border-slate-200 shadow-sm cursor-pointer flex-shrink-0"
          style={{ backgroundColor: value || '#000000' }}
          title="Pick a color"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-slate-200 rounded-lg h-9 px-2 text-xs outline-none font-mono"
          placeholder="#000000"
        />
      </div>
      {isOpen && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 z-50 w-[232px]">
          <div className="grid grid-cols-10 gap-1">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => { onChange(color); setCustomColor(color); setIsOpen(false); }}
                className={`w-5 h-5 rounded border cursor-pointer hover:scale-125 transition-transform ${
                  value === color ? 'ring-2 ring-[#000066] ring-offset-1' : 'border-slate-200'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
            <input
              type="color"
              value={customColor}
              onChange={(e) => { setCustomColor(e.target.value); onChange(e.target.value); }}
              className="w-8 h-8 p-0 border-0 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-slate-500">{customColor}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;