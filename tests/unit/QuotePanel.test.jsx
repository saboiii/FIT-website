import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import QuotePanel from '@/components/Editor/QuotePanel'

const metrics = {
  volumeCm3: 12.3,
  dimensionsCm: { length: 2, width: 2, height: 3 },
  confidence: 'low',
}
const settings = { materialType: 'pla', infillPercent: 20, layerHeightMm: 0.2 }

const mockQuote = {
  currency: 'sgd',
  lines: [
    { key: 'material', label: 'Material', amount: 1.5 },
    { key: 'printTime', label: 'Print time', amount: 2.5 },
    { key: 'baseFee', label: 'Base fee', amount: 0 },
  ],
  expedite: { applied: false, amount: 0 },
  total: 5,
  confidence: 'low',
}

beforeEach(() => {
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ quote: mockQuote }) }))
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('QuotePanel', () => {
  it('renders nothing when there is no measurable model', () => {
    const { container } = render(<QuotePanel metrics={null} settings={settings} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows a low-confidence warning for non-watertight models', () => {
    render(<QuotePanel metrics={metrics} settings={settings} />)
    expect(screen.getByText(/approximate/i)).toBeInTheDocument()
  })

  it('fetches and displays the server quote total', async () => {
    render(<QuotePanel metrics={metrics} settings={settings} />)
    expect(await screen.findByText('SGD 5.00')).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith('/api/quote', expect.objectContaining({ method: 'POST' }))
  })

  it('never sends a client-supplied price in the request body', async () => {
    render(<QuotePanel metrics={metrics} settings={settings} />)
    await screen.findByText('SGD 5.00')
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body).not.toHaveProperty('total')
    expect(body).not.toHaveProperty('price')
    expect(body).toHaveProperty('volumeCm3', 12.3)
  })

  it('surfaces the minimum order price when the floor was applied', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            quote: {
              ...mockQuote,
              minimumApplied: true,
              inputs: { printHours: 2.3, weightGrams: 10, volumeCm3: 12.3 },
            },
          }),
      }),
    )
    render(<QuotePanel metrics={metrics} settings={settings} />)
    expect(await screen.findByText(/minimum order price/i)).toBeInTheDocument()
  })

  it('shows the estimated print hours on the print-time line', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            quote: {
              ...mockQuote,
              inputs: { printHours: 2.3, weightGrams: 10, volumeCm3: 12.3 },
            },
          }),
      }),
    )
    render(<QuotePanel metrics={metrics} settings={settings} />)
    expect(await screen.findByText(/2\.3\s*h/i)).toBeInTheDocument()
  })
})
