// constants/avatars.ts - Gradient DiceBear Avatar System

export interface AvatarPreset {
  index: number;
  url: string;
  name: string;
  color: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    index: 0,
    url: 'https://api.dicebear.com/9.x/fun-emoji/png?seed=Felix&size=200&backgroundType=gradientLinear&backgroundColor=ef4444,b91c1c',
    name: 'Felix',
    color: '#ef4444', // Red gradient
  },
  {
    index: 1,
    url: 'https://api.dicebear.com/9.x/fun-emoji/png?seed=Max&size=200&backgroundType=gradientLinear&backgroundColor=f59e0b,f97316',
    name: 'Max',
    color: '#f59e0b', // Orange gradient
  },
  {
    index: 2,
    url: 'https://api.dicebear.com/9.x/fun-emoji/png?seed=Aneka&size=200&backgroundType=gradientLinear&backgroundColor=facc15,eab308',
    name: 'Aneka',
    color: '#facc15', // Yellow gradient
  },
  {
    index: 3,
    url: 'https://api.dicebear.com/9.x/fun-emoji/png?seed=Bella&size=200&backgroundType=gradientLinear&backgroundColor=10b981,059669',
    name: 'Bella',
    color: '#10b981', // Green gradient
  },
  {
    index: 4,
    url: 'https://api.dicebear.com/9.x/fun-emoji/png?seed=Charlie&size=200&backgroundType=gradientLinear&backgroundColor=06b6d4,0891b2',
    name: 'Charlie',
    color: '#06b6d4', // Cyan gradient
  },
  {
    index: 5,
    url: 'https://api.dicebear.com/9.x/fun-emoji/png?seed=Lucy&size=200&backgroundType=gradientLinear&backgroundColor=3b82f6,2563eb',
    name: 'Lucy',
    color: '#3b82f6', // Blue gradient
  },
  {
    index: 6,
    url: 'https://api.dicebear.com/9.x/fun-emoji/png?seed=Cooper&size=200&backgroundType=gradientLinear&backgroundColor=8b5cf6,6366f1',
    name: 'Cooper',
    color: '#8b5cf6', // Purple gradient
  },
  {
    index: 7,
    url: 'https://api.dicebear.com/9.x/fun-emoji/png?seed=Luna&size=200&backgroundType=gradientLinear&backgroundColor=ec4899,d946ef',
    name: 'Luna',
    color: '#ec4899', // Pink gradient
  },
];

export function getAvatarByIndex(index: number): AvatarPreset {
  return AVATAR_PRESETS[index] || AVATAR_PRESETS[0];
}

export function getAvatarUrl(index: number): string {
  return getAvatarByIndex(index).url;
}
