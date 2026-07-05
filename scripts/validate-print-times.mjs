#!/usr/bin/env node
/**
 * Print-farm timing validation (openspec change
 * `add-lightweight-print-time-estimator`, task 3.2).
 *
 * Compares the priced volume heuristic and the shape-aware layer-stack
 * estimator against REAL print times, then least-squares fits the layer-stack
 * constants (flowMm3PerS / perLayerOverheadS) to your machines.
 *
 * Usage:
 *   node scripts/validate-print-times.mjs samples.csv
 *
 * samples.csv — one row per timed print (header required):
 *   file,actualHours[,layerHeightMm,infillPercent,wallLoops,enableSupport,label]
 *   models/benchy.stl,1.9
 *   models/bracket.3mf,4.25,0.2,20,2,true,bracket with supports
 *
 * Print SHAPE-DIVERSE references (at least one flat/wide part and one tall/
 * narrow part) or the two constants cannot be separated. Supported formats:
 * STL, OBJ, glTF/GLB, 3MF. `actualHours` is wall-clock printer time in hours
 * (1h 30m = 1.5).
 */
import { readFile } from 'node:fs/promises'
import { parseModelToPositions } from '../lib/quoting/serverGeometry.js'
import { computeGeometryMetrics } from '../lib/quoting/geometryVolume.js'
import { estimatePrintHours } from '../lib/quoting/printTimeEstimate.js'
import {
  layerStackComponents,
  hoursFromLayerStackComponents,
  DEFAULT_LAYER_STACK_MODEL,
} from '../lib/quoting/printTime/layerStack.js'
import { comparePrintTimes, fitLayerStackConstants } from '../lib/quoting/printTime/validate.js'

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  const header = lines.shift().split(',').map((h) => h.trim())
  return lines.map((line) => {
    // Last column (label) may contain commas — split only header-1 times.
    const cells = line.split(',')
    const row = {}
    header.forEach((h, i) => {
      row[h] = i === header.length - 1 ? cells.slice(i).join(',').trim() : cells[i]?.trim()
    })
    return row
  })
}

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Usage: node scripts/validate-print-times.mjs samples.csv (see file header for format)')
  process.exit(1)
}

const rows = parseCsv(await readFile(csvPath, 'utf8'))
if (rows.length === 0) {
  console.error('No sample rows found in', csvPath)
  process.exit(1)
}

const samples = []
for (const row of rows) {
  const label = row.label || row.file
  const actualHours = Number(row.actualHours)
  if (!(actualHours > 0)) {
    console.warn(`skipping ${label}: actualHours must be > 0`)
    continue
  }
  const settings = {
    layerHeightMm: Number(row.layerHeightMm) || 0.2,
    infillPercent: Number(row.infillPercent) || 20,
    wallLoops: Number(row.wallLoops) || 2,
    enableSupport: String(row.enableSupport).toLowerCase() === 'true',
  }
  const parsed = await parseModelToPositions(await readFile(row.file), row.file)
  if (!parsed) {
    console.warn(`skipping ${label}: unsupported or unparseable file`)
    continue
  }
  const metrics = computeGeometryMetrics({ positions: parsed.positions, index: null, sourceUnit: parsed.sourceUnit })
  const components = layerStackComponents({ ...parsed, settings })
  samples.push({
    label,
    actualHours,
    settings,
    components,
    estimates: {
      'volume heuristic (priced)': estimatePrintHours({ volumeCm3: metrics.volumeCm3, dimensionsCm: metrics.dimensionsCm, ...settings }),
      'layer-stack (current constants)': hoursFromLayerStackComponents(components),
    },
  })
}

if (samples.length === 0) {
  console.error('No usable samples.')
  process.exit(1)
}

const fmt = (h) => `${h.toFixed(2)}h`
const pct = (p) => `${p >= 0 ? '+' : ''}${p.toFixed(0)}%`

const fit = fitLayerStackConstants(
  samples.map((s) => ({ ...s.components, actualHours: s.actualHours })),
)
if (fit) {
  const tuned = { ...DEFAULT_LAYER_STACK_MODEL, ...fit }
  for (const s of samples) {
    s.estimates['layer-stack (FITTED constants)'] = hoursFromLayerStackComponents(s.components, tuned)
  }
}

const { rows: report, summary } = comparePrintTimes(samples)
console.log('\nPer-print comparison (error vs actual):\n')
for (const r of report) {
  console.log(`  ${r.label} — actual ${fmt(r.actualHours)}`)
  for (const [name, err] of Object.entries(r.errors)) {
    const est = samples.find((s) => s.label === r.label).estimates[name]
    console.log(`      ${name.padEnd(34)} ${fmt(est).padStart(8)}  (${pct(err)})`)
  }
}
console.log('\nSummary (mean |error| / bias):\n')
for (const [name, s] of Object.entries(summary)) {
  console.log(`  ${name.padEnd(34)} ${s.meanAbsPctError.toFixed(1).padStart(6)}%  /  ${pct(s.meanPctBias)}`)
}

if (fit) {
  console.log(`\nFitted constants (from ${fit.samplesUsed} prints):`)
  console.log(`  flowMm3PerS       = ${fit.flowMm3PerS.toFixed(2)}   (current default ${DEFAULT_LAYER_STACK_MODEL.flowMm3PerS})`)
  console.log(`  perLayerOverheadS = ${fit.perLayerOverheadS.toFixed(2)}   (current default ${DEFAULT_LAYER_STACK_MODEL.perLayerOverheadS})`)
  console.log(
    '\nIf the FITTED row above tracks your actual times well, apply these in\n' +
    'DEFAULT_LAYER_STACK_MODEL (lib/quoting/printTime/layerStack.js) — that\n' +
    'completes task 3.2 and unblocks the pricing swap (task 3.3).',
  )
} else {
  console.log(
    '\nCould not fit constants. Two possible causes:\n' +
    '  - fewer than 2 shape-diverse prints (print one flat slab AND one tall\n' +
    '    tower; same-shape samples cannot separate flow from per-layer overhead)\n' +
    '  - inconsistent times (the best fit needed a negative constant — recheck\n' +
    '    the actualHours values and that settings match what was really printed)',
  )
}
