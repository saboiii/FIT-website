import { describe, it, expect } from 'vitest'
import { resolveAudience } from '@/lib/newsletter/audience'
import { renderCampaignEmail, renderWelcomeEmail, trackedClickUrl } from '@/lib/newsletter/template'
import { dueWelcomeStep } from '@/lib/newsletter/welcome'

const now = new Date('2026-07-03T00:00:00Z')

describe('resolveAudience', () => {
  const subs = [
    { email: 'a@x.com', status: 'active', interestIds: ['printing'] },
    { email: 'b@x.com', status: 'unsubscribed', interestIds: ['printing'] },
    { email: 'c@x.com', status: 'active', interestIds: ['news'], preferences: { pausedUntil: '2027-01-01' } },
    { email: 'd@x.com', status: 'active', interestIds: [] },
  ]
  it('sends "all" campaigns to active, unpaused subscribers', () => {
    const out = resolveAudience(subs, { audience: { type: 'all' } }, now)
    expect(out.map((s) => s.email)).toEqual(['a@x.com', 'd@x.com'])
  })
  it('segments by interest', () => {
    const out = resolveAudience(subs, { audience: { type: 'interests', interestIds: ['printing'] } }, now)
    expect(out.map((s) => s.email)).toEqual(['a@x.com'])
  })
  it('interest campaigns with no interests go to nobody', () => {
    expect(resolveAudience(subs, { audience: { type: 'interests', interestIds: [] } }, now)).toEqual([])
  })
})

describe('renderCampaignEmail', () => {
  const campaign = { _id: 'c1', subject: 'July <digest>', intro: 'Hot & new' }
  const subscriber = { unsubscribeToken: 'tok-1' }
  const posts = [{ title: 'Post A', slug: 'post-a', excerpt: 'About A' }]

  it('wraps article links for click tracking and appends the open pixel', () => {
    const { html } = renderCampaignEmail({ campaign, posts, subscriber, baseUrl: 'https://x.test' })
    // & is HTML-escaped inside attributes
    expect(html).toContain('/api/newsletter/click?c=c1&amp;s=tok-1&amp;url=https%3A%2F%2Fx.test%2Fblog%2Fpost-a')
    expect(html).toContain('/api/newsletter/open?c=c1&amp;s=tok-1')
    expect(html).toContain('/newsletter/unsubscribe/tok-1')
  })

  it('escapes subject and content', () => {
    const { html } = renderCampaignEmail({ campaign, posts, subscriber, baseUrl: 'https://x.test' })
    expect(html).toContain('July &lt;digest&gt;')
    expect(html).not.toContain('July <digest>')
  })

  it('produces a text alternative with unsubscribe', () => {
    const { text } = renderCampaignEmail({ campaign, posts, subscriber, baseUrl: 'https://x.test' })
    expect(text).toContain('Post A')
    expect(text).toContain('Unsubscribe: https://x.test/newsletter/unsubscribe/tok-1')
  })
})

describe('trackedClickUrl', () => {
  it('encodes the target url', () => {
    const url = trackedClickUrl({ baseUrl: 'https://x.test', campaignId: 'c', token: 't', url: 'https://x.test/blog/a?b=1' })
    expect(url).toContain('url=https%3A%2F%2Fx.test%2Fblog%2Fa%3Fb%3D1')
  })
})

describe('dueWelcomeStep', () => {
  const sequence = {
    isActive: true,
    steps: [
      { delayDays: 0, subject: 'Welcome!' },
      { delayDays: 3, subject: 'Getting started' },
    ],
  }
  it('first step due immediately after subscribing', () => {
    const sub = { status: 'active', welcomeStep: 0, createdAt: '2026-07-02T00:00:00Z' }
    expect(dueWelcomeStep(sub, sequence, now)?.stepIndex).toBe(0)
  })
  it('second step waits for its delay from the previous send', () => {
    const early = { status: 'active', welcomeStep: 1, welcomeStepSentAt: '2026-07-01T00:00:00Z' }
    expect(dueWelcomeStep(early, sequence, now)).toBeNull()
    const due = { status: 'active', welcomeStep: 1, welcomeStepSentAt: '2026-06-29T00:00:00Z' }
    expect(dueWelcomeStep(due, sequence, now)?.stepIndex).toBe(1)
  })
  it('finished, inactive, or unsubscribed → nothing', () => {
    expect(dueWelcomeStep({ status: 'active', welcomeStep: 2, createdAt: now }, sequence, now)).toBeNull()
    expect(dueWelcomeStep({ status: 'unsubscribed', welcomeStep: 0, createdAt: now }, sequence, now)).toBeNull()
    expect(dueWelcomeStep({ status: 'active', welcomeStep: 0, createdAt: now }, { ...sequence, isActive: false }, now)).toBeNull()
  })
})

describe('renderWelcomeEmail', () => {
  it('renders paragraphs and unsubscribe link', () => {
    const { html } = renderWelcomeEmail({
      step: { subject: 'Hi', body: 'Para one\n\nPara two' },
      subscriber: { unsubscribeToken: 'tok-9' },
      baseUrl: 'https://x.test',
    })
    expect(html).toContain('Para one')
    expect(html).toContain('Para two')
    expect(html).toContain('/newsletter/unsubscribe/tok-9')
  })
})
