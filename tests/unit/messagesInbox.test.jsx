// RTL smokes for the redesigned creator messages inbox (blueprint §5.3):
// list rows with the ink unread dot, mark-read on select (+ the
// 'chat:channel-read' broadcast the site-wide launcher listens for), the
// relocated auto-welcome Sheet editor, and the entitlement gate.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import MessagesInbox from '@/components/DashboardComponents/MessagesInbox'

const stream = vi.hoisted(() => {
    const channel = {
        watch: vi.fn(async () => {}),
        on: vi.fn(),
        off: vi.fn(),
        sendMessage: vi.fn(async () => ({})),
        state: { messages: [] },
    }
    const client = {
        connectUser: vi.fn(async () => {}),
        channel: vi.fn(() => channel),
        disconnectUser: vi.fn(async () => {}),
    }
    return { channel, client }
})

vi.mock('stream-chat', () => ({
    StreamChat: { getInstance: vi.fn(() => stream.client) },
}))

let mockUser = null
vi.mock('@clerk/nextjs', () => ({
    useUser: () => ({ user: mockUser, isLoaded: true }),
}))

let mockEntitlements = { loading: false, canUseMessaging: true }
vi.mock('@/utils/useEntitlements', () => ({
    default: () => mockEntitlements,
}))

vi.mock('next/image', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    default: ({ src, alt }) => <img src={typeof src === 'string' ? src : ''} alt={alt} />,
}))

const okJson = (data) => Promise.resolve({ ok: true, json: async () => data })
const failJson = () => Promise.resolve({ ok: false, json: async () => ({}) })

function stubFetch({ channels = [], settings = { autoReplyMessage: '' } } = {}) {
    global.fetch = vi.fn((url, options = {}) => {
        const u = String(url)
        if (u.startsWith('/api/chat/inbox')) return okJson({ channels })
        if (u.startsWith('/api/chat/token')) return okJson({ token: 'tok', apiKey: 'key', userId: 'user_1' })
        if (u.startsWith('/api/chat/settings')) {
            return options.method === 'POST' ? okJson({ ok: true }) : okJson(settings)
        }
        if (u.startsWith('/api/chat/read')) return okJson({ ok: true })
        return failJson()
    })
}

const twoChannels = [
    {
        channelId: 'ch1',
        participants: [{ id: 'user_a', name: 'Ada' }],
        lastMessage: { text: 'Is the widget in stock?', createdAt: new Date().toISOString(), userId: 'user_a' },
        unreadCount: 1,
    },
    {
        channelId: 'ch2',
        participants: [{ id: 'user_b', name: 'Bruno' }],
        lastMessage: { text: 'Thanks again!', createdAt: new Date().toISOString(), userId: 'user_b' },
        unreadCount: 0,
    },
]

beforeEach(() => {
    mockUser = { id: 'user_1', firstName: 'Saba' }
    mockEntitlements = { loading: false, canUseMessaging: true }
    stream.channel.state.messages = []
    vi.clearAllMocks()
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('MessagesInbox', () => {
    it('renders list rows with an ink unread dot and the unread-total pill', async () => {
        stubFetch({ channels: twoChannels })
        render(<MessagesInbox />)

        // "Ada" renders in the list row and (auto-selected) thread header.
        const adas = await screen.findAllByText('Ada')
        expect(adas.length).toBeGreaterThan(0)
        expect(screen.getByText('Bruno')).toBeInTheDocument()
        expect(screen.getByText('Is the widget in stock?')).toBeInTheDocument()

        // Only the unread channel gets the ink dot; the pill shows the total.
        expect(screen.getAllByTestId('unread-dot')).toHaveLength(1)
        expect(screen.getByText('1 unread')).toBeInTheDocument()
        // Unread row name is semibold (never yellow, never a coloured badge).
        const rowName = adas.find((el) => el.closest('button'))
        expect(rowName.className).toContain('font-semibold')
    })

    it('selecting a conversation marks it read and dispatches chat:channel-read', async () => {
        stubFetch({ channels: twoChannels })
        const readEvents = []
        const onRead = (e) => readEvents.push(e.detail)
        window.addEventListener('chat:channel-read', onRead)

        render(<MessagesInbox />)
        fireEvent.click(await screen.findByText('Bruno'))

        await waitFor(() => {
            const readCalls = global.fetch.mock.calls.filter(([u]) => String(u).startsWith('/api/chat/read'))
            expect(readCalls.map(([, opts]) => JSON.parse(opts.body).channelId)).toContain('ch2')
        })
        await waitFor(() => {
            expect(readEvents.map((d) => d.channelId)).toContain('ch2')
        })
        expect(stream.client.connectUser).toHaveBeenCalled()
        expect(stream.channel.watch).toHaveBeenCalled()

        window.removeEventListener('chat:channel-read', onRead)
    })

    it('opens the auto-welcome editor from the "…" menu Sheet and saves it', async () => {
        stubFetch({ channels: twoChannels, settings: { autoReplyMessage: 'Welcome!' } })
        render(<MessagesInbox />)
        await screen.findAllByText('Ada')

        // The editor no longer lives inline on the page — only inside the Sheet.
        expect(screen.queryByRole('textbox', { name: 'Automatic welcome message' })).toBeNull()

        fireEvent.click(screen.getByRole('button', { name: 'Inbox options' }))
        const textarea = await screen.findByRole('textbox', { name: 'Automatic welcome message' })
        expect(textarea).toHaveValue('Welcome!')

        fireEvent.change(textarea, { target: { value: 'Hi there — back soon.' } })
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        await waitFor(() => {
            const saveCall = global.fetch.mock.calls.find(
                ([u, opts]) => String(u).startsWith('/api/chat/settings') && opts?.method === 'POST',
            )
            expect(saveCall).toBeTruthy()
            expect(JSON.parse(saveCall[1].body)).toEqual({ autoReplyMessage: 'Hi there — back soon.' })
        })
    })

    it('sends a message through the Stream channel from the composer', async () => {
        stubFetch({ channels: twoChannels })
        render(<MessagesInbox />)
        await screen.findAllByText('Ada')

        // First channel auto-selects and connects; wait for the composer to enable.
        const input = await screen.findByLabelText('Type a reply')
        await waitFor(() => expect(input).not.toBeDisabled())
        fireEvent.change(input, { target: { value: 'On its way!' } })
        fireEvent.submit(input.closest('form'))

        await waitFor(() => {
            expect(stream.channel.sendMessage).toHaveBeenCalledWith({ text: 'On its way!' })
        })
        expect(input).toHaveValue('')
    })

    it('renders the guide empty state when there are no conversations', async () => {
        stubFetch({ channels: [] })
        render(<MessagesInbox />)
        expect(await screen.findByText('Messages From Your Customers')).toBeInTheDocument()
        expect(screen.getByText("Messages From Your Customers")).toBeInTheDocument() // body copy no longer renders (minimal empty states)
    })

    it('renders an informational EmptyState when messaging is not entitled', async () => {
        mockEntitlements = { loading: false, canUseMessaging: false }
        stubFetch({})
        render(<MessagesInbox />)

        expect(
            await screen.findByText('Messaging Requires an Active Subscription'),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Messaging Requires an Active Subscription'), // minimal empty states drop body copy
        ).toBeInTheDocument()
        // Gated users never hit the inbox API.
        const inboxCalls = global.fetch.mock.calls.filter(([u]) => String(u).startsWith('/api/chat/inbox'))
        expect(inboxCalls).toHaveLength(0)
    })
})
