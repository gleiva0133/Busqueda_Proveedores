import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Filter } from 'lucide-react';

interface MultiSelectFilterProps {
  label: string;
  options: (string | number)[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Todas'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const stringOptions = options.map(o => String(o));

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = stringOptions.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAllSelected = selectedValues.length === 0 || selectedValues.length === options.length;

  const handleToggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      const next = selectedValues.filter(v => v !== value);
      onChange(next);
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleSelectAll = () => {
    onChange([]); // Empty means "ALL" selected by default
  };

  const handleClearAll = () => {
    onChange(['__NONE__']); // Force no selection if needed, or clear
  };

  const getButtonText = () => {
    if (selectedValues.length === 0) {
      return `${placeholder} (${options.length})`;
    }
    if (selectedValues.length === 1) {
      return selectedValues[0];
    }
    if (selectedValues.length === options.length) {
      return `Todas (${options.length})`;
    }
    return `${selectedValues.length} seleccionados`;
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="block text-slate-400 text-[11px] mb-1 font-medium flex items-center justify-between">
        <span>{label}</span>
        {selectedValues.length > 0 && selectedValues[0] !== '__NONE__' && (
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-[10px] text-amber-400 hover:underline"
          >
            Restablecer
          </button>
        )}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 hover:border-amber-500/50 rounded-xl text-xs text-left text-slate-200 flex items-center justify-between transition focus:outline-none focus:border-amber-500"
      >
        <span className="truncate pr-2">{getButtonText()}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-2.5 text-xs space-y-2 max-h-64 overflow-y-auto">
          {options.length > 6 && (
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 mb-1"
            />
          )}

          <div className="flex items-center justify-between pt-0.5 pb-1.5 border-b border-slate-800 text-[10px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className={`font-semibold ${isAllSelected ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
            >
              ✓ Seleccionar Todos
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-slate-400 hover:text-rose-400"
            >
              Limpiar
            </button>
          </div>

          <div className="space-y-1">
            {filteredOptions.map(opt => {
              const isChecked = selectedValues.length === 0 || selectedValues.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded-lg cursor-pointer text-slate-200 transition"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleOption(opt)}
                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                  />
                  <span className="truncate text-xs">{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
