import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { verifyPin } from '../../services/security/appLock';
import { toPersianDigits } from '../../services/jalali';

interface LockScreenProps {
  onUnlock: () => void;
}

/**
 * قفل ورود.
 *
 * داده چرخه، عکس صورت و پرونده پزشکی حساس‌ترین داده یک نفر است
 * و گوشی در خانواده دست به دست می‌شود. نسخه ۱ هیچ قفلی نداشت.
 */
export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await verifyPin(pin);
    if (result.ok) {
      onUnlock();
      return;
    }
    setPin('');
    setRemaining(result.remainingAttempts);
    setError('رمز اشتباه است.');
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-slate-950 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500 text-white flex items-center justify-center mx-auto shadow-lg">
          <Lock className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h1 className="text-lg font-black text-slate-800 dark:text-white">رمز رزا را وارد کنید</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">این رمز فقط روی همین گوشی ذخیره شده است.</p>
        </div>

        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\D/g, '').slice(0, 8));
            setError(null);
          }}
          placeholder="رمز عددی"
          className="w-full py-4 px-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-center text-xl font-black tracking-[0.5em] focus:outline-none focus:border-rose-400"
        />

        {error && (
          <p className="text-sm font-bold text-rose-600">
            {error}
            {remaining !== null && remaining > 0 && ` ${toPersianDigits(remaining)} تلاش باقی مانده.`}
          </p>
        )}

        <button
          type="submit"
          disabled={pin.length < 4}
          className="w-full py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-extrabold text-sm active:scale-95 transition-all"
        >
          باز کردن
        </button>

        <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 pt-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          رمز قابل بازیابی نیست. فراموشی رمز به معنای پاک شدن داده‌هاست.
        </p>
      </form>
    </div>
  );
};
