import { Kysely, sql } from 'kysely';

// City and coordinates, so the map can put a node where it is rather than at
// the middle of its country.
//
// Nullable and unbackfilled on purpose: every existing row keeps its country
// and picks these up on its next enrichment pass, which is at most 30 days
// out and immediate for anything new.
//
// DECIMAL(9,6) rather than DOUBLE: six decimal places is about 11 cm, far
// finer than a city-level database can justify, and it compares and sorts
// exactly. Signed, so the range covers ±180.
export async function up(db: Kysely<never>): Promise<void> {
  await db.schema.alterTable('nodes')
    .addColumn('city', 'varchar(80)')
    .execute();
  await db.schema.alterTable('nodes')
    .addColumn('lat', sql`decimal(9,6)`)
    .execute();
  await db.schema.alterTable('nodes')
    .addColumn('lon', sql`decimal(9,6)`)
    .execute();
}

export async function down(db: Kysely<never>): Promise<void> {
  await db.schema.alterTable('nodes').dropColumn('lon').execute();
  await db.schema.alterTable('nodes').dropColumn('lat').execute();
  await db.schema.alterTable('nodes').dropColumn('city').execute();
}
