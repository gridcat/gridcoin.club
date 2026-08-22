import { describe, expect, it } from 'vitest';
import { databaseNameFromUrl } from '@/server/db/index';

describe('databaseNameFromUrl', () => {
  it('takes the name from the DSN path', () => {
    expect(databaseNameFromUrl('mysql://admin:pw@mysql:3306/addnodes')).toBe('addnodes');
  });

  it('survives a password with URL metacharacters in it', () => {
    expect(databaseNameFromUrl('mysql://admin:p%40ss%2Fword@mysql:3306/addnodes')).toBe('addnodes');
  });

  it('rejects a DSN that names no database', () => {
    expect(() => databaseNameFromUrl('mysql://admin:pw@mysql:3306/')).toThrow(/names no database/);
  });

  it('rejects anything that is not a plain identifier, since it reaches DDL', () => {
    expect(() => databaseNameFromUrl('mysql://admin:pw@mysql:3306/add%60nodes'))
      .toThrow(/plain identifier/);
    expect(() => databaseNameFromUrl('mysql://admin:pw@mysql:3306/add-nodes'))
      .toThrow(/plain identifier/);
  });
});
