// Migration runner. Owned by the JOB, never by the Next server — a
// page-render process must not be racing DDL, and Kysely's migration lock
// only serialises runners that actually take it.
//
// FileMigrationProvider reads the compiled .js out of dist/, so tsconfig.jobs
// has to keep emitting src/server/db/migrations/*.

import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import { FileMigrationProvider, Migrator } from 'kysely';
import { ensureDatabase, getDb } from './index';
import { log } from '../log';

export async function migrateToLatest(): Promise<void> {
  // Kysely cannot connect to a schema that is not there, and on an existing
  // datadir nothing else creates it. Every job command routes through here.
  await ensureDatabase();

  const migrator = new Migrator({
    db: getDb(),
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  for (const it of results ?? []) {
    if (it.status === 'Success') {
      log.info(`migration applied: ${it.migrationName}`);
    } else if (it.status === 'Error') {
      log.error(`migration failed: ${it.migrationName}`);
    }
  }

  if (error) throw error;
}
