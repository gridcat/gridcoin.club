// Validation for the peer-sharing endpoint.
//
// Split out from the route handler so the whole contract can be tested
// without HTTP: what a wallet is allowed to send, what we refuse, and what we
// write down. The route itself is then thin enough to read in one screen.
//
// What is deliberately NOT accepted here is as important as what is. The
// consent screen in the TUI promises that a report carries peer addresses and
// nothing else — no wallet addresses, no balances, no CPID, not even the
// peers' version strings. Widening this shape later means revisiting consent,
// not just editing a schema.

import { createHash } from 'node:crypto';
import { formatEndpoint, parseEndpoint } from './addr';
import type { Network } from '../db/database';

export const MAX_PEERS_PER_REPORT = 64;
/**
 * Ceiling on a report body. Enforced by nginx (`client_max_body_size`) and
 * re-checked in the route: this version of Next allows only `runtime` and
 * `maxDuration` in a route config export, so the body parser cannot be
 * configured per-route any more.
 */
export const MAX_BODY_BYTES = 16 * 1024;
export const SUPPORTED_VERSION = 1;

/** How long a client should wait before reporting again. */
export const NEXT_REPORT_AFTER_SECONDS = 3600;

export interface ValidReport {
  reporterHash: string;
  client: string;
  network: Network;
  peers: string[];
  accepted: number;
  rejected: number;
}

export type ValidationError =
  | 'bad_json'
  | 'unsupported_version'
  | 'bad_reporter'
  | 'bad_client'
  | 'bad_network'
  | 'bad_peers'
  | 'no_valid_peers';

export type ValidationResult =
  | { ok: true; report: ValidReport }
  | { ok: false; error: ValidationError };

/**
 * The reporter id never reaches disk in the form the client holds.
 *
 * A client keeps a random 32-hex id so we can count distinct vantage points;
 * we store the first 16 hex of its SHA-256. That is enough to group reports
 * and to ban an abusive one, and it means the table cannot be correlated back
 * to a value anybody still has.
 */
export function hashReporter(reporter: string): string {
  return createHash('sha256').update(reporter).digest('hex').slice(0, 16);
}

const REPORTER_RE = /^[0-9a-f]{32}$/;
const CLIENT_RE = /^[\w.\-/+ ]{1,64}$/;

export function validateReport(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'bad_json' };
  }
  const body = raw as Record<string, unknown>;

  if (body.v !== SUPPORTED_VERSION) return { ok: false, error: 'unsupported_version' };

  const reporter = typeof body.reporter === 'string' ? body.reporter.toLowerCase() : '';
  if (!REPORTER_RE.test(reporter)) return { ok: false, error: 'bad_reporter' };

  const client = typeof body.client === 'string' ? body.client.trim() : '';
  if (!CLIENT_RE.test(client)) return { ok: false, error: 'bad_client' };

  const network = body.network === 'main' || body.network === 'test'
    ? (body.network as Network)
    : null;
  if (!network) return { ok: false, error: 'bad_network' };

  if (!Array.isArray(body.peers)) return { ok: false, error: 'bad_peers' };
  if (body.peers.length > MAX_PEERS_PER_REPORT) return { ok: false, error: 'bad_peers' };

  const seen = new Set<string>();
  let rejected = 0;
  for (const entry of body.peers) {
    if (typeof entry !== 'string') {
      rejected += 1;
      continue;
    }
    // parseEndpoint is the same routability check the harvester and the seed
    // importer use, so a peer the wallet reports cannot be accepted here and
    // rejected elsewhere. Private, loopback and CGNAT ranges never survive it.
    const endpoint = parseEndpoint(entry);
    if (!endpoint) {
      rejected += 1;
      continue;
    }
    // formatEndpoint, not string concatenation: an IPv6 address written
    // as host:port is ambiguous and parseEndpoint cannot read it back, so
    // the job would drop every v6 peer on intake.
    seen.add(formatEndpoint(endpoint));
  }

  const peers = Array.from(seen);
  if (!peers.length) return { ok: false, error: 'no_valid_peers' };

  return {
    ok: true,
    report: {
      reporterHash: hashReporter(reporter),
      client,
      network,
      peers,
      accepted: peers.length,
      rejected,
    },
  };
}

/**
 * Client address, for rate limiting only — never persisted.
 *
 * Cloudflare fronts the origin, so CF-Connecting-IP is the real client when
 * the request came through it. Both this and X-Forwarded-For are forgeable by
 * anyone who reaches the origin directly, which is why the limiter is defence
 * in depth and not the thing that decides what gets published.
 */
export function clientAddress(headers: {
  'cf-connecting-ip'?: string | string[];
  'x-forwarded-for'?: string | string[];
}, socketAddress?: string): string {
  const first = (value: string | string[] | undefined): string | null => {
    if (!value) return null;
    const v = Array.isArray(value) ? value[0] : value;
    const head = v.split(',')[0]?.trim();
    return head || null;
  };
  return first(headers['cf-connecting-ip'])
    ?? first(headers['x-forwarded-for'])
    ?? socketAddress
    ?? 'unknown';
}
