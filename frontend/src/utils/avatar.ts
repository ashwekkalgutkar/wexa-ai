// Deterministic Seeded Avatar Gradient Generator for Artist Nodes

const GRADIENT_PALETTES = [
  { bg: ['#e0e7ff', '#c7d2fe'], text: '#3730a3', ring: '#818cf8' }, // Soft Indigo
  { bg: ['#fae8ff', '#f5d0fe'], text: '#86198f', ring: '#c084fc' }, // Soft Purple
  { bg: ['#ffe4e6', '#fecdd3'], text: '#9f1239', ring: '#fb7185' }, // Soft Rose
  { bg: ['#e0f2fe', '#bae6fd'], text: '#075985', ring: '#38bdf8' }, // Soft Sky
  { bg: ['#dcfce7', '#bbf7d0'], text: '#166534', ring: '#4ade80' }, // Soft Emerald
  { bg: ['#fef3c7', '#fde68a'], text: '#92400e', ring: '#fbbf24' }, // Soft Amber
  { bg: ['#ede9fe', '#ddd6fe'], text: '#5b21b6', ring: '#a78bfa' }, // Soft Violet
  { bg: ['#ccfbf1', '#99f6e4'], text: '#115e59', ring: '#2dd4bf' }, // Soft Teal
];

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getArtistInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getArtistAvatarData(name: string) {
  const hash = simpleHash(name || '');
  const palette = GRADIENT_PALETTES[hash % GRADIENT_PALETTES.length];
  const initials = getArtistInitials(name);

  return {
    color1: palette.bg[0],
    color2: palette.bg[1],
    textColor: palette.text,
    ringColor: palette.ring,
    initials,
  };
}
