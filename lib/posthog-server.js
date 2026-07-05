import { PostHog } from 'posthog-node'

let posthogClient = null

export function getPostHogClient() {
    if (!posthogClient) {
        posthogClient = new PostHog(
            process.env.NEXT_PUBLIC_POSTHOG_KEY,
            {
                host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
                // Flush immediately — API routes are short-lived serverless functions
                flushAt: 1,
                flushInterval: 0,
            }
        )
    }
    return posthogClient
}
