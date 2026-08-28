#!/usr/bin/env node
/**
 * اطمینان از وجود مجوزهای لازم برای اعلان‌های محلی قابل‌اعتماد در
 * AndroidManifest.xml (POST_NOTIFICATIONS، SCHEDULE_EXACT_ALARM،
 * USE_EXACT_ALARM، VIBRATE) — دقیقاً همان مجموعه‌ای که برنامه‌ی مرجع
 * daroto (که نوتیفیکیشنش قابل‌اعتماد کار می‌کند) در مانیفست خودش دارد.
 *
 * چرا این اسکریپت لازم است:
 * از اندروید ۱۲ به بعد، حتی وقتی کاربر مجوز نمایش اعلان را داده،
 * @capacitor/local-notifications نمی‌تواند اعلان‌ها را «دقیق» (exact)
 * زمان‌بندی کند مگر SCHEDULE_EXACT_ALARM در AndroidManifest.xml اعلام شده
 * باشد. بدون آن، دقیقاً همان باگ گزارش‌شده رخ می‌دهد: کاربر ساعتی را
 * تنظیم می‌کند، آن لحظه می‌رسد، ولی اعلانی نمی‌آید (یا با تاخیر نامشخص
 * می‌آید).
 *
 * چرا خودکار: پوشه android/ معمولاً با `npx cap add android` ساخته
 * می‌شود و بعضی وقت‌ها (مثلاً پاک و دوباره ساخته شدن پروژه بومی) این
 * فایل از نو تولید می‌شود؛ خودکار بودن این اسکریپت یعنی هیچ‌وقت این
 * مجوز فراموش نمی‌شود. اسکریپت idempotent است: اگر خط از قبل باشد
 * کاری نمی‌کند، و اگر android/ اصلاً وجود نداشته باشد (هنوز
 * `cap add android` اجرا نشده) بی‌خطر و بی‌صدا خارج می‌شود.
 *
 * این اسکریپت در package.json به `cap:sync` وصل شده تا بعد از هر
 * `npx cap sync` خودش اجرا شود.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const manifestPath = join(process.cwd(), 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

const REQUIRED_PERMISSIONS = [
  // اندروید ۱۳+: بدون این، هیچ اعلانی اصلاً نمایش داده نمی‌شود؛ خودِ
  // پلاگین در زمان اجرا هم درخواستش می‌کند (requestPermissions)، ولی
  // اعلام صریح در مانیفست هم مثل برنامه‌ی مرجع daroto، یک لایه ایمنی است.
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  // اندروید ۱۲+: بدون این، اعلان‌های زمان‌بندی‌شده «دقیق» نیستند و ممکن
  // است با تأخیر نامشخص برسند یا اصلاً نرسند — همان ریشه اصلی باگ رفع‌شده.
  '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />',
  '<uses-permission android:name="android.permission.USE_EXACT_ALARM" />',
  // برای الگوی لرزش کانال اعلان.
  '<uses-permission android:name="android.permission.VIBRATE" />',
  /*
   * بدون این مجوز، همه‌ی اعلان‌های زمان‌بندی‌شده با ری‌استارت گوشی پاک
   * می‌شوند و تا وقتی کاربر خودش اپ را باز نکند هیچ یادآوری‌ای نمی‌آید —
   * یعنی دقیقاً همان شبی که گوشی ری‌استارت شده، یادآوری دارو نمی‌آید و
   * کاربر هیچ نشانه‌ای هم نمی‌بیند. پلاگین یک BroadcastReceiver برای
   * BOOT_COMPLETED دارد، ولی آن receiver بدون این مجوز هرگز صدا زده
   * نمی‌شود. اعلام صریحش اینجا تضمین می‌کند که merge مانیفست از قلم نیندازد.
   */
  '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />',
];

/**
 * آیکون نوار وضعیت.
 *
 * capacitor.config.ts مقدار smallIcon را 'ic_stat_roza' گذاشته، ولی هیچ
 * drawable ای با این نام در پروژه وجود ندارد. اندروید در این حالت آیکون را
 * پیدا نمی‌کند و به‌جای نشان برنامه، یک مربع/دایره‌ی خالی در نوار وضعیت
 * می‌گذارد. این بررسی، مشکل را قبل از بیلد و با دستور دقیق رفعش اعلام
 * می‌کند — به‌جای اینکه بعد از نصب روی گوشی کشف شود.
 *
 * عمداً خودکار تولید نمی‌شود: آیکون نوار وضعیت باید یک سیلوئت ساده‌ی سفید
 * روی پس‌زمینه‌ی شفاف باشد و لوگوی پرجزئیات رزا در ۲۴dp به لکه تبدیل
 * می‌شود. این یکی به یک فایل طراحی‌شده نیاز دارد، نه به یک اسکریپت.
 */
const ICON_NAME = 'ic_stat_roza';
const ICON_DENSITIES = [
  ['drawable-mdpi', 24],
  ['drawable-hdpi', 36],
  ['drawable-xhdpi', 48],
  ['drawable-xxhdpi', 72],
  ['drawable-xxxhdpi', 96],
];

function checkNotificationIcon(resDir) {
  const found = ICON_DENSITIES.filter(([dir]) => existsSync(join(resDir, dir, `${ICON_NAME}.png`)));
  if (found.length === ICON_DENSITIES.length) {
    console.log('[ensure-notification-permissions] آیکون نوار وضعیت موجود است.');
    return;
  }

  const missing = ICON_DENSITIES.filter(([dir]) => !existsSync(join(resDir, dir, `${ICON_NAME}.png`)));
  console.warn(
    [
      '',
      '[ensure-notification-permissions] ⚠  آیکون نوار وضعیت ناقص است.',
      `  capacitor.config.ts به smallIcon: '${ICON_NAME}' اشاره می‌کند ولی این فایل‌ها نیستند:`,
      ...missing.map(([dir, size]) => `    android/app/src/main/res/${dir}/${ICON_NAME}.png   (${size}×${size}px)`),
      '  تا وقتی اضافه نشوند، اعلان‌ها یک مربع خالی در نوار وضعیت نشان می‌دهند.',
      '  فایل باید سیلوئت سفید روی پس‌زمینه‌ی شفاف باشد (اندروید فقط کانال آلفا را می‌خواند).',
      '',
    ].join('\n'),
  );
}

function main() {
  if (!existsSync(manifestPath)) {
    console.log('[ensure-notification-permissions] android/ هنوز ساخته نشده (npx cap add android)؛ رد شد.');
    return;
  }

  let xml = readFileSync(manifestPath, 'utf8');
  let changed = false;

  for (const permissionTag of REQUIRED_PERMISSIONS) {
    if (xml.includes(permissionTag)) continue;
    if (!xml.includes('<manifest')) {
      console.warn('[ensure-notification-permissions] ساختار AndroidManifest.xml شناخته‌شده نیست؛ رد شد.');
      return;
    }
    // بلافاصله بعد از تگ باز <manifest ...> اضافه می‌شود، قبل از <application>.
    xml = xml.replace(/(<manifest[^>]*>)/, `$1\n    ${permissionTag}`);
    changed = true;
  }

  if (changed) {
    writeFileSync(manifestPath, xml, 'utf8');
    console.log('[ensure-notification-permissions] مجوز(های) لازم به AndroidManifest.xml اضافه شد.');
  } else {
    console.log('[ensure-notification-permissions] مجوزها از قبل موجود بودند؛ تغییری لازم نبود.');
  }

  checkNotificationIcon(join(process.cwd(), 'android', 'app', 'src', 'main', 'res'));
}

main();
