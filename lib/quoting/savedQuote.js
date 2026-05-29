/**
 * Pure helpers for saved / shareable quotes: opaque share-token generation and
 * validity windows. No DB/network here so the logic is unit-testable; the model
 * + routes use these.
 */
import { randomBytes } from 'node:crypto'

export const DEFAULT_VALIDITY_DAYS = 30
export const DEFAULT_SHARE_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

/** URL-safe opaque share token (not guessable; stored on the record). */
export function generateShareToken() {
  return randomBytes(24).toString('base64url')
}

/** Date `days` from `now` (ms epoch or Date). */
export function computeExpiry(now = Date.now(), days = DEFAULT_VALIDITY_DAYS) {
  const base = now instanceof Date ? now.getTime() : now
  return new Date(base + days * DAY_MS)
}

/** True when `expiresAt` is in the past relative to `now`. */
export function isExpired(expiresAt, now = Date.now()) {
  if (!expiresAt) return false
  const exp = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime()
  if (!Number.isFinite(exp)) return false
  const t = now instanceof Date ? now.getTime() : now
  return t > exp
}

/** A quote is still valid (re-quote needed if not) when within its validity window. */
export function isQuoteValid(savedQuote, now = Date.now()) {
  if (!savedQuote) return false
  return !isExpired(savedQuote.validUntil, now)
}

/** A share link is usable when it has a token and hasn't expired. */
export function isShareUsable(savedQuote, now = Date.now()) {
  if (!savedQuote?.shareToken) return false
  return !isExpired(savedQuote.shareExpiresAt, now)
}
