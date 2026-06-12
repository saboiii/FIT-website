import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}))
vi.mock('@/lib/checkPrivileges', () => ({ checkAdminPrivileges: vi.fn() }))
vi.mock('@/lib/db', () => ({ connectToDatabase: vi.fn() }))
vi.mock('@/models/User', () => ({ default: { find: vi.fn() } }))

import { auth, clerkClient } from '@clerk/nextjs/server'
import { checkAdminPrivileges } from '@/lib/checkPrivileges'
import User from '@/models/User'
import { GET } from '@/app/api/user/batch/route'

function get(ids = 'user_1') {
  return GET({ url: `http://localhost/api/user/batch?ids=${ids}` })
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ userId: 'user_admin' })
  checkAdminPrivileges.mockResolvedValue(true)
  clerkClient.mockResolvedValue({
    users: {
      getUser: vi.fn().mockResolvedValue({
        firstName: 'Ada',
        lastName: 'L',
        emailAddresses: [{ emailAddress: 'ada@example.com' }],
        phoneNumbers: [],
        publicMetadata: {},
        privateMetadata: {},
      }),
    },
  })
  User.find.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
})

describe('GET /api/user/batch', () => {
  it('rejects unauthenticated callers', async () => {
    auth.mockResolvedValue({ userId: null })
    const res = await get()
    expect(res.status).toBe(401)
  })

  it('rejects authenticated non-admins (PII + Stripe ids inside)', async () => {
    checkAdminPrivileges.mockResolvedValue(false)
    const res = await get()
    expect(res.status).toBe(403)
  })

  it('returns user details for admins', async () => {
    const res = await get('user_1')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.users).toHaveLength(1)
    expect(body.users[0].email).toBe('ada@example.com')
  })
})
