import Script from 'next/script';

/**
 * Family-wide Plausible loader. Identical in every *.gridcoin.club
 * frontend: copy it verbatim, don't fork it (docs/frontend-conventions.md).
 *
 * The script and its event beacon are first-party: edge nginx serves
 * /stats/* from the self-hosted instance (grc-infra snippets/gc-plausible.conf),
 * so blockers that list the analytics host don't drop the visit and the CSP
 * stays 'self'. data-api is required: without it the script posts to
 * /api/event, which every family site routes to its backend.
 *
 * Renders nothing unless tracking is enabled and a domain is given, so dev
 * and testnet builds stay silent. `domain` is the Plausible site. `enabled`
 * defaults to NEXT_PUBLIC_TRACK; pass it explicitly when the client bundle
 * can't read that env (explorer computes it server-side in getInitialProps).
 */
export function Analytics({
  domain,
  enabled = process.env.NEXT_PUBLIC_TRACK === 'true',
}: {
  domain: string;
  enabled?: boolean;
}) {
  if (!enabled || !domain) return null;
  return (
    <Script
      src="/stats/js/script.js"
      data-domain={domain}
      data-api="/stats/event"
    />
  );
}
