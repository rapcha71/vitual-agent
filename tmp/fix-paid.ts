import 'dotenv/config';
import { db } from '../server/db';
import { properties } from '../shared/schema';
import { and, gte, lte } from 'drizzle-orm';

async function main() {
  // Only revert properties that were bulk-marked on 2026-05-08 between 22:50 and 23:30 UTC
  // These are the ones incorrectly set by the "mark-all-paid" button
  const from = new Date('2026-05-08T22:50:00.000Z');
  const to   = new Date('2026-05-08T23:30:00.000Z');

  const toRevert = await db
    .select({ id: properties.id, propertyId: properties.propertyId, paidAt: properties.paidAt })
    .from(properties)
    .where(and(gte(properties.paidAt, from), lte(properties.paidAt, to)));

  console.log(`Found ${toRevert.length} properties to revert:`, toRevert.map(p => p.propertyId));

  if (toRevert.length === 0) {
    console.log('Nothing to revert.');
    return;
  }

  const result = await db
    .update(properties)
    .set({ isPaid: false, paidAt: null })
    .where(and(gte(properties.paidAt, from), lte(properties.paidAt, to)));

  console.log('Reverted successfully.');
}

main().catch(console.error).finally(() => process.exit(0));
