/**
 * Pure helpers for wiring admin-configured delivery options to custom-print
 * requests. No I/O, no Mongoose — numbers/objects in, plain objects out.
 *
 * `additionalDeliveryTypes` (from `AppSettings`) describe delivery options the
 * admin has set up. Each entry can be flagged applicable to "shop" and/or
 * "print" products. For instant-quoted custom prints we attach every active
 * "print" type to the request so the customer has options at checkout.
 */

/**
 * @param {Array} additionalDeliveryTypes - AppSettings.additionalDeliveryTypes
 * @returns {Array<{type:string, deliveryTypeConfigId:any, price?:number}>}
 *   the array shape expected by `CustomPrintRequest.delivery.deliveryTypes`.
 */
export function resolveCustomPrintDeliveryDefaults(additionalDeliveryTypes = []) {
  if (!Array.isArray(additionalDeliveryTypes)) return []
  return additionalDeliveryTypes
    .filter(
      (dt) =>
        dt &&
        dt.isActive !== false &&
        Array.isArray(dt.applicableToProductTypes) &&
        dt.applicableToProductTypes.includes('print'),
    )
    .map((dt) => ({
      type: dt.name,
      deliveryTypeConfigId: dt._id ?? null,
      // `price` is computed at checkout from the type's tiers/basePricing; the
      // request just records the configurable defaults the customer can pick.
      price: 0,
    }))
}
