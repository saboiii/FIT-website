// Pure: which subscribers does a campaign go to?
// Active only, not paused, and matching the interest segment (if any).
export function resolveAudience(subscribers = [], campaign = {}, now = new Date()) {
  const audience = campaign.audience || { type: 'all' }
  return subscribers.filter((s) => {
    if (s.status !== 'active') return false
    const paused = s.preferences?.pausedUntil
    if (paused && new Date(paused) > now) return false
    if (audience.type === 'interests') {
      const wanted = audience.interestIds || []
      if (!wanted.length) return false
      if (!(s.interestIds || []).some((id) => wanted.includes(id))) return false
    }
    return true
  })
}
