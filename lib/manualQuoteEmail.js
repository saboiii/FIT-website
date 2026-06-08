/**
 * Pure body builder for the admin notification email sent when a customer
 * submits a custom-print configuration that requires a manual quote (advanced
 * mode). No I/O — receives a request-shaped object, returns `{subject, html}`.
 *
 * Keeping the body builder pure means we can unit-test the content without
 * touching nodemailer or env credentials.
 */

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function fmtSetting(label, value) {
  if (value === undefined || value === null || value === '') return ''
  return `<li><b>${esc(label)}:</b> ${esc(value)}</li>`
}

/**
 * @param {{
 *   request: {
 *     requestId: string,
 *     userEmail?: string, userName?: string,
 *     modelFile?: { originalName?: string },
 *     printConfiguration?: { printSettings?: object, meshColors?: object }
 *   }
 * }} args
 * @returns {{subject: string, html: string}}
 */
export function buildManualQuoteAdminEmail({ request } = {}) {
  const reqId = request?.requestId || '(no id)'
  const customer = request?.userName || request?.userEmail || '(unknown customer)'
  const modelName = request?.modelFile?.originalName || '(no model uploaded yet)'
  const ps = request?.printConfiguration?.printSettings || {}
  const meshColors = request?.printConfiguration?.meshColors || {}
  const colourCount = Object.keys(meshColors).length

  const settingsList = [
    fmtSetting('Material', ps.materialType),
    fmtSetting('Layer height (mm)', ps.layerHeight),
    fmtSetting('Initial layer (mm)', ps.initialLayerHeight),
    fmtSetting('Wall loops', ps.wallLoops),
    fmtSetting('Infill density (%)', ps.sparseInfillDensity),
    fmtSetting('Infill pattern', ps.sparseInfillPattern),
    fmtSetting('Nozzle (mm)', ps.nozzleDiameter),
    fmtSetting(
      'Support',
      ps.enableSupport === undefined
        ? null
        : ps.enableSupport
        ? `Yes (${ps.supportType || 'Normal'})`
        : 'No',
    ),
    fmtSetting('Print plate', ps.printPlate),
  ]
    .filter(Boolean)
    .join('')

  const subject = `Custom print request needs a manual quote — ${reqId}`
  const html = `
    <h3 style="margin:0 0 12px 0;">A custom-print request needs a manual quote</h3>
    <p>Customer <b>${esc(customer)}</b> submitted advanced print settings that
    require your review before quoting.</p>
    <ul>
      <li><b>Request ID:</b> ${esc(reqId)}</li>
      <li><b>Model file:</b> ${esc(modelName)}</li>
      <li><b>Per-mesh colours set:</b> ${esc(colourCount)}</li>
    </ul>
    <h4 style="margin:16px 0 8px 0;">Print settings</h4>
    <ul>${settingsList || '<li>(none provided)</li>'}</ul>
    <p>Open the admin dashboard to set a quote, dimensions, and delivery options.</p>
  `

  return { subject, html }
}
