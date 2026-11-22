'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Store,
  Wallet,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  QrCode,
  BellRing,
  Gift,
  Smartphone,
  Mail,
  ArrowUpRight,
} from 'lucide-react'

type Lang = 'en' | 'ta' | 'si'

const SUPPORT_EMAIL = 'retcashdigital@gmail.com'
const SUPPORT_PHONE = '+94 75 095 7336' // விருப்பமிருந்தால் உங்கள் Support எண்ணை இங்கே இடவும் (உதா: '+94 76 000 0000')

const COPY: Record<
  Lang,
  {
    walletBtn: string
    merchantBtn: string
    trialBadge: string
    heroTitleStart: string
    heroTitleHighlight: string
    heroSubtitle: string
    merchantCardTitle: string
    merchantCardDesc: string
    customerCardTitle: string
    customerCardDesc: string
    mockupPushTitle: string
    mockupPushBody: string
    mockupPassLabel: string
    mockupCashbackLabel: string
    mockupVisitsLabel: string
    mockupSetupTag: string
    feat1Title: string
    feat1Desc: string
    feat2Title: string
    feat2Desc: string
    feat3Title: string
    feat3Desc: string
    howBadge: string
    howTitle: string
    step1Title: string
    step1Desc: string
    step2Title: string
    step2Desc: string
    step3Title: string
    step3Desc: string
    plansBadge: string
    plansTitle: string
    plansSubtitle: string
    monthlyTitle: string
    monthlySub: string
    monthlyBadge: string
    monthlyUnit: string
    monthlyTrialTag: string
    monthlyCta: string
    annualBestBadge: string
    annualTitle: string
    annualSub: string
    annualBadge: string
    annualUnit: string
    annualEqTag: string
    annualCta: string
    planFeaturesMonthly: string[]
    planFeaturesAnnual: string[]
    footerTagline: string
    footerSupportLabel: string
    footerRegister: string
    footerMerchant: string
    footerCustomer: string
  }
> = {
  en: {
    walletBtn: 'Wallet',
    merchantBtn: 'Merchant Portal',
    trialBadge: 'Start with 30-Day Unlimited Free Trial',
    heroTitleStart: 'Grow Your Business with Smart ',
    heroTitleHighlight: 'Cashback & Rewards',
    heroSubtitle:
      'Retcash helps retail stores retain customers, boost repeat visits, and send instant lock-screen push alerts inside a digital loyalty wallet—without extra hardware or SMS fees.',
    merchantCardTitle: 'Merchant Portal',
    merchantCardDesc: 'Store Login & Billing',
    customerCardTitle: 'Customer Pass',
    customerCardDesc: 'Check Rewards Wallet',
    mockupPushTitle: 'RETCASH • Just now',
    mockupPushBody: 'You earned Rs. 150 cashback! Tap to view your updated loyalty wallet.',
    mockupPassLabel: 'DIGITAL LOYALTY PASS',
    mockupCashbackLabel: 'Available Cashback',
    mockupVisitsLabel: '4 / 5 Visits Completed',
    mockupSetupTag: 'Ready in 2 Minutes • No Extra Hardware',
    feat1Title: 'Zero Hardware Required',
    feat1Desc:
      'Run your entire loyalty program from any smartphone, tablet, or laptop you already own—no barcode scanners or extra POS machines needed.',
    feat2Title: 'Instant Lock-Screen Push Alerts',
    feat2Desc:
      'Notify customers directly on their phone screen the moment cashback is credited or a new store offer goes live—zero SMS or messaging charges.',
    feat3Title: 'Smart Cashback & Offer Manager',
    feat3Desc:
      'Reward repeat shoppers automatically across visits and publish promotional store banners straight into every connected customer wallet.',
    howBadge: 'How It Works',
    howTitle: 'Turn One-Time Buyers into Regulars',
    step1Title: 'Enter Number or Scan Pass',
    step1Desc:
      "At checkout, enter the customer's phone number or scan their QR loyalty pass to record the purchase in seconds.",
    step2Title: 'Instant Wallet & Push Update',
    step2Desc:
      'Cashback is added immediately to their digital wallet and a real-time push notification alerts them on their phone.',
    step3Title: 'Customers Return to Claim',
    step3Desc:
      'Customers come back to your store to redeem their accumulated rewards and check your latest seasonal offers.',
    plansBadge: 'Merchant Plans',
    plansTitle: 'Start Free for 30 Days',
    plansSubtitle:
      'Enjoy full feature access for 1 month completely free. Choose your plan after trial.',
    monthlyTitle: 'Monthly Pass',
    monthlySub: 'Flexible month-to-month billing',
    monthlyBadge: 'Standard',
    monthlyUnit: '/ month',
    monthlyTrialTag: '✓ First 30 Days Free Trial Included',
    monthlyCta: 'Start 30-Day Free Trial',
    annualBestBadge: 'Best Value (Save 33%)',
    annualTitle: 'Annual Pass',
    annualSub: 'Pay yearly & get maximum savings',
    annualBadge: '4 Months Free',
    annualUnit: '/ year',
    annualEqTag: '✓ Equivalent to Rs. 658 / month',
    annualCta: 'Get Started with Free Trial',
    planFeaturesMonthly: [
      'Unlimited Customers & Visits',
      'Instant Push Notifications (Cashback & Offers)',
      'Visit Stamp & Cashback Tracker',
      'Store Offers & Banner Manager',
    ],
    planFeaturesAnnual: [
      'Everything in Monthly Pass',
      'Unlimited Customers & Visits',
      'Save Rs. 3,980 per year',
      'Priority Merchant Onboarding & Support',
    ],
    footerTagline: 'Digital Loyalty & Cashback Platform for Retail Stores',
    footerSupportLabel: 'Merchant Onboarding & Support:',
    footerRegister: 'Register Store',
    footerMerchant: 'Merchant Login',
    footerCustomer: 'Customer Wallet',
  },
  ta: {
    walletBtn: 'வாலட்',
    merchantBtn: 'கடைக்காரர் பக்கம்',
    trialBadge: 'முதல் 30 நாட்கள் முற்றிலும் இலவசம்',
    heroTitleStart: 'ஸ்மார்ட் கேஷ்பேக் & சலுகைகள் மூலம் ',
    heroTitleHighlight: 'உங்கள் வியாபாரத்தை வளருங்கள்',
    heroSubtitle:
      'தனி மெஷின்களோ SMS கட்டணங்களோ இன்றி, டிஜிட்டல் லாயல்டி வாலட் மற்றும் உடனடி போன் நோட்டிபிகேஷன் மூலம் வாடிக்கையாளர்களை மீண்டும் உங்கள் கடைக்கு வரவழையுங்கள்.',
    merchantCardTitle: 'Merchant Portal',
    merchantCardDesc: 'கடை லாகின் & பில்லிங்',
    customerCardTitle: 'Customer Pass',
    customerCardDesc: 'கேஷ்பேக் வாலட் பார்க்க',
    mockupPushTitle: 'RETCASH • இப்போது',
    mockupPushBody: 'உங்களுக்கு Rs. 150 கேஷ்பேக் கிடைத்துள்ளது! வாலட்டைப் பார்க்க தட்டவும்.',
    mockupPassLabel: 'டிஜிட்டல் லாயல்டி கார்டு',
    mockupCashbackLabel: 'உங்கள் கேஷ்பேக் இருப்பு',
    mockupVisitsLabel: '4 / 5 வருகைகள் நிறைவு',
    mockupSetupTag: '2 நிமிடத்தில் தொடங்கலாம் • தனி மெஷின் தேவையில்லை',
    feat1Title: 'தனி மெஷின் தேவையில்லை',
    feat1Desc:
      'உங்கள் கையில் இருக்கும் சாதாரண ஸ்மார்ட்போன், டேப்லெட் அல்லது கணினி மூலமே வாடிக்கையாளர்களுக்கு பில் போட்டு கேஷ்பேக் வழங்கலாம்.',
    feat2Title: 'உடனடி போன் நோட்டிபிகேஷன்',
    feat2Desc:
      'கேஷ்பேக் ஏறிய உடனும், புதிய ஆஃபர் போட்ட உடனும் வாடிக்கையாளர் போன் திரையில் நேரடி அலர்ட் செல்லும் — SMS கட்டணம் கிடையாது.',
    feat3Title: 'ஸ்மார்ட் கேஷ்பேக் & ஆஃபர் மேலாளர்',
    feat3Desc:
      'தொடர்ந்து வரும் வாடிக்கையாளர்களுக்கு தானியங்கி கேஷ்பேக் மற்றும் உங்கள் கடையின் சலுகை பேனர்களை நேரடியாக அவர்களின் வாலட்டில் காட்டுங்கள்.',
    howBadge: 'எப்படி வேலை செய்கிறது?',
    howTitle: 'ஒருமுறை வரும் வாடிக்கையாளரை நிரந்தர வாடிக்கையாளராக்குங்கள்',
    step1Title: 'போன் நம்பர் அல்லது QR ஸ்கேன்',
    step1Desc:
      'பில் போடும்போது வாடிக்கையாளரின் போன் நம்பரை உள்ளிடவும் அல்லது QR கார்டை ஸ்கேன் செய்து வருகையைப் பதிவு செய்யவும்.',
    step2Title: 'உடனடி கேஷ்பேக் & அலர்ட்',
    step2Desc:
      'வாடிக்கையாளர் வாலட்டில் கேஷ்பேக் உடனே சேர்ந்து, அவர்களின் போனில் நேரடி நோட்டிபிகேஷன் செல்லும்.',
    step3Title: 'மீண்டும் கடைக்கு வருதல்',
    step3Desc:
      'சேமித்த கேஷ்பேக்கைப் பயன்படுத்தவும் புதிய சலுகைகளைப் பெறவும் வாடிக்கையாளர் மீண்டும் உங்கள் கடைக்கு வருவார்.',
    plansBadge: 'கடைக்காரர் திட்டங்கள்',
    plansTitle: '30 நாட்கள் இலவசமாகப் பயன்படுத்துங்கள்',
    plansSubtitle:
      'முதல் 1 மாதம் அனைத்து வசதிகளையும் இலவசமாகப் பயன்படுத்துங்கள். அதன்பின் உங்களுக்கு ஏற்ற திட்டத்தைத் தேர்ந்தெடுக்கலாம்.',
    monthlyTitle: 'மாதாந்திர திட்டம்',
    monthlySub: 'மாதாந்திர கட்டண முறை',
    monthlyBadge: 'Standard',
    monthlyUnit: '/ மாதம்',
    monthlyTrialTag: '✓ முதல் 30 நாட்கள் இலவச டிரையல்',
    monthlyCta: '30-நாள் இலவச டிரையல் தொடங்குங்கள்',
    annualBestBadge: 'அதிக லாபம் (33% சேமிப்பு)',
    annualTitle: 'வருடாந்திர திட்டம்',
    annualSub: 'வருடத்திற்கு ஒருமுறை செலுத்தி சேமியுங்கள்',
    annualBadge: '4 மாதங்கள் இலவசம்',
    annualUnit: '/ வருடம்',
    annualEqTag: '✓ மாதத்திற்கு Rs. 658 மட்டுமே',
    annualCta: 'இலவச டிரையலுடன் இணையுங்கள்',
    planFeaturesMonthly: [
      'வரம்பற்ற வாடிக்கையாளர்கள் & வருகைகள்',
      'உடனடி Push Notifications (கேஷ்பேக் & ஆஃபர்கள்)',
      'வருகை & கேஷ்பேக் கண்காணிப்பு',
      'கடை ஆஃபர்கள் & பேனர் மேலாண்மை',
    ],
    planFeaturesAnnual: [
      'மாதாந்திர திட்டத்தின் அனைத்து வசதிகளும்',
      'வரம்பற்ற வாடிக்கையாளர்கள் & வருகைகள்',
      'வருடத்திற்கு Rs. 3,980 சேமிப்பு',
      'முன்னுரிமை கடைக்காரர் உதவி (Priority Support)',
    ],
    footerTagline: 'சில்லறை வணிகங்களுக்கான டிஜிட்டல் லாயல்டி & கேஷ்பேக் தளம்',
    footerSupportLabel: 'கடை இணைப்பு & உதவிக்கு:',
    footerRegister: 'புதிய கடை பதிவு',
    footerMerchant: 'கடைக்காரர் லாகின்',
    footerCustomer: 'வாடிக்கையாளர் வாலட்',
  },
  si: {
    walletBtn: 'වොලට්',
    merchantBtn: 'වෙළඳසැල් පිවිසුම',
    trialBadge: 'දින 30ක සම්පූර්ණ නොමිලේ අත්හදා බැලීමක්',
    heroTitleStart: 'Smart Cashback සහ දීමනා මගින් ',
    heroTitleHighlight: 'ඔබේ ව්‍යාපාරය දියුණු කරගන්න',
    heroSubtitle:
      'අමතර යන්ත්‍ර හෝ SMS ගාස්තු නොමැතිව, ඩිජිටල් ලෝයල්ටි වොලට් සහ ක්ෂණික Push Notifications මගින් පාරිභෝගිකයින් නැවත ඔබේ වෙළඳසැලට ගෙන්වා ගන්න.',
    merchantCardTitle: 'Merchant Portal',
    merchantCardDesc: 'වෙළඳසැල් පිවිසුම සහ බිල්පත්',
    customerCardTitle: 'Customer Pass',
    customerCardDesc: 'Cashback වොලට් පරීක්ෂාව',
    mockupPushTitle: 'RETCASH • දැන්',
    mockupPushBody: 'ඔබට Rs. 150 Cashback ලැබී ඇත! ඔබේ වොලට් එක බැලීමට තට්ටු කරන්න.',
    mockupPassLabel: 'ඩිජිටල් ලෝයල්ටි කාඩ්පත',
    mockupCashbackLabel: 'ඔබේ Cashback ශේෂය',
    mockupVisitsLabel: 'පැමිණීම් 4 / 5 සම්පූර්ණයි',
    mockupSetupTag: 'මිනිත්තු 2කින් අරඹන්න • අමතර උපකරණ අවශ්‍ය නැත',
    feat1Title: 'අමතර උපකරණ අවශ්‍ය නැත',
    feat1Desc:
      'ඔබ ළඟ ඇති සාමාන්‍ය ස්මාර්ට් දුරකථනයෙන්, ටැබ්ලට් එකෙන් හෝ පරිගණකයෙන් සම්පූර්ණ ලෝයල්ටි පද්ධතිය පහසුවෙන් ක්‍රියාත්මක කළ හැක.',
    feat2Title: 'ක්ෂණික Lock-Screen Push Alerts',
    feat2Desc:
      'Cashback එකතු වූ වහාම සහ නව දීමනා පළ කළ වහාම පාරිභෝගිකයාගේ දුරකථන තිරයට සෘජු පණිවිඩයක් යවන්න — SMS ගාස්තු නැත.',
    feat3Title: 'Smart Cashback සහ දීමනා කළමනාකරු',
    feat3Desc:
      'නැවත පැමිණෙන පාරිභෝගිකයින්ට ස්වයංක්‍රීයව ප්‍රතිලාභ ලබා දී ඔබේ වෙළඳසැලේ විශේෂ දීමනා ඔවුන්ගේ වොලට් එකටම යවන්න.',
    howBadge: 'ක්‍රියා කරන ආකාරය',
    howTitle: 'එක් වරක් පැමිණෙන පාරිභෝගිකයින් නිත්‍ය පාරිභෝගිකයින් කරගන්න',
    step1Title: 'දුරකථන අංකය හෝ QR Scan',
    step1Desc:
      'බිල්පත සකසන විට පාරිභෝගිකයාගේ දුරකථන අංකය ඇතුළත් කරන්න හෝ QR කාඩ්පත ස්කෑන් කරන්න.',
    step2Title: 'ක්ෂණික Wallet සහ Push පණිවිඩය',
    step2Desc:
      'Cashback මුදල එසැණින් වොලට් එකට එකතු වී දුරකථනයට Notification එකක් ලැබේ.',
    step3Title: 'නැවත වෙළඳසැලට පැමිණීම',
    step3Desc:
      'එකතු වූ Cashback මුදල භාවිතා කිරීමට සහ නව දීමනා ලබා ගැනීමට පාරිභෝගිකයා නැවත ඔබේ වෙළඳසැලට පැමිණේ.',
    plansBadge: 'වෙළඳසැල් පැකේජ',
    plansTitle: 'දින 30ක් නොමිලේ භාවිතා කරන්න',
    plansSubtitle:
      'පළමු මාසය සම්පූර්ණයෙන්ම නොමිලේ සියලු පහසුකම් අත්විඳින්න. ඉන්පසු ඔබට ගැලපෙන පැකේජය තෝරන්න.',
    monthlyTitle: 'මාසික පැකේජය',
    monthlySub: 'නම්‍යශීලී මාසික ගෙවීම් ක්‍රමය',
    monthlyBadge: 'Standard',
    monthlyUnit: '/ මසකට',
    monthlyTrialTag: '✓ පළමු දින 30 නොමිලේ අත්හදා බැලීම',
    monthlyCta: 'දින 30 නොමිලේ අරඹන්න',
    annualBestBadge: 'හොඳම වටිනාකම (33% ඉතිරිය)',
    annualTitle: 'වාර්ෂික පැකේජය',
    annualSub: 'වාර්ෂිකව ගෙවා උපරිම ඉතිරියක් ලබාගන්න',
    annualBadge: 'මාස 4ක් නොමිලේ',
    annualUnit: '/ වසරකට',
    annualEqTag: '✓ මසකට Rs. 658 ක් පමණි',
    annualCta: 'නොමිලේ අත්හදා බැලීම අරඹන්න',
    planFeaturesMonthly: [
      'අසීමිත පාරිභෝගිකයින් සහ පැමිණීම්',
      'ක්ෂණික Push Notifications (Cashback සහ දීමනා)',
      'පැමිණීම් සහ Cashback වාර්තා',
      'වෙළඳසැල් දීමනා සහ බැනර් පාලනය',
    ],
    planFeaturesAnnual: [
      'මාසික පැකේජයේ සියලුම පහසුකම්',
      'අසීමිත පාරිභෝගිකයින් සහ පැමිණීම්',
      'වසරකට Rs. 3,980 ක ඉතිරියක්',
      'ප්‍රමුඛතා වෙළඳසැල් සහාය (Priority Support)',
    ],
    footerTagline: 'වෙළඳසැල් සඳහා වන ඩිජිටල් ලෝයල්ටි සහ Cashback පද්ධතිය',
    footerSupportLabel: 'වෙළඳසැල් ලියාපදිංචිය සහ සහාය සඳහා:',
    footerRegister: 'වෙළඳසැල ලියාපදිංචි කරන්න',
    footerMerchant: 'වෙළඳසැල් පිවිසුම',
    footerCustomer: 'පාරිභෝගික වොලට්',
  },
}

export default function HomePage() {
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('retcash_landing_lang') as Lang | null
    if (saved && (saved === 'en' || saved === 'ta' || saved === 'si')) {
      setLang(saved)
    }
  }, [])

  const handleLanguageChange = (nextLang: Lang) => {
    setLang(nextLang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('retcash_landing_lang', nextLang)
    }
  }

  const t = COPY[lang]

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-[#00875A] selection:text-white antialiased text-slate-800">
      {/* Background Emerald Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[#00875A]/5 blur-3xl pointer-events-none -z-10" />

      {/* 1. HEADER - Responsive Navbar with Language Switcher */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-2">
          {/* Logo & Branding */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img
              src="/logo.png"
              alt="RETCASH Logo"
              className="h-8 sm:h-9 w-auto object-contain"
            />
            <div>
              <span className="text-[15px] sm:text-[16px] font-black tracking-tight text-slate-800 leading-none block uppercase">
                RETCASH
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                Loyalty &amp; Rewards
              </span>
            </div>
          </div>

          {/* Desktop Language Switcher */}
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-full border border-slate-200/80">
            {(
              [
                { code: 'en', label: 'EN' },
                { code: 'ta', label: 'தமிழ்' },
                { code: 'si', label: 'සිංහල' },
              ] as const
            ).map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => handleLanguageChange(item.code)}
                className={`px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer ${
                  lang === item.code
                    ? 'bg-[#00875A] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Quick Access Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <Link
              href="/customer/login"
              className="px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5"
            >
              <Wallet size={15} className="text-[#00875A] shrink-0" />
              <span>{t.walletBtn}</span>
            </Link>

            <Link
              href="/merchant/login"
              className="bg-[#00875A] hover:bg-emerald-700 text-white px-3 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-sm flex items-center gap-1.5"
            >
              <Store size={15} className="shrink-0" />
              <span>{t.merchantBtn}</span>
            </Link>
          </div>
        </div>

        {/* Mobile Language Switcher Bar */}
        <div className="flex md:hidden items-center justify-center gap-1.5 px-4 py-2 bg-slate-50/90 border-t border-slate-200/70">
          {(
            [
              { code: 'en', label: 'EN' },
              { code: 'ta', label: 'தமிழ்' },
              { code: 'si', label: 'සිංහල' },
            ] as const
          ).map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => handleLanguageChange(item.code)}
              className={`px-3.5 py-1 rounded-full text-[11px] font-extrabold transition cursor-pointer ${
                lang === item.code
                  ? 'bg-[#00875A] text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200/80'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-7 sm:pt-14 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column - Main Pitch */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-[#ECFDF5] border border-emerald-200/80 px-3.5 py-1.5 rounded-full">
              <Gift size={14} className="text-[#00875A] shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold text-[#00875A] uppercase tracking-wider">
                {t.trialBadge}
              </span>
            </div>

            <h1 className="text-2xl sm:text-5xl font-black text-slate-900 leading-tight">
              {t.heroTitleStart}
              <span className="text-[#00875A]">{t.heroTitleHighlight}</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {t.heroSubtitle}
            </p>

            {/* Portal Choice Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 max-w-lg mx-auto lg:mx-0">
              <Link
                href="/merchant/login"
                className="group bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 hover:border-[#00875A] hover:shadow-md transition text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center text-[#00875A] shrink-0">
                    <Store size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 group-hover:text-[#00875A] transition">
                      {t.merchantCardTitle}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {t.merchantCardDesc}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="text-slate-300 group-hover:text-[#00875A] transition shrink-0"
                />
              </Link>

              <Link
                href="/customer/login"
                className="group bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 hover:border-[#00875A] hover:shadow-md transition text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#ECFDF5] group-hover:text-[#00875A] transition shrink-0">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 group-hover:text-[#00875A] transition">
                      {t.customerCardTitle}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {t.customerCardDesc}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="text-slate-300 group-hover:text-[#00875A] transition shrink-0"
                />
              </Link>
            </div>
          </div>

          {/* Right Column - Realistic Visual App & Push Preview Mockup */}
          <div className="lg:col-span-5">
            <div
              className="relative rounded-3xl p-5 sm:p-7 text-white shadow-xl overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, #00875A 0%, #059669 55%, #0d9488 100%)',
                boxShadow: '0 14px 38px rgba(0,135,90,0.24)',
              }}
            >
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />

              <div className="relative z-10 space-y-4">
                {/* Simulated Lock-Screen Push Notification Banner */}
                <div className="rounded-2xl bg-slate-900/90 border border-white/15 p-3.5 shadow-lg backdrop-blur-md flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#00875A] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <BellRing size={15} />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-extrabold text-emerald-300 tracking-wide">
                        {t.mockupPushTitle}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-100 mt-0.5 leading-snug font-medium">
                      {t.mockupPushBody}
                    </p>
                  </div>
                </div>

                {/* Simulated Customer Digital Wallet Card */}
                <div className="rounded-2xl bg-white/15 border border-white/25 p-4 backdrop-blur-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
                      <Sparkles size={11} /> {t.mockupPassLabel}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-white text-[#00875A] flex items-center justify-center">
                      <QrCode size={18} />
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="text-left">
                      <p className="text-[11px] text-emerald-100 font-medium">
                        {t.mockupCashbackLabel}
                      </p>
                      <p className="text-2xl font-black tracking-tight text-white">
                        Rs. 450.00
                      </p>
                    </div>
                    <span className="text-[11px] font-bold bg-emerald-950/35 px-2.5 py-1 rounded-lg text-emerald-100">
                      {t.mockupVisitsLabel}
                    </span>
                  </div>

                  {/* 5-Visit Progress Dots */}
                  <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div
                        key={step}
                        className={`h-2 rounded-full ${
                          step <= 4 ? 'bg-white' : 'bg-white/25'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-0.5 flex items-center gap-2 text-[11px] font-bold text-emerald-100">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{t.mockupSetupTag}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES - Non-Redundant Value Props */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-12 sm:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-[#ECFDF5] text-[#00875A] flex items-center justify-center">
              <Smartphone size={22} />
            </div>
            <h3 className="text-sm font-black text-slate-900">{t.feat1Title}</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {t.feat1Desc}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-[#ECFDF5] text-[#00875A] flex items-center justify-center">
              <BellRing size={22} />
            </div>
            <h3 className="text-sm font-black text-slate-900">{t.feat2Title}</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {t.feat2Desc}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-[#ECFDF5] text-[#00875A] flex items-center justify-center">
              <Sparkles size={22} />
            </div>
            <h3 className="text-sm font-black text-slate-900">{t.feat3Title}</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {t.feat3Desc}
            </p>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS - 3 Simple Steps */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-14 sm:pb-16">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-xs space-y-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-extrabold text-[#00875A] uppercase tracking-wider bg-[#ECFDF5] px-3 py-1 rounded-full border border-emerald-200/60">
              {t.howBadge}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {t.howTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2.5">
              <span className="inline-block text-xs font-black text-[#00875A] bg-[#ECFDF5] px-2.5 py-1 rounded-lg">
                STEP 01
              </span>
              <h3 className="text-sm font-black text-slate-800">{t.step1Title}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {t.step1Desc}
              </p>
            </div>

            <div className="space-y-2.5">
              <span className="inline-block text-xs font-black text-[#00875A] bg-[#ECFDF5] px-2.5 py-1 rounded-lg">
                STEP 02
              </span>
              <h3 className="text-sm font-black text-slate-800">{t.step2Title}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {t.step2Desc}
              </p>
            </div>

            <div className="space-y-2.5">
              <span className="inline-block text-xs font-black text-[#00875A] bg-[#ECFDF5] px-2.5 py-1 rounded-lg">
                STEP 03
              </span>
              <h3 className="text-sm font-black text-slate-800">{t.step3Title}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {t.step3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MERCHANT SUBSCRIPTION PLANS (CTA fixed to /merchant/register) */}
      <section className="bg-slate-100/70 border-y border-slate-200/80 py-12 sm:py-16 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-extrabold text-[#00875A] uppercase tracking-wider bg-[#ECFDF5] px-3 py-1 rounded-full border border-emerald-200/60">
              {t.plansBadge}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              {t.plansTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {t.plansSubtitle}
            </p>
          </div>

          {/* Pricing Cards Grid - 2 Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Monthly Plan */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">
                      {t.monthlyTitle}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {t.monthlySub}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                    {t.monthlyBadge}
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  Rs. 990{' '}
                  <span className="text-xs font-semibold text-slate-400">
                    {t.monthlyUnit}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 font-bold bg-[#ECFDF5] px-3 py-1.5 rounded-xl inline-block">
                  {t.monthlyTrialTag}
                </p>
                <ul className="space-y-2.5 text-xs text-slate-600 font-medium pt-1">
                  {t.planFeaturesMonthly.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2
                        size={14}
                        className="text-[#00875A] shrink-0 mt-0.5"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/merchant/register"
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs py-3.5 rounded-2xl text-center transition flex items-center justify-center gap-1.5"
              >
                <span>{t.monthlyCta}</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {/* Yearly Plan - Highlighted Best Value */}
            <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-[#00875A] relative flex flex-col justify-between space-y-6">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00875A] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs flex items-center gap-1 whitespace-nowrap">
                <Sparkles size={11} /> {t.annualBestBadge}
              </div>
              <div className="space-y-4 pt-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">
                      {t.annualTitle}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {t.annualSub}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-[#ECFDF5] text-[#00875A] px-2.5 py-1 rounded-full border border-emerald-200">
                    {t.annualBadge}
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  Rs. 7,900{' '}
                  <span className="text-xs font-semibold text-slate-400">
                    {t.annualUnit}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 font-bold bg-[#ECFDF5] px-3 py-1.5 rounded-xl inline-block">
                  {t.annualEqTag}
                </p>
                <ul className="space-y-2.5 text-xs text-slate-600 font-medium pt-1">
                  {t.planFeaturesAnnual.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2
                        size={14}
                        className="text-[#00875A] shrink-0 mt-0.5"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/merchant/register"
                className="w-full bg-[#00875A] hover:bg-emerald-700 text-white font-extrabold text-xs py-3.5 rounded-2xl text-center transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>{t.annualCta}</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER WITH TRUST & SUPPORT SIGNALS */}
      <footer className="py-8 px-4 sm:px-8 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="space-y-1">
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-extrabold text-slate-700">
                <ShieldCheck size={16} className="text-[#00875A]" />
                <span>RETCASH Loyalty System &copy; {new Date().getFullYear()}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {t.footerTagline}
              </p>
            </div>

            {/* Merchant Support & Contact */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <span className="text-slate-500 font-semibold">
                {t.footerSupportLabel}
              </span>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-[#ECFDF5] text-slate-700 hover:text-[#00875A] font-bold px-3 py-1.5 rounded-xl transition"
              >
                <Mail size={13} className="text-[#00875A]" />
                <span>{SUPPORT_EMAIL}</span>
              </a>
              {SUPPORT_PHONE && (
                <a
                  href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1.5 bg-[#ECFDF5] text-[#00875A] font-bold px-3 py-1.5 rounded-xl"
                >
                  <Smartphone size={13} />
                  <span>{SUPPORT_PHONE}</span>
                </a>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center md:justify-between gap-4 text-xs font-semibold text-slate-400">
            <div className="flex flex-wrap items-center justify-center gap-5">
              <Link href="/merchant/register" className="hover:text-[#00875A] transition">
                {t.footerRegister}
              </Link>
              <Link href="/merchant/login" className="hover:text-[#00875A] transition">
                {t.footerMerchant}
              </Link>
              <Link href="/customer/login" className="hover:text-[#00875A] transition">
                {t.footerCustomer}
              </Link>
            </div>
            <span className="text-[11px] text-slate-400">Sri Lanka</span>
          </div>
        </div>
      </footer>
    </div>
  )
}