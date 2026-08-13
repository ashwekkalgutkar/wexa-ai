// Single Saturated Accent Color for State, Emphasis & Focus
export const ACCENT_COLOR = '#6C5CE7';       // Muted Indigo/Violet Accent
export const ACCENT_HOVER = '#5b4bc4';
export const ACCENT_LIGHT = '#eeedfe';

export const TEXT_MAIN = '#1A1A1A';          // Soft Near-Black Text
export const TEXT_MUTED = '#64748B';         // Muted Charcoal
export const BG_OFFWHITE = '#FAFAF8';        // Warm Off-White Canvas

export const DEFAULT_LINK_COLOR = 'rgba(0, 0, 0, 0.15)'; // Thin 15% opacity gray edges
export const DEFAULT_NODE_RING = 'rgba(0, 0, 0, 0.12)';

export function getRoleBadgeColor(role: string): string {
  switch (role?.toLowerCase()) {
    case 'featured':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'produced':
      return 'bg-[#6C5CE7]/10 text-[#6C5CE7] border-[#6C5CE7]/30';
    case 'wrote':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'remixed':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'band_member':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function hexToRgba(hex: string, alpha: number = 1): string {
  if (!hex || typeof hex !== 'string') return `rgba(108, 92, 231, ${alpha})`;
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return `rgba(108, 92, 231, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function darkenHex(hex: string, percent: number = 20): string {
  if (!hex || typeof hex !== 'string') return '#1e1b4b';
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return '#1e1b4b';
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
