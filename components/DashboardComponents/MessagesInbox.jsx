'use client';

// Creator messages — "mail" (blueprint §5.3). Two panes ≥1024px: conversation
// list (320px) + thread. Unread = ink dot + semibold (never yellow); selected
// row = sun-soft wash. The auto-welcome editor lives under the "…" menu in the
// list header as a Sheet (Appendix A relocation). All Stream wiring, event
// dispatches and mark-read logic are unchanged from the pre-redesign inbox.
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { StreamChat } from 'stream-chat';
import Image from 'next/image';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { motion } from 'framer-motion';
import { IoChevronBack, IoEllipsisHorizontal, IoMailOutline } from 'react-icons/io5';
import { settle } from '@/lib/motion/tokens';
import { DashProvider, EmptyState, GlassBar, Sheet, SkeletonRow, StatusPill } from '@/components/dashboard-ui';
import useEntitlements from '@/utils/useEntitlements';

dayjs.extend(relativeTime);

export default function MessagesInbox() {
    const { user, isLoaded } = useUser();
    const { loading: entitlementsLoading, canUseMessaging } = useEntitlements();
    const [loading, setLoading] = useState(true);
    const [channels, setChannels] = useState([]);
    const [activeChannelId, setActiveChannelId] = useState(null);
    const [client, setClient] = useState(null);
    const [channel, setChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [connectingChannel, setConnectingChannel] = useState(false);
    const [error, setError] = useState(null);
    const [autoReplyMessage, setAutoReplyMessage] = useState('');
    const [autoReplySaving, setAutoReplySaving] = useState(false);
    const [unreadTotal, setUnreadTotal] = useState(0);
    // UI-only state (no effect on Stream wiring): the "…" welcome-message
    // Sheet and the mobile list→thread pane swap.
    const [welcomeOpen, setWelcomeOpen] = useState(false);
    const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

    useEffect(() => {
        const loadInbox = async () => {
            if (!isLoaded || !user || entitlementsLoading || !canUseMessaging) return;
            setLoading(true);
            try {
                const res = await fetch('/api/chat/inbox');
                if (!res.ok) throw new Error('Failed to load inbox');
                const data = await res.json();
                const list = data.channels || [];
                setChannels(list);
                const totalUnread = list.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0);
                setUnreadTotal(totalUnread);
                if (list.length > 0) {
                    setActiveChannelId(list[0].channelId);
                }
            } catch (e) {
                console.error('Failed to load inbox', e);
                setError('Unable to load messages right now');
            } finally {
                setLoading(false);
            }
        };
        loadInbox();
    }, [isLoaded, user, entitlementsLoading, canUseMessaging]);

    // Listen for channel read events from other surfaces (e.g. ChatLauncher)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleChannelRead = (event) => {
            const channelId = event?.detail?.channelId;
            if (!channelId) return;
            setChannels(prev => {
                if (!prev || prev.length === 0) return prev;
                const updated = prev.map(ch =>
                    ch.channelId === channelId ? { ...ch, unreadCount: 0 } : ch
                );
                const totalUnread = updated.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0);
                setUnreadTotal(totalUnread);
                return updated;
            });
        };

        window.addEventListener('chat:channel-read', handleChannelRead);

        return () => {
            window.removeEventListener('chat:channel-read', handleChannelRead);
        };
    }, []);

    useEffect(() => {
        const loadSettings = async () => {
            if (!isLoaded || !user) return;
            try {
                const res = await fetch('/api/chat/settings');
                if (!res.ok) return;
                const data = await res.json();
                setAutoReplyMessage(data.autoReplyMessage || '');
            } catch (e) {
                console.error('Failed to load chat settings', e);
            }
        };
        loadSettings();
    }, [isLoaded, user]);

    const saveAutoReply = async () => {
        try {
            setAutoReplySaving(true);
            await fetch('/api/chat/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ autoReplyMessage }),
            });
        } catch (e) {
            console.error('Failed to save auto-reply', e);
        } finally {
            setAutoReplySaving(false);
        }
    };

    // Broadcast unread total changes for navbar / launcher badges after render commits
    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(
            new CustomEvent('chat:unread-updated', { detail: { total: unreadTotal } })
        );
    }, [unreadTotal]);

    useEffect(() => {
        if (!activeChannelId || !user) return;

        let active = true;

        const connectChannel = async () => {
            setConnectingChannel(true);
            try {
                const tokenRes = await fetch('/api/chat/token');
                if (!tokenRes.ok) throw new Error('Failed to get chat token');
                const tokenData = await tokenRes.json();
                if (!tokenData.token || !tokenData.apiKey) throw new Error('Stream Chat not configured');

                const streamClient = StreamChat.getInstance(tokenData.apiKey);
                await streamClient.connectUser({ id: tokenData.userId }, tokenData.token);

                const streamChannel = streamClient.channel('messaging', activeChannelId);
                await streamChannel.watch();

                if (!active) return;

                setMessages(
                    (streamChannel.state.messages || []).map(m => ({
                        id: m.id,
                        from: m.user?.id === tokenData.userId ? 'me' : 'other',
                        text: m.text,
                        createdAt: m.created_at,
                    })),
                );

                streamChannel.on('message.new', (event) => {
                    const m = event.message;
                    if (!m || !m.id) return;
                    setMessages(prev => ([
                        ...prev,
                        {
                            id: m.id,
                            from: m.user?.id === tokenData.userId ? 'me' : 'other',
                            text: m.text,
                            createdAt: m.created_at,
                        },
                    ]));
                });

                setClient(streamClient);
                setChannel(streamChannel);

                // Mark this channel as read for unread badge purposes
                try {
                    await fetch('/api/chat/read', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ channelId: activeChannelId }),
                    });

                    // Locally clear unread count for this channel and broadcast new total
                    setChannels(prev => {
                        const updated = prev.map(ch =>
                            ch.channelId === activeChannelId ? { ...ch, unreadCount: 0 } : ch
                        );
                        const totalUnread = updated.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0);
                        setUnreadTotal(totalUnread);
                        return updated;
                    });

                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                            new CustomEvent('chat:channel-read', {
                                detail: { channelId: activeChannelId },
                            })
                        );
                    }
                } catch {
                    // Non-fatal if this fails
                }
            } catch (e) {
                console.error('Failed to connect channel', e);
                setError('Unable to open this conversation right now');
            } finally {
                setConnectingChannel(false);
            }
        };

        connectChannel();

        return () => {
            active = false;
            if (client) {
                client.disconnectUser().catch(() => { });
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeChannelId, user?.id]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !channel) return;
        const text = input.trim();
        setInput('');
        try {
            await channel.sendMessage({ text });
        } catch (e) {
            console.error('Failed to send message', e);
        }
    };

    if (!isLoaded || entitlementsLoading) {
        return (
            <DashProvider>
                <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-6 py-8">
                    <SkeletonRow className="max-w-[320px]" />
                    <div className="flex gap-4">
                        <div className="flex w-full flex-col gap-2 lg:w-[320px]">
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                        </div>
                        <div className="hidden flex-1 flex-col gap-2 lg:flex">
                            <SkeletonRow />
                            <SkeletonRow />
                        </div>
                    </div>
                </div>
            </DashProvider>
        );
    }

    if (!canUseMessaging) {
        return (
            <DashProvider>
                <div className="mx-auto flex min-h-[70vh] w-full max-w-[1200px] items-center justify-center px-6 py-8">
                    <EmptyState
                        icon={<IoMailOutline />}
                        title="Messaging Requires an Active Subscription"
                        body="Messaging is only available to creators with an active subscription."
                    />
                </div>
            </DashProvider>
        );
    }

    const activeChannel = channels.find((ch) => ch.channelId === activeChannelId) || null;
    const activeParticipant = (activeChannel?.participants && activeChannel.participants[0]) || null;

    return (
        <DashProvider>
            <div className="mx-auto flex h-[92vh] w-full max-w-[1200px] flex-col gap-4 px-4 py-8 lg:px-6">
                <div className="flex items-center">
                    <Link href="/dashboard" className="dash-data dash-soft hover:text-[var(--dash-ink)]">
                        ← Dashboard
                    </Link>
                </div>

                <div className="flex min-h-0 flex-1 gap-4">
                    {/* Conversation list pane */}
                    <section
                        aria-label="Conversations"
                        className={`${mobileThreadOpen ? 'hidden lg:flex' : 'flex'} min-h-0 w-full flex-col overflow-hidden rounded-[var(--dash-r-card)] border border-[var(--dash-line)] bg-[var(--dash-card)] shadow-[var(--dash-shadow-card)] lg:w-[320px] lg:shrink-0`}
                    >
                        <header className="flex items-center gap-2 border-b border-[var(--dash-line)] px-4 py-3">
                            <h2 className="dash-section">Messages</h2>
                            {unreadTotal > 0 && (
                                <StatusPill tone="paper">
                                    {unreadTotal} unread
                                </StatusPill>
                            )}
                            <button
                                type="button"
                                aria-label="Inbox options"
                                onClick={() => setWelcomeOpen(true)}
                                className="dash-hoverable ml-auto grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--dash-ink-soft)] hover:bg-[var(--dash-canvas)] hover:text-[var(--dash-ink)]"
                            >
                                <IoEllipsisHorizontal size={16} />
                            </button>
                        </header>

                        {loading ? (
                            <div className="flex flex-col gap-2 p-4">
                                <SkeletonRow />
                                <SkeletonRow />
                                <SkeletonRow />
                                <SkeletonRow />
                            </div>
                        ) : channels.length === 0 ? (
                            <EmptyState
                                icon={<IoMailOutline />}
                                title="Messages From Your Customers"
                                body="Conversations customers start with you land here. Reply in real time from this inbox."
                            />
                        ) : (
                            <div className="dash-scroll flex-1">
                                {channels.map((ch) => {
                                    const p = (ch.participants && ch.participants[0]) || null;
                                    const selected = ch.channelId === activeChannelId;
                                    const unread = (ch.unreadCount || 0) > 0;
                                    return (
                                        <button
                                            key={ch.channelId}
                                            type="button"
                                            onClick={() => {
                                                setActiveChannelId(ch.channelId);
                                                setMobileThreadOpen(true);
                                            }}
                                            className={`dash-hoverable flex w-full cursor-pointer items-start gap-3 border-b border-[var(--dash-line)] px-4 py-3 text-left ${
                                                selected ? 'bg-[var(--dash-sun-soft)]' : 'hover:bg-[var(--dash-canvas)]'
                                            }`}
                                        >
                                            <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--dash-line)] bg-[var(--dash-canvas)] text-[12px] font-medium">
                                                {p?.imageUrl ? (
                                                    <Image
                                                        src={p.imageUrl}
                                                        alt={p.name || p.id || 'Customer'}
                                                        width={32}
                                                        height={32}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    (p?.name?.[0] || '?').toUpperCase()
                                                )}
                                            </span>
                                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                                <span className="flex items-center gap-2">
                                                    {unread && (
                                                        <span
                                                            data-testid="unread-dot"
                                                            aria-hidden="true"
                                                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--dash-ink)]"
                                                        />
                                                    )}
                                                    <span className={`truncate text-[13px] ${unread ? 'font-semibold' : 'font-medium'}`}>
                                                        {p?.name || p?.id || 'Customer'}
                                                    </span>
                                                    {ch.lastMessage?.createdAt && (
                                                        <span className="dash-data dash-soft ml-auto shrink-0">
                                                            {dayjs(ch.lastMessage.createdAt).fromNow(true)}
                                                        </span>
                                                    )}
                                                </span>
                                                {ch.lastMessage?.text && (
                                                    <span className="dash-soft truncate text-[13px]">{ch.lastMessage.text}</span>
                                                )}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Thread pane */}
                    <motion.section
                        key={mobileThreadOpen ? 'thread-open' : 'thread-idle'}
                        aria-label="Conversation"
                        initial={{ x: 24, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={settle}
                        className={`${mobileThreadOpen ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--dash-r-card)] border border-[var(--dash-line)] bg-[var(--dash-canvas)]`}
                    >
                        {/* Mobile: back chevron in a GlassBar */}
                        <GlassBar className="lg:hidden">
                            <button
                                type="button"
                                aria-label="Back to conversations"
                                onClick={() => setMobileThreadOpen(false)}
                                className="dash-hoverable grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)]"
                            >
                                <IoChevronBack size={16} />
                            </button>
                            <span className="truncate text-[13px] font-semibold">
                                {activeParticipant?.name || 'Conversation'}
                            </span>
                        </GlassBar>

                        {/* Desktop: quiet thread header */}
                        <header className="hidden items-baseline gap-3 border-b border-[var(--dash-line)] bg-[var(--dash-card)] px-4 py-3 lg:flex">
                            <span className="truncate text-[13px] font-semibold">
                                {activeParticipant?.name || 'Conversation'}
                            </span>
                            {activeParticipant?.email && (
                                <span className="dash-data dash-soft truncate">{activeParticipant.email}</span>
                            )}
                        </header>

                        {/* Quiet inline strips — never spinners over a thread */}
                        {error && (
                            <div className="border-b border-[var(--dash-line)] bg-[var(--dash-bad-bg)] px-4 py-2 text-[13px] text-[var(--dash-bad)]">
                                {error}
                            </div>
                        )}
                        {connectingChannel && !error && (
                            <div className="dash-soft border-b border-[var(--dash-line)] bg-[var(--dash-card)] px-4 py-2 text-[13px]">
                                Connecting…
                            </div>
                        )}

                        {!activeChannelId ? (
                            <div className="dash-soft flex flex-1 items-center justify-center px-6 text-center text-[13px]">
                                Select a conversation to start replying.
                            </div>
                        ) : (
                            <>
                                <div className="dash-scroll flex flex-1 flex-col gap-3 px-4 py-4">
                                    {messages.map((m) => (
                                        <div
                                            key={m.id}
                                            className={`flex max-w-[80%] flex-col gap-1 ${
                                                m.from === 'me' ? 'items-end self-end' : 'items-start self-start'
                                            }`}
                                        >
                                            <div
                                                className={`rounded-[var(--dash-r-inner)] px-3 py-2 text-[13px] ${
                                                    m.from === 'me'
                                                        ? 'bg-[var(--dash-ink)] text-[var(--dash-canvas)]'
                                                        : 'border border-[var(--dash-line)] bg-[var(--dash-card)]'
                                                }`}
                                            >
                                                {m.text}
                                            </div>
                                            {m.createdAt && (
                                                <span className="dash-data dash-soft">
                                                    {dayjs(m.createdAt).format('D MMM, HH:mm')}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {messages.length === 0 && !connectingChannel && (
                                        <div className="dash-soft mt-2 text-center text-[13px]">
                                            No messages in this conversation yet.
                                        </div>
                                    )}
                                </div>
                                {/* Composer — Tier-1 bar pinned to the bottom */}
                                <form
                                    onSubmit={handleSend}
                                    className="flex items-center gap-2 border-t border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-3"
                                >
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Type a reply…"
                                        aria-label="Type a reply"
                                        className="min-w-0 flex-1 rounded-full border border-[var(--dash-line)] bg-[var(--dash-canvas)] px-4 py-2 text-[13px] focus:outline-none"
                                        disabled={connectingChannel}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || connectingChannel}
                                        className="dash-hoverable shrink-0 cursor-pointer rounded-full bg-[var(--dash-ink)] px-4 py-2 text-[13px] font-medium text-[var(--dash-canvas)] active:scale-[0.97] disabled:opacity-50"
                                    >
                                        Send
                                    </button>
                                </form>
                            </>
                        )}
                    </motion.section>
                </div>

                {/* Auto-welcome message editor — relocated from an always-visible
                    card into the list-header "…" Sheet (Appendix A). */}
                <Sheet open={welcomeOpen} onClose={() => setWelcomeOpen(false)} label="Automatic welcome message">
                    <div className="flex flex-col gap-3 p-6">
                        <div>
                            <h3 className="dash-section">Automatic Welcome Message</h3>
                            <p className="dash-soft mt-1 text-[13px]">
                                Sent automatically when a customer first messages you.
                            </p>
                        </div>
                        <textarea
                            value={autoReplyMessage}
                            onChange={(e) => setAutoReplyMessage(e.target.value)}
                            rows={4}
                            placeholder="e.g. Thanks for your message! I'll get back to you as soon as I can."
                            aria-label="Automatic welcome message"
                            className="w-full resize-none rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-2 text-[13px] focus:outline-none"
                        />
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setWelcomeOpen(false)}
                                className="dash-soft cursor-pointer text-[13px] hover:text-[var(--dash-ink)]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    await saveAutoReply();
                                    setWelcomeOpen(false);
                                }}
                                disabled={autoReplySaving}
                                className="dash-hoverable cursor-pointer rounded-full bg-[var(--dash-ink)] px-4 py-2 text-[13px] font-medium text-[var(--dash-canvas)] active:scale-[0.97] disabled:opacity-50"
                            >
                                {autoReplySaving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </Sheet>
            </div>
        </DashProvider>
    );
}
