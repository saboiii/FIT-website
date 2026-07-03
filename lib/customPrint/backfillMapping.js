/**
 * Map a legacy PrintOrder document to CustomPrintRequest fields, for the
 * one-shot PrintOrder → CustomPrintRequest backfill (phase 6 of the
 * `migrate-print-delivery-to-custom-requests` change). Pure.
 *
 * PrintOrder stores `userId` as a Mongo ObjectId; CustomPrintRequest uses the
 * Clerk string id — so the caller resolves and passes the Clerk identity.
 */
import { randomUUID } from 'crypto'

export function printOrderToCustomPrintRequestFields(po = {}, { userId, userEmail, userName } = {}) {
  const isUpload = !!po.isCustomUpload
  const status = po.status || 'paid'
  return {
    requestId: randomUUID(),
    userId,
    userEmail: userEmail || 'unknown@migrated.local',
    userName: userName || 'Migrated Order',
    source: isUpload ? 'upload' : 'product',
    // Only product-sourced jobs carry a product ref.
    ...(isUpload ? {} : { sourceProduct: { productId: po.productId || null } }),
    // Reuse the stored model key so editor/proxy/recompute keep working.
    ...(po.modelUrl ? { modelFile: { originalName: po.productTitle || po.modelUrl, s3Key: po.modelUrl } } : {}),
    ...(po.printConfiguration ? { printConfiguration: po.printConfiguration } : {}),
    basePrice: Number(po.totalAmount ?? po.basePrice ?? 0),
    currency: String(po.currency || 'sgd').toLowerCase(),
    status,
    // PrintOrders were created at payment time.
    paidAt: po.createdAt || new Date(),
    quoteMode: null,
    statusHistory: [{ status, note: `Backfilled from PrintOrder ${po.orderId || po._id}` }],
  }
}
