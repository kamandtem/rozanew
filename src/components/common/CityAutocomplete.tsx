import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { searchIranCities } from '../../services/iranCities';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  labelFa?: string;
  placeholder?: string;
  className?: string;
}

/**
 * ورودی شهر با تکمیل خودکار از فهرست شهرهای ایران.
 *
 * هدف: جلوگیری از غلط تایپی در اسم شهر (که باعث می‌شد آب‌وهوا و توصیه‌های
 * مرتبط با آفتاب/رطوبت پیدا نشوند). لیست پیشنهادها همزمان با تایپ کاربر
 * به‌روز می‌شود، درست مثل اتوکامپلیت آدرس در اپ‌های نقشه؛ اما کاملاً
 * آفلاین است. اگر شهر کاربر در فهرست نباشد، همچنان می‌تواند متن دلخواه
 * را تایپ و تایید کند — چیزی قفل نمی‌شود.
 */
export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  onChange,
  labelFa = 'شهر',
  placeholder = 'مثلاً تهران',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = searchIranCities(value);

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

  const selectCity = (city: string) => {
    onChange(city);
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
      selectCity(suggestions[highlightIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {labelFa && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">{labelFa}</label>
      )}
      <div className="relative">
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
          className="w-full py-3 pr-4 pl-9 rounded-2xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/60 dark:border-slate-700/60 text-sm font-bold"
        />
        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-[#fffdf9] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl max-h-56 overflow-y-auto">
          {suggestions.map((city, index) => (
            <button
              type="button"
              key={city}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectCity(city)}
              className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-right text-sm font-bold flex items-center gap-2 ${
                index === highlightIndex
                  ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0 opacity-60" />
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
