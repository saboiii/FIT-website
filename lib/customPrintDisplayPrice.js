/**
 * Pure selector: pick the right price to display for a custom-print request,
 * given the two ways a request can be priced.
 *
 * - Instant quote (Instant Quoting Engine): server-authoritative breakdown is
 *   persisted on `request.quote` and `request.quoteMode === 'instant'`. The
 *   amount shown is `quote.total`.
 * - Manual quote (admin sets): legacy `request.basePrice + request.printFee`.
 *   This is also the path for any quote without a marked mode (legacy data).
 *
 * Returns `{ amount, label, source }`. No I/O.
 */
export function customPrintDisplayPrice(request) {
  const r = request || {}
  const isInstant =
    r.quoteMode === 'instant' &&
    typeof r.quote?.total === 'number' &&
    Number.isFinite(r.quote.total)

  if (isInstant) {
    return { amount: Number(r.quote.total), label: 'Instant Quote', source: 'instant' }
  }

  const base = Number(r.basePrice) || 0
  const fee = Number(r.printFee) || 0
  return { amount: base + fee, label: 'Quoted', source: 'manual' }
}
