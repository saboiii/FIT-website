// Pure: which welcome-drip step (if any) is due for a subscriber?
const DAY = 24 * 3600 * 1000

export function dueWelcomeStep(subscriber, sequence, now = new Date()) {
  if (!sequence?.isActive || !Array.isArray(sequence.steps) || !sequence.steps.length) return null
  if (subscriber.status !== 'active') return null
  const stepIndex = subscriber.welcomeStep ?? 0
  if (stepIndex >= sequence.steps.length) return null
  const step = sequence.steps[stepIndex]
  const anchor = subscriber.welcomeStepSentAt || subscriber.createdAt
  if (!anchor) return null
  const dueAt = new Date(anchor).getTime() + (Number(step.delayDays) || 0) * DAY
  if (now.getTime() < dueAt) return null
  return { stepIndex, step }
}
