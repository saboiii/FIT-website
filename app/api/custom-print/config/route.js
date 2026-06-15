import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/db'
import CustomPrintRequest from '@/models/CustomPrintRequest'
import { sendEmail, wrapInTemplate } from '@/lib/email'
import { buildManualQuoteAdminEmail } from '@/lib/manualQuoteEmail'

const STATUS_RANK = {
    pending_upload: 0,
    pending_config: 1,
    configured: 2,
    quoted: 3,
    payment_pending: 4,
    paid: 5,
    printing: 6,
    printed: 7,
    shipped: 8,
    delivered: 9,
};

function computeMinimumStatusFromData(requestDoc) {
    const hasModel = !!(requestDoc?.modelFile?.s3Key && requestDoc?.modelFile?.originalName);
    const isConfigured = !!requestDoc?.printConfiguration?.isConfigured;
    if (isConfigured) return 'configured';
    if (hasModel) return 'pending_config';
    return 'pending_upload';
}

function maybeUpgradeStatusToMatchData(requestDoc, note) {
    const target = computeMinimumStatusFromData(requestDoc);
    const current = requestDoc?.status || 'pending_upload';
    const currentRank = STATUS_RANK[current];
    const targetRank = STATUS_RANK[target];
    if (currentRank == null || targetRank == null) return false;
    if (currentRank >= targetRank) return false;

    requestDoc.status = target;
    requestDoc.statusHistory = requestDoc.statusHistory || [];
    requestDoc.statusHistory.push({
        status: target,
        updatedAt: new Date(),
        note: note || 'Auto-reconciled status based on uploaded model/configuration',
    });
    return true;
}

export async function PUT(req) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await connectToDatabase()

        const body = await req.json()
        const { requestId, printSettings, meshColors, generic, mode } = body

        if (!requestId) {
            return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
        }

        // Find the custom print request
        const customPrintRequest = await CustomPrintRequest.findOne({
            requestId,
            userId
        })

        if (!customPrintRequest) {
            return NextResponse.json({ error: 'Custom print request not found' }, { status: 404 })
        }

        const isManual = mode === 'manual'

        // Update print configuration (persist mode). Never assign
        // `generic: undefined` — Mongoose fails casting undefined to the
        // subdocument. A MANUAL (advanced) save supersedes any earlier
        // simple-mode selection entirely, so its generic block is dropped;
        // instant saves carry the sent generic; otherwise preserve what's there.
        const existingGeneric = customPrintRequest.printConfiguration?.generic
        const nextGeneric = isManual
            ? null
            : generic && typeof generic === 'object'
                ? {
                    strength: generic.strength ?? null,
                    quality: generic.quality ?? null,
                    colour: generic.colour ?? null,
                    material: generic.material ?? null,
                }
                : (existingGeneric && typeof existingGeneric.toObject === 'function'
                    ? existingGeneric.toObject()
                    : existingGeneric) || null
        customPrintRequest.printConfiguration = {
            ...(nextGeneric ? { generic: nextGeneric } : {}),
            meshColors: meshColors || {},
            printSettings: {
                layerHeight: printSettings.layerHeight,
                initialLayerHeight: printSettings.initialLayerHeight,
                materialType: printSettings.materialType,
                wallLoops: printSettings.wallLoops,
                internalSolidInfillPattern: printSettings.internalSolidInfillPattern,
                sparseInfillDensity: printSettings.sparseInfillDensity,
                sparseInfillPattern: printSettings.sparseInfillPattern,
                nozzleDiameter: printSettings.nozzleDiameter,
                enableSupport: printSettings.enableSupport,
                supportType: printSettings.supportType,
                printPlate: printSettings.printPlate
            },
            configuredAt: new Date(),
            isConfigured: true
        }

        // Persist the quote mode (instant vs manual). The instant path will
        // separately POST /api/quote to compute and persist the actual quote;
        // the manual path stays at `configured` until an admin sets a quote.
        if (mode === 'instant' || mode === 'manual') {
            customPrintRequest.quoteMode = mode
        }

        // A manual save supersedes any prior instant quote: clear the stale
        // server quote so the cart stops showing the old instant price, and
        // step the request back to `configured` to await a fresh admin quote.
        if (isManual) {
            customPrintRequest.quote = undefined
            customPrintRequest.quotedAt = undefined
            if (customPrintRequest.status === 'quoted') {
                customPrintRequest.status = 'configured'
                customPrintRequest.statusHistory = customPrintRequest.statusHistory || []
                customPrintRequest.statusHistory.push({
                    status: 'configured',
                    updatedAt: new Date(),
                    note: 'Switched to advanced (manual) configuration — awaiting admin quote',
                })
            }
        }

        // Ensure status never lags behind stored data (e.g. pending_upload -> configured)
        maybeUpgradeStatusToMatchData(customPrintRequest, 'Print configuration saved');

        await customPrintRequest.save()

        // Manual mode: best-effort notify the admin so they know to quote. Never
        // block the save on email failure — credentials may be unset in some envs.
        if (customPrintRequest.quoteMode === 'manual') {
            const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER
            if (adminEmail) {
                try {
                    const { subject, html } = buildManualQuoteAdminEmail({
                        request: customPrintRequest.toObject(),
                    })
                    await sendEmail({ to: adminEmail, subject, html: wrapInTemplate(html) })
                } catch (emailErr) {
                    console.error('Manual-quote admin notification failed:', emailErr)
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Configuration saved successfully',
            request: customPrintRequest
        })

    } catch (error) {
        console.error('Error saving print configuration:', error)
        // Full detail is logged above; never echo internals to the client.
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
    }
}
