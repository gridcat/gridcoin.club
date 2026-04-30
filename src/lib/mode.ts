export type ThemeMode = 'light' | 'dark';

export const DEFAULT_THEME: ThemeMode = 'light';

// Resolve the cookie `domain` attribute so the theme preference is
// shared across the apex (gridcoin.club) and every *.gridcoin.club
// subdomain. Returning `null` means "scope to the current host only" —
// used for localhost / IP-only / non-club hosts where browsers reject
// a cookie whose domain isn't a registrable suffix of the current host.
function sharedCookieDomain(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  if (host === 'gridcoin.club' || host.endsWith('.gridcoin.club')) {
    return '.gridcoin.club';
  }
  return null;
}

export function saveTheme(theme: ThemeMode) {
  const domain = sharedCookieDomain();
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const parts = [
    `theme=${theme}`,
    'path=/',
    'max-age=31536000',
    'samesite=lax',
  ];
  if (domain) parts.push(`domain=${domain}`);
  if (isSecure) parts.push('secure');
  document.cookie = parts.join('; ');
}

export function getThemeFromCookie(): ThemeMode {
  if (typeof document === 'undefined') {
    return DEFAULT_THEME;
  }
  const match = document.cookie.match(/theme=(dark|light)/);
  if (match) {
    const theme = match[1];
    if (theme === 'light' || theme === 'dark') {
      return theme as ThemeMode;
    }
  }
  return DEFAULT_THEME;
}

export function toggleTheme(current: ThemeMode): void {
  const newTheme = current === 'light' ? 'dark' : 'light';
  saveTheme(newTheme);
}
