// Server-only fetch helper used by SSR sibling-stat fetchers.
// - 2s timeout via AbortController so a hung sibling never stalls a render.
// - Swallows errors and returns null; callers decide what to render in the
//   absence of data (typically a "status unavailable" line in the tile).
// - Sets a User-Agent so sibling APIs can identify hub-originated traffic.

const DEFAULT_TIMEOUT_MS = 2000;
const USER_AGENT = 'gridcoin-club-hub/1.0';

interface ServerFetchOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function serverFetch<T = unknown>(
  url: string,
  options: ServerFetchOptions = {},
): Promise<T | null> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: options.signal ?? controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': USER_AGENT,
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
