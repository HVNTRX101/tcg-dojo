// Generates a solid-color SVG data URI placeholder card image with the card name overlaid
// Used to replace copyrighted placeholder images in mock data

const GAME_COLORS: Record<string, { bg: string; accent: string }> = {
  'Magic: The Gathering': { bg: '#1a1a2e', accent: '#e94560' },
  Pokemon: { bg: '#1b4332', accent: '#ffd60a' },
  'Yu-Gi-Oh!': { bg: '#3d0066', accent: '#ff6b00' },
  'Disney Lorcana': { bg: '#1a1a3e', accent: '#a855f7' },
  'One Piece': { bg: '#7f1d1d', accent: '#f59e0b' },
  Digimon: { bg: '#0c4a6e', accent: '#06b6d4' },
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateCardPlaceholder(name: string, game: string, rarity?: string): string {
  const colors = GAME_COLORS[game] || { bg: '#1f2937', accent: '#6366f1' };
  const escapedName = escapeXml(name);
  const escapedGame = escapeXml(game);
  const escapedRarity = escapeXml(rarity || '');

  // Split long names into two lines
  const maxLineLength = 18;
  let line1 = escapedName;
  let line2 = '';
  if (escapedName.length > maxLineLength) {
    const words = escapedName.split(' ');
    line1 = '';
    line2 = '';
    let onFirst = true;
    for (const word of words) {
      if (onFirst && (line1 + ' ' + word).trim().length <= maxLineLength) {
        line1 = (line1 + ' ' + word).trim();
      } else {
        onFirst = false;
        line2 = (line2 + ' ' + word).trim();
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors.bg}"/>
        <stop offset="100%" style="stop-color:${colors.bg}88"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#bg)" rx="12"/>
    <rect x="20" y="20" width="360" height="360" rx="8" fill="none" stroke="${colors.accent}" stroke-width="2" opacity="0.4"/>
    <rect x="30" y="30" width="340" height="340" rx="6" fill="none" stroke="${colors.accent}" stroke-width="1" opacity="0.2"/>
    <circle cx="200" cy="160" r="60" fill="${colors.accent}" opacity="0.15"/>
    <text x="200" y="150" text-anchor="middle" font-family="system-ui, sans-serif" font-size="42" font-weight="bold" fill="${colors.accent}" opacity="0.3">${escapedName.charAt(0)}</text>
    <text x="200" y="250" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="white">${line1}</text>
    ${line2 ? `<text x="200" y="278" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="white">${line2}</text>` : ''}
    <text x="200" y="${line2 ? 310 : 285}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="${colors.accent}" opacity="0.7">${escapedGame}</text>
    ${escapedRarity ? `<text x="200" y="${line2 ? 330 : 305}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" fill="white" opacity="0.4">${escapedRarity}</text>` : ''}
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function generateAvatarPlaceholder(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
      : parts[0]?.slice(0, 2).toUpperCase() || '?';
  const escaped = escapeXml(initials);
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    hash = (hash << 5) - hash + displayName.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  const bg = `hsl(${hue} 45% 32%)`;
  const accent = `hsl(${hue} 70% 58%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <circle cx="64" cy="64" r="64" fill="${bg}"/>
    <circle cx="64" cy="64" r="56" fill="none" stroke="${accent}" stroke-width="2" opacity="0.5"/>
    <text x="64" y="76" text-anchor="middle" font-family="system-ui, sans-serif" font-size="40" font-weight="700" fill="white">${escaped}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
