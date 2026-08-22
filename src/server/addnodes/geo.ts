// Country and ASN lookup from range CSVs baked into the image.
//
// Data: sapics/ip-location-db, the `iptoasn-*` sets, which are PDDL /
// public-domain — no key, no attribution requirement, no runtime network
// call. Files live in data/geo/ and are refreshed only when the image is
// rebuilt; that staleness is fine for a country label on a node list.
//
// Missing or unreadable files are NOT an error: enrichment is skipped and the
// run carries on, because a node list without country comments is still a
// working node list.

import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { parseIpv4, parseIpv6 } from './addr';
import { log } from '../log';

export interface GeoInfo {
  cc: string | null;
  asn: number | null;
  asnOrg: string | null;
}

interface Range {
  start: bigint;
  end: bigint;
  value: string;
}

type Table = Range[];

function toBigInt(bytes: number[]): bigint {
  let out = BigInt(0);
  for (const b of bytes) out = (out * BigInt(256)) + BigInt(b);
  return out;
}

function ipToBigInt(ip: string): { key: bigint; v6: boolean } | null {
  const v4 = parseIpv4(ip);
  if (v4) return { key: toBigInt(v4), v6: false };
  const v6 = parseIpv6(ip);
  if (v6) return { key: toBigInt(v6), v6: true };
  return null;
}

/**
 * Split a CSV line on commas, honouring double-quoted fields — AS names
 * routinely contain commas ("Foo Ltd., Inc").
 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function loadTable(file: string, valueColumns: number[]): Table {
  if (!existsSync(file)) {
    log.warn('geo data missing, skipping that lookup', { file });
    return [];
  }
  const rows: Table = [];
  const text = readFileSync(file, 'utf8');
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const cols = splitCsvLine(line);
    if (cols.length < 3) continue;
    const start = ipToBigInt(cols[0].trim());
    const end = ipToBigInt(cols[1].trim());
    if (!start || !end) continue;
    rows.push({
      start: start.key,
      end: end.key,
      value: valueColumns.map((c) => (cols[c] ?? '').trim()).join('\t'),
    });
  }
  // The upstream files are already sorted, but a binary search that silently
  // returns nonsense on unsorted input is not worth the risk.
  rows.sort((a, b) => {
    if (a.start < b.start) return -1;
    if (a.start > b.start) return 1;
    return 0;
  });
  return rows;
}

function search(table: Table, key: bigint): string | null {
  let lo = 0;
  let hi = table.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const row = table[mid];
    if (key < row.start) hi = mid - 1;
    else if (key > row.end) lo = mid + 1;
    else return row.value;
  }
  return null;
}

export class GeoLookup {
  private countryV4: Table = [];

  private countryV6: Table = [];

  private asnV4: Table = [];

  private asnV6: Table = [];

  constructor(private dir: string) {}

  static fromEnv(): GeoLookup {
    const dir = process.env.ADDNODES_GEO_DIR
      || path.join(process.cwd(), 'data', 'geo');
    const g = new GeoLookup(dir);
    g.load();
    return g;
  }

  load(): void {
    this.countryV4 = loadTable(path.join(this.dir, 'iptoasn-country-ipv4.csv'), [2]);
    this.countryV6 = loadTable(path.join(this.dir, 'iptoasn-country-ipv6.csv'), [2]);
    this.asnV4 = loadTable(path.join(this.dir, 'iptoasn-asn-ipv4.csv'), [2, 3]);
    this.asnV6 = loadTable(path.join(this.dir, 'iptoasn-asn-ipv6.csv'), [2, 3]);
    log.info('geo tables loaded', {
      countryV4: this.countryV4.length,
      countryV6: this.countryV6.length,
      asnV4: this.asnV4.length,
      asnV6: this.asnV6.length,
    });
  }

  get available(): boolean {
    return this.countryV4.length > 0 || this.asnV4.length > 0;
  }

  lookup(ip: string): GeoInfo {
    const parsed = ipToBigInt(ip);
    if (!parsed) return { cc: null, asn: null, asnOrg: null };

    const ccRaw = search(parsed.v6 ? this.countryV6 : this.countryV4, parsed.key);
    const asnRaw = search(parsed.v6 ? this.asnV6 : this.asnV4, parsed.key);

    const cc = ccRaw && /^[A-Za-z]{2}$/.test(ccRaw) ? ccRaw.toUpperCase() : null;

    let asn: number | null = null;
    let asnOrg: string | null = null;
    if (asnRaw) {
      const [asnStr, org] = asnRaw.split('\t');
      const n = Number(asnStr);
      if (Number.isInteger(n) && n > 0) asn = n;
      // iptoasn uses "Not routed" as a placeholder rather than an empty cell.
      if (org && org.toLowerCase() !== 'not routed') asnOrg = org.slice(0, 128);
    }

    return { cc, asn, asnOrg };
  }
}
