import { describe, it, expect } from 'vitest'
import { buildNewChatMessageEmail } from '@/lib/email/templates/chat'

describe('buildNewChatMessageEmail', () => {
  it('includes sender name in subject and body', () => {
    const { subject, html } = buildNewChatMessageEmail({ senderName: 'Grace', messageText: 'Hello!' })
    expect(subject).toContain('Grace')
    expect(html).toContain('Grace')
    expect(html).toContain('Hello!')
  })

  it('escapes the message preview and truncates long text', () => {
    const long = 'x'.repeat(200) + '<script>'
    const { html } = buildNewChatMessageEmail({ senderName: 'A', messageText: long })
    expect(html).toContain('…')
    expect(html).not.toContain('<script>')
  })

  it('falls back gracefully with no sender/text', () => {
    const { subject, html } = buildNewChatMessageEmail({})
    expect(subject).toContain('someone')
    expect(html).not.toContain('undefined')
  })
})
