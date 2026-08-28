import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'ir.roza.skin', appName: 'رزا', webDir: 'dist',
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_roza', iconColor: '#c98978' },
    SplashScreen: { launchAutoHide: true, launchShowDuration: 500, backgroundColor: '#fffaf8', showSpinner: false },
    /*
     * مشکل: روی اندروید ۱۵ (targetSdk 35) که Capacitor 7 پیش‌فرض می‌سازد،
     * سیستم edge-to-edge را اجبار می‌کند. بدون این پلاگین، هیچ‌کس به سیستم
     * نمی‌گفت که فضای نوار وضعیت (ساعت/آنتن) را برای اپ کنار بگذارد،
     * پس WebView کل صفحه (زیر نوار وضعیت) را می‌پوشاند.
     * overlaysWebView: false یعنی سیستم دوباره فضای نوار وضعیت را رزرو می‌کند.
     */
    StatusBar: { overlaysWebView: false, style: 'DARK', backgroundColor: '#faf8f5' },
  },
  android: { allowMixedContent: false },
};
export default config;
