import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCircle2, Clock3, Plus, Trash2 } from 'lucide-react';
import { LocalDB, createId } from '../../services/db';
import { formatJalaliDate, getTodayIsoDate, toPersianDigits } from '../../services/jalali';
import { Routine, RoutineStep } from '../../types';
import { loadRoutine, toggleStep } from '../../services/routineService';
import { JalaliDatePicker } from '../common/JalaliDatePicker';

export const PersonalRoutineView: React.FC = () => {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('10');
  const [time, setTime] = useState('');
  const [repeat, setRepeat] = useState<'today' | 'daily' | 'date'>('today');
  const [date, setDate] = useState(getTodayIsoDate());

  const refresh = () => {
    const saved = LocalDB.getRoutine(getTodayIsoDate(), 'morning');
    setRoutine(saved || loadRoutine(getTodayIsoDate(), 'morning', []));
  };
  useEffect(() => { refresh(); }, []);

  const add = () => {
    if (!title.trim() || !routine) return;
    const step: RoutineStep = {
      id: createId('personal_step'),
      titleFa: title.trim(),
      category: 'treatment',
      completed: false,
      timeSeconds: Math.max(60, Number(minutes || 10) * 60),
      descriptionFa: repeat === 'daily' ? 'هر روز' : repeat === 'date' ? `برای تاریخ ${formatJalaliDate(date)}` : 'امروز',
      isCustom: true,
      reasonFa: 'برنامه شخصی تو',
    };
    const updated = { ...routine, steps: [...routine.steps, step] };
    LocalDB.saveRoutine(updated);
    setRoutine(updated);
    setTitle('');
  };

  const remove = (id: string) => {
    if (!routine) return;
    const updated = { ...routine, steps: routine.steps.filter((step) => step.id !== id) };
    LocalDB.saveRoutine(updated);
    setRoutine(updated);
  };

  return (
    <div className="pb-[calc(var(--safe-bottom)+10rem)] pt-4 px-4 max-w-lg mx-auto space-y-4">
      <div className="p-5 rounded-[2rem] bg-gradient-to-br from-[#fff2ea] to-[#eef3fa] border border-[#f0e1d6]">
        <h2 className="text-xl font-black text-[#263b56]">روتین پوستی من</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">کارهای شخصی مراقبت از پوستت را اضافه کن. برای هرکدام می‌توانی زمان و تکرار بگذاری.</p>
      </div>

      <div className="p-4 rounded-[1.7rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="مثلاً ماسک آبرسان"
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-bold"
        />

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-slate-500">
            مدت به دقیقه
            <input
              value={minutes}
              onChange={(event) => setMinutes(event.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-3 text-sm font-bold"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            ساعت یادآوری
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-3 text-sm font-bold"
            />
          </label>
        </div>

        {/*
          تکرار — قبلاً یک select خام بود. حالا مثل تکه‌های انتخاب ترکیب
          در فرم «قفسه محصولات» (رنگ توپر رزی + تیک وقتی انتخاب می‌شود)
          حالت جذاب و لمسی دارد. چون این تکه‌ها جای select قبلی را
          گرفته‌اند و خودشان چند دکمه‌اند، عرضشان از قبل جمع‌وجورتر شد؛
          دکمه «ثبت» کنارشان هم دیگر آیکن تنها نیست و برچسب دارد.
        */}
        <div className="flex items-center gap-2">
          <div className="flex-1 grid grid-cols-3 gap-1.5">
            {(
              [
                { value: 'today' as const, label: 'امروز' },
                { value: 'daily' as const, label: 'هر روز' },
                { value: 'date' as const, label: 'تاریخ دلخواه' },
              ]
            ).map((option) => {
              const isOn = repeat === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRepeat(option.value)}
                  className={`min-h-[44px] px-1.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 text-center transition-colors ${
                    isOn
                      ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isOn && <Check className="w-3.5 h-3.5 shrink-0" />}
                  {option.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={add}
            disabled={!title.trim()}
            className="shrink-0 h-11 px-4 rounded-xl bg-[#263b56] text-white disabled:opacity-40 text-sm font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            ثبت
          </button>
        </div>

        {repeat === 'date' && <JalaliDatePicker labelFa="تاریخ انجام" value={date} onChange={setDate} allowPast />}

        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5" /> ساعت یادآوری برای اعلان‌های محلی ذخیره می‌شود.
        </p>
      </div>

      <div className="space-y-2">
        {routine?.steps.filter((step) => step.isCustom).map((step) => (
          <div
            key={step.id}
            className={`p-4 rounded-2xl border flex items-center gap-3 ${step.completed ? 'bg-emerald-50 border-emerald-200' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}
          >
            <button
              onClick={() => { if (routine) setRoutine(toggleStep(routine, step.id)); }}
              className={`icon-only w-9 h-9 rounded-xl flex items-center justify-center ${step.completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
            >
              {step.completed ? <Check className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </button>
            <div className="flex-1">
              <p className={`text-sm font-bold ${step.completed ? 'line-through opacity-60' : 'text-slate-700 dark:text-slate-200'}`}>{step.titleFa}</p>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Clock3 className="w-3.5 h-3.5" />
                {toPersianDigits(Math.round((step.timeSeconds || 600) / 60))} دقیقه · {step.descriptionFa}
              </p>
            </div>
            <button onClick={() => remove(step.id)} className="icon-only p-2 text-slate-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
