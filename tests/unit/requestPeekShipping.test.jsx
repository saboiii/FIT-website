// Regression: opening the quote editor mounts the REAL ShippingFields inside
// the peek. Its delivery-sync effect signals "no change" by returning the
// same object — the peek's setForm adapter must honour that or React loops
// ("Maximum update depth exceeded", found in browser QA 2026-07-05).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import CustomPrintRequests from '@/components/Admin/CustomPrintRequests'

vi.mock('@/utils/AdminSettingsContext', () => ({
    useAdminSettings: () => ({
        settings: {
            deliveryTypes: [
                { name: 'local-pickup', displayName: 'Local Pickup', isActive: true, description: '' },
                { name: 'standard-shipping', displayName: 'Standard Shipping', isActive: true, description: '' },
            ],
        },
        loading: false,
        error: null,
    }),
}))
vi.mock('@/components/General/ToastProvider', () => ({
    useToast: () => ({ showToast: vi.fn() }),
}))
// NOTE: deliberately NOT stubbing ShippingFields — the loop lived in the
// interaction between its sync effect and the peek's setForm adapter.

const request = {
    requestId: 'REQ-LOOP',
    userEmail: 'loop@example.com',
    status: 'configured',
    createdAt: '2026-07-01T10:00:00Z',
    modelFile: { originalName: 'loop.stl', s3Key: 'models/loop.stl' },
    printConfiguration: { printSettings: { layerHeight: 0.2 }, meshColors: {} },
    dimensions: { length: 10, width: 8, height: 4, weight: 0.5 },
    // Saved delivery types make ShippingFields seed + sync on mount — the
    // exact path that looped.
    delivery: { deliveryTypes: [{ type: 'local-pickup', price: 5, customPrice: 5, customDescription: null }] },
    statusHistory: [],
}

beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ requests: [request] }) }))
})
afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('RequestPeek + real ShippingFields', () => {
    it('opens the quote editor without an update-depth loop', async () => {
        render(<CustomPrintRequests />)
        fireEvent.click(await screen.findByText('loop.stl'))
        fireEvent.click(await screen.findByText('Create quote'))
        // Real ShippingFields mounted and settled: its content is visible and
        // React did not throw "Maximum update depth exceeded".
        await waitFor(() => expect(screen.getByText('Local Pickup')).toBeInTheDocument())
        expect(screen.getByText('Standard Shipping')).toBeInTheDocument()
    })
})
