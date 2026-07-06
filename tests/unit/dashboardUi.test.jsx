// Smoke tests for the Sunlit Paper primitives (blueprint §4.8) — render,
// interaction basics, and the alert/confirm-replacement dialog contract.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import {
    ActionIcon,
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
    Tag,
} from '@/components/dashboard-ui'
import { IoPencilOutline, IoTrashOutline } from 'react-icons/io5'

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
        expect(screen.getByText('Good morning, Saba.')).toBeInTheDocument()
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

    it('ViewTabs pills have one fixed height and scroll instead of wrapping', () => {
        render(
            <ViewTabs
                tabs={[
                    { key: 'all', label: 'All', count: 9 },
                    { key: 'quote', label: 'Needs quote' },
                ]}
                active="all"
                onChange={() => {}}
            />,
        )
        const strip = screen.getByRole('tablist')
        // Own scroll box, no wrapping — counts can't push siblings around.
        expect(strip.className).toContain('dash-hscroll')
        expect(strip.className).toContain('flex-nowrap')
        expect(strip.className).not.toContain('flex-wrap')
        for (const tab of screen.getAllByRole('tab')) {
            expect(tab.className).toContain('h-8')
            expect(tab.className).toContain('items-center')
            expect(tab.className).not.toContain('py-')
        }
    })

    it('ActionIcon is a fixed-size icon-only button labelled via aria-label and title', () => {
        const onClick = vi.fn()
        render(<ActionIcon icon={IoTrashOutline} tone="bad" label="Delete review" onClick={onClick} />)
        const btn = screen.getByRole('button', { name: 'Delete review' })
        // Fixed 28px circle — the one row-action size everywhere.
        expect(btn.className).toContain('h-7')
        expect(btn.className).toContain('w-7')
        expect(btn.className).toContain('rounded-full')
        expect(btn).toHaveAttribute('title', 'Delete review')
        // Icon-only: a glyph, never raw text.
        expect(btn.textContent.trim()).toBe('')
        expect(btn.querySelector('svg')).toBeTruthy()
        // Destructive intent revealed on hover, never screaming at rest.
        expect(btn.className).toContain('text-[var(--dash-ink-soft)]')
        expect(btn.className).toContain('hover:bg-[var(--dash-bad-bg)]')
        expect(btn.className).toContain('hover:text-[var(--dash-bad)]')
        fireEvent.click(btn)
        expect(onClick).toHaveBeenCalled()
    })

    it('ActionIcon quiet tone rests ink-soft and washes sun-soft on hover; disabled blocks clicks', () => {
        const onClick = vi.fn()
        render(<ActionIcon icon={IoPencilOutline} label="Edit status" onClick={onClick} disabled />)
        const btn = screen.getByRole('button', { name: 'Edit status' })
        expect(btn).toBeDisabled()
        expect(btn.className).toContain('hover:bg-[var(--dash-sun-soft)]')
        fireEvent.click(btn)
        expect(onClick).not.toHaveBeenCalled()
    })

    it('ActionIcon with href renders an identically styled labelled link', () => {
        render(<ActionIcon icon={IoPencilOutline} label="View in store" href="/products/benchy" />)
        const link = screen.getByRole('link', { name: 'View in store' })
        expect(link).toHaveAttribute('href', '/products/benchy')
        expect(link.className).toContain('h-7')
        expect(link.className).toContain('w-7')
    })

    it('Tag is a flat non-interactive fixed-height meta label', () => {
        render(<Tag>shop</Tag>)
        const tag = screen.getByText('shop')
        expect(tag.tagName).toBe('SPAN')
        expect(tag.className).toContain('h-6')
        expect(tag.className).toContain('items-center')
        expect(tag.className).toContain('uppercase')
        // Flat: no fill, no status tone — distinct from StatusPill and buttons.
        expect(tag.className).not.toContain('bg-')
        expect(tag.className).toContain('text-[var(--dash-ink-soft)]')
    })

    it('StatusPill renders at a fixed height regardless of content', () => {
        render(
            <>
                <StatusPill tone="sun">Awaiting Quote</StatusPill>
                <StatusPill tone="ok">Paid</StatusPill>
            </>,
        )
        for (const label of ['Awaiting Quote', 'Paid']) {
            const pill = screen.getByText(label)
            expect(pill.className).toContain('h-6')
            expect(pill.className).toContain('items-center')
            expect(pill.className).toContain('whitespace-nowrap')
            expect(pill.className).not.toContain('py-')
        }
    })

    it('overlays use the see-through dash-scrim, not an opaque cover', () => {
        const { baseElement } = render(
            <PeekPanel open onClose={vi.fn()} title="Request fbf7">
                body
            </PeekPanel>,
        )
        expect(baseElement.querySelector('.dash-scrim')).toBeTruthy()
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
