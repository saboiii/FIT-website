#!/usr/bin/env node

/**
 * Backfill legacy PrintOrder documents into CustomPrintRequest (phase 6 of the
 * `migrate-print-delivery-to-custom-requests` change).
 *
 * Every NEW print job already creates a CustomPrintRequest; this migrates
 * HISTORICAL PrintOrders that predate that. Idempotent + reversible:
 *   - skips any PrintOrder that already has `customPrintRequestId` set
 *     (upload mirrors, and anything already backfilled);
 *   - after creating the CustomPrintRequest, links it back onto the PrintOrder
 *     (`customPrintRequestId`) so a re-run skips it and you can reverse by
 *     deleting the created requests + unsetting the link.
 *
 * DRY-RUN BY DEFAULT — prints what it would do and changes nothing.
 *   node scripts/backfill-printorders.mjs            # dry run
 *   node scripts/backfill-printorders.mjs --apply    # actually write
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

async function run() {
  const apply = process.argv.includes('--apply')
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set (check .env / .env.local).')
    process.exit(1)
  }

  const { connectToDatabase } = await import('../lib/db.js')
  const PrintOrder = (await import('../models/PrintOrder.js')).default
  const CustomPrintRequest = (await import('../models/CustomPrintRequest.js')).default
  const User = (await import('../models/User.js')).default
  const { printOrderToCustomPrintRequestFields } = await import('../lib/customPrint/backfillMapping.js')

  await connectToDatabase()

  // Not-yet-migrated: no link to a CustomPrintRequest.
  const candidates = await PrintOrder.find({
    $or: [{ customPrintRequestId: { $exists: false } }, { customPrintRequestId: null }],
  }).lean()

  console.log(`${apply ? 'APPLY' : 'DRY-RUN'}: ${candidates.length} PrintOrder(s) to backfill.\n`)

  let migrated = 0
  let skipped = 0
  for (const po of candidates) {
    const userDoc = po.userId ? await User.findById(po.userId).lean() : null
    if (!userDoc?.userId) {
      console.warn(`  skip PrintOrder ${po.orderId || po._id}: cannot resolve Clerk userId (user ${po.userId})`)
      skipped++
      continue
    }
    const fields = printOrderToCustomPrintRequestFields(po, {
      userId: userDoc.userId,
      userEmail: userDoc.email,
      userName: userDoc.name || userDoc.firstName || userDoc.email,
    })
    console.log(`  ${po.orderId || po._id} → ${fields.source} request for ${fields.userId} (${fields.status}, ${fields.currency} ${fields.basePrice})`)
    if (apply) {
      const created = await CustomPrintRequest.create(fields)
      await PrintOrder.updateOne({ _id: po._id }, { $set: { customPrintRequestId: created._id } })
      migrated++
    }
  }

  console.log(`\nDone. ${apply ? `Migrated ${migrated}, skipped ${skipped}.` : `Would migrate ${candidates.length - skipped}, skip ${skipped}. Re-run with --apply to write.`}`)
  process.exit(0)
}

run().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
