// Plausible tagged-events helper.
//
// The Plausible build we self-host at daj.pw/js/plausible.js (used by all
// gridcoin.club sites) supports class-based event tracking: elements with
// class names of the form `plausible-event-name=<event>` fire a custom
// event on click, and `plausible-event-<prop>=<value>` attaches arbitrary
// custom properties. Multiple class names compose normally — apply this
// helper alongside any existing className.
//
// Encoding rules:
//   - Spaces in event names / values become '+' (Plausible decodes back).
//   - Values are coerced to string; falsy values are dropped so the prop
//     doesn't get logged at all rather than as "undefined".
//
// Convention used across the hub:
//   - 'Outbound Service' / 'Outbound Project' / 'Outbound GitHub' for
//     clicks that leave the site.
//   - 'Nav Click' for top-bar nav (with prop `to` and `from`).
//   - 'Hero CTA', 'Fellow See All', '404 Recover' for in-page primary
//     buttons that route to other hub pages.
//   - 'Tag Toggle' (tag, state) for the /projects filter chips.
//   - 'Mode Toggle' (mode) for light/dark switch.
//   - 'Nodes Sort' / 'Nodes Filter' / 'Nodes Search' / 'Nodes Page' /
//     'Map Zoom' for the controls on /nodes/all.
export function plausibleClass(
  eventName: string,
  props: Record<string, string | number | boolean | null | undefined> = {},
): string {
  const enc = (s: string) => String(s).replace(/\s+/g, '+');
  const out = [`plausible-event-name=${enc(eventName)}`];
  for (const [key, raw] of Object.entries(props)) {
    if (raw === null || raw === undefined || raw === '') continue;
    out.push(`plausible-event-${key}=${enc(String(raw))}`);
  }
  return out.join(' ');
}

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

/**
 * Fire an event that is not a click on an element.
 *
 * The class-based form above only works for things the reader clicks, which
 * covers links and buttons and nothing else. Sorting a column, changing a
 * filter or zooming a map are state changes, so they need the call.
 *
 * Silently does nothing when the script has not loaded: an ad blocker, a
 * local dev run, or the testnet build, none of which should throw.
 */
export function trackEvent(
  eventName: string,
  props: Record<string, string | number | boolean | null | undefined> = {},
): void {
  if (typeof window === 'undefined' || typeof window.plausible !== 'function') return;

  const clean: Record<string, string> = {};
  for (const [key, raw] of Object.entries(props)) {
    if (raw === null || raw === undefined || raw === '') continue;
    clean[key] = String(raw);
  }
  window.plausible(eventName, Object.keys(clean).length ? { props: clean } : undefined);
}
