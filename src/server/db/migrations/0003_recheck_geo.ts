import { Kysely, sql } from 'kysely';

// Force one geo re-check on every node that predates the city columns.
//
// 0002 added city/lat/lon but left geo_checked_at alone, so every row already
// on the box looked freshly enriched and enrichment skipped it. Since it only
// revisits a node whose check is older than 30 days, the new columns would
// have stayed empty for a month and the map would have kept falling back to
// country centroids for everything except newly discovered nodes.
//
// This lives in its own migration rather than as an edit to 0002 because 0002
// has already run in production: Kysely records it as applied and would never
// replay it.
//
// Cost is one extra pass through the enrichment budget (300 nodes a run).
// ptr_checked_at is deliberately untouched, so reverse DNS is not redone.
export async function up(db: Kysely<never>): Promise<void> {
  await sql`UPDATE nodes SET geo_checked_at = NULL`.execute(db);
}

export async function down(): Promise<void> {
  // Nothing to undo: this only asks for work that was going to happen anyway.
}
