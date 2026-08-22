// Kysely table types for the `addnodes` schema on the shared MariaDB.
//
// Hand-written rather than generated, matching the family's boring-stack
// convention (grcbazaar, grc-stamp, grc-control all do the same). The
// migrations in ./migrations are the source of truth; this file has to be
// kept in step with them by hand.
//
// One row in `nodes` per network+host+port is THE record for a peer. Every
// source — a TUI report, our own daemon, the seed file, the prober — upserts
// that same row and leaves a trail in `node_sources`. There are deliberately
// no parallel per-source tables.

import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

/** MariaDB DATETIME columns round-trip as JS Date through mysql2. */
export type DbDate = ColumnType<Date, Date | string, Date | string>;

export type Network = 'main' | 'test';
export type NodeStatus = 'new' | 'online' | 'unreachable' | 'dead';
export type NodeSource = 'report' | 'daemon' | 'seed' | 'probe';
export type BlocklistKind = 'host' | 'ip' | 'cidr';

export interface NodesTable {
  id: Generated<number>;
  network: Network;
  /** Literal host as advertised: an IPv4/IPv6 address, or a hostname from the seed list. */
  host: string;
  port: number;
  first_seen_at: DbDate;
  /** Last time any source mentioned it, including unverified addrman gossip. */
  last_seen_at: DbDate;
  /** Last time it actually answered. Distinct from last_seen_at on purpose. */
  last_online_at: DbDate | null;
  /** Reverse DNS, stored only when it forward-confirms back to the same address. */
  ptr: string | null;
  ptr_checked_at: DbDate | null;
  cc: string | null;
  asn: number | null;
  asn_org: string | null;
  city: string | null;
  // MariaDB hands DECIMAL back as a string; coerce with Number() at the edge.
  lat: string | number | null;
  lon: string | number | null;
  geo_checked_at: DbDate | null;
  status: Generated<NodeStatus>;
  last_probe_at: DbDate | null;
  last_probe_ok_at: DbDate | null;
  probe_fail_streak: Generated<number>;
  /** Drives the probe queue; see server/addnodes/steps/probe.ts for the ladder. */
  next_probe_at: DbDate;
  /** Operator override: always publish when online, ignoring the diversity caps. */
  pinned: Generated<number>;
  /** Operator override: never publish, but keep tracking and keep visible. */
  excluded: Generated<number>;
  label: string | null;
  notes: string | null;
}

export interface NodeSourcesTable {
  node_id: number;
  source: NodeSource;
  first_seen_at: DbDate;
  last_seen_at: DbDate;
  hits: Generated<number>;
}

export interface ObservationsTable {
  node_id: number;
  /** Truncated to the hour. Absent row means "we did not probe in that hour". */
  hour_bucket: DbDate;
  probe_ok: number | null;
  distinct_reporters: Generated<number>;
}

export interface NodeDailyTable {
  node_id: number;
  day: ColumnType<Date, Date | string, Date | string>;
  probes: Generated<number>;
  successes: Generated<number>;
  downtime_minutes: Generated<number>;
}

export type NodeEvent = 'discovered' | 'up' | 'down';

export interface NodeEventsTable {
  id: Generated<number>;
  node_id: number;
  at: DbDate;
  event: NodeEvent;
  /** Timestamp of the previous event, so a row knows its own duration. */
  prev_event_at: DbDate | null;
}

export interface ReportersTable {
  /** First 16 hex of sha256(reporter id). The raw id is never stored. */
  reporter_hash: string;
  first_seen_at: DbDate;
  last_seen_at: DbDate;
  report_count: Generated<number>;
  banned: Generated<number>;
}

export interface ReportsTable {
  id: Generated<number>;
  received_at: DbDate;
  reporter_hash: string;
  client: string;
  network: Network;
  /** JSON array of "host:port" strings, already validated by the ingest route. */
  peers: ColumnType<string[], string, string>;
  processed_at: DbDate | null;
}

export interface BlocklistTable {
  id: Generated<number>;
  pattern: string;
  kind: BlocklistKind;
  reason: string | null;
  created_at: DbDate;
  created_by: string | null;
}

export type AdminAction =
  | 'block' | 'unblock' | 'pin' | 'unpin' | 'exclude'
  | 'include' | 'label' | 'note' | 'ban' | 'unban' | 'probe';

export interface AdminActionsTable {
  id: Generated<number>;
  at: DbDate;
  /** The admin's wallet address, supplied by grc-control from its verified session. */
  actor: string;
  action: AdminAction;
  target_kind: 'node' | 'reporter' | 'pattern';
  target: string;
  detail: ColumnType<unknown, string, string> | null;
}

export interface RunsTable {
  id: Generated<number>;
  started_at: DbDate;
  duration_ms: number | null;
  reports_ingested: Generated<number>;
  nodes_probed: Generated<number>;
  published_main: Generated<number>;
  published_test: Generated<number>;
  error: string | null;
}

export interface Database {
  nodes: NodesTable;
  node_sources: NodeSourcesTable;
  observations: ObservationsTable;
  node_daily: NodeDailyTable;
  node_events: NodeEventsTable;
  reporters: ReportersTable;
  reports: ReportsTable;
  blocklist: BlocklistTable;
  admin_actions: AdminActionsTable;
  runs: RunsTable;
}

export type NodeRow = Selectable<NodesTable>;
export type NewNode = Insertable<NodesTable>;
export type NodeUpdate = Updateable<NodesTable>;
export type ReportRow = Selectable<ReportsTable>;
export type BlocklistRow = Selectable<BlocklistTable>;
export type NodeEventRow = Selectable<NodeEventsTable>;
export type RunRow = Selectable<RunsTable>;
export type ReporterRow = Selectable<ReportersTable>;
