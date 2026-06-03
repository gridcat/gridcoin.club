// Centralized link-rel policy.
// Dofollow only for our own resources; everything else is nofollow.
// Adds noopener/noreferrer when target="_blank" for security.
//
// Whitelisted (dofollow):
//   - gridcoin.us
//   - gridcoin.club and any *.gridcoin.club subdomain
//   - grcbazaar.com (our marketplace — own property on its own apex domain)
//   - github.com/gridcat/* (gridcat's repos)
//   - github.com/gridcoin-community/* (community repos)

const GITHUB_ORG_ALLOWLIST = new Set(['gridcat', 'gridcoin-community']);

function isDofollowHost(host: string): boolean {
  return (
    host === 'gridcoin.us'
    || host === 'gridcoin.club'
    || host.endsWith('.gridcoin.club')
    || host === 'grcbazaar.com'
  );
}

function isDofollowGithubPath(host: string, pathname: string): boolean {
  if (host !== 'github.com') return false;
  const segments = pathname.split('/').filter(Boolean);
  return segments.length > 0 && GITHUB_ORG_ALLOWLIST.has(segments[0].toLowerCase());
}

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export function linkRel(href: string | undefined, target?: string): string | undefined {
  if (!href || !isExternal(href)) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return undefined;
  }

  const host = url.hostname.toLowerCase();
  const dofollow = isDofollowHost(host) || isDofollowGithubPath(host, url.pathname);
  const blank = target === '_blank';

  const parts: string[] = [];
  if (!dofollow) parts.push('nofollow');
  if (blank) parts.push('noopener', 'noreferrer');

  return parts.length > 0 ? parts.join(' ') : undefined;
}
