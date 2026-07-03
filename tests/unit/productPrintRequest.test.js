import { describe, it, expect } from 'vitest'
import { buildProductPrintRequestInput, colourNameFromVariants } from '@/lib/customPrint/productRequest'

const printProduct = {
  _id: 'prod1',
  productType: 'print',
  name: 'Benchy',
  slug: 'benchy',
  viewableModel: 'models/benchy.stl',
  basePrice: { presentmentCurrency: 'SGD', presentmentAmount: 12 },
  printConfig: {
    layerHeight: 0.2,
    materialType: 'plastic',
    wallLoops: 3,
    sparseInfillDensity: 25,
    nozzleDiameter: 0.4,
    enableSupport: true,
  },
  variantTypes: [
    {
      name: 'Colour',
      options: [
        { name: 'Black', hex: '#000000' },
        { name: 'Red', hex: '#ff0000' },
      ],
    },
  ],
}

const user = { userId: 'clerk_123', email: 'a@b.com', name: 'Ada' }

describe('buildProductPrintRequestInput', () => {
  it('builds a product-sourced request with fixed settings + chosen colour', () => {
    const out = buildProductPrintRequestInput({ product: printProduct, chosenColour: 'Red', user })
    expect(out.source).toBe('product')
    expect(out.sourceProduct.productId).toBe('prod1')
    expect(out.userId).toBe('clerk_123')
    // settings copied verbatim from the product's fixed config
    expect(out.printConfiguration.printSettings).toEqual(printProduct.printConfig)
    // colour applied
    expect(out.printConfiguration.meshColors).toEqual({ default: '#ff0000' })
    // model reused so editor/proxy/recompute work unchanged
    expect(out.modelFile.s3Key).toBe('models/benchy.stl')
    // quote input maps print settings -> engine shape
    expect(out.quoteSettings).toMatchObject({
      infillPercent: 25,
      wallLoops: 3,
      nozzleMm: 0.4,
      layerHeightMm: 0.2,
      enableSupport: true,
    })
  })

  it('resolves missing option hex from the admin catalogue by name', () => {
    const noHex = {
      ...printProduct,
      variantTypes: [{ name: 'Color', options: [{ name: 'Ivory White' }] }],
    }
    const out = buildProductPrintRequestInput({
      product: noHex,
      chosenColour: 'Ivory White',
      user,
      colourCatalogue: [{ name: 'Ivory White', hex: '#f5f0e1' }],
    })
    expect(out.printConfiguration.meshColors).toEqual({ default: '#f5f0e1' })
  })

  it('falls back to neutral grey when no hex anywhere', () => {
    const noHex = {
      ...printProduct,
      variantTypes: [{ name: 'Color', options: [{ name: 'Mystery' }] }],
    }
    const out = buildProductPrintRequestInput({ product: noHex, chosenColour: 'Mystery', user })
    expect(out.printConfiguration.meshColors.default).toBe('#cccccc')
  })

  it('rejects a colour the product does not offer', () => {
    expect(() => buildProductPrintRequestInput({ product: printProduct, chosenColour: 'Gold', user }))
      .toThrow(/colour/i)
  })

  it('rejects a non-print product', () => {
    expect(() =>
      buildProductPrintRequestInput({ product: { ...printProduct, productType: 'shop' }, chosenColour: 'Red', user }),
    ).toThrow(/print product/i)
  })

  it('rejects a product without a model', () => {
    expect(() =>
      buildProductPrintRequestInput({ product: { ...printProduct, viewableModel: null }, chosenColour: 'Red', user }),
    ).toThrow(/model/i)
  })
})

describe('colourNameFromVariants', () => {
  it('extracts the colour-type variant value', () => {
    expect(colourNameFromVariants({ Colour: 'Red', Size: 'L' })).toBe('Red')
    expect(colourNameFromVariants({ Color: 'Blue' })).toBe('Blue')
  })
  it('returns undefined when no colour variant present', () => {
    expect(colourNameFromVariants({ Size: 'L' })).toBeUndefined()
    expect(colourNameFromVariants()).toBeUndefined()
  })
})
