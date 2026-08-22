// Kysely connection to the `addnodes` schema on the shared MariaDB.
//
// Two very different callers share this module:
//   - the Next server, which holds one long-lived pool and only ever touches
//     `reports` (ingest) and the read queries behind /nodes/<id>;
//   - the job, a short-lived process that does the heavy lifting and then
//     exits, so it must be able to close the pool explicitly or node hangs.
//
// The pool is cached on globalThis so Next's dev-mode module reloading does
// not leak a new pool on every edit — the same trick grc-control uses.

import { Kysely, MysqlDialect } from 'kysely';
import { createPool, type Pool } from 'mysql2';
import { createConnection } from 'mysql2/promise';
import type { Database } from './database';
import { log } from '../log';

const DEFAULT_URL = 'mysql://root:root@127.0.0.1:3306/addnodes';

export function databaseUrl(): string {
  return process.env.ADDNODES_DATABASE_URL || DEFAULT_URL;
}

/**
 * The schema name out of the DSN. Interpolated into DDL below, where a
 * placeholder is not allowed, so the shape is checked rather than trusted.
 */
export function databaseNameFromUrl(url: string): string {
  const name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  if (!name) throw new Error('ADDNODES_DATABASE_URL names no database');
  if (!/^[A-Za-z0-9_$]+$/.test(name)) {
    throw new Error(`ADDNODES_DATABASE_URL database name is not a plain identifier: ${name}`);
  }
  return name;
}

/**
 * Create the schema if it is not there yet, so a fresh MariaDB needs no
 * hand-run SQL. MariaDB's docker-entrypoint-initdb.d only fires on an empty
 * datadir, so on a box that has been up a while a database added to that
 * script is never created — this closes the gap from the job's side.
 *
 * CREATE DATABASE takes no placeholders and cannot run over a connection
 * already bound to a missing schema, so this opens its own short-lived one
 * with no database selected. A user granted `ALL ON <name>.*` may create
 * exactly that database, which is what the family's `admin` has. The DDL is
 * skipped entirely when the schema is already there, so a user with no
 * CREATE privilege is not an error on an existing install.
 */
export async function ensureDatabase(): Promise<void> {
  const url = new URL(databaseUrl());
  const name = databaseNameFromUrl(databaseUrl());
  url.pathname = '/';

  const conn = await createConnection({ uri: url.toString() });
  try {
    const [rows] = await conn.query('SHOW DATABASES LIKE ?', [name]);
    if (Array.isArray(rows) && rows.length > 0) return;

    // IF NOT EXISTS as well as the check above: two job containers starting
    // together would both see it missing.
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    log.info(`created database ${name}`);
  } finally {
    await conn.end();
  }
}

interface Cache {
  pool?: Pool;
  db?: Kysely<Database>;
}

const cache: Cache = ((globalThis as any).__addnodesDb ??= {} as Cache);

function createDb(): Kysely<Database> {
  const pool = createPool({
    uri: databaseUrl(),
    connectionLimit: 5,
    // MariaDB hands BIGINT back as a JS number by default, which silently
    // loses precision past 2^53. Nothing in this schema is that large today,
    // but ids are BIGINT UNSIGNED and the family convention (grc-control's
    // db.ts) is to be explicit rather than lucky.
    supportBigNumbers: true,
    bigNumberStrings: false,
    // DATETIME columns come back as Date objects; without this mysql2 hands
    // back strings in the connection's timezone and every comparison drifts.
    dateStrings: false,
    timezone: 'Z',
  });

  cache.pool = pool;
  return new Kysely<Database>({ dialect: new MysqlDialect({ pool }) });
}

export function getDb(): Kysely<Database> {
  cache.db ??= createDb();
  return cache.db;
}

/**
 * Close the pool. The job must call this before exiting; the Next server
 * never should.
 */
export async function closeDb(): Promise<void> {
  if (cache.db) {
    await cache.db.destroy();
    cache.db = undefined;
    cache.pool = undefined;
  }
}

/** Single source of truth for "now" so tests can freeze it. */
export function now(): Date {
  return new Date();
}

/** Truncate a timestamp to the top of its hour, the observations bucket key. */
export function hourBucket(at: Date): Date {
  const d = new Date(at);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

/** MariaDB DATE column key for the daily rollup. */
export function dayKey(at: Date): string {
  return at.toISOString().slice(0, 10);
}

export type { Database } from './database';
