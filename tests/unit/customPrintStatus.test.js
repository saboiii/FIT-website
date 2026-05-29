import { describe, it, expect } from 'vitest'
import { customPrintStage, isCustomPrintBlockingCheckout } from '@/utils/customPrintStatus'

describe('customPrintStage', () => {
  it('treats pending_upload / pending_config as customer action needed', () => {
    for (const s of ['pending_upload', 'pending_config']) {
      const stage = customPrintStage(s)
      expect(stage.stage).toBe('action_needed')
      expect(stage.actionNeeded).toBe(true)
      expect(stage.payable).toBe(false)
    }
  })

  it('treats configured as awaiting quote — NOT incomplete, no action needed', () => {
    const stage = customPrintStage('configured')
    expect(stage.stage).toBe('awaiting_quote')
    expect(stage.actionNeeded).toBe(false)
    expect(stage.title.toLowerCase()).not.toContain('incomplete')
  })

  it('treats quoted / payment_pending as payable', () => {
    expect(customPrintStage('quoted').payable).toBe(true)
    expect(customPrintStage('payment_pending').payable).toBe(true)
  })

  it('treats paid+ as in production', () => {
    for (const s of ['paid', 'printing', 'printed', 'shipped', 'delivered']) {
      expect(customPrintStage(s).stage).toBe('in_production')
    }
  })

  it('handles cancelled and unknown statuses safely', () => {
    expect(customPrintStage('cancelled').stage).toBe('cancelled')
    expect(customPrintStage('something-else').stage).toBe('unknown')
  })
})

describe('isCustomPrintBlockingCheckout', () => {
  it('blocks while action is needed or awaiting a quote', () => {
    expect(isCustomPrintBlockingCheckout('pending_upload')).toBe(true)
    expect(isCustomPrintBlockingCheckout('pending_config')).toBe(true)
    expect(isCustomPrintBlockingCheckout('configured')).toBe(true)
  })

  it('does not block once quoted or later', () => {
    expect(isCustomPrintBlockingCheckout('quoted')).toBe(false)
    expect(isCustomPrintBlockingCheckout('paid')).toBe(false)
  })
})
