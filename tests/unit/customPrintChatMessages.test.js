import { describe, it, expect } from 'vitest'
import {
  customPrintChatMessage,
  CUSTOM_PRINT_CHAT_EVENTS,
} from '@/lib/chat/customPrintMessages'

describe('customPrintChatMessage', () => {
  it('returns null for an unknown event', () => {
    expect(customPrintChatMessage('nope')).toBeNull()
  })

  it('builds an awaiting-quote message with the model name', () => {
    const msg = customPrintChatMessage('awaiting-quote', { modelName: 'cat.stl' })
    expect(msg).toContain('cat.stl')
  })

  it('includes the amount in quote-ready and paid', () => {
    expect(customPrintChatMessage('quote-ready', { total: 35, currency: 'sgd' })).toContain('SGD 35.00')
    expect(customPrintChatMessage('paid', { total: 35, currency: 'sgd' })).toContain('SGD 35.00')
  })

  it('quote-ready omits amount cleanly when total is absent', () => {
    const msg = customPrintChatMessage('quote-ready', {})
    expect(msg).toContain('quote is ready')
    expect(msg).not.toContain('undefined')
  })

  it('shipped includes tracking when present', () => {
    expect(customPrintChatMessage('shipped', { trackingNumber: 'T1' })).toContain('T1')
    expect(customPrintChatMessage('shipped', {})).not.toContain('tracking')
  })

  it('cancelled includes the note', () => {
    expect(customPrintChatMessage('cancelled', { note: 'dup' })).toContain('dup')
  })

  it('every advertised event builds a non-empty string', () => {
    for (const ev of CUSTOM_PRINT_CHAT_EVENTS) {
      const msg = customPrintChatMessage(ev, {})
      expect(typeof msg).toBe('string')
      expect(msg.length).toBeGreaterThan(0)
      expect(msg).not.toContain('undefined')
    }
  })
})
