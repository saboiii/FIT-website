// Pure: text → reading time in whole minutes (200 wpm, ≥1 for non-empty).
const WPM = 200

export function readingTimeMinutes(text) {
  if (!text) return 0
  const plain = String(text)
    // strip common markdown/markup syntax so it isn't counted as words
    .replace(/[#*_`>~[\]()!-]/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return 0
  const words = plain.split(' ').length
  return Math.max(1, Math.round(words / WPM))
}
