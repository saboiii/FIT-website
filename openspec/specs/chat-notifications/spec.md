# Chat Notifications Specification

## Purpose

Give the vendor a live, personal line to the buyer for each custom-print
request, and make sure personal chat messages aren't missed. At every lifecycle
event a short update is posted into a buyer↔vendor Stream channel (so the vendor
can continue the conversation), and when any chat message arrives the other
participant is emailed. The Stream-side work lives in thin best-effort adapters
(`lib/chatNotify.js`, the `message.new` handler in
`app/api/webhook/stream/route.js`) so a chat/email failure never blocks the
triggering request.

## Requirements

### Requirement: Lifecycle updates are posted into a buyer↔vendor chat thread

For each custom-print lifecycle event, the system SHALL post a short update
message into a Stream `creator`-kind channel between the buyer
(`request.userId`) and the vendor (the custom-print product's `creatorUserId`),
sent as the vendor, so the vendor has a live personal thread to continue the
conversation. The channel SHALL be created/reused idempotently and a
`ChannelSummary` upserted so both parties see it in their inbox. Posting is
best-effort: failures (including unconfigured Stream env) MUST be logged and
MUST NOT block the triggering request.

#### Scenario: Quote-ready posts a chat update
- **WHEN** a quote (instant or manual) is set for a request
- **THEN** a message announcing the quote is posted into the buyer↔vendor
  `creator` channel from the vendor.

#### Scenario: Stream not configured
- **WHEN** Stream credentials are unset
- **THEN** the chat post is skipped with a logged warning and the lifecycle
  action still completes successfully.

### Requirement: Recipients are emailed when they receive a new chat message

When a new chat message is delivered, the system SHALL email the other
participant(s) ("New message from {sender}") so a personal message is not
missed. The sender SHALL NOT be emailed about their own message; recipients with
no email on file are skipped. Sending is best-effort and MUST NOT fail webhook
processing.

#### Scenario: New message notifies the counterpart
- **WHEN** the Stream `message.new` webhook fires for a channel
- **THEN** each member other than the sender, who has an email on file, receives
  a "new message" email linking back to the conversation.

#### Scenario: Sender is not notified of their own message
- **WHEN** the `message.new` webhook fires
- **THEN** no email is sent to the message's author.
