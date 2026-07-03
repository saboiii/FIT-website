/**
 * Pure builder for a PRODUCT-sourced print job. A `productType: "print"` product
 * bought with print delivery becomes a CustomPrintRequest: the vendor's fixed
 * print config + the customer's chosen colour, reusing the product's own 3D
 * model so the editor, server-side geometry recompute, and proxy access work
 * unchanged. No DB/Stripe/network — the caller persists + quotes.
 *
 * See openspec change `migrate-print-delivery-to-custom-requests`.
 */
import { printSettingsToQuoteSettings } from '@/lib/quoting/printSettingsToQuote'

/** The colour the customer chose, from a cart item's `selectedVariants` map
 * ({ 'Colour': 'Red', 'Size': 'L' } → 'Red'). Returns undefined if none. */
export function colourNameFromVariants(selectedVariants = {}) {
  const entry = Object.entries(selectedVariants || {}).find(([k]) => /colou?r/i.test(k))
  return entry?.[1]
}

/**
 * @param {object} args
 * @param {object} args.product   - a Product doc (plain object), productType 'print'
 * @param {object|null} [args.variant] - selected variant (optional)
 * @param {string} args.chosenColour - colour name; must be one the product offers
 * @param {{userId,email,name}} args.user
 * @returns {object} fields for a new CustomPrintRequest + `quoteSettings` for the engine
 */
export function buildProductPrintRequestInput({ product, variant = null, chosenColour, user, colourCatalogue = [] } = {}) {
  if (!product) throw new Error('product is required')
  if (product.productType !== 'print') throw new Error('not a print product')
  if (!product.viewableModel) throw new Error('product has no 3D model')
  if (!product.printConfig) throw new Error('product has no fixed print config')

  // Colour is a colour-type variant option (carries a hex swatch). The customer
  // picks one at purchase; the vendor cannot change print settings.
  const colourType = (product.variantTypes || []).find((vt) => /colou?r/i.test(vt.name))
  const colour = colourType?.options?.find((o) => o.name === chosenColour)
  if (!colour) throw new Error(`colour "${chosenColour}" is not offered by this product`)

  // Resolve the hex: prefer the option's own swatch, else look it up by name in
  // the admin catalogue (older options were saved without a hex). Falls back to a
  // neutral grey so the model still renders.
  const colourHex =
    colour.hex || colourCatalogue.find((c) => c?.name === colour.name)?.hex || '#cccccc'

  const printSettings = product.printConfig

  return {
    source: 'product',
    sourceProduct: {
      productId: product._id,
      variantId: variant?._id ?? variant?.id ?? null,
    },
    userId: user?.userId,
    userEmail: user?.email,
    userName: user?.name,
    // Reuse the product's model so all model-keyed machinery works unchanged.
    modelFile: { originalName: product.name, s3Key: product.viewableModel },
    printConfiguration: {
      printSettings,
      // ponytail: single colour applied to the whole model ("default" mesh).
      // Per-mesh colours would need the editor to enumerate meshes; not requested.
      meshColors: { default: colourHex },
      isConfigured: true,
      configuredAt: new Date(),
    },
    basePrice: product.basePrice?.presentmentAmount ?? 0,
    currency: (product.basePrice?.presentmentCurrency || 'sgd').toLowerCase(),
    // Settings in the Instant Quoting Engine shape — caller computes the fixed
    // quote from the product model geometry + these.
    quoteSettings: printSettingsToQuoteSettings(printSettings),
  }
}
