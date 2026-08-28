import React from 'react';
import { AlertTriangle, CloudDrizzle, Droplet, Layers, Smile, Wind, type LucideIcon } from 'lucide-react';
import { SkinType } from '../../types';

interface SkinTypeItem {
  type: SkinType;
  titleFa: string;
  hintFa: string;
}

interface SkinTypeGridProps {
  items: SkinTypeItem[];
  value: SkinType;
  onChange: (type: SkinType) => void;
}

const ICONS: Record<SkinType, LucideIcon> = {
  combination: Layers,
  oily: Droplet,
  dry: Wind,
  sensitive: AlertTriangle,
  dehydrated: CloudDrizzle,
  normal: Smile,
};

/**
 * لیست عمودی قبلی (۶ دکمه بلند با توضیح کامل) کل ارتفاع صفحه را می‌گرفت
 * و جایی برای تصویرسازی بالای مرحله نمی‌ماند. این گرید ۲ ستونی فقط
 * آیکون + عنوان کوتاه را نشان می‌دهد؛ توضیح کامل (hintFa) در همین آرایه
 * می‌ماند تا هر جای دیگری از اپ (مثلاً پروفایل) بخواهد کامل نشانش دهد.
 */
export const SkinTypeGrid: React.FC<SkinTypeGridProps> = ({ items, value, onChange }) => (
  <div className="grid grid-cols-2 gap-2.5">
    {items.map((item) => {
      const Icon = ICONS[item.type];
      const active = value === item.type;
      return (
        <button
          key={item.type}
          type="button"
          onClick={() => onChange(item.type)}
          className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl border text-center transition-all ${
            active
              ? 'bg-[#8e5241] text-white border-[#8e5241]'
              : 'bg-white/40 dark:bg-slate-800/50 backdrop-blur-md text-[#5c4a3e] dark:text-slate-300 border-white/60 dark:border-slate-700/60'
          }`}
        >
          <Icon className="w-5 h-5" />
          <span className="text-sm font-black">{item.titleFa}</span>
        </button>
      );
    })}
  </div>
);
