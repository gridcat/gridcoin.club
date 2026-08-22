// Blocklist matching.
//
// A blocklist entry is a promise made to a person who asked to be delisted,
// so it is applied everywhere: before probing, before enrichment, and before
// every published file. That is deliberately broader than `nodes.excluded`,
// which is our own judgement call and only keeps a node out of the .txt.

import { inCidr, normaliseHost } from './addr';
import type { BlocklistRow } from '../db/database';

export interface BlockRule {
  kind: 'host' | 'ip' | 'cidr';
  pattern: string;
}

export function toRules(rows: Pick<BlocklistRow, 'kind' | 'pattern'>[]): BlockRule[] {
  return rows.map((r) => ({ kind: r.kind, pattern: normaliseHost(r.pattern) }));
}

/**
 * `host` matches a rule when:
 *  - kind 'ip'   — exact literal match
 *  - kind 'cidr' — the address falls inside the range
 *  - kind 'host' — exact hostname, or any subdomain of it, so blocking
 *                  "example.net" also covers "node1.example.net"
 */
export function isBlocked(host: string, rules: BlockRule[]): boolean {
  const h = normaliseHost(host);
  return rules.some((rule) => {
    switch (rule.kind) {
      case 'ip':
        return h === rule.pattern;
      case 'cidr':
        return inCidr(h, rule.pattern);
      case 'host':
        return h === rule.pattern || h.endsWith(`.${rule.pattern}`);
      default:
        return false;
    }
  });
}
