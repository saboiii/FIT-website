/**
 * "Sunlit Paper" motion tokens — the ONLY transitions permitted in dashboard
 * code (docs/DASHBOARD-UX-BLUEPRINT.md §4.5, research track B).
 *
 * Springs are derived from Apple's perceptual-duration+bounce model:
 *   stiffness = (2π/T)², damping = (1−bounce)·4π/T, mass = 1.
 * Use with framer-motion's `transition` prop. Never inline ad-hoc configs.
 */

/** Default for any state change: expand, layout, toggle. T≈0.35s, bounce 0. */
export const settle = { type: 'spring', stiffness: 320, damping: 36, mass: 1 }

/** Button/card press (scale 0.97; small icons 0.95). T≈0.18s, bounce 0. */
export const press = { type: 'spring', stiffness: 1200, damping: 70, mass: 1 }

/** Sheets, modals, palette, peek — the only overshoot. T≈0.5s, bounce 0.15. */
export const sheet = { type: 'spring', stiffness: 160, damping: 21, mass: 1 }

/** First-mount list/tile entrance (pair with stagger()). T≈0.4s, bounce 0. */
export const staggerIn = { type: 'spring', stiffness: 250, damping: 31, mass: 1 }

/** Content crossfade: tabs, data swap. Opacity only, no movement. */
export const swap = { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
export const swapExit = { duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }

/** Parent variants for first-mount stagger: 40ms, first 6 items only (§4.5). */
export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}
export const staggerChild = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: staggerIn },
}

/** Clamp stagger delay: items beyond the 6th enter together. */
export const staggerDelay = (index) => Math.min(index, 6) * 0.04
