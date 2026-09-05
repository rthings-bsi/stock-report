export interface UIThemeConfig {
  appTitle: string;
  appSubtitle: string;
  primaryColor: string; // emerald | slate | blue | zinc
  cardRadius: 'rounded-none' | 'rounded-sm' | 'rounded-md' | 'rounded-lg' | 'rounded-xl';
  bgPattern: 'clean-slate' | 'soft-ambient' | 'pure-white' | 'cool-grey';
  showBannerBadges: boolean;
  tableDense: boolean;
}

export const DEFAULT_UI_THEME: UIThemeConfig = {
  appTitle: 'Spindo Unit 5 - Warehouse',
  appSubtitle: 'Monitoring & Capacity Analytics System',
  primaryColor: 'emerald',
  cardRadius: 'rounded-md',
  bgPattern: 'clean-slate',
  showBannerBadges: true,
  tableDense: false,
};

export const COLOR_PRESETS = [
  { 
    id: 'emerald', 
    name: 'Emerald Forest (Standard)', 
    bannerHex: '#064e3b',
    headerHex: '#047857',
    bgClass: 'bg-emerald-900', 
    borderClass: 'border-emerald-800' 
  },
  { 
    id: 'slate', 
    name: 'Corporate Slate', 
    bannerHex: '#0f172a',
    headerHex: '#1e293b',
    bgClass: 'bg-slate-900', 
    borderClass: 'border-slate-800' 
  },
  { 
    id: 'blue', 
    name: 'Ocean Navy', 
    bannerHex: '#082f49',
    headerHex: '#0369a1',
    bgClass: 'bg-sky-950', 
    borderClass: 'border-sky-900' 
  },
  { 
    id: 'zinc', 
    name: 'Industrial Zinc', 
    bannerHex: '#18181b',
    headerHex: '#27272a',
    bgClass: 'bg-zinc-900', 
    borderClass: 'border-zinc-800' 
  },
];

export const RADIUS_PRESETS = [
  { id: 'rounded-none', name: 'Sharp (0px)', px: '0px' },
  { id: 'rounded-sm', name: 'Compact (2px)', px: '2px' },
  { id: 'rounded-md', name: 'Standard (6px)', px: '6px' },
  { id: 'rounded-lg', name: 'Soft (8px)', px: '8px' },
  { id: 'rounded-xl', name: 'Modern (12px)', px: '12px' },
];

export const BACKGROUND_PRESETS = [
  { id: 'clean-slate', name: 'Clean Slate (Default)', desc: 'Abu-abu bersih premium tanpa bintik/grid' },
  { id: 'soft-ambient', name: 'Soft Emerald Ambient', desc: 'Semburat pendaran halus emerald di atas' },
  { id: 'pure-white', name: 'Pure White', desc: 'Putih bersih minimalis Apple style' },
  { id: 'cool-grey', name: 'Cool Grey', desc: 'Abu-abu solid industrial' },
];
