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
