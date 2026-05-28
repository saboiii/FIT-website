import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authenticate } from '@/lib/authenticate';
import { checkAdminPrivileges } from '@/lib/checkPrivileges';
import Product from '@/models/Product';
import { clerkClient } from '@clerk/nextjs/server';
import { sendEmail, wrapInTemplate } from '@/lib/email';

export async function POST(request) {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    if (!(await checkAdminPrivileges(userId))) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { deliveryTypeName, changes } = await request.json();
    await connectToDatabase();

    // Find all products that use this delivery type
    const products = await Product.find({
        'delivery.deliveryTypes.type': deliveryTypeName
    }).select('creatorUserId name');

    // Deduplicate creator IDs
    const creatorIds = [...new Set(products.map(p => p.creatorUserId).filter(Boolean))];

    let notifiedCount = 0;
    const clerk = await clerkClient();
    for (const creatorId of creatorIds) {
        try {
            const user = await clerk.users.getUser(creatorId);
            const email = user?.emailAddresses?.[0]?.emailAddress;
            if (!email) continue;

            const bodyHtml = `
                <p>A delivery type used by your products has been updated.</p>
                <p><b>Delivery Type:</b> ${changes.displayName || deliveryTypeName}</p>
                <p>Please review your product delivery settings to ensure they are still correct.</p>
                <p><a href="https://www.fixitoday.com/dashboard/products" style="color: #ffdd00;">Go to Dashboard</a></p>
            `;

            await sendEmail({
                to: email,
                subject: 'Delivery Type Updated - Action May Be Required',
                html: wrapInTemplate(bodyHtml),
            });
            notifiedCount++;
        } catch (err) {
            console.error(`Failed to notify creator ${creatorId}:`, err);
        }
    }

    return NextResponse.json({ notified: notifiedCount });
}
