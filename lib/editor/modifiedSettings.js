/**
 * Pure diff of current editor settings vs their defaults, powering the
 * per-field reset panel (openspec change `add-per-field-setting-reset`).
 * Returns one entry per changed field with everything the UI needs to render
 * a row and reset just that field.
 */

/** "sparseInfillDensity" -> "Sparse infill density" */
export function humanizeSettingKey(key) {
  const words = String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * @param {object} current - current values keyed by setting name
 * @param {object} defaults - default values for the same keys
 * @param {string} [pathPrefix] - leva store path prefix (e.g. 'printability')
 * @returns {Array<{key,label,value,defaultValue,path}>} changed fields only
 */
export function modifiedSettings(current, defaults, pathPrefix = '') {
  if (!current || !defaults) return []
  const out = []
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const value = current[key]
    if (value === undefined || value === defaultValue) continue
    out.push({
      key,
      label: humanizeSettingKey(key),
      value,
      defaultValue,
      path: pathPrefix ? `${pathPrefix}.${key}` : key,
    })
  }
  return out
}
