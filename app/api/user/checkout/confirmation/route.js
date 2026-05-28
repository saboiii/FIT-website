import { NextResponse } from "next/server";
import { sendEmail, wrapInTemplate } from "@/lib/email";

export async function POST(req) {
    try {
        const { email } = await req.json();
        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const bodyHtml = `
  <p style="margin: 0 0 16px 0;">Dear Customer,</p>
  <p style="margin: 0 0 16px 0;">
    Thank you for your recent purchase with <b style="color: #ffdd00;">Fix It Today</b>! Your order has been successfully received and is now being processed.
  </p>
  <h3 style="font-size: 16px; margin: 24px 0 8px 0; color: #ffdd00;">What Happens Next:</h3>
  <ol style="margin-left: 20px; padding-left: 0; color: #ddd;">
    <li style="margin-bottom: 8px;">
      <b style="color: #ffdd00;">Order Processing:</b> We are preparing your order. Check status in your account under "Orders".
    </li>
    <li>
      <b style="color: #ffdd00;">Delivery:</b> Your order will be shipped to the address you provided. Delivery time may vary by location.
    </li>
  </ol>
  <p style="margin: 16px 0;">
    If you have any questions, contact us at
    <a href="mailto:fixittoday.contact@gmail.com" style="color: #ffdd00; text-decoration: none;">fixittoday.contact@gmail.com</a>.
  </p>
  <p style="margin: 16px 0;">
    Thank you for choosing FIT!
  </p>`;

        await sendEmail({
            to: email,
            subject: "Fix It Today (FIT) Order Confirmation – Thank You for Your Purchase!",
            html: wrapInTemplate(bodyHtml),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error sending confirmation email:", error);
        return NextResponse.json({ error: "Failed to send confirmation email" }, { status: 500 });
    }
}
