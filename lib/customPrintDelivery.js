/**
 * Pure helpers for wiring admin-configured delivery options to custom-print
 * requests. No I/O, no Mongoose — numbers/objects in, plain objects out.
 *
 * `additionalDeliveryTypes` (from `AppSettings`) describe delivery options the
 * admin has set up. Each entry can be flagged applicable to "shop" and/or
 * "print" products. For instant-quoted custom prints we attach every active
 * "print" type to the request so the customer has options at checkout, priced
 * from the type's tiers/formula and the request's dimensions (cm + kg) via the
 * same `getDeliveryTypeApplicability` logic the product form uses.
 */
import { getDeliveryTypeApplicability } from '@/utils/deliveryTypeHelpers'

function priceFor(deliveryType, dimensions) {
  if (!dimensions) return { include: true, price: 0 }
  const applicability = getDeliveryTypeApplicability(deliveryType, {
    productType: 'print',
    dimensions,
  })
  // Types with no pricing system (e.g. pickup) come back applicable with a
  // null price — include them at 0. Types whose tiers don't cover the dims
  // are excluded so the customer can't pick an un-shippable option.
  if (!applicability.applicable) return { include: false, price: 0 }
  return { include: true, price: Number(applicability.defaultPrice) || 0 }
}

/**
 * @param {Array} additionalDeliveryTypes - AppSettings.additionalDeliveryTypes
 * @param {{length:number,width:number,height:number,weight:number}|null} [dimensions]
 *   request dimensions in cm with weight in kg; when provided, prices are
 *   computed (tiers/formula) and non-covering types are excluded.
 * @returns {Array<{type:string, deliveryTypeConfigId:any, price:number}>}
 *   the array shape expected by `CustomPrintRequest.delivery.deliveryTypes`.
 */
export function resolveCustomPrintDeliveryDefaults(additionalDeliveryTypes = [], dimensions = null) {
  if (!Array.isArray(additionalDeliveryTypes)) return []
  const out = []
  for (const dt of additionalDeliveryTypes) {
    const eligible =
      dt &&
      dt.isActive !== false &&
      Array.isArray(dt.applicableToProductTypes) &&
      dt.applicableToProductTypes.includes('print')
    if (!eligible) continue
    const { include, price } = priceFor(dt, dimensions)
    if (!include) continue
    out.push({ type: dt.name, deliveryTypeConfigId: dt._id ?? null, price })
  }
  return out
}

/**
 * Re-price delivery types already stored on a request from the CURRENT admin
 * settings, so quotes reflect up-to-date delivery pricing. Entries with an
 * admin-set `customPrice` are left untouched (customPrice wins downstream);
 * entries whose type no longer exists in settings keep their stored price.
 */
export function refreshCustomPrintDeliveryPrices(
  storedDeliveryTypes = [],
  additionalDeliveryTypes = [],
  dimensions = null,
) {
  if (!Array.isArray(storedDeliveryTypes)) return []
  const configByName = new Map(
    (Array.isArray(additionalDeliveryTypes) ? additionalDeliveryTypes : [])
      .filter((dt) => dt?.name)
      .map((dt) => [dt.name, dt]),
  )
  return storedDeliveryTypes.map((entry) => {
    if (!entry || entry.customPrice != null) return entry
    const config = configByName.get(entry.type)
    if (!config) return entry
    const { include, price } = priceFor(config, dimensions)
    if (!include) return entry
    return { ...entry, price }
  })
}
