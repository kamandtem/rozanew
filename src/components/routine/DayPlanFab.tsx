import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Clock3, Plus, X } from 'lucide-react';
import { LocalDB, createId } from '../../services/db';
import { getTodayIsoDate, toPersianDigits } from '../../services/jalali';
import { Routine, RoutineStep } from '../../types';
import { loadRoutine, toggleStep } from '../../services/routineService';

/** دکمه شناور برای ساخت برنامه شخصی همان روز، با رفتار شبیه پنل اهداف مرجع. */
export const DayPlanFab: React.FC<{ onOpen?: () => void }> = ({ onOpen }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('10');
  const [routine, setRoutine] = useState<Routine | null>(null);

  const refresh = () => {
    const today = getTodayIsoDate();
    const saved = LocalDB.getRoutine(today, 'morning');
    setRoutine(saved || loadRoutine(today, 'morning', []));
  };
  useEffect(() => { if (open) refresh(); }, [open]);

  const add = () => {
    if (!title.trim() || !routine) return;
    const step: RoutineStep = { id: createId('personal_step'), titleFa: title.trim(), category: 'treatment', completed: false, timeSeconds: Math.max(60, Number(minutes || 10) * 60), descriptionFa: 'برنامه شخصی امروز', isCustom: true, reasonFa: 'کاری که خودت برای امروز انتخاب کردی' };
    const updated = { ...routine, steps: [...routine.steps, step] };
    LocalDB.saveRoutine(updated); setRoutine(updated); setTitle(''); setMinutes('10');
  };

  const toggle = (id: string) => { if (!routine) return; const updated = toggleStep(routine, id); setRoutine(updated); };

  return <>
    <button aria-label="افزودن برنامه شخصی امروز" onClick={() => onOpen ? onOpen() : setOpen(true)} className="fixed z-40 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-[calc(50%-150px)] w-14 h-14 rounded-full bg-[#263b56] text-white shadow-[0_10px_26px_rgba(38,59,86,.3)] flex items-center justify-center active:scale-95 transition-transform"><Plus className="w-7 h-7" /></button>
    {open && <div className="fixed inset-0 z-[55] bg-[#20334d]/30 flex items-end justify-center p-4" onClick={() => setOpen(false)}><section className="w-full max-w-md max-h-[78vh] overflow-y-auto rounded-[2rem] bg-[#fffdf9] dark:bg-slate-900 p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-black text-[#263b56] dark:text-white">برنامه شخصی امروز</h2><p className="text-xs text-slate-500 mt-1">کارهای خودت را اضافه کن و بعد تیک بزن.</p></div><button onClick={() => setOpen(false)} className="icon-only p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"><X className="w-5 h-5" /></button></div>
      <div className="flex gap-2 mb-4"><input value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') add(); }} placeholder="مثلاً ماسک آبرسان" className="flex-1 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-bold" /><input value={minutes} onChange={(event) => setMinutes(event.target.value.replace(/\D/g, ''))} inputMode="numeric" aria-label="مدت به دقیقه" className="w-20 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-3 text-sm font-bold text-center" /><button onClick={add} disabled={!title.trim()} className="icon-only w-12 rounded-2xl bg-[#263b56] text-white disabled:opacity-40"><Plus className="w-5 h-5 mx-auto" /></button></div>
      <div className="space-y-2">{routine?.steps.filter((step) => step.isCustom).map((step) => <button key={step.id} onClick={() => toggle(step.id)} className={`w-full text-right p-3 rounded-2xl border flex items-center gap-3 ${step.completed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}><span className={`w-8 h-8 rounded-xl flex items-center justify-center ${step.completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{step.completed ? <Check className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}</span><span className={`flex-1 text-sm font-bold ${step.completed ? 'line-through opacity-60' : ''}`}>{step.titleFa}</span><span className="text-xs text-slate-400 flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />{toPersianDigits(Math.round((step.timeSeconds || 600) / 60))} دقیقه</span></button>)}</div>
      {(!routine || routine.steps.filter((step) => step.isCustom).length === 0) && <p className="py-8 text-center text-sm text-slate-400">هنوز کاری برای امروز اضافه نکرده‌ای.</p>}
    </section></div>}
  </>;
};
