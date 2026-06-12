import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import AppSettings from '@/models/AppSettings'
import { authenticate } from '@/lib/authenticate'
import { checkAdminPrivileges } from '@/lib/checkPrivileges'
import { getAppSettingsId } from '@/lib/appSettingsId'
import { resolvePricing } from '@/lib/quoting/pricingDefaults'
import { DEFAULT_PRINT_COLOURS } from '@/lib/quoting/genericPresets'
import { buildQuotingUpdate } from '@/lib/quoting/adminConfigSchema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getSettings() {
  const id = getAppSettingsId()
  let settings = await AppSettings.findById(id)
  if (!settings) {
    settings = new AppSettings({ _id: id })
    await settings.save()
  }
  return settings
}

// GET — current quoting config (merged with defaults) + colour catalogue.
export async function GET(request) {
  try {
    const { userId } = await authenticate(request)
    if (!(await checkAdminPrivileges(userId))) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
    }
    await connectToDatabase()
    const settings = await getSettings()

    const stored = settings.quotingConfig
      ? (typeof settings.quotingConfig.toObject === 'function'
          ? settings.quotingConfig.toObject()
          : settings.quotingConfig)
      : {}
    const printColours = settings.printColours?.length
      ? settings.printColours
      : DEFAULT_PRINT_COLOURS

    const machineLimits = settings.machineLimits?.toObject?.() || settings.machineLimits || {}

    return NextResponse.json(
      { quotingConfig: resolvePricing(stored), printColours, machineLimits },
      { status: 200 },
    )
  } catch (error) {
    console.error('Error fetching quoting config:', error)
    return NextResponse.json({ error: 'Failed to fetch quoting config' }, { status: 500 })
  }
}

// PUT — update quoting config and/or the colour catalogue.
export async function PUT(request) {
  try {
    const { userId } = await authenticate(request)
    if (!(await checkAdminPrivileges(userId))) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const result = buildQuotingUpdate(body)
    if (!result.ok) {
      return NextResponse.json({ error: result.error, issues: result.issues }, { status: result.status })
    }

    await connectToDatabase()
    const settings = await getSettings()

    if (result.data.quotingConfig) {
      // Merge over existing so partial updates don't drop other fields.
      const current = settings.quotingConfig?.toObject?.() || settings.quotingConfig || {}
      settings.quotingConfig = { ...current, ...result.data.quotingConfig }
    }
    if (result.data.printColours) {
      settings.printColours = result.data.printColours
    }
    if (result.data.machineLimits) {
      const current = settings.machineLimits?.toObject?.() || settings.machineLimits || {}
      settings.machineLimits = { ...current, ...result.data.machineLimits }
    }
    await settings.save()

    return NextResponse.json({ message: 'Quoting config updated' }, { status: 200 })
  } catch (error) {
    console.error('Error updating quoting config:', error)
    return NextResponse.json({ error: 'Failed to update quoting config' }, { status: 500 })
  }
}
