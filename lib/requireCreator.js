import { clerkClient } from "@clerk/nextjs/server";

// Creator-feature gate (shop customisation, display name): admin or an
// active paid subscription, read server-side from Clerk public metadata.
export async function requireCreator(userId) {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const isAdmin = clerkUser?.publicMetadata?.role === "admin";
    const isSubscribed = Boolean(clerkUser?.publicMetadata?.stripeSubscriptionId);
    return isAdmin || isSubscribed;
}
