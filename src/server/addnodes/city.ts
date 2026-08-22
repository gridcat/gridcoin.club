// City and coordinate lookup, streamed.
//
// Data: sapics/ip-location-db, the `dbip-city-*` sets. Unlike the iptoasn
// tables next door these are CC BY 4.0 — DB-IP ask for a link back to
// db-ip.com on any page that shows results, which /nodes/all carries. The
// GeoLite2 equivalent is CC BY-SA, and that share-alike would arguably reach
// our own published lists, which is why this is dbip.
//
// Streamed rather than loaded. The country and ASN tables are a few hundred
// thousand rows and sit in memory happily; the city tables are millions, and
// holding them would cost more RAM than the whole rest of the job. Instead
// each run makes ONE pass per address family over the gzip, resolving every
// pending address together:
//
//   - the file is sorted by range start, so the pending keys get sorted too
//     and the two are walked in lockstep, O(rows + keys) with no seeking
//   - a run with nothing to enrich never opens the file at all
//
// Missing or unreadable files are NOT an error, the same posture as geo.ts:
// enrichment falls back to the country centroid and the run carries on.

import { createReadStream, existsSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import * as path from 'node:path';
import { parseIpv4, parseIpv6 } from './addr';
import { splitCsvLine } from './geo';
import { log } from '../log';

export interface CityInfo {
  city: string | null;
  lat: number | null;
  lon: number | null;
}

// dbip-city columns: start, end, cc, state1, state2, city, postcode, lat, lon,
// timezone.
const COL_START = 0;
const COL_END = 1;
const COL_CITY = 5;
const COL_LAT = 7;
const COL_LON = 8;

function toBigInt(bytes: number[]): bigint {
  let out = BigInt(0);
  for (const b of bytes) out = (out * BigInt(256)) + BigInt(b);
  return out;
}

function ipKey(ip: string): { key: bigint; v6: boolean } | null {
  const v4 = parseIpv4(ip);
  if (v4) return { key: toBigInt(v4), v6: false };
  const v6 = parseIpv6(ip);
  if (v6) return { key: toBigInt(v6), v6: true };
  return null;
}

function coordinate(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function cityDir(): string {
  return process.env.ADDNODES_GEO_DIR || path.join(process.cwd(), 'data', 'geo');
}

interface Pending {
  ip: string;
  key: bigint;
}

/**
 * One pass over one file, assigning every pending key that falls in a range.
 *
 * Both sides are sorted ascending, so this walks them together: skip pending
 * keys that fall before the current range, then take every key inside it.
 */
async function resolveFile(
  file: string,
  pending: Pending[],
  out: Map<string, CityInfo>,
): Promise<void> {
  if (!pending.length) return;
  if (!existsSync(file)) {
    log.warn('city table missing, falling back to country centroids', { file });
    return;
  }

  const sorted = pending.slice().sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  let cursor = 0;

  const lines = createInterface({
    input: createReadStream(file).pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  try {
    for await (const line of lines) {
      if (cursor >= sorted.length) break;
      if (!line) continue;

      const cols = splitCsvLine(line);
      const startRaw = cols[COL_START];
      const endRaw = cols[COL_END];
      if (!startRaw || !endRaw) continue;

      const start = ipKey(startRaw);
      const end = ipKey(endRaw);
      if (!start || !end) continue;

      // Everything still pending below this range is in a gap the database
      // does not cover, so it never resolves — skip it for good.
      while (cursor < sorted.length && sorted[cursor].key < start.key) cursor += 1;

      while (cursor < sorted.length && sorted[cursor].key <= end.key) {
        out.set(sorted[cursor].ip, {
          city: cols[COL_CITY] ? cols[COL_CITY].slice(0, 80) : null,
          lat: coordinate(cols[COL_LAT]),
          lon: coordinate(cols[COL_LON]),
        });
        cursor += 1;
      }
    }
  } finally {
    lines.close();
  }
}

/**
 * Resolve a batch of addresses to city and coordinates.
 *
 * Addresses that are hostnames rather than literals, or that the database
 * does not cover, are simply absent from the result.
 */
export async function resolveCities(
  ips: string[],
  dir = cityDir(),
): Promise<Map<string, CityInfo>> {
  const out = new Map<string, CityInfo>();
  const v4: Pending[] = [];
  const v6: Pending[] = [];

  for (const ip of Array.from(new Set(ips))) {
    const parsed = ipKey(ip);
    if (!parsed) continue;
    (parsed.v6 ? v6 : v4).push({ ip, key: parsed.key });
  }

  await resolveFile(path.join(dir, 'dbip-city-ipv4.csv.gz'), v4, out);
  await resolveFile(path.join(dir, 'dbip-city-ipv6.csv.gz'), v6, out);

  if (v4.length || v6.length) {
    log.info('city lookup complete', {
      requested: v4.length + v6.length, resolved: out.size,
    });
  }
  return out;
}
