import React from 'react';

interface State {
  hasError: boolean;
}

/**
 * دام خطا.
 *
 * نسخه ۱ فقط یک دیو خالی نشان می‌داد. الان پیام فارسی و دکمه
 * تلاش مجدد دارد و مهم‌تر: به کاربر اطمینان می‌دهد داده‌اش پاک نشده.
 */
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Roza crashed', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <div className="text-4xl">🌿</div>
          <h1 className="text-lg font-black text-slate-800">متاسفم، رزا مشکلی پیدا کرد</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            اطلاعات شما روی گوشی سالم است و پاک نشده. لطفاً برنامه را دوباره باز کنید.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-2xl bg-rose-500 text-white font-bold text-sm"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }
}
