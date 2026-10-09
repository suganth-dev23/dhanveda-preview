export const AVAILABLE_CATEGORY_ICONS = [
  'Utensils', 'ShoppingBag', 'Car', 'ShoppingCart', 'Zap', 'Film',
  'Activity', 'Home', 'TrendingUp', 'Plane', 'Briefcase', 'Sparkles',
  'Gift', 'Compass', 'Laptop', 'Building2', 'GraduationCap', 'Coffee',
  'Fuel', 'Wifi', 'Smartphone', 'Tv', 'Heart', 'ShieldAlert', 'ShieldCheck',
  'Wallet', 'CreditCard', 'Landmark', 'CircleDollarSign', 'Tag'
];

export const CATEGORY_COLORS = [
  '#f97316', // Orange
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#eab308', // Yellow
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#22c55e', // Green
  '#a855f7', // Purple
  '#f59e0b', // Amber
  '#64748b', // Slate
];

function getRelativeLuminance(r: number, g: number, b: number): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function parseHex(hex: string): [number, number, number] {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return [100, 116, 139];
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [100, 116, 139];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Returns an accessible CSS style object (background and text color) for category badges
 * guaranteed to meet WCAG AA (>= 4.5:1) contrast against light or dark mode backgrounds.
 */
export function getCategoryBadgeStyle(
  colorHex?: string,
  isDark?: boolean
): React.CSSProperties {
  const isDarkMode = isDark !== undefined
    ? isDark
    : (typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false);

  const rawHex = colorHex || '#64748b';
  let [r, g, b] = parseHex(rawHex);

  if (!isDarkMode) {
    // Light mode: background is tinted on white, text must darken until contrast against white >= 5.5
    for (let i = 0; i < 40; i++) {
      const l = getRelativeLuminance(r, g, b);
      const contrast = 1.05 / (l + 0.05);
      if (contrast >= 5.5) break;
      r = Math.max(0, Math.floor(r * 0.93));
      g = Math.max(0, Math.floor(g * 0.93));
      b = Math.max(0, Math.floor(b * 0.93));
    }
    const textHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    return {
      backgroundColor: `${rawHex}15`,
      color: textHex,
    };
  } else {
    // Dark mode: background is dark (~L=0.015), text must lighten until contrast >= 4.6
    const bgLum = 0.015;
    for (let i = 0; i < 40; i++) {
      const l = getRelativeLuminance(r, g, b);
      const contrast = (l + 0.05) / (bgLum + 0.05);
      if (contrast >= 4.6) break;
      r = Math.min(255, Math.ceil(r + (255 - r) * 0.15));
      g = Math.min(255, Math.ceil(g + (255 - g) * 0.15));
      b = Math.min(255, Math.ceil(b + (255 - b) * 0.15));
    }
    const textHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    return {
      backgroundColor: `${rawHex}20`,
      color: textHex,
    };
  }
}

