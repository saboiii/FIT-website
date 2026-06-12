import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({ connectToDatabase: vi.fn() }))
vi.mock('@/models/CustomPrintRequest', () => ({ default: { exists: vi.fn() } }))
vi.mock('@/models/DigitalProductTransaction', () => ({ default: { exists: vi.fn() } }))
vi.mock('@/models/PrintOrder', () => ({ default: { exists: vi.fn() } }))
vi.mock('@/models/User', () => ({ default: { findOne: vi.fn() } }))
vi.mock('@/lib/checkPrivileges', () => ({ checkAdminPrivileges: vi.fn() }))

import CustomPrintRequest from '@/models/CustomPrintRequest'
import DigitalProductTransaction from '@/models/DigitalProductTransaction'
import PrintOrder from '@/models/PrintOrder'
import User from '@/models/User'
import { checkAdminPrivileges } from '@/lib/checkPrivileges'
import { isPrivateModelKey, canAccessModelKey } from '@/lib/proxyAccess'

const KEY = 'models/123-abc-part.stl'

beforeEach(() => {
  vi.clearAllMocks()
  CustomPrintRequest.exists.mockResolvedValue(null)
  DigitalProductTransaction.exists.mockResolvedValue(null)
  PrintOrder.exists.mockResolvedValue(null)
  User.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'mongo-id' }) })
  checkAdminPrivileges.mockResolvedValue(false)
})

describe('isPrivateModelKey', () => {
  it('flags models/ keys only', () => {
    expect(isPrivateModelKey('models/x.stl')).toBe(true)
    expect(isPrivateModelKey('images/p.jpg')).toBe(false)
    expect(isPrivateModelKey('viewables/v.glb')).toBe(false)
    expect(isPrivateModelKey('')).toBe(false)
    expect(isPrivateModelKey(null)).toBe(false)
  })
})

describe('canAccessModelKey', () => {
  it('denies anonymous callers', async () => {
    expect(await canAccessModelKey(KEY, null)).toBe(false)
  })

  it('allows the custom-print request owner', async () => {
    CustomPrintRequest.exists.mockResolvedValue({ _id: 'x' })
    expect(await canAccessModelKey(KEY, 'user_1')).toBe(true)
    expect(CustomPrintRequest.exists).toHaveBeenCalledWith({
      userId: 'user_1',
      'modelFile.s3Key': KEY,
    })
  })

  it('allows a digital-product buyer whose purchase includes the asset', async () => {
    DigitalProductTransaction.exists.mockResolvedValue({ _id: 'x' })
    expect(await canAccessModelKey(KEY, 'user_2')).toBe(true)
  })

  it('allows the owner of a print order referencing the model', async () => {
    PrintOrder.exists.mockResolvedValue({ _id: 'x' })
    expect(await canAccessModelKey(KEY, 'user_3')).toBe(true)
  })

  it('allows admins', async () => {
    checkAdminPrivileges.mockResolvedValue(true)
    expect(await canAccessModelKey(KEY, 'user_admin')).toBe(true)
  })

  it('denies everyone else', async () => {
    expect(await canAccessModelKey(KEY, 'user_stranger')).toBe(false)
  })
})
