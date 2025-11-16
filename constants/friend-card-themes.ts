// config/friend-card-themes.ts
export type ThemeRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface FriendCardTheme {
  id: string;
  name: string;
  rarity: ThemeRarity;
  price: number;
  description: string;
  
  // Visual properties
  backgroundColor?: string;
  gradientColors?: string[];
  borderColor?: string;
  borderWidth?: number;
  borderGlow?: boolean;
  
  // Animation properties
  animated?: boolean;
  animationType?: 'gradient' | 'particles' | 'glow' | 'shimmer' | 'pulse' | 'wave' | 'matrix';
  animationSpeed?: number;
  
  // Particle effects
  particles?: {
    type: 'stars' | 'sparkles' | 'bubbles' | 'snow' | 'petals' | 'flames' | 'leaves' | 'code' | 'lightning';
    count: number;
    colors: string[];
  };
  
  // Special effects
  glowColor?: string;
  shadowColor?: string;
  overlayPattern?: 'grid' | 'dots' | 'waves' | 'hexagon';
}

export const FRIEND_CARD_THEMES: Record<string, FriendCardTheme> = {
  // DEFAULT (Free)
  default: {
    id: 'default',
    name: 'Default',
    rarity: 'common',
    price: 0,
    description: 'The classic look',
    backgroundColor: 'rgba(31, 41, 55, 0.7)',
    borderColor: 'rgba(75, 85, 99, 0.3)',
    borderWidth: 1,
  },

  // GRADIENT THEMES
  sunsetBlaze: {
    id: 'sunsetBlaze',
    name: 'Sunset Blaze',
    rarity: 'rare',
    price: 25,
    description: 'Warm sunset gradient with flame particles',
    gradientColors: ['#FF6B35', '#F7931E', '#FF0080'],
    borderColor: 'rgba(255, 107, 53, 0.5)',
    borderWidth: 2,
    borderGlow: true,
    animated: true,
    animationType: 'particles',
    particles: {
      type: 'flames',
      count: 8,
      colors: ['#FF6B35', '#F7931E', '#FFD700'],
    },
  },

  oceanDepths: {
    id: 'oceanDepths',
    name: 'Ocean Depths',
    rarity: 'rare',
    price: 500,
    description: 'Deep ocean gradient with floating bubbles',
    gradientColors: ['#006994', '#0891b2', '#06b6d4'],
    borderColor: 'rgba(6, 182, 212, 0.5)',
    borderWidth: 2,
    animated: true,
    animationType: 'particles',
    particles: {
      type: 'bubbles',
      count: 12,
      colors: ['rgba(255, 255, 255, 0.3)', 'rgba(6, 182, 212, 0.4)'],
    },
  },

  northernLights: {
    id: 'northernLights',
    name: 'Northern Lights',
    rarity: 'epic',
    price: 1000,
    description: 'Aurora borealis shimmer effect',
    gradientColors: ['#6366f1', '#8b5cf6', '#10b981', '#06b6d4'],
    borderColor: 'rgba(139, 92, 246, 0.6)',
    borderWidth: 2,
    borderGlow: true,
    animated: true,
    animationType: 'shimmer',
    animationSpeed: 3,
  },

  midnightGalaxy: {
    id: 'midnightGalaxy',
    name: 'Midnight Galaxy',
    rarity: 'epic',
    price: 1200,
    description: 'Cosmic void with twinkling stars',
    gradientColors: ['#0f0720', '#1a0b2e', '#6366f1'],
    borderColor: 'rgba(99, 102, 241, 0.5)',
    borderWidth: 2,
    animated: true,
    animationType: 'particles',
    particles: {
      type: 'stars',
      count: 20,
      colors: ['#ffffff', '#fbbf24', '#60a5fa'],
    },
  },

  forestCanopy: {
    id: 'forestCanopy',
    name: 'Forest Canopy',
    rarity: 'rare',
    price: 5,
    description: 'Emerald forest with drifting leaves',
    gradientColors: ['#065f46', '#059669', '#10b981'],
    borderColor: 'rgba(16, 185, 129, 0.5)',
    borderWidth: 2,
    animated: true,
    animationType: 'particles',
    particles: {
      type: 'leaves',
      count: 10,
      colors: ['#10b981', '#34d399', '#6ee7b7'],
    },
  },

  roseGold: {
    id: 'roseGold',
    name: 'Rose Gold',
    rarity: 'epic',
    price: 1000,
    description: 'Luxurious rose gold with sparkles',
    gradientColors: ['#b76e79', '#e8b4b8', '#d4af37'],
    borderColor: 'rgba(212, 175, 55, 0.6)',
    borderWidth: 2,
    borderGlow: true,
    animated: true,
    animationType: 'particles',
    particles: {
      type: 'sparkles',
      count: 15,
      colors: ['#ffd700', '#ffecb3', '#fff'],
    },
  },

  // ANIMATED THEMES
  neonPulse: {
    id: 'neonPulse',
    name: 'Neon Pulse',
    rarity: 'epic',
    price: 1500,
    description: 'Cyberpunk neon with pulsing borders',
    gradientColors: ['#0f0f23', '#1a1a2e', '#00d9ff'],
    borderColor: '#00d9ff',
    borderWidth: 3,
    borderGlow: true,
    animated: true,
    animationType: 'pulse',
    glowColor: '#ff00de',
    animationSpeed: 2,
  },

  electricStorm: {
    id: 'electricStorm',
    name: 'Electric Storm',
    rarity: 'legendary',
    price: 2000,
    description: 'Dark storm with lightning strikes',
    gradientColors: ['#0f172a', '#1e293b', '#312e81'],
    borderColor: 'rgba(139, 92, 246, 0.7)',
    borderWidth: 0,
    animated: true,
    animationType: 'particles',
    particles: {
      type: 'lightning',
      count: 15,
      colors: ['#a78bfa', '#c4b5fd', '#ffffff'],
    },
  },

  cherryBlossom: {
    id: 'cherryBlossom',
    name: 'Cherry Blossom',
    rarity: 'rare',
    price: 800,
    description: 'Soft pink with falling petals',
    gradientColors: ['#fce7f3', '#fbcfe8', '#f9a8d4'],
    borderColor: 'rgba(249, 168, 212, 0.5)',
    borderWidth: 2,
    animated: true,
    animationType: 'particles',
    particles: {
      type: 'petals',
      count: 12,
      colors: ['#fce7f3', '#fbcfe8', '#f9a8d4'],
    },
  },

  matrixCode: {
    id: 'matrixCode',
    name: 'Matrix Code',
    rarity: 'legendary',
    price: 2500,
    description: 'Cascading green code effect',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderColor: 'rgba(34, 197, 94, 0.7)',
    borderWidth: 2,
    borderGlow: true,
    animated: true,
    animationType: 'matrix',
    particles: {
      type: 'code',
      count: 8,
      colors: ['#22c55e', '#16a34a'],
    },
  },

  fireAndIce: {
    id: 'fireAndIce',
    name: 'Fire & Ice',
    rarity: 'legendary',
    price: 3000,
    description: 'Dual elemental power',
    gradientColors: ['#dc2626', '#f59e0b', '#06b6d4', '#3b82f6'],
    borderColor: 'rgba(239, 68, 68, 0.7)',
    borderWidth: 3,
    borderGlow: true,
    animated: true,
    animationType: 'wave',
    animationSpeed: 2,
  },

  cosmicDrift: {
    id: 'cosmicDrift',
    name: 'Cosmic Drift',
    rarity: 'legendary',
    price: 2800,
    description: 'Drifting through the cosmos',
    gradientColors: ['#1e1b4b', '#312e81', '#4c1d95', '#5b21b6'],
    borderColor: 'rgba(139, 92, 246, 0.6)',
    borderWidth: 2,
    animated: true,
    animationType: 'particles',
    particles: {
      type: 'stars',
      count: 25,
      colors: ['#ffffff', '#c4b5fd', '#a78bfa'],
    },
    overlayPattern: 'dots',
  },

  // SPECIAL EFFECT THEMES
  holographic: {
    id: 'holographic',
    name: 'Holographic',
    rarity: 'mythic',
    price: 5000,
    description: 'Rainbow shifting metallic effect',
    gradientColors: ['#667eea', '#764ba2', '#f093fb', '#4facfe'],
    borderColor: 'rgba(102, 126, 234, 0.8)',
    borderWidth: 3,
    borderGlow: true,
    animated: true,
    animationType: 'shimmer',
    animationSpeed: 1.5,
    glowColor: '#f093fb',
  },

  crystalline: {
    id: 'crystalline',
    name: 'Crystalline',
    rarity: 'legendary',
    price: 2500,
    description: 'Frosted glass with prismatic light',
    gradientColors: ['rgba(224, 242, 254, 0.3)', 'rgba(191, 219, 254, 0.4)', 'rgba(147, 197, 253, 0.3)'],
    borderColor: 'rgba(147, 197, 253, 0.8)',
    borderWidth: 2,
    borderGlow: true,
    animated: true,
    animationType: 'shimmer',
    particles: {
      type: 'sparkles',
      count: 10,
      colors: ['#ffffff', '#bfdbfe', '#93c5fd'],
    },
  },

  shadowAssassin: {
    id: 'shadowAssassin',
    name: 'Shadow Assassin',
    rarity: 'legendary',
    price: 3000,
    description: 'Dark shadows with crimson glow',
    gradientColors: ['#0a0a0a', '#1a0a0f', '#2d0a1f'],
    borderColor: 'rgba(239, 68, 68, 0.8)',
    borderWidth: 2,
    borderGlow: true,
    animated: true,
    animationType: 'glow',
    glowColor: '#ef4444',
    shadowColor: '#dc2626',
  },

  goldRoyale: {
    id: 'goldRoyale',
    name: 'Gold Royale',
    rarity: 'mythic',
    price: 5000,
    description: 'Regal gold with crown particles',
    gradientColors: ['#b8860b', '#daa520', '#ffd700'],
    borderColor: 'rgba(255, 215, 0, 0.8)',
    borderWidth: 1,
    borderGlow: true,
    animated: true,
    animationType: 'particles',
    particles: {
      type: 'sparkles',
      count: 20,
      colors: ['#ffd700', '#ffed4e', '#ffffff'],
    },
  },

  rgbGaming: {
    id: 'rgbGaming',
    name: 'RGB Gaming',
    rarity: 'epic',
    price: 1800,
    description: 'Cycling rainbow border effect',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderColor: '#000000ff',
    borderWidth: 1,
    borderGlow: true,
    animated: true,
    animationType: 'wave',
    animationSpeed: 2,
  },

  retroWave: {
    id: 'retroWave',
    name: 'Retro Wave',
    rarity: 'epic',
    price: 1500,
    description: '80s synthwave aesthetic',
    gradientColors: ['#1a0b2e', '#3d1f47', '#ff00ff', '#00ffff'],
    borderColor: 'rgba(255, 0, 255, 0.7)',
    borderWidth: 2,
    borderGlow: true,
    animated: true,
    animationType: 'wave',
    overlayPattern: 'grid',
  },

  // SEASONAL THEMES
  winterFrost: {
    id: 'winterFrost',
    name: 'Winter Frost',
    rarity: 'rare',
    price: 750,
    description: 'Icy blue with snowflakes',
    gradientColors: ['#dbeafe', '#bfdbfe', '#93c5fd'],
    borderColor: 'rgba(147, 197, 253, 0.6)',
    borderWidth: 2,
    animated: true,
    animationType: 'particles',
    particles: {
      type: 'snow',
      count: 15,
      colors: ['#ffffff', '#e0f2fe', '#bae6fd'],
    },
  },

  autumnHarvest: {
    id: 'autumnHarvest',
    name: 'Autumn Harvest',
    rarity: 'rare',
    price: 750,
    description: 'Warm autumn with falling leaves',
    gradientColors: ['#78350f', '#92400e', '#b45309'],
    borderColor: 'rgba(251, 146, 60, 0.5)',
    borderWidth: 2,
    animated: true,
    animationType: 'particles',
    particles: {
      type: 'leaves',
      count: 12,
      colors: ['#f97316', '#fb923c', '#fdba74'],
    },
  },

  halloweenSpooky: {
    id: 'halloweenSpooky',
    name: 'Halloween Spooky',
    rarity: 'epic',
    price: 1000,
    description: 'Spooky purple and orange vibes',
    gradientColors: ['#2e1065', '#5b21b6', '#f97316'],
    borderColor: 'rgba(249, 115, 22, 0.7)',
    borderWidth: 2,
    borderGlow: true,
    animated: true,
    animationType: 'pulse',
    glowColor: '#a855f7',
  },

  lunarNewYear: {
    id: 'lunarNewYear',
    name: 'Lunar New Year',
    rarity: 'legendary',
    price: 2000,
    description: 'Red and gold with fireworks',
    gradientColors: ['#7f1d1d', '#dc2626', '#fbbf24'],
    borderColor: 'rgba(251, 191, 36, 0.8)',
    borderWidth: 3,
    borderGlow: true,
    animated: true,
    animationType: 'particles',
    particles: {
      type: 'sparkles',
      count: 18,
      colors: ['#fbbf24', '#f59e0b', '#dc2626'],
    },
  },
  flowerGarden: {
    id: 'flowerGarden',
    name: 'Flower Garden',
    rarity: 'epic',
    price: 10,
    description: 'Blooming flowers with butterflies',
    gradientColors: ['#fce7f3', '#fbcfe8', '#f9a8d4'],
    animated: true,
    animationType: 'particles',
    particles: {
        type: 'petals',  // Already supported!
        count: 20,
        colors: ['#ec4899', '#f472b6', '#fb7185']
    }
    },
};

// Helper function to get theme by ID
export const getTheme = (themeId: string): FriendCardTheme => {
  return FRIEND_CARD_THEMES[themeId] || FRIEND_CARD_THEMES.default;
};

// Helper function to get themes by rarity
export const getThemesByRarity = (rarity: ThemeRarity): FriendCardTheme[] => {
  return Object.values(FRIEND_CARD_THEMES).filter(theme => theme.rarity === rarity);
};

// Helper function to get all themes sorted by price
export const getAllThemesSorted = (): FriendCardTheme[] => {
  return Object.values(FRIEND_CARD_THEMES).sort((a, b) => a.price - b.price);
};