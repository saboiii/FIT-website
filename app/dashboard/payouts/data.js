// Data seam for creator payout statements (openspec add-creator-payout-statements).
// The page renders the honest coming-soon state while this returns null; the
// backend (creator-scoped aggregation over CheckoutSession/Order data plus the
// Stripe Express balance) plugs in here without touching the page markup.

/**
 * @typedef {Object} PayoutRow
 * @property {string} id            Stripe payout id.
 * @property {string} paidAt        ISO timestamp.
 * @property {number} amount        Major units (SGD).
 * @property {'paid'|'in_transit'|'pending'} status
 */

/**
 * @typedef {Object} OrderBreakdownRow
 * @property {string} orderId
 * @property {string} productName
 * @property {number} productRevenue  Major units.
 * @property {number} shippingRevenue Major units.
 * @property {number} fees            Platform + Stripe fees, major units.
 * @property {number} net             What the creator keeps, major units.
 */

/**
 * @typedef {Object} PayoutStatement
 * @property {number} balance             Current available balance, major units.
 * @property {number} pendingBalance      Not yet paid out, major units.
 * @property {PayoutRow[]} payouts        Payout history, newest first.
 * @property {OrderBreakdownRow[]} orders Per-order revenue breakdowns.
 */

/**
 * Placeholder seam — intentionally returns null until the payout-statements
 * API exists (see openspec/changes/add-creator-payout-statements/proposal.md).
 * @returns {Promise<PayoutStatement|null>}
 */
export async function fetchPayoutStatement() {
    return null
}
