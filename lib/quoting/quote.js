/**
 * Instant Quoting Engine — composes the itemized quote from geometry metrics,
 * print settings, pricing config, and option toggles. Pure and dependency-free
 * (numbers in, breakdown out) so it runs identically in the browser (live
 * preview) and the server (authoritative recompute).
 *
 * The seven cost factors (client spec): material, print time, base fee,
 * post-processing, special request, priority, delivery — plus an expedite
 * surcharge and a minimum-price floor.
 */
import { resolvePricing, densityFor, MATERIAL_DENSITIES } from './pricingDefaults'
import { estimateMaterialGrams } from './materialEstimate'
import { estimatePrintHours } from './printTimeEstimate'
import { calculateDeliveryPrice } from '@/utils/deliveryPriceCalculator'

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

/** Expedite surcharge for a given subtotal. mode: 'percent' | 'flat' | 'greater'. */
export function computeExpedite(subtotal, pricing) {
  const percent = (subtotal * (Number(pricing.expediteSurchargePercent) || 0)) / 100
  const flat = Number(pricing.expediteSurchargeFlat) || 0
  switch (pricing.expediteMode) {
    case 'percent':
      return round2(percent)
    case 'flat':
      return round2(flat)
    case 'greater':
    default:
      return round2(Math.max(percent, flat))
  }
}

/**
 * @param {object} args
 * @param {{volumeCm3, dimensionsCm:{length,width,height}, confidence}} args.metrics
 * @param {{materialType, infillPercent, wallLoops, nozzleMm, layerHeightMm, enableSupport}} args.settings
 * @param {object} [args.pricingOverrides] - AppSettings.quotingConfig
 * @param {{postProcessing, specialRequest, priority, expedite}} [args.options]
 * @param {object} [args.deliveryType] - an AppSettings delivery type (with pricingTiers) for the delivery line
 * @param {object} [args.densities] - material→density map override
 * @returns {object} itemized QuoteBreakdown
 */
export function calculateInstantQuote({
  metrics,
  settings = {},
  pricingOverrides = {},
  options = {},
  deliveryType = null,
  densities = MATERIAL_DENSITIES,
} = {}) {
  const pricing = resolvePricing(pricingOverrides)
  const volumeCm3 = Number(metrics?.volumeCm3) || 0
  const dimensionsCm = metrics?.dimensionsCm || { length: 0, width: 0, height: 0 }

  const density = densityFor(settings.materialType, densities)
  const weightGrams = estimateMaterialGrams({
    volumeCm3,
    dimensionsCm,
    infillPercent: settings.infillPercent,
    wallLoops: settings.wallLoops,
    nozzleMm: settings.nozzleMm,
    densityGPerCm3: density,
  })
  const printHours = estimatePrintHours({
    volumeCm3,
    dimensionsCm,
    infillPercent: settings.infillPercent,
    wallLoops: settings.wallLoops,
    nozzleMm: settings.nozzleMm,
    layerHeightMm: settings.layerHeightMm,
    enableSupport: settings.enableSupport,
  })

  // Delivery: tiers are weight-in-grams / volume-in-cm³ (see unit contract).
  let deliveryAmount = 0
  if (deliveryType) {
    const calc = calculateDeliveryPrice(deliveryType, {
      length: dimensionsCm.length,
      width: dimensionsCm.width,
      height: dimensionsCm.height,
      weight: weightGrams,
    })
    if (calc.applicable && calc.price != null) deliveryAmount = calc.price
  }

  const lines = [
    { key: 'material', label: 'Material', amount: round2(weightGrams * pricing.materialRatePerGram) },
    { key: 'printTime', label: 'Print time', amount: round2(printHours * pricing.printTimeRatePerHour) },
    { key: 'baseFee', label: 'Base fee', amount: round2(pricing.baseFee) },
    { key: 'postProcessing', label: 'Post-processing', amount: round2(options.postProcessing ? pricing.postProcessingFee : 0) },
    { key: 'specialRequest', label: 'Special request', amount: round2(options.specialRequest ? pricing.specialRequestFee : 0) },
    { key: 'priority', label: 'Priority', amount: round2(options.priority ? pricing.priorityFee : 0) },
    { key: 'delivery', label: 'Delivery', amount: round2(deliveryAmount) },
  ]

  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0))
  const expediteAmount = options.expedite ? computeExpedite(subtotal, pricing) : 0
  const totalBeforeMin = round2(subtotal + expediteAmount)
  const total = round2(Math.max(totalBeforeMin, Number(pricing.minimumPrice) || 0))

  return {
    currency: pricing.currency,
    inputs: {
      volumeCm3: round2(volumeCm3),
      weightGrams: round2(weightGrams),
      printHours: Math.round(printHours * 100) / 100,
      dimensionsCm,
    },
    lines,
    subtotal,
    expedite: { applied: !!options.expedite, mode: pricing.expediteMode, amount: expediteAmount },
    total,
    minimumApplied: total > totalBeforeMin,
    confidence: metrics?.confidence || 'low',
    estimatedFields: ['printTime'],
  }
}
