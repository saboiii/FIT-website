// RTL smoke for the admin print-time calibration panel: renders samples from
// the API, offers apply when a fit exists, and posts uploads/updates.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/components/General/ToastProvider', () => ({
    useToast: () => ({ showToast: vi.fn() }),
}))

import PrintTimeCalibration from '@/components/Admin/PrintTimeCalibration'

const view = (overrides = {}) => ({
    samples: [
        {
            id: 's1',
            label: 'flat plate',
            fileName: 'plate.stl',
            settings: { layerHeightMm: 0.2, infillPercent: 20, wallLoops: 2, enableSupport: false },
            actualHours: 1.5,
            estimatedHours: 1.2,
        },
        {
            id: 's2',
            label: 'tall tower',
            fileName: 'tower.stl',
            settings: { layerHeightMm: 0.2, infillPercent: 20, wallLoops: 2, enableSupport: false },
            actualHours: null,
            estimatedHours: 3.4,
        },
    ],
    timedCount: 1,
    fit: null,
    applied: null,
    ...overrides,
})

describe('PrintTimeCalibration', () => {
    beforeEach(() => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve(view()) }),
        )
    })
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('lists samples with their estimates and guides toward shape diversity', async () => {
        render(<PrintTimeCalibration />)
        expect(await screen.findByText('flat plate')).toBeInTheDocument()
        expect(screen.getByText('tall tower')).toBeInTheDocument()
        expect(screen.getByText(/We estimate 1h 12m/)).toBeInTheDocument()
        // One timed print → nudge for a second, differently-shaped one.
        expect(screen.getByText(/add a second, differently-shaped one/)).toBeInTheDocument()
        expect(screen.queryByText('Apply calibration')).toBeNull()
    })

    it('offers one-click apply when a fit exists and PUTs the apply action', async () => {
        const fitted = view({
            timedCount: 2,
            fit: {
                flowMm3PerS: 8,
                perLayerOverheadS: 4,
                samplesUsed: 2,
                currentMeanAbsPctError: 24,
                fittedMeanAbsPctError: 3,
            },
        })
        global.fetch = vi.fn((url, opts) =>
            Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve(
                        opts?.method === 'PUT' ? { ...fitted, applied: { flowMm3PerS: 8, perLayerOverheadS: 4, fittedAt: null } } : fitted,
                    ),
            }),
        )
        render(<PrintTimeCalibration />)
        // "off by 24% … drops to 3%" spans multiple elements — match the pieces.
        expect(await screen.findByText('24%')).toBeInTheDocument()
        expect(screen.getByText('3%')).toBeInTheDocument()
        fireEvent.click(screen.getByText('Apply calibration'))
        await waitFor(() => expect(screen.getByText(/Calibration applied/)).toBeInTheDocument())
        const putCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'PUT')
        expect(JSON.parse(putCall[1].body)).toEqual({ action: 'apply' })
    })
})
