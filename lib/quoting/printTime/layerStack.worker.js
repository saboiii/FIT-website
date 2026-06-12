/**
 * Web Worker wrapper for the layer-stack print-time estimator, so slicing a
 * large mesh never blocks the editor's main thread.
 *
 * Usage (module worker):
 *   const w = new Worker(new URL('@/lib/quoting/printTime/layerStack.worker', import.meta.url))
 *   w.postMessage({ positions, sourceUnit, settings })   // positions may be transferred
 *   w.onmessage = ({ data }) => data.ok ? use(data.hours) : fallbackToHeuristic()
 *
 * Not yet wired into QuotePanel — the live quote is server-authoritative and
 * the API accepts metrics only, so a client-computed time can't feed the priced
 * quote without a product/security decision. See the openspec change
 * `add-lightweight-print-time-estimator` (validation + wiring tasks).
 */
import { estimatePrintHoursLayerStack } from './layerStack'

globalThis.onmessage = (event) => {
  try {
    const { positions, sourceUnit, settings, model } = event.data || {}
    const hours = estimatePrintHoursLayerStack({ positions, sourceUnit, settings }, model)
    globalThis.postMessage({ ok: true, hours })
  } catch (err) {
    globalThis.postMessage({ ok: false, error: err?.message || 'layer-stack estimate failed' })
  }
}
