import { describe, expect, it } from 'vitest';
import { isBlocked, toRules } from '@/server/addnodes/blocklist';

describe('isBlocked', () => {
  const rules = toRules([
    { kind: 'ip', pattern: '203.0.113.7' },
    { kind: 'cidr', pattern: '198.51.100.0/24' },
    { kind: 'host', pattern: 'Example.NET' },
  ]);

  it('matches an exact address', () => {
    expect(isBlocked('203.0.113.7', rules)).toBe(true);
    expect(isBlocked('203.0.113.8', rules)).toBe(false);
  });

  it('matches inside a cidr', () => {
    expect(isBlocked('198.51.100.42', rules)).toBe(true);
    expect(isBlocked('198.51.101.42', rules)).toBe(false);
  });

  it('matches a hostname and its subdomains, case-insensitively', () => {
    expect(isBlocked('example.net', rules)).toBe(true);
    expect(isBlocked('NODE1.Example.net', rules)).toBe(true);
    // Not a subdomain — a suffix match here would block an unrelated domain.
    expect(isBlocked('notexample.net', rules)).toBe(false);
  });

  it('blocks nothing when there are no rules', () => {
    expect(isBlocked('203.0.113.7', [])).toBe(false);
  });
});
