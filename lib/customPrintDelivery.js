/**
 * Pure helpers for attaching the admin-configured delivery options to a
 * custom-print request. No I/O, no Mongoose — arrays in, plain objects out.
 *
 * The source of truth is the custom-print PRODUCT's delivery config
 * (`product.delivery.deliveryTypes`), exactly like any other product: the admin
 * curates which delivery types are offered and sets their price once (via the
 * product form's delivery section). Requests copy those options + prices
 * verbatim. Prices are NOT recomputed from each model's dimensions — the admin's
 * configured price for the custom-print product is what the customer pays.
 *
 * Each product delivery entry has the Product `DeliveryTypeSchema` shape:
 *   { type, price, customPrice, customDescription, deliveryTypeConfigId }
 * `customPrice` (the admin's explicit override) wins over `price` downstream
 * (see `customPrintChargeBreakdown`), so both are carried through.
 */

/**
 * Copy the custom-print product's delivery types onto the request's
 * delivery-types shape. This is the single source of truth — call it whenever a
 * request is (re)quoted so the request always reflects the current product
 * delivery config.
 *
 * @param {Array} productDeliveryTypes - product.delivery.deliveryTypes
 * @returns {Array<{type:string, price:number, customPrice:number|null,
 *   customDescription:string|null, deliveryTypeConfigId?:any}>}
 */
export function resolveCustomPrintDeliveryDefaults(productDeliveryTypes = []) {
  if (!Array.isArray(productDeliveryTypes)) return []
  return productDeliveryTypes
    .filter((dt) => dt && dt.type)
    .map((dt) => ({
      type: dt.type,
      price: Number(dt.price) || 0,
      customPrice: dt.customPrice ?? null,
      customDescription: dt.customDescription ?? null,
      ...(dt.deliveryTypeConfigId ? { deliveryTypeConfigId: dt.deliveryTypeConfigId } : {}),
    }))
}
