// Money display helpers for the creator dashboard. Currency comes from
// product data (basePrice.presentmentCurrency), never hardcoded — S$ is only
// the fallback (blueprint §5.2).

export function currencyPrefix(code) {
    if (!code || String(code).toUpperCase() === 'SGD') return 'S$'
    try {
        const parts = new Intl.NumberFormat('en', { style: 'currency', currency: code }).formatToParts(1)
        const symbol = parts.find((p) => p.type === 'currency')?.value
        return symbol || `${String(code).toUpperCase()} `
    } catch (e) {
        return `${String(code).toUpperCase()} `
    }
}

export function formatMoney(value) {
    const n = Number.isFinite(value) ? value : 0
    return n.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
