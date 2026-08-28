import React from 'react';
import { getGuideTier, useGuideProgress } from '../../services/guide/guideProgress';

interface GuideBadgeProps {
  onClick: () => void;
  className?: string;
}

/**
 * بج سطح کاربر در راهنما — کنار نام کاربر در منوی اصلی.
 * روی هر Level ای که کاربر واقعاً وارد شده (یعنی Level قبلش را کامل کرده) می‌ایستد.
 *
 * قبلاً یک پیل با پس‌زمینه گرادیانت بود؛ حالا فقط متن رنگی (بدون باکس/پس‌زمینه)
 * تا کنار «روز بخیر» و اسم کاربر، سه ردیف سبک و هم‌قواره بمانند.
 */
export const GuideBadge: React.FC<GuideBadgeProps> = ({ onClick, className = '' }) => {
  const progress = useGuideProgress();
  const tier = getGuideTier(progress);

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center self-start leading-none text-[11px] font-black text-[#c8862c] dark:text-amber-400 active:opacity-60 transition-opacity ${className}`}
    >
      <span className="truncate max-w-[130px]">{tier.labelFa}</span>
    </button>
  );
};
