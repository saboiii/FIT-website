// Pure step machine for the onboarding wizard.
export const WIZARD_STEPS = [
  { key: 'welcome', title: 'Welcome', blurb: 'What this wizard sets up' },
  { key: 'pricing', title: 'Pricing', blurb: 'What do you charge?' },
  { key: 'machines', title: 'Your machines', blurb: 'Print times & size limits' },
  { key: 'colours', title: 'Colours & materials', blurb: 'Curate your catalogue' },
  { key: 'delivery', title: 'Delivery', blurb: 'How prints reach customers' },
]

export function nextStep(i) {
  return Math.min(i + 1, WIZARD_STEPS.length - 1)
}

export function prevStep(i) {
  return Math.max(i - 1, 0)
}

export function isLastStep(i) {
  return i >= WIZARD_STEPS.length - 1
}
