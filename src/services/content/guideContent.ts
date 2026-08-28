import { AdviceSource } from '../../types';
import { findIngredientById } from './ingredients';
import { SEVERITY_HINT_FA, SEVERITY_LABEL_FA } from '../advice/severity';

/**
 * محتوای «راهنمای استفاده از رزا».
 *
 * قانون اصلی: هر چیزی که اینجا نوشته می‌شود باید دقیقاً همان چیزی باشد
 * که Recommendation Engine واقعاً استفاده می‌کند (ingredients.ts,
 * recommendationEngine.ts, advice/severity.ts, cycle/cycleService.ts,
 * providers/procedureRules.ts). هیچ ادعای پزشکی اضافه‌ای اینجا نیست.
 */

export type GuideLevel = 1 | 2 | 3;

export interface GuideTopic {
  id: string;
  level: GuideLevel;
  titleFa: string;
  emoji: string;
  /** تصویر ترکیب — همان تصویری که در قفسه محصولات و تداخل‌سنج هم استفاده می‌شود (یک پوشه ریشه مشترک). وقتی وجود دارد، به‌جای ایموجی نمایش داده می‌شود. */
  imageUrl?: string;
  /** برای کارت‌های سطح ۱: شناسه دقیق ترکیب در INGREDIENTS_DATABASE (در صورت وجود). */
  ingredientId?: string;
  /** برای کارت‌های سطح ۱ عمومی (مثلاً «رتینوئیدها»، «AHA»، «BHA»): دسته‌ی کلی ترکیب. */
  activeClassFallback?: string;
  /** این موضوع به کدام منبع هشدار (AdviceSource) در موتور توصیه مربوط است. */
  adviceSources?: AdviceSource[];
  /** بخش‌های ساختاریافته کارت — عنوان کوچک + متن. */
  sectionsFa: { labelFa: string; textFa: string }[];
}

/* ============================ LEVEL 1 — مواد فعال را بشناس ============================ */

function ingredientTopic(args: {
  id: string;
  ingredientId: string;
  titleFa: string;
  nameEn: string;
  emoji: string;
  whatIsItFa: string;
  whatForFa: string;
  usedForFa: string;
  possibleIssueFa: string;
  whenRozaWarnsFa: string;
  activeClassFallback?: string;
}): GuideTopic {
  return {
    id: args.id,
    level: 1,
    titleFa: args.titleFa,
    emoji: args.emoji,
    // همه‌ی تصاویر ترکیبات از یک پوشه ریشه مشترک می‌آیند (public/assets/ingredients)؛
    // همان پوشه‌ای که قفسه محصولات و تداخل‌سنج هم از آن می‌خوانند — یک‌جا عوض کن، همه‌جا عوض می‌شود.
    imageUrl: `/assets/ingredients/${args.ingredientId}.jpg`,
    ingredientId: args.ingredientId,
    activeClassFallback: args.activeClassFallback,
    sectionsFa: [
      { labelFa: 'اسم', textFa: `${args.titleFa} — ${args.nameEn}` },
      { labelFa: 'این ماده چیست؟', textFa: args.whatIsItFa },
      { labelFa: 'به چه درد پوست می‌خورد؟', textFa: args.whatForFa },
      { labelFa: 'معمولاً برای چه مشکلی استفاده می‌شود؟', textFa: args.usedForFa },
      { labelFa: 'ممکن است چه مشکلی ایجاد کند؟', textFa: args.possibleIssueFa },
      { labelFa: 'رزا چه زمانی ممکن است درباره آن هشدار بدهد؟', textFa: args.whenRozaWarnsFa },
    ],
  };
}

export const LEVEL1_TOPICS: GuideTopic[] = [
  ingredientTopic({
    id: 'guide_retinol',
    ingredientId: 'ing_retinol',
    titleFa: 'رتینول',
    nameEn: 'Retinol',
    emoji: '🌙',
    whatIsItFa: 'رتینول یکی از معروف‌ترین ترکیبات مراقبت از پوست است که از خانواده ویتامین A می‌آید.',
    whatForFa: 'بیشتر برای کمک به خطوط ریز، بافت پوست و نوسازی سلولی استفاده می‌شود.',
    usedForFa: 'خطوط ریز و چروک، بافت ناهموار، جوش‌های سرسیاه و زیرپوستی.',
    possibleIssueFa: 'چون قوی است، ممکن است در چند هفته اول پوست را خشک، پوسته‌پوسته یا کمی تحریک کند.',
    whenRozaWarnsFa: 'در بارداری و شیردهی، در دوره مصرف رتینوئید خوراکی، قبل و بعد بعضی پروسیجرها، یا وقتی پوستت این روزها ملتهب یا خیلی حساس ثبت شده.',
  }),
  ingredientTopic({
    id: 'guide_retinoids',
    ingredientId: 'ing_retinoid_family',
    activeClassFallback: 'retinoid',
    titleFa: 'رتینوئیدها',
    nameEn: 'Retinoids',
    emoji: '🧬',
    whatIsItFa: 'رتینوئیدها خانواده‌ای از ترکیبات مشتق ویتامین A هستند؛ رتینول یکی از اعضای این خانواده است. بعضی اعضا مثل ترتینوئین یا آداپالن فقط با تجویز پزشک استفاده می‌شوند.',
    whatForFa: 'نوسازی سلولی پوست و تنظیم روند تولید سلول‌های جدید.',
    usedForFa: 'آکنه، جوش سرسیاه و زیرپوستی، خطوط ریز و چروک.',
    possibleIssueFa: 'تحریک، خشکی و حساس‌تر شدن پوست به نور آفتاب، مخصوصاً در هفته‌های اول مصرف.',
    whenRozaWarnsFa: 'وقتی ترکیب تجویزی پزشک باشد (دستور پزشک، نه پیشنهاد رزا)، در بارداری، یا قبل و بعد بعضی پروسیجرها.',
  }),
  ingredientTopic({
    id: 'guide_niacinamide',
    ingredientId: 'ing_niacinamide',
    titleFa: 'نیاسینامید',
    nameEn: 'Niacinamide (Vitamin B3)',
    emoji: '💧',
    whatIsItFa: 'نیاسینامید یکی از ایمن‌ترین و پرکاربردترین ترکیبات مراقبت از پوست است؛ نوعی ویتامین B3.',
    whatForFa: 'کمک به تنظیم چربی پوست، کاهش قرمزی جوش و روشن‌تر شدن لک‌های تیره.',
    usedForFa: 'پوست چرب یا مختلط، منافذ باز، جوش التهابی، لک.',
    possibleIssueFa: 'برای اکثر افراد بی‌خطر است؛ به‌ندرت ممکن است در غلظت بالا کمی قرمزی ایجاد کند.',
    whenRozaWarnsFa: 'تقریباً هیچ‌وقت هشدار جدی نمی‌دهد؛ فقط ممکن است در کنار سایر شرایط پوستی به‌عنوان یک نکته اطلاعاتی مطرح شود.',
  }),
  ingredientTopic({
    id: 'guide_vitamin_c',
    ingredientId: 'ing_vitamin_c',
    titleFa: 'ویتامین C',
    nameEn: 'Vitamin C',
    emoji: '☀️',
    whatIsItFa: 'یک آنتی‌اکسیدان قوی که معمولاً صبح‌ها استفاده می‌شود.',
    whatForFa: 'مقابله با آسیب آلودگی و نور خورشید، روشن‌تر شدن پوست و کمک به تولید کلاژن.',
    usedForFa: 'کدری پوست، لک، پیشگیری از پیری زودرس.',
    possibleIssueFa: 'در بعضی افراد، به‌خصوص پوست حساس، ممکن است کمی سوزش یا قرمزی ایجاد کند.',
    whenRozaWarnsFa: 'وقتی همزمان با رتینول یا لایه‌بردارهای قوی در یک نوبت استفاده شود، یا وقتی پوستت این روزها حساس یا ملتهب است.',
  }),
  ingredientTopic({
    id: 'guide_salicylic_acid',
    ingredientId: 'ing_salicylic_acid',
    titleFa: 'سالیسیلیک اسید',
    nameEn: 'Salicylic Acid (BHA)',
    emoji: '🧴',
    whatIsItFa: 'یک لایه‌بردار محلول در چربی از خانواده BHA.',
    whatForFa: 'نفوذ به عمق منافذ و حل کردن چربی و سلول‌های مرده داخل آن‌ها.',
    usedForFa: 'جوش سرسیاه و سرسفید، پوست چرب و مستعد جوش.',
    possibleIssueFa: 'ممکن است پوست خشک یا حساس را بیشتر از حد معمول تحریک کند.',
    whenRozaWarnsFa: 'وقتی همزمان با رتینول یا سایر لایه‌بردارها استفاده شود، قبل از بعضی پروسیجرها، یا در پوست خیلی حساس.',
  }),
  ingredientTopic({
    id: 'guide_glycolic_acid',
    ingredientId: 'ing_glycolic_acid',
    titleFa: 'گلیکولیک اسید',
    nameEn: 'Glycolic Acid (AHA)',
    emoji: '✨',
    whatIsItFa: 'قوی‌ترین و رایج‌ترین عضو خانواده AHA؛ یک لایه‌بردار محلول در آب.',
    whatForFa: 'صیقلی و شفاف کردن سطح پوست و کمک به محو لک‌های سطحی.',
    usedForFa: 'بافت ناهموار، کدری پوست، لک سطحی.',
    possibleIssueFa: 'چون نسبتاً قوی است، ریسک قرمزی و سوزش آن از لاکتیک اسید بیشتر است.',
    whenRozaWarnsFa: 'وقتی همزمان با رتینول یا اسیدهای دیگر استفاده شود، قبل از بعضی پروسیجرها، یا وقتی پوستت حساس یا ملتهب است.',
  }),
  ingredientTopic({
    id: 'guide_lactic_acid',
    ingredientId: 'ing_lactic_acid',
    titleFa: 'لاکتیک اسید',
    nameEn: 'Lactic Acid (AHA)',
    emoji: '🌸',
    whatIsItFa: 'ملایم‌ترین عضو خانواده AHA؛ مولکول بزرگ‌تری دارد و معمولاً کمتر تحریک می‌کند.',
    whatForFa: 'لایه‌برداری ملایم و کمک به آبرسانی سطحی پوست.',
    usedForFa: 'بافت ناهموار، خشکی سطحی، شروع ملایم لایه‌برداری.',
    possibleIssueFa: 'نسبت به گلیکولیک اسید ملایم‌تر است، اما باز هم می‌تواند در پوست حساس تحریک ایجاد کند.',
    whenRozaWarnsFa: 'وقتی همزمان با رتینول یا اسیدهای دیگر استفاده شود، یا قبل از بعضی پروسیجرها.',
  }),
  ingredientTopic({
    id: 'guide_azelaic_acid',
    ingredientId: 'ing_azelaic_acid',
    titleFa: 'آزلائیک اسید',
    nameEn: 'Azelaic Acid',
    emoji: '🌿',
    whatIsItFa: 'یکی از ملایم‌ترین ترکیبات فعال، مناسب پوست حساس و رزاسه.',
    whatForFa: 'کاهش قرمزی، کم‌رنگ کردن لک و ملاسما و کمک به جوش‌های ملایم.',
    usedForFa: 'رزاسه، قرمزی، لک، جوش خفیف.',
    possibleIssueFa: 'به‌ندرت مشکل‌ساز است؛ در شروع مصرف ممکن است کمی سوزش خفیف حس شود.',
    whenRozaWarnsFa: 'معمولاً هشدار جدی نمی‌دهد؛ در بارداری هم اغلب مجاز است ولی رزا توصیه می‌کند با پزشک مشورت کنی.',
  }),
  ingredientTopic({
    id: 'guide_benzoyl_peroxide',
    ingredientId: 'ing_benzoyl_peroxide',
    titleFa: 'بنزوئیل پراکساید',
    nameEn: 'Benzoyl Peroxide',
    emoji: '🎯',
    whatIsItFa: 'یک ترکیب قوی و موثر برای از بین بردن باکتری عامل جوش.',
    whatForFa: 'کشتن باکتری عامل آکنه و کاهش جوش‌های التهابی.',
    usedForFa: 'آکنه التهابی و جوش‌های چرکی.',
    possibleIssueFa: 'می‌تواند خشکی و پوسته‌ریزی ایجاد کند و حتی پارچه یا حوله را بی‌رنگ کند.',
    whenRozaWarnsFa: 'وقتی همزمان با رتینوئید یا ویتامین C در یک نوبت استفاده شود، یا وقتی پوستت خشک و حساس است.',
  }),
  ingredientTopic({
    id: 'guide_aha',
    ingredientId: 'ing_aha_family',
    activeClassFallback: 'aha',
    titleFa: 'AHA',
    nameEn: 'Alpha Hydroxy Acids',
    emoji: '🍋',
    whatIsItFa: 'خانواده‌ای از لایه‌بردارهای محلول در آب که گلیکولیک اسید و لاکتیک اسید عضو آن‌اند.',
    whatForFa: 'صیقلی کردن سطح پوست و کمک به یکدست شدن رنگ و بافت پوست.',
    usedForFa: 'بافت ناهموار، کدری، لک سطحی.',
    possibleIssueFa: 'استفاده همزمان چند AHA یا AHA با رتینول ریسک قرمزی و تحریک را بالا می‌برد.',
    whenRozaWarnsFa: 'وقتی همزمان با رتینول یا لایه‌بردار دیگری استفاده شود، یا قبل از بعضی پروسیجرها.',
  }),
  ingredientTopic({
    id: 'guide_bha',
    ingredientId: 'ing_bha_family',
    activeClassFallback: 'bha',
    titleFa: 'BHA',
    nameEn: 'Beta Hydroxy Acid',
    emoji: '🫧',
    whatIsItFa: 'خانواده لایه‌بردارهای محلول در چربی؛ سالیسیلیک اسید معروف‌ترین عضو آن است.',
    whatForFa: 'نفوذ به داخل منافذ چرب و کمک به تمیزی و کاهش جوش سرسیاه.',
    usedForFa: 'پوست چرب و مستعد جوش، منافذ باز.',
    possibleIssueFa: 'در پوست خشک یا حساس می‌تواند خشکی و تحریک ایجاد کند.',
    whenRozaWarnsFa: 'وقتی همزمان با رتینول یا اسید دیگری استفاده شود، یا قبل از بعضی پروسیجرها.',
  }),
];

/* ============================ LEVEL 2 — بفهم چرا رزا هشدار می‌دهد ============================ */

export const LEVEL2_TOPICS: GuideTopic[] = [
  {
    id: 'guide_l2_skin_type',
    level: 2,
    titleFa: 'نوع پوست من',
    emoji: '🧴',
    adviceSources: ['skin_profile'],
    sectionsFa: [
      {
        labelFa: 'چرا نوع پوست روی پیشنهادهای رزا اثر دارد؟',
        textFa:
          'هر ترکیبی برای همه نوع پوست یکسان مناسب نیست. مثلاً بعضی ترکیبات برای پوست چرب پیشنهاد می‌شوند ولی برای پوست خیلی خشک یا حساس مناسب نیستند. رزا نوع پوستی که خودت در پروفایل ثبت کرده‌ای را در نظر می‌گیرد تا ترکیب‌های سازگارتر را پیشنهاد بدهد و از ترکیب‌هایی که معمولاً برای آن نوع پوست مناسب نیستند فاصله بگیرد.',
      },
    ],
  },
  {
    id: 'guide_l2_sensitivity',
    level: 2,
    titleFa: 'حساسیت و علائم واقعی پوست',
    emoji: '🩹',
    adviceSources: ['symptom', 'safety'],
    sectionsFa: [
      { labelFa: 'قرمزی، خشکی، تحریک', textFa: 'اگر این روزها در ثبت‌های خودت قرمزی، خشکی یا سوزش پوست ثبت کرده باشی، رزا متوجه می‌شود پوستت الان در وضعیت حساس‌تری قرار دارد.' },
      {
        labelFa: 'چرا در این حالت توصیه ملایم‌تر می‌شود؟',
        textFa: 'وقتی پوست واقعاً ملتهب یا حساس ثبت شده، رزا ممکن است شدت بعضی هشدارها را یک پله بالاتر ببرد؛ یعنی چیزی که معمولاً فقط «احتیاط» بود، در این روزها ممکن است «مهم» نشان داده شود. این یعنی رزا به داده‌های واقعی تو نگاه می‌کند، نه فقط قوانین ثابت.',
      },
    ],
  },
  {
    id: 'guide_l2_cycle',
    level: 2,
    titleFa: 'چرخه قاعدگی و پوست',
    emoji: '🌙',
    adviceSources: ['cycle'],
    sectionsFa: [
      {
        labelFa: 'چرخه چطور روی پوست اثر می‌گذارد؟',
        textFa: 'در بعضی افراد، فازهای مختلف چرخه می‌توانند روی چربی، حساسیت یا احتمال جوش زدن پوست اثر بگذارند. رزا این تغییرات را به‌عنوان یک نکته اطلاعاتی نشان می‌دهد، نه یک قانون قطعی.',
      },
      {
        labelFa: 'یک نکته مهم',
        textFa: 'چرخه هرگز به‌تنهایی دلیل «ممنوع بودن» یک ماده نیست. یعنی رزا هرگز نمی‌گوید «چون الان در این فاز چرخه هستی، فلان ماده قطعاً ممنوع است». چرخه فقط یکی از چند اطلاعاتی است که رزا در کنار وضعیت واقعی پوست، محصولات خودت و سایر شرایط بررسی می‌کند.',
      },
    ],
  },
  {
    id: 'guide_l2_procedure',
    level: 2,
    titleFa: 'پروسیجرها (نوبت آرایشگاه و کلینیک)',
    emoji: '💈',
    adviceSources: ['procedure'],
    sectionsFa: [
      {
        labelFa: 'چرا بعضی Activeها قبل از پروسیجر محدود می‌شوند؟',
        textFa: 'بعضی خدمات آرایشگاه یا کلینیک (مثل لیزر یا پیلینگ) پوست را موقتاً حساس‌تر می‌کنند. به همین دلیل ممکن است رزا، بر اساس نوع پروسیجر و زمان آن، استفاده از بعضی محصولات فعال را برای چند روز قبل یا بعد از نوبت محدود کند یا روتین را برای مدتی ملایم‌تر کند.',
      },
      {
        labelFa: 'این یعنی چه؟',
        textFa: 'وقتی این هشدار را می‌بینی، یعنی این محدودیت واقعاً مربوط به همان نوبتی است که در برنامه ثبت کرده‌ای — نه یک حدس کلی.',
      },
    ],
  },
  {
    id: 'guide_l2_real_product',
    level: 2,
    titleFa: 'محصول واقعی من',
    emoji: '🧴',
    adviceSources: ['medication'],
    sectionsFa: [
      {
        labelFa: 'چرا ثبت محصول‌های خودت مهم است؟',
        textFa: 'رزا فقط نباید درباره موادی هشدار بدهد که در زندگی واقعی تو وجود ندارند. وقتی محصول‌های خودت را در «قفسه محصولات» ثبت می‌کنی، رزا می‌تواند تشخیص بدهد کدام ترکیب واقعاً در روتین توست و توصیه را دقیق‌تر و شخصی‌تر بسازد.',
      },
      {
        labelFa: 'آموزشی یعنی چه؟',
        textFa: 'اگر یک ترکیب در محصولات ثبت‌شده تو نباشد، هشدار مربوط به آن به‌عنوان «آموزشی» نشان داده می‌شود؛ یعنی فقط برای اطلاع است، نه اینکه الان واقعاً در حال استفاده از آن باشی.',
      },
    ],
  },
];

/* ============================ LEVEL 3 — منطق رزا را یاد بگیر ============================ */

const SEVERITY_ORDER: (keyof typeof SEVERITY_LABEL_FA)[] = [
  'INFO',
  'SUGGESTION',
  'CAUTION',
  'IMPORTANT',
  'PROFESSIONAL_INSTRUCTION',
];

export const LEVEL3_TOPICS: GuideTopic[] = [
  {
    id: 'guide_l3_not_same_for_everyone',
    level: 3,
    titleFa: 'چرا یک هشدار برای همه یکسان نیست؟',
    emoji: '🧩',
    sectionsFa: [
      {
        labelFa: 'همه چیز به شرایط بستگی دارد',
        textFa: 'یک ماده فعال ممکن است برای یک نفر کاملاً مناسب باشد، برای فرد دیگری نیاز به احتیاط داشته باشد و در یک شرایط خاص (مثلاً بارداری یا قبل از یک پروسیجر) نیاز به توقف کامل داشته باشد. رزا این تصمیم را بر اساس ترکیب واقعی از پروفایل پوستی، علائم اخیر، محصولات ثبت‌شده و شرایط ایمنی می‌گیرد — نه یک قانون ثابت برای همه.',
      },
    ],
  },
  {
    id: 'guide_l3_severity_levels',
    level: 3,
    titleFa: 'پنج سطح توصیه رزا',
    emoji: '🎚️',
    sectionsFa: SEVERITY_ORDER.map((severity) => ({
      labelFa: `${SEVERITY_LABEL_FA[severity]} (${severity})`,
      textFa: SEVERITY_HINT_FA[severity],
    })),
  },
  {
    id: 'guide_l3_why_not_today',
    level: 3,
    titleFa: 'چرا رزا گاهی می‌گوید «امروز استفاده نکن»؟',
    emoji: '🛑',
    adviceSources: ['pregnancy', 'medication', 'safety', 'age'],
    sectionsFa: [
      {
        labelFa: 'ترکیبی از چند اطلاعات',
        textFa: 'این تصمیم معمولاً از ترکیب چند اطلاعات می‌آید: شرایط ایمنی (مثل بارداری یا داروی فعال)، محصول واقعی خودت، ترکیب موجود در آن محصول، سطح حساسیت پوستت، علائم ثبت‌شده این روزها، نوبت‌های آرایشگاه یا کلینیک، و سایر اطلاعاتی که واقعاً در پروفایل تو ثبت شده‌اند. هیچ‌کدام از این‌ها به‌تنهایی و بدون بقیه، تصمیم نهایی را نمی‌سازد.',
      },
    ],
  },
];

export const GUIDE_TOPICS: GuideTopic[] = [...LEVEL1_TOPICS, ...LEVEL2_TOPICS, ...LEVEL3_TOPICS];

export function guideTopicsForLevel(level: GuideLevel): GuideTopic[] {
  return GUIDE_TOPICS.filter((topic) => topic.level === level);
}

export function findGuideTopicById(id: string): GuideTopic | undefined {
  return GUIDE_TOPICS.find((topic) => topic.id === id);
}

/** کارت سطح ۱ متناظر با یک ترکیب — اول شناسه دقیق، بعد دسته کلی (مثلاً رتینوئیدها). */
export function findLevel1TopicForIngredientId(ingredientId: string): GuideTopic | undefined {
  const exact = LEVEL1_TOPICS.find((topic) => topic.ingredientId === ingredientId);
  if (exact) return exact;
  const ingredient = findIngredientById(ingredientId);
  if (!ingredient?.activeClass) return undefined;
  return LEVEL1_TOPICS.find((topic) => topic.activeClassFallback === ingredient.activeClass);
}

/** موضوع مرتبط با یک منبع هشدار (برای دکمه «چرا؟» وقتی به ترکیب خاصی وصل نیست). */
export function findGuideTopicForSource(source: AdviceSource): GuideTopic | undefined {
  return LEVEL2_TOPICS.find((topic) => topic.adviceSources?.includes(source))
    || LEVEL3_TOPICS.find((topic) => topic.adviceSources?.includes(source));
}

/** موضوع مناسب برای دکمه «چرا؟» روی یک هشدار ترکیب‌محور — اول کارت خود ترکیب، بعد منبع هشدار. */
export function findWhyTopicForIngredientAdvice(args: { ingredientId?: string; source: AdviceSource }): GuideTopic | undefined {
  if (args.ingredientId) {
    const ingredientTopicMatch = findLevel1TopicForIngredientId(args.ingredientId);
    if (ingredientTopicMatch) return ingredientTopicMatch;
  }
  return findGuideTopicForSource(args.source);
}

export const GUIDE_TOTAL_TOPICS = GUIDE_TOPICS.length;
