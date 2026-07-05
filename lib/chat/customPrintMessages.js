/**
 * Pure plain-text builders for the chat updates posted into the buyer↔vendor
 * thread at each custom-print lifecycle event. No I/O. Kept short and friendly —
 * the message opens a thread the vendor can continue personally.
 *
 * `data` may include: requestId, modelName, total, currency, status, note.
 */

function money(amount, currency = 'sgd') {
  const n = Number(amount)
  const safe = Number.isFinite(n) ? n : 0
  return `${String(currency || 'sgd').toUpperCase()} ${safe.toFixed(2)}`
}

const BUILDERS = Object.freeze({
  'awaiting-quote': (d) =>
    `Hi! We've received your custom-print configuration${d.modelName ? ` for "${d.modelName}"` : ''} and are preparing your quote. We'll follow up here and by email shortly.`,
  'quote-ready': (d) =>
    `Your quote is ready${d.total != null ? `: ${money(d.total, d.currency)}` : ''}. You can review the breakdown and pay from your cart. Happy to answer any questions here!`,
  paid: (d) =>
    `Thanks — your payment${d.total != null ? ` of ${money(d.total, d.currency)}` : ''} is confirmed and your print is queued. We'll keep you updated right here.`,
  printing: () => `Your model is now printing. 🖨️`,
  printed: () => `Printing is complete — we're preparing your order for dispatch.`,
  shipped: (d) =>
    `Your order has shipped${d.trackingNumber ? ` (tracking: ${d.trackingNumber})` : ''}.`,
  delivered: () => `Your print has been delivered — we hope it turned out great!`,
  cancelled: (d) =>
    `Your custom-print request has been cancelled${d.note ? `: ${d.note}` : ''}. Reply here if you have any questions.`,
})

/**
 * @param {string} event - one of the keys above
 * @param {object} [data]
 * @returns {string|null} the message text, or null for an unknown event
 */
export function customPrintChatMessage(event, data = {}) {
  const build = BUILDERS[event]
  return build ? build(data || {}) : null
}

export const CUSTOM_PRINT_CHAT_EVENTS = Object.freeze(Object.keys(BUILDERS))
