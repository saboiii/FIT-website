// CoachMarks guided tours (blueprint §9.11): step rendering, next/back/done,
// missing-selector skipping, Esc, and the localStorage-backed auto-offer hook.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, renderHook, waitFor, act } from '@testing-library/react'
import CoachMarks, { useTourOffer, TourOfferStrip } from '@/components/dashboard-ui/CoachMarks'

const STEPS = [
    { selector: '[data-tour="one"]', title: 'Step one', body: 'First thing to know.' },
    { selector: '[data-tour="missing"]', title: 'Ghost step', body: 'Selector matches nothing.' },
    { selector: '[data-tour="two"]', title: 'Step two', body: 'Second thing to know.' },
]

function Fixture({ open = true, onClose = () => {} }) {
    return (
        <div>
            <div data-tour="one">target one</div>
            <div data-tour="two">target two</div>
            <CoachMarks steps={STEPS} open={open} onClose={onClose} panelKey="testPanel" />
        </div>
    )
}

afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
})

describe('CoachMarks', () => {
    it('renders the first step and skips steps whose selector is missing', async () => {
        render(<Fixture />)
        expect(await screen.findByText('Step one')).toBeInTheDocument()
        expect(screen.getByText('First thing to know.')).toBeInTheDocument()
        // Ghost step dropped: 2 live steps, not 3.
        expect(screen.getByLabelText('Step 1 of 2')).toBeInTheDocument()
        expect(screen.queryByText('Ghost step')).toBeNull()
    })

    it('walks forward and back through the steps, ending with Done', async () => {
        const onClose = vi.fn()
        render(<Fixture onClose={onClose} />)
        await screen.findByText('Step one')
        expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()

        fireEvent.click(screen.getByRole('button', { name: 'Next' }))
        expect(await screen.findByText('Step two')).toBeInTheDocument()
        expect(screen.getByLabelText('Step 2 of 2')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Back' }))
        expect(await screen.findByText('Step one')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Next' }))
        fireEvent.click(await screen.findByRole('button', { name: 'Done' }))
        expect(onClose).toHaveBeenCalled()
        // Finishing marks the panel's tour as seen.
        expect(localStorage.getItem('dashTourSeen.testPanel')).toBe('1')
    })

    it('closes on Escape and marks the tour seen', async () => {
        const onClose = vi.fn()
        render(<Fixture onClose={onClose} />)
        await screen.findByText('Step one')
        fireEvent.keyDown(window, { key: 'Escape' })
        expect(onClose).toHaveBeenCalled()
        expect(localStorage.getItem('dashTourSeen.testPanel')).toBe('1')
    })

    it('renders nothing when closed or when no selector resolves', () => {
        const { container } = render(
            <CoachMarks steps={STEPS} open={false} onClose={() => {}} panelKey="testPanel" />,
        )
        expect(container.querySelector('[role="dialog"]')).toBeNull()
        cleanup()
        // Open, but none of the selectors exist in this DOM.
        const { container: c2 } = render(
            <CoachMarks
                steps={[{ selector: '[data-tour="nowhere"]', title: 'X', body: 'Y' }]}
                open
                onClose={() => {}}
                panelKey="testPanel"
            />,
        )
        expect(c2.querySelector('[role="dialog"]')).toBeNull()
    })
})

describe('useTourOffer', () => {
    it('offers once, and accept/dismiss persist "seen" so it never re-offers', async () => {
        const first = renderHook(() => useTourOffer('somePanel'))
        await waitFor(() => expect(first.result.current.offered).toBe(true))

        act(() => first.result.current.dismiss())
        expect(first.result.current.offered).toBe(false)
        expect(localStorage.getItem('dashTourSeen.somePanel')).toBe('1')

        // A later visit (fresh hook instance) is never offered again.
        const second = renderHook(() => useTourOffer('somePanel'))
        await waitFor(() => expect(second.result.current.offered).toBe(false))
    })

    it('accept also marks seen (the panel opens the tour itself)', async () => {
        const { result } = renderHook(() => useTourOffer('otherPanel'))
        await waitFor(() => expect(result.current.offered).toBe(true))
        act(() => result.current.accept())
        expect(localStorage.getItem('dashTourSeen.otherPanel')).toBe('1')
        expect(result.current.offered).toBe(false)
    })
})

describe('TourOfferStrip', () => {
    it('renders Start / No thanks and fires the callbacks', () => {
        const onStart = vi.fn()
        const onDismiss = vi.fn()
        render(<TourOfferStrip onStart={onStart} onDismiss={onDismiss} />)
        fireEvent.click(screen.getByRole('button', { name: 'Start' }))
        expect(onStart).toHaveBeenCalled()
        fireEvent.click(screen.getByRole('button', { name: 'No thanks' }))
        expect(onDismiss).toHaveBeenCalled()
    })
})
