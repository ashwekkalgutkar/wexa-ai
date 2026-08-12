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
