// constants/profile-theme.ts
export interface ProfileTheme {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price: number; // Price in coins/currency
  gradient: {
    background: string[];
    decorativeBar: string[];
    accent: string[];
  };
  hasParticles?: boolean;
  hasAnimatedBackground?: boolean;
  particleConfig?: {
    type: 'stars' | 'bubbles' | 'fireflies' | 'snow' | 'confetti' | 'leaves' | 'sparkles' | 'rain' | 'smoke' | 'orbs' | 'dust' | 'waves' | 'feathers' | 'petals' | 'lightning' | 'plasma' | 'crystals';
    color: string;
    count: number;
  };
}

export const PROFILE_THEMES: Record<string, ProfileTheme> = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Classic rubric theme',
    icon: 'water',
    rarity: 'common',
    price: 0,
    gradient: {
      background: ['#0f2c45', '#1a3a52'],
      decorativeBar: ['#6ADBCE', '#568CD2', '#EE007F'],
      accent: ['#6ADBCE', '#568CD2'],
    },
  },

  ocean: {
    id: 'ocean',
    name: 'Deep Ocean',
    description: 'Tranquil underwater depths with bioluminescent creatures',
    icon: 'water',
    rarity: 'rare',
    price: 50,
    gradient: {
      background: ['#001a33', '#004d80', '#0066cc'],
      decorativeBar: ['#00ccff', '#0099ff', '#66ffff'],
      accent: ['#00ccff', '#33ffff'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'bubbles',
      color: '#00ccff',
      count: 45,
    },
  },

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

  // NEW THEMES BELOW

  lavender: {
    id: 'lavender',
    name: 'Lavender Dreams',
    description: 'Soft purple serenity with floating sparkles',
    icon: 'flower',
    rarity: 'rare',
    price: 60,
    gradient: {
      background: ['#e6d5f0', '#d8b5e8'],
      decorativeBar: ['#b88ec7', '#a78bc9', '#9966cc'],
      accent: ['#b88ec7', '#9966cc'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'sparkles',
      color: '#d8b5e8',
      count: 35,
    },
  },

  desert: {
    id: 'desert',
    name: 'Desert Mirage',
    description: 'Scorching sands with heat shimmer effect',
    icon: 'sunny',
    rarity: 'rare',
    price: 60,
    gradient: {
      background: ['#d4a574', '#c99358'],
      decorativeBar: ['#f4a460', '#daa520', '#ff8c00'],
      accent: ['#f4a460', '#daa520'],
    },
    hasAnimatedBackground: true,
  },

  midnight_purple: {
    id: 'midnight_purple',
    name: 'Purple Eclipse',
    description: 'Deep purple with mystical aura',
    icon: 'moon',
    rarity: 'epic',
    price: 130,
    gradient: {
      background: ['#1a0033', '#330066', '#4d0099'],
      decorativeBar: ['#cc66ff', '#9933ff', '#6600cc'],
      accent: ['#cc66ff', '#9933ff'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'sparkles',
      color: '#cc66ff',
      count: 40,
    },
  },

  tropical: {
    id: 'tropical',
    name: 'Tropical Paradise',
    description: 'Vibrant island vibes with exotic falling leaves',
    icon: 'leaf',
    rarity: 'epic',
    price: 135,
    gradient: {
      background: ['#ff6b9d', '#ff8fab', '#ffb3c1'],
      decorativeBar: ['#ffde91', '#ffc75f', '#ff9f43'],
      accent: ['#ffde91', '#ffc75f'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'leaves',
      color: '#ff9f43',
      count: 28,
    },
  },

  underground: {
    id: 'underground',
    name: 'Crystal Cavern',
    description: 'Glowing crystals in dark depths',
    icon: 'stone',
    rarity: 'epic',
    price: 140,
    gradient: {
      background: ['#0d0d0d', '#1a1a2e', '#16213e'],
      decorativeBar: ['#0f3460', '#533483', '#7e22ce'],
      accent: ['#a78bfa', '#7e22ce'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'sparkles',
      color: '#a78bfa',
      count: 38,
    },
  },

  sunrise: {
    id: 'sunrise',
    name: 'Golden Sunrise',
    description: 'Peaceful dawn breaking over mountains',
    icon: 'sunny',
    rarity: 'epic',
    price: 135,
    gradient: {
      background: ['#1a1a2e', '#ff6b35', '#ffb627'],
      decorativeBar: ['#ffd60a', '#ffc300', '#ff9500'],
      accent: ['#ffd60a', '#ff9500'],
    },
    hasAnimatedBackground: true,
  },

  matrix: {
    id: 'matrix',
    name: 'Digital Matrix',
    description: 'Endless streams of green code',
    icon: 'code',
    rarity: 'legendary',
    price: 210,
    gradient: {
      background: ['#000000', '#001a00', '#003300'],
      decorativeBar: ['#00ff00', '#00cc00', '#00ff41'],
      accent: ['#00ff00', '#00cc00'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'rain',
      color: '#00ff00',
      count: 55,
    },
  },

  ember: {
    id: 'ember',
    name: 'Endless Ember',
    description: 'Raging fire with glowing embers',
    icon: 'flame',
    rarity: 'legendary',
    price: 215,
    gradient: {
      background: ['#330000', '#660000', '#990000'],
      decorativeBar: ['#ff4500', '#ff6347', '#ff7f50'],
      accent: ['#ff6347', '#ff7f50'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'sparkles',
      color: '#ff6347',
      count: 50,
    },
  },

  cyberpunk_pink: {
    id: 'cyberpunk_pink',
    name: 'Synthwave Nights',
    description: 'Retro 80s cyberpunk aesthetic',
    icon: 'radio',
    rarity: 'legendary',
    price: 220,
    gradient: {
      background: ['#2a0845', '#5a0080', '#6a0dad'],
      decorativeBar: ['#ff006e', '#ff1493', '#ff69b4'],
      accent: ['#ff006e', '#00ffff'],
    },
    hasAnimatedBackground: true,
  },

  quantum: {
    id: 'quantum',
    name: 'Quantum Realm',
    description: 'Interdimensional energy waves and particles',
    icon: 'lightning',
    rarity: 'legendary',
    price: 225,
    gradient: {
      background: ['#0a0020', '#15003b', '#1a0566'],
      decorativeBar: ['#00ffff', '#ff00ff', '#00ff88'],
      accent: ['#00ffff', '#ff00ff'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'waves',
      color: '#00ffff',
      count: 65,
    },
  },

  heaven: {
    id: 'heaven',
    name: 'Heavenly Gates',
    description: 'Divine light with angelic particles',
    icon: 'star',
    rarity: 'legendary',
    price: 230,
    gradient: {
      background: ['#fff8f3', '#fff0e6', '#ffe8d6'],
      decorativeBar: ['#ffe135', '#ffcd39', '#ffd700'],
      accent: ['#ffe135', '#ffd700'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'sparkles',
      color: '#fff8f3',
      count: 45,
    },
  },

  abyss: {
    id: 'abyss',
    name: 'The Abyss',
    description: 'Infinite darkness with strange glowing entities',
    icon: 'ghost',
    rarity: 'legendary',
    price: 235,
    gradient: {
      background: ['#000000', '#0a0a0a', '#1a0a2e'],
      decorativeBar: ['#4a0080', '#6a0dad', '#9d4edd'],
      accent: ['#9d4edd', '#4a0080'],
    },
    hasParticles: true,
    particleConfig: {
      type: 'smoke',
      color: '#6a0dad',
      count: 42,
    },
  },
};

export const getThemeById = (themeId: string): ProfileTheme => {
  return PROFILE_THEMES[themeId] || PROFILE_THEMES.default;
};

export const getThemesByRarity = (rarity: 'common' | 'rare' | 'epic' | 'legendary'): ProfileTheme[] => {
  return Object.values(PROFILE_THEMES).filter(theme => theme.rarity === rarity);
};

export const getAllThemesSorted = (): ProfileTheme[] => {
  return Object.values(PROFILE_THEMES).sort((a, b) => a.price - b.price);
};

export const isThemeFree = (themeId: string): boolean => {
  const theme = getThemeById(themeId);
  return theme.price === 0;
};