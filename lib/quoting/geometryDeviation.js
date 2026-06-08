/**
 * Pure: compare client-supplied vs server-recomputed geometry metrics so the
 * /api/quote persist path can flag suspicious deviations.
 *
 * The client computes geometry in the browser; the server recomputes from the
 * stored model (currently STL only). Both should agree within rounding; a
 * large mismatch is either a real parse divergence (bug) or a tampering attempt
 * (the client lowballed `volumeCm3` to get a cheaper quote).
 *
 * Returns `{ volumePctDelta, suspicious, tolerancePct }`. No I/O.
 *
 * `volumePctDelta` is the absolute relative difference,
 * `|server - client| / server`, expressed as a percentage (e.g. 12.5 = 12.5%).
 * `suspicious` is `true` iff the delta exceeds `tolerancePct` (default 10%).
 */
export const DEFAULT_DEVIATION_TOLERANCE_PCT = 10

export function geometryDeviation(client, server, tolerancePct = DEFAULT_DEVIATION_TOLERANCE_PCT) {
  const c = Number(client?.volumeCm3)
  const s = Number(server?.volumeCm3)
  if (!Number.isFinite(c) || !Number.isFinite(s) || s <= 0) {
    return { volumePctDelta: null, suspicious: false, tolerancePct }
  }
  const volumePctDelta = (Math.abs(s - c) / s) * 100
  return {
    volumePctDelta,
    suspicious: volumePctDelta > tolerancePct,
    tolerancePct,
  }
}
