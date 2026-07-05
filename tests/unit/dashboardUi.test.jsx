// Smoke tests for the Sunlit Paper primitives (blueprint §4.8) — render,
// interaction basics, and the alert/confirm-replacement dialog contract.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import {
    DashProvider,
    DashCard,
    StatTile,
    HeroGreeting,
    ViewTabs,
    StatusPill,
    SegmentPill,
    DottedRow,
    Timeline,
    ConfirmDialog,
    PeekPanel,
    EmptyState,
    LedgerTable,
} from '@/components/dashboard-ui'

afterEach(cleanup)

describe('dashboard-ui primitives', () => {
    it('DashProvider sets the .dash token scope', () => {
        const { container } = render(<DashProvider>hi</DashProvider>)
        expect(container.querySelector('.dash')).toBeInTheDocument()
    })

    it('StatTile renders label, numeral and delta context', () => {
        render(<StatTile label="Open requests" value={12} delta={8} />)
        expect(screen.getByText('Open requests')).toBeInTheDocument()
        expect(screen.getByText('12')).toBeInTheDocument()
        expect(screen.getByText(/8%/)).toBeInTheDocument()
    })

    it('StatTile with onClick is a button with an action label', () => {
        const go = vi.fn()
        render(<StatTile label="Awaiting quote" value={3} hint="oldest 2 d" onClick={go} actionLabel="Open queue" />)
        fireEvent.click(screen.getByRole('button'))
        expect(go).toHaveBeenCalled()
        expect(screen.getByText(/Open queue/)).toBeInTheDocument()
    })

    it('HeroGreeting renders the two-line greeting', () => {
        render(<HeroGreeting salutation="Good morning," name="Saba" context="Friday 5 July" />)
        expect(screen.getByText('Saba.')).toBeInTheDocument()
        expect(screen.getByText('Friday 5 July')).toBeInTheDocument()
    })

    it('ViewTabs marks the active tab and fires onChange', () => {
        const onChange = vi.fn()
        render(
            <ViewTabs
                tabs={[
                    { key: 'all', label: 'All', count: 9 },
                    { key: 'quote', label: 'Needs quote', count: 3 },
                ]}
                active="all"
                onChange={onChange}
            />,
        )
        expect(screen.getByRole('tab', { name: /All/ })).toHaveAttribute('aria-selected', 'true')
        fireEvent.click(screen.getByRole('tab', { name: /Needs quote/ }))
        expect(onChange).toHaveBeenCalledWith('quote')
    })

    it('ConfirmDialog confirms and cancels without window.confirm', () => {
        const onConfirm = vi.fn()
        const onClose = vi.fn()
        render(
            <ConfirmDialog open onClose={onClose} onConfirm={onConfirm} title="Cancel this request?" tone="bad" confirmLabel="Cancel request" />,
        )
        fireEvent.click(screen.getByText('Cancel request'))
        expect(onConfirm).toHaveBeenCalled()
        fireEvent.click(screen.getByText('Cancel'))
        expect(onClose).toHaveBeenCalled()
    })

    it('PeekPanel closes on Escape', () => {
        const onClose = vi.fn()
        render(
            <PeekPanel open onClose={onClose} title="Request fbf7">
                body
            </PeekPanel>,
        )
        fireEvent.keyDown(window, { key: 'Escape' })
        expect(onClose).toHaveBeenCalled()
    })

    it('Esc closes only the topmost of stacked overlays', () => {
        // ConfirmDialog over a PeekPanel — the exact "cancel request" flow.
        const closePeek = vi.fn()
        const closeConfirm = vi.fn()
        render(
            <>
                <PeekPanel open onClose={closePeek} title="Request fbf7">
                    body
                </PeekPanel>
                <ConfirmDialog open onClose={closeConfirm} onConfirm={vi.fn()} title="Cancel this request?" />
            </>,
        )
        fireEvent.keyDown(window, { key: 'Escape' })
        expect(closeConfirm).toHaveBeenCalledTimes(1)
        expect(closePeek).not.toHaveBeenCalled()
    })

    it('body scroll unlocks after stacked overlays both close', () => {
        document.body.style.overflow = ''
        const { rerender } = render(
            <>
                <PeekPanel open onClose={vi.fn()} title="Peek">body</PeekPanel>
                <ConfirmDialog open onClose={vi.fn()} onConfirm={vi.fn()} title="Sure?" />
            </>,
        )
        expect(document.body.style.overflow).toBe('hidden')
        rerender(
            <>
                <PeekPanel open={false} onClose={vi.fn()} title="Peek">body</PeekPanel>
                <ConfirmDialog open={false} onClose={vi.fn()} onConfirm={vi.fn()} title="Sure?" />
            </>,
        )
        expect(document.body.style.overflow).toBe('')
    })

    it('EmptyState has exactly one primary CTA', () => {
        render(<EmptyState title="No Test Prints Yet" body="Add a model to calibrate." cta="Add Test Print" onCta={vi.fn()} />)
        expect(screen.getAllByRole('button')).toHaveLength(1)
    })

    it('LedgerTable renders grouped rows with headers', () => {
        render(
            <LedgerTable
                columns={[
                    { key: 'what', label: 'Order' },
                    { key: 'amt', label: 'Amount', align: 'right' },
                ]}
                groups={[
                    {
                        key: 'g1',
                        label: '5 Jul',
                        rows: [{ key: 'r1', cells: ['#ORD-1', 'S$11.32'] }],
                    },
                ]}
            />,
        )
        expect(screen.getByText('5 Jul')).toBeInTheDocument()
        expect(screen.getByText('S$11.32')).toBeInTheDocument()
    })

    it('SegmentPill, DottedRow, StatusPill, Timeline, DashCard render', () => {
        render(
            <DashCard title="Card">
                <StatusPill tone="sun">quoted</StatusPill>
                <SegmentPill
                    segments={[
                        { label: 'Done', value: 4, tone: 'ink' },
                        { label: 'Now', value: 2, tone: 'sun' },
                        { label: 'Pending', value: 1, tone: 'hatch' },
                    ]}
                />
                <DottedRow label="Layer height">0.2 mm</DottedRow>
                <Timeline items={[{ id: 1, title: 'Quoted', at: '2026-07-05T06:00:00Z' }]} />
            </DashCard>,
        )
        expect(screen.getByText('quoted')).toBeInTheDocument()
        expect(screen.getByText('Layer height')).toBeInTheDocument()
        expect(screen.getByText('Quoted')).toBeInTheDocument()
    })
})
