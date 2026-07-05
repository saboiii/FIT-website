/**
 * Pure body builder for the admin notification email sent when a customer
 * submits a custom-print configuration that requires a manual quote (advanced
 * mode). No I/O — receives a request-shaped object, returns `{subject, html}`
 * (full document, rendered through the shared light-theme base layout).
 *
 * Keeping the builder pure means we can unit-test the content without touching
 * nodemailer or env credentials.
 */
import { emailLayout, bodyBlock, esc, SITE_URL } from '@/lib/email/template'

function fmtSetting(label, value) {
  if (value === undefined || value === null || value === '') return ''
  return `<li style="margin-bottom:4px;"><b>${esc(label)}:</b> ${esc(value)}</li>`
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
  const bodyHtml =
    bodyBlock({
      heading: 'A custom-print request needs a manual quote',
      paragraphs: [
        `Customer <b>${esc(customer)}</b> submitted advanced print settings that require your review before quoting.`,
      ],
    }) +
    `<ul style="margin:0 0 16px 0;padding-left:18px;">
      <li style="margin-bottom:4px;"><b>Request ID:</b> ${esc(reqId)}</li>
      <li style="margin-bottom:4px;"><b>Model file:</b> ${esc(modelName)}</li>
      <li style="margin-bottom:4px;"><b>Per-mesh colours set:</b> ${esc(colourCount)}</li>
    </ul>
    <h2 style="font-size:15px;margin:16px 0 8px 0;">Print settings</h2>
    <ul style="margin:0 0 16px 0;padding-left:18px;">${settingsList || '<li>(none provided)</li>'}</ul>
    <p style="margin:0;">Open the admin dashboard to set a quote, dimensions, and delivery options.</p>`

  const html = emailLayout({
    title: subject,
    preheader: `${customer} submitted advanced settings — set a quote.`,
    bodyHtml: bodyHtml + `<p style="margin:16px 0 0 0;"><a href="${SITE_URL}/admin" style="color:#67696b;">Open admin dashboard →</a></p>`,
  })

  return { subject, html }
}
