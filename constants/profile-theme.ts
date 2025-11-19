// constants/profile-theme.ts
export interface ProfileTheme {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price: number; // NEW: Price in coins/currency
  gradient: {
    background: string[];
    decorativeBar: string[];
    accent: string[];
  };
  hasParticles?: boolean;
  hasAnimatedBackground?: boolean;
  particleConfig?: {
    type: 'stars' | 'bubbles' | 'fireflies' | 'snow' | 'confetti';
    color: string;
    count: number;
  };
}

export const PROFILE_THEMES: Record<string, ProfileTheme> = {
  // default: {
  //   id: 'default',
  //   name: 'Default',
  //   description: 'Classic rubric theme',
  //   icon: 'water',
  //   rarity: 'common',
  //   price: 0, // Free - default theme
  //   gradient: {
  //     background: ['#0f2c45', '#1a3a52'],
  //     decorativeBar: ['#6ADBCE', '#568CD2', '#EE007F'],
  //     accent: ['#6ADBCE', '#568CD2'],
  //   },
  // },
  
  sunset: {
    id: 'sunset',
    name: 'Golden Sunset',
    description: 'Warm evening glow',
    icon: 'sunny',
    rarity: 'rare',
    price: 50,
    gradient: {
      background: ['#d73900ff', '#ff8c42'],
      decorativeBar: ['#ffd700', '#ff8c42', '#ff6b35'],
      accent: ['#ffd700', '#ff8c42'],
    },
  },
  
  midnight: {
    id: 'midnight',
    name: 'Midnight Sky',
    description: 'Starry night with twinkling stars',
    icon: 'moon',
    rarity: 'rare',
    price: 50,
    gradient: {
      background: ['#0a0e27', '#1a1d3a'],
      decorativeBar: ['#8b5cf6', '#6366f1', '#3b82f6'],
      accent: ['#8b5cf6', '#6366f1'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'stars',
      color: '#ffffff',
      count: 50,
    },
  },
  
  winter: {
    id: 'winter',
    name: 'Winter Wonderland',
    description: 'Gentle snowfall',
    icon: 'snow',
    rarity: 'rare',
    price: 50,
    gradient: {
      background: ['#e3f2fd', '#bbdefb'],
      decorativeBar: ['#64b5f6', '#42a5f5', '#2196f3'],
      accent: ['#64b5f6', '#42a5f5'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'snow',
      color: '#ffffff',
      count: 40,
    },
  },
  
  sakura: {
    id: 'sakura',
    name: 'Cherry Blossom',
    description: 'Peaceful spring petals falling',
    icon: 'flower',
    rarity: 'epic',
    price: 125,
    gradient: {
      background: ['#ff5776ff', '#ffb3c1'],
      decorativeBar: ['#ff6b9d', '#c94b7e', '#ff8fab'],
      accent: ['#ff6b9d', '#c94b7e'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'bubbles',
      color: '#ffc1cc',
      count: 30,
    },
  },
  
  forest: {
    id: 'forest',
    name: 'Enchanted Forest',
    description: 'Mystical fireflies in the woods',
    icon: 'leaf',
    rarity: 'epic',
    price: 125,
    gradient: {
      background: ['#1a4d2e', '#2d5a3d'],
      decorativeBar: ['#7fcd91', '#52c72b', '#4caf50'],
      accent: ['#7fcd91', '#52c72b'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'fireflies',
      color: '#ffeb3b',
      count: 25,
    },
  },
  
  celebration: {
    id: 'celebration',
    name: 'Party Time',
    description: 'Festive confetti celebration',
    icon: 'gift',
    rarity: 'epic',
    price: 125,
    gradient: {
      background: ['#ff006e', '#8338ec'],
      decorativeBar: ['#ffbe0b', '#fb5607', '#ff006e'],
      accent: ['#ffbe0b', '#fb5607'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'confetti',
      color: '#ffbe0b',
      count: 35,
    },
  },
  
  aurora: {
    id: 'aurora',
    name: 'Aurora Borealis',
    description: 'Mesmerizing northern lights',
    icon: 'flash',
    rarity: 'legendary',
    price: 200,
    gradient: {
      background: ['#001f3f', '#003d5c'],
      decorativeBar: ['#00ffaa', '#00d4ff', '#0088ff'],
      accent: ['#00ffaa', '#00d4ff'],
    },
    hasAnimatedBackground: true,
  },
  
  neon: {
    id: 'neon',
    name: 'Neon City',
    description: 'Cyberpunk vibes',
    icon: 'radio',
    rarity: 'legendary',
    price: 200,
    gradient: {
      background: ['#1a0033', '#2d0052'],
      decorativeBar: ['#ff00ff', '#00ffff', '#ff00aa'],
      accent: ['#ff00ff', '#00ffff'],
    },
    hasAnimatedBackground: true,
  },
  
  cosmic: {
    id: 'cosmic',
    name: 'Cosmic Voyage',
    description: 'Journey through space',
    icon: 'planet',
    rarity: 'legendary',
    price: 200,
    gradient: {
      background: ['#000000', '#1a0a2e'],
      decorativeBar: ['#6a0dad', '#9d4edd', '#c77dff'],
      accent: ['#6a0dad', '#9d4edd'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'stars',
      color: '#ffffff',
      count: 60,
    },
  },
};

export const getThemeById = (themeId: string): ProfileTheme => {
  return PROFILE_THEMES[themeId] || PROFILE_THEMES.default;
};

// Helper function to get themes by rarity
export const getThemesByRarity = (rarity: 'common' | 'rare' | 'epic' | 'legendary'): ProfileTheme[] => {
  return Object.values(PROFILE_THEMES).filter(theme => theme.rarity === rarity);
};

// Helper function to get all themes sorted by price
export const getAllThemesSorted = (): ProfileTheme[] => {
  return Object.values(PROFILE_THEMES).sort((a, b) => a.price - b.price);
};

// Helper function to check if theme is free
export const isThemeFree = (themeId: string): boolean => {
  const theme = getThemeById(themeId);
  return theme.price === 0;
};