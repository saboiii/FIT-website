/**
 * Server-side chat adapter: post a lifecycle update into the buyer↔vendor
 * Stream channel so the vendor has a live thread to continue personally.
 *
 * This mirrors the find/create logic in `app/api/chat/channel` and the
 * `sendMessage` + `ChannelSummary` upsert in `app/api/chat/auto-reply`, but
 * runs from server contexts (API routes, webhooks) where there is no caller
 * token. Best-effort: any failure (including unconfigured Stream env) is logged
 * and swallowed so it never blocks the triggering request.
 */
import { getStreamServerClient } from '@/lib/streamChat'
import { connectToDatabase } from '@/lib/db'
import ChannelSummary from '@/models/ChannelSummary'

/**
 * Post a message from `creatorUserId` into the `creator`-kind channel for
 * [buyerUserId, creatorUserId], creating it if needed.
 *
 * @returns {Promise<{ ok: boolean, skipped?: string, channelId?: string }>}
 */
export async function postCustomPrintChatUpdate({
  buyerUserId,
  creatorUserId,
  text,
} = {}) {
  if (!text || !buyerUserId || !creatorUserId) {
    return { ok: false, skipped: 'missing-args' }
  }
  // A vendor cannot DM themselves (e.g. the creator owns their own request).
  if (buyerUserId === creatorUserId) {
    return { ok: false, skipped: 'same-user' }
  }
  if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
    console.warn('[chatNotify] Stream env unset — skipping chat update')
    return { ok: false, skipped: 'stream-unconfigured' }
  }

  try {
    const client = getStreamServerClient()
    const kind = 'creator'
    const members = Array.from(new Set([buyerUserId, creatorUserId]))
    const sortedMembers = [...members].sort()

    // Both members must be known to Stream before channel creation/messaging.
    await client.upsertUsers(members.map((id) => ({ id })))

    // Reuse an existing channel for this member set + kind, else create one.
    let channel
    let existing = []
    try {
      existing = await client.queryChannels(
        { type: 'messaging', members: { $eq: sortedMembers }, kind },
        { last_message_at: -1 },
        { limit: 1 },
      )
    } catch (e) {
      console.error('[chatNotify] queryChannels failed:', e)
    }

    if (existing.length > 0) {
      channel = existing[0]
    } else {
      channel = client.channel('messaging', undefined, {
        members,
        kind,
        created_by_id: creatorUserId,
      })
      await channel.create()
    }

    const sent = await channel.sendMessage({ text, user_id: creatorUserId })

    // Keep the inbox summary fresh so both parties see the thread immediately.
    try {
      await connectToDatabase()
      const last = sent?.message
      await ChannelSummary.findOneAndUpdate(
        { channelId: channel.id },
        {
          channelId: channel.id,
          kind,
          participants: sortedMembers.map((id) => ({ id })),
          memberIds: sortedMembers,
          ...(last
            ? {
                lastMessage: {
                  id: last.id,
                  text: last.text,
                  createdAt: last.created_at ? new Date(last.created_at) : new Date(),
                  userId: last.user?.id || creatorUserId,
                },
              }
            : {}),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
    } catch (e) {
      console.error('[chatNotify] ChannelSummary upsert failed:', e)
    }

    return { ok: true, channelId: channel.id }
  } catch (err) {
    console.error('[chatNotify] failed to post custom-print chat update:', err)
    return { ok: false, skipped: 'error' }
  }
}
