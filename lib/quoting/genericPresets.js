/**
 * Generic print presets: translate the customer's plain-language choices
 * (Strength × Quality × Colour) into concrete `printSettings` consumed by the
 * editor, the print farm, and the Instant Quoting Engine. Pure + data-driven so
 * the print farm can tune the tables and so prices are unit-testable.
 *
 * The two axes are orthogonal: Quality drives layer height; Strength drives wall
 * loops + infill. (Note "Draft" means different things per axis — Quality-Draft
 * = thick/fast layers; Strength-Draft = low infill/walls to save filament.)
 */

// Quality → layer height (look/speed)
export const QUALITY_MAP = Object.freeze({
  Draft: { layerHeight: 0.3, initialLayerHeight: 0.3 },
  Medium: { layerHeight: 0.2, initialLayerHeight: 0.2 },
  High: { layerHeight: 0.12, initialLayerHeight: 0.12 },
})

// Strength → walls + infill (durability/material)
export const STRENGTH_MAP = Object.freeze({
  Draft: { wallLoops: 1, sparseInfillDensity: 10 },
  Normal: { wallLoops: 2, sparseInfillDensity: 20 },
  Strong: { wallLoops: 4, sparseInfillDensity: 40 },
})

export const DEFAULT_QUALITY = 'Medium'
export const DEFAULT_STRENGTH = 'Normal'

// Default colour/material catalogue. `material` (optional) maps to a density key
// the quoting engine understands (see MATERIAL_DENSITIES); plain colours are PLA.
// Admins override this via AppSettings.printColours.
export const DEFAULT_PRINT_COLOURS = Object.freeze([
  { name: 'Wood Colour', hex: '#9b6a3f', material: 'wood' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'Red', hex: '#d12c2c' },
  { name: 'Green', hex: '#2e8b3d' },
  { name: 'Blue', hex: '#2356c7' },
  { name: 'Transparent', hex: '#e8f4f8', material: 'transparent' },
  { name: 'Yellow', hex: '#f2c200' },
  { name: 'Orange', hex: '#ee7b21' },
  { name: 'Ivory White', hex: '#f5f0e1' },
  { name: 'Natural', hex: '#e9dcc3', material: 'natural' },
  { name: 'Technology Grey', hex: '#6e7479' },
  { name: 'Grey', hex: '#9aa0a6' },
  { name: 'Black Grey', hex: '#3c4043' },
  { name: 'Navy Grey', hex: '#44505c' },
  { name: 'Silvery', hex: '#c7ccd1' },
  { name: 'Orange Yellow', hex: '#f4a300' },
  { name: 'Cherry Pink', hex: '#d6447e' },
  { name: 'Mint Green', hex: '#8fd6b4' },
  { name: 'Bright Green', hex: '#4caf50' },
  { name: 'Mango', hex: '#ffb547' },
  { name: 'Sky Blue', hex: '#7ec8e3' },
  { name: 'Golden', hex: '#d4af37' },
  { name: 'Cyan', hex: '#25c4c4' },
  { name: 'Pink Rose', hex: '#e89bb0' },
  { name: 'Skin', hex: '#e6b89c' },
  { name: 'Sapphire Blue', hex: '#2a4bd7' },
  { name: 'Coffee', hex: '#6f4e37' },
  { name: 'Marble', hex: '#f3f0ea', material: 'marble' },
  { name: 'Light Wood', hex: '#c8a165', material: 'wood' },
  { name: 'Dark Wood', hex: '#5a3a22', material: 'wood' },
])

/**
 * Map a generic selection to concrete print settings + the chosen colour.
 * Unknown strength/quality fall back to defaults; an unknown colour yields a
 * plastic material with no colour override.
 *
 * @param {{strength?:string, quality?:string, colour?:string}} selection
 * @param {Array<{name,hex,material?}>} [colours]
 * @returns {{layerHeight, initialLayerHeight, wallLoops, sparseInfillDensity, materialType, colourHex, colourName}}
 */
export function mapGenericToPrintSettings(
  { strength, quality, colour } = {},
  colours = DEFAULT_PRINT_COLOURS,
) {
  const q = QUALITY_MAP[quality] || QUALITY_MAP[DEFAULT_QUALITY]
  const s = STRENGTH_MAP[strength] || STRENGTH_MAP[DEFAULT_STRENGTH]
  const entry = (colours || []).find(
    (c) => c?.name && colour && c.name.toLowerCase() === String(colour).toLowerCase(),
  )

  return {
    layerHeight: q.layerHeight,
    initialLayerHeight: q.initialLayerHeight,
    wallLoops: s.wallLoops,
    sparseInfillDensity: s.sparseInfillDensity,
    materialType: entry?.material || 'plastic',
    colourHex: entry?.hex || null,
    colourName: entry?.name || null,
  }
}
