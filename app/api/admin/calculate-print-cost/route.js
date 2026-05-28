import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authenticate } from '@/lib/authenticate';
import { checkAdminPrivileges } from '@/lib/checkPrivileges';
import AppSettings from '@/models/AppSettings';
import { calculatePrintCost } from '@/lib/printPricing';

export async function POST(request) {
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    if (!(await checkAdminPrivileges(userId))) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { printSettings, dimensions } = await request.json();
    await connectToDatabase();

    const settingsId = process.env.NODE_ENV === 'development' ? 'app-settings-dev' : 'app-settings';
    const settings = await AppSettings.findById(settingsId);
    const formula = settings?.printPricingFormula || {};

    const suggestedPrice = calculatePrintCost(printSettings, dimensions, formula);

    return NextResponse.json({ suggestedPrice });
}
