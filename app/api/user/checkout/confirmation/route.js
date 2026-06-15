import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { buildOrderConfirmationEmail } from "@/lib/email/templates/transactional";

export async function POST(req) {
    try {
        const { email, name } = await req.json();
        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const { subject, html } = buildOrderConfirmationEmail({ customerName: name });
        await sendEmail({ to: email, subject, html });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error sending confirmation email:", error);
        return NextResponse.json({ error: "Failed to send confirmation email" }, { status: 500 });
    }
}
