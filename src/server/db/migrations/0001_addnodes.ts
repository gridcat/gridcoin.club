import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('nodes')
    .addColumn('id', 'bigint', (c) => c.autoIncrement().primaryKey())
    .addColumn('network', sql`enum('main','test')`, (c) => c.notNull())
    .addColumn('host', 'varchar(255)', (c) => c.notNull())
    .addColumn('port', 'integer', (c) => c.notNull())
    .addColumn('first_seen_at', 'datetime', (c) => c.notNull())
    .addColumn('last_seen_at', 'datetime', (c) => c.notNull())
    .addColumn('last_online_at', 'datetime')
    .addColumn('ptr', 'varchar(255)')
    .addColumn('ptr_checked_at', 'datetime')
    .addColumn('cc', 'char(2)')
    .addColumn('asn', 'integer')
    .addColumn('asn_org', 'varchar(128)')
    .addColumn('geo_checked_at', 'datetime')
    .addColumn('status', sql`enum('new','online','unreachable','dead')`, (c) => c.notNull().defaultTo('new'))
    .addColumn('last_probe_at', 'datetime')
    .addColumn('last_probe_ok_at', 'datetime')
    .addColumn('probe_fail_streak', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('next_probe_at', 'datetime', (c) => c.notNull())
    .addColumn('pinned', sql`tinyint`, (c) => c.notNull().defaultTo(0))
    .addColumn('excluded', sql`tinyint`, (c) => c.notNull().defaultTo(0))
    .addColumn('label', 'varchar(64)')
    .addColumn('notes', 'text')
    .execute();

  await db.schema
    .createIndex('nodes_endpoint')
    .on('nodes')
    .columns(['network', 'host', 'port'])
    .unique()
    .execute();

  // The publish query filters on (network, status) and the probe queue orders
  // by next_probe_at; both are hot every run.
  await db.schema.createIndex('nodes_net_status').on('nodes').columns(['network', 'status']).execute();
  await db.schema.createIndex('nodes_next_probe').on('nodes').column('next_probe_at').execute();

  await db.schema
    .createTable('node_sources')
    .addColumn('node_id', 'bigint', (c) => c.notNull())
    .addColumn('source', sql`enum('report','daemon','seed','probe')`, (c) => c.notNull())
    .addColumn('first_seen_at', 'datetime', (c) => c.notNull())
    .addColumn('last_seen_at', 'datetime', (c) => c.notNull())
    .addColumn('hits', 'bigint', (c) => c.notNull().defaultTo(0))
    .addPrimaryKeyConstraint('node_sources_pk', ['node_id', 'source'])
    .execute();

  await db.schema
    .createTable('observations')
    .addColumn('node_id', 'bigint', (c) => c.notNull())
    .addColumn('hour_bucket', 'datetime', (c) => c.notNull())
    .addColumn('probe_ok', sql`tinyint`)
    .addColumn('distinct_reporters', 'smallint', (c) => c.notNull().defaultTo(0))
    .addPrimaryKeyConstraint('observations_pk', ['node_id', 'hour_bucket'])
    .execute();

  // Pruning scans by age across all nodes, so it needs its own index —
  // the PK is node-major and useless for that.
  await db.schema.createIndex('observations_hour').on('observations').column('hour_bucket').execute();

  await db.schema
    .createTable('node_daily')
    .addColumn('node_id', 'bigint', (c) => c.notNull())
    .addColumn('day', 'date', (c) => c.notNull())
    .addColumn('probes', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('successes', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('downtime_minutes', 'integer', (c) => c.notNull().defaultTo(0))
    .addPrimaryKeyConstraint('node_daily_pk', ['node_id', 'day'])
    .execute();

  await db.schema.createIndex('node_daily_day').on('node_daily').column('day').execute();

  await db.schema
    .createTable('node_events')
    .addColumn('id', 'bigint', (c) => c.autoIncrement().primaryKey())
    .addColumn('node_id', 'bigint', (c) => c.notNull())
    .addColumn('at', 'datetime', (c) => c.notNull())
    .addColumn('event', sql`enum('discovered','up','down')`, (c) => c.notNull())
    .addColumn('prev_event_at', 'datetime')
    .execute();

  await db.schema.createIndex('node_events_node_at').on('node_events').columns(['node_id', 'at']).execute();

  await db.schema
    .createTable('reporters')
    .addColumn('reporter_hash', 'char(16)', (c) => c.primaryKey())
    .addColumn('first_seen_at', 'datetime', (c) => c.notNull())
    .addColumn('last_seen_at', 'datetime', (c) => c.notNull())
    .addColumn('report_count', 'bigint', (c) => c.notNull().defaultTo(0))
    .addColumn('banned', sql`tinyint`, (c) => c.notNull().defaultTo(0))
    .execute();

  await db.schema
    .createTable('reports')
    .addColumn('id', 'bigint', (c) => c.autoIncrement().primaryKey())
    .addColumn('received_at', 'datetime', (c) => c.notNull())
    .addColumn('reporter_hash', 'char(16)', (c) => c.notNull())
    .addColumn('client', 'varchar(64)', (c) => c.notNull())
    .addColumn('network', sql`enum('main','test')`, (c) => c.notNull())
    .addColumn('peers', 'json', (c) => c.notNull())
    .addColumn('processed_at', 'datetime')
    .execute();

  // The job claims work with `where processed_at is null order by id`, and
  // the ingest backstop counts the same rows.
  await db.schema.createIndex('reports_unprocessed').on('reports').columns(['processed_at', 'id']).execute();

  await db.schema
    .createTable('blocklist')
    .addColumn('id', 'bigint', (c) => c.autoIncrement().primaryKey())
    .addColumn('pattern', 'varchar(255)', (c) => c.notNull())
    .addColumn('kind', sql`enum('host','ip','cidr')`, (c) => c.notNull())
    .addColumn('reason', 'varchar(255)')
    .addColumn('created_at', 'datetime', (c) => c.notNull())
    .addColumn('created_by', 'varchar(64)')
    .execute();

  await db.schema.createIndex('blocklist_pattern').on('blocklist').column('pattern').unique().execute();

  await db.schema
    .createTable('admin_actions')
    .addColumn('id', 'bigint', (c) => c.autoIncrement().primaryKey())
    .addColumn('at', 'datetime', (c) => c.notNull())
    .addColumn('actor', 'varchar(64)', (c) => c.notNull())
    .addColumn(
      'action',
      sql`enum('block','unblock','pin','unpin','exclude','include','label','note','ban','unban','probe')`,
      (c) => c.notNull(),
    )
    .addColumn('target_kind', sql`enum('node','reporter','pattern')`, (c) => c.notNull())
    .addColumn('target', 'varchar(255)', (c) => c.notNull())
    .addColumn('detail', 'json')
    .execute();

  await db.schema.createIndex('admin_actions_at').on('admin_actions').column('at').execute();

  await db.schema
    .createTable('runs')
    .addColumn('id', 'bigint', (c) => c.autoIncrement().primaryKey())
    .addColumn('started_at', 'datetime', (c) => c.notNull())
    .addColumn('duration_ms', 'integer')
    .addColumn('reports_ingested', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('nodes_probed', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('published_main', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('published_test', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('error', 'varchar(255)')
    .execute();

  await db.schema.createIndex('runs_started').on('runs').column('started_at').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  for (const t of [
    'runs', 'admin_actions', 'blocklist', 'reports', 'reporters',
    'node_events', 'node_daily', 'observations', 'node_sources', 'nodes',
  ]) {
    await db.schema.dropTable(t).ifExists().execute();
  }
}
