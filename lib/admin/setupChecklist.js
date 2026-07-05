// Pure derivation of the admin Overview setup checklist. Data in (from the
// existing admin GET endpoints), rows out — no fetch, no React.
import { DEFAULT_TIME_MODEL } from '@/lib/quoting/pricingDefaults'

const isPos = (v) => Number.isFinite(Number(v)) && Number(v) > 0

function timeModelTuned(timeModel) {
  if (!timeModel) return false
  // ponytail: an override equal to the default is indistinguishable from
  // "untuned" (the GET returns the resolved model) — acceptable false ⚠.
  return Object.keys(DEFAULT_TIME_MODEL).some(
    (k) => timeModel[k] != null && Number(timeModel[k]) !== DEFAULT_TIME_MODEL[k],
  )
}

function printDeliveryOk(deliveryTypes) {
  return (deliveryTypes || []).some(
    (dt) =>
      dt?.isActive !== false &&
      (dt?.applicableToProductTypes || []).includes('print') &&
      ((dt?.pricingTiers || []).length > 0 || dt?.basePricing),
  )
}

function productOk(product) {
  if (!product) return false
  const dims = product.dimensions || {}
  return (
    isPos(product.basePrice?.presentmentAmount) &&
    ['length', 'width', 'height', 'weight'].every((k) => isPos(dims[k]))
  )
}

/**
 * @returns {Array<{key, label, ok, required, consequence, tab}>}
 * `tab` is the admin panel that fixes the row.
 */
export function buildSetupChecklist({
  quotingConfig,
  printColours,
  machineLimits,
  deliveryTypes,
  customPrintProduct,
  adminEmailPresent,
} = {}) {
  return [
    {
      key: 'pricing',
      label: 'Pricing rates set',
      ok: isPos(quotingConfig?.materialRatePerGram) && isPos(quotingConfig?.printTimeRatePerHour),
      required: true,
      consequence: 'Instant quotes will price material and machine time at zero.',
      tab: 'quoting',
    },
    {
      key: 'timeModel',
      label: 'Print-time model tuned',
      ok: timeModelTuned(quotingConfig?.timeModel),
      required: false,
      consequence: 'Using generic defaults; estimated print times may not match your machines.',
      tab: 'quoting',
    },
    {
      key: 'machineLimits',
      label: 'Machine limits entered',
      ok: Object.values(machineLimits || {}).some(isPos),
      required: false,
      consequence: 'Oversized models won’t be caught at quote time.',
      tab: 'quoting',
    },
    {
      key: 'colours',
      label: 'Colour catalogue curated',
      ok: (printColours || []).length > 0,
      required: false,
      consequence: 'Customers can’t pick a print colour.',
      tab: 'quoting',
    },
    {
      key: 'delivery',
      label: 'Delivery for prints configured',
      ok: printDeliveryOk(deliveryTypes),
      required: true,
      consequence: 'Print orders can’t be shipped or priced for delivery.',
      tab: 'delivery',
    },
    {
      key: 'product',
      label: 'Custom-print base product configured',
      ok: productOk(customPrintProduct),
      required: true,
      consequence: 'Custom print uploads can’t be quoted or checked out.',
      tab: 'customPrint',
    },
    {
      key: 'adminEmail',
      label: 'Admin notification email set',
      ok: Boolean(adminEmailPresent),
      required: false,
      consequence: 'You won’t get emails for new requests (set ADMIN_EMAIL or GMAIL_USER).',
      tab: 'quoting',
    },
  ]
}

export function needsOnboarding(items) {
  return (items || []).some((i) => i.required && !i.ok)
}

const CLOSED_STATUSES = new Set(['delivered', 'cancelled'])

export function summarizeRequests(requests = []) {
  const openByStatus = {}
  let unquoted = 0
  let paidNotPrinted = 0
  for (const r of requests) {
    const status = r?.status
    if (!status || CLOSED_STATUSES.has(status)) continue
    openByStatus[status] = (openByStatus[status] || 0) + 1
    if (status === 'configured' && !r.quotedAt) unquoted += 1
    if (status === 'paid') paidNotPrinted += 1
  }
  const openTotal = Object.values(openByStatus).reduce((a, b) => a + b, 0)
  return { openTotal, openByStatus, unquoted, paidNotPrinted }
}
