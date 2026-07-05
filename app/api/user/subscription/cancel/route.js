import Stripe from "stripe";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const currentPublicMetadata = user.publicMetadata || {};

  if (!currentPublicMetadata.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 }
    );
  } else {
    try {
      await stripe.subscriptions.update(
        currentPublicMetadata.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );
      try {
        getPostHogClient().capture({
          distinctId: userId,
          event: "subscription_cancelled",
          properties: { cancel_at_period_end: true },
        });
      } catch (phErr) {
        console.error("PostHog subscription_cancelled capture failed:", phErr);
      }
      return NextResponse.json(
        { message: "Subscription cancellation scheduled successfully" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error canceling subscription:", error);
      return NextResponse.json(
        { error: "Failed to cancel subscription" },
        { status: 500 }
      );
    }
  }
}
