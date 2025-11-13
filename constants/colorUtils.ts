// utils/colorUtils.ts
/**
 * Lightens a hex color by a given percentage
 */
export const lightenColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
};

/**
 * Darkens a hex color by a given percentage
 */
export const darkenColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return "#" + (
    0x1000000 +
    (R > 0 ? R : 0) * 0x10000 +
    (G > 0 ? G : 0) * 0x100 +
    (B > 0 ? B : 0)
  ).toString(16).slice(1);
};

/**
 * Adds alpha transparency to a hex color
 */
export const addAlphaToColor = (color: string, alpha: number): string => {
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${color}${alphaHex}`;
};

/**
 * Gets a complementary color scheme based on the primary color
 */
export const getColorScheme = (primaryColor: string) => {
  return {
    primary: primaryColor,
    light: lightenColor(primaryColor, 35),
    lighter: lightenColor(primaryColor, 50),
    dark: darkenColor(primaryColor, 18),
    darker: darkenColor(primaryColor, 30),
    accent: lightenColor(primaryColor, 20),
    shadow: addAlphaToColor(primaryColor, 0.3),
    overlay: addAlphaToColor(primaryColor, 0.15),
    border: addAlphaToColor(primaryColor, 0.3),
  };
};