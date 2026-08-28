import React, { useEffect, useRef, useState } from 'react';
import { Tag } from 'lucide-react';
import { searchKnownBrands } from '../../services/knownBrands';

interface BrandAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  labelFa?: string;
  placeholder?: string;
  className?: string;
}

/**
 * ورودی برند با تکمیل خودکار از فهرست چند برند شناخته‌شده در ایران.
 *
 * دقیقاً هم‌الگوی CityAutocomplete: لیست پیشنهادها همزمان با تایپ
 * به‌روز می‌شود، ولی چیزی قفل نیست — اگر برند کاربر در فهرست نبود،
 * همچنان می‌تواند هر متنی تایپ و تایید کند.
 */
export const BrandAutocomplete: React.FC<BrandAutocompleteProps> = ({
  value,
  onChange,
  labelFa,
  placeholder = 'مثلاً سینره، لاروش‌پوزای، مای',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = searchKnownBrands(value);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    setHighlightIndex(0);
  }, [value]);

  const selectBrand = (brand: string) => {
    onChange(brand);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectBrand(suggestions[highlightIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {labelFa && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">{labelFa}</label>
      )}
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-autocomplete="list"
        className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold"
      />

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-[#fffdf9] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl max-h-56 overflow-y-auto">
          {suggestions.map((brand, index) => (
            <button
              type="button"
              key={brand}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectBrand(brand)}
              className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-right text-sm font-bold flex items-center gap-2 ${
                index === highlightIndex
                  ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Tag className="w-3.5 h-3.5 shrink-0 opacity-60" />
              {brand}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
