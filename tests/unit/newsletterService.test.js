import { describe, it, expect, vi } from 'vitest'
import { sendCampaign } from '@/lib/newsletter/service'

const campaign = { _id: 'c1', subject: 'Digest', sentTokens: ['tok-already'] }
const subscribers = [
  { email: 'a@x.com', unsubscribeToken: 'tok-a' },
  { email: 'already@x.com', unsubscribeToken: 'tok-already' },
  { email: 'b@x.com', unsubscribeToken: 'tok-b' },
]

describe('sendCampaign', () => {
  it('skips already-sent tokens and records each success via onSent', async () => {
    const sendEmail = vi.fn().mockResolvedValue()
    const onSent = vi.fn().mockResolvedValue()
    const result = await sendCampaign({
      campaign, subscribers, posts: [], baseUrl: 'https://x.test', sendEmail, onSent,
    })
    expect(result).toEqual({ sent: 2, failed: 0, errors: [] })
    expect(sendEmail).toHaveBeenCalledTimes(2)
    expect(sendEmail.mock.calls.map((c) => c[0].to)).toEqual(['a@x.com', 'b@x.com'])
    expect(onSent).toHaveBeenCalledTimes(2)
  })

  it('continues past individual failures and reports them', async () => {
    const sendEmail = vi.fn()
      .mockRejectedValueOnce(new Error('smtp boom'))
      .mockResolvedValueOnce()
    const result = await sendCampaign({
      campaign, subscribers, posts: [], baseUrl: 'https://x.test', sendEmail,
    })
    expect(result.sent).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.errors[0]).toContain('a@x.com')
    expect(result.errors[0]).toContain('smtp boom')
  })
})
