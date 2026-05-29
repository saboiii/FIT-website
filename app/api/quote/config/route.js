import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import AppSettings from '@/models/AppSettings'
import { getAppSettingsId } from '@/lib/appSettingsId'
import { DEFAULT_PRINT_COLOURS } from '@/lib/quoting/genericPresets'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/quote/config — customer-readable, non-sensitive quoting config for the
 * editor. Exposes only the colour/material catalogue (no pricing internals; the
 * server computes prices via /api/quote). Falls back to defaults.
 */
export async function GET() {
  try {
    await connectToDatabase()
    const settings = await AppSettings.findById(getAppSettingsId()).lean()
    const printColours = settings?.printColours?.length
      ? settings.printColours
      : DEFAULT_PRINT_COLOURS
    return NextResponse.json({ printColours }, { status: 200 })
  } catch (error) {
    console.error('Error fetching public quote config:', error)
    // Degrade gracefully: the editor falls back to defaults on any failure.
    return NextResponse.json({ printColours: DEFAULT_PRINT_COLOURS }, { status: 200 })
  }
}
