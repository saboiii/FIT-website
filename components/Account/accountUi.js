// Shared bits for the customer account area ("Sunlit Paper" restyle).
// Status-tone mapping follows the dashboard vocabulary (blueprint §4.8 #6):
// sun = in motion / needs you, ink = done step, hatch = pending, ok/bad = terminal.

const ORDER_TONES = {
    pending: 'hatch',
    on_hold: 'hatch',
    processing: 'sun',
    confirmed: 'sun',
    shipped: 'sun',
    printing: 'sun',
    printed: 'sun',
    pending_config: 'hatch',
    configured: 'hatch',
    delivered: 'ok',
    successful: 'ok',
    cancelled: 'bad',
    failed: 'bad',
    refunded: 'bad',
    partially_refunded: 'bad',
}

export function orderTone(statusKey) {
    return ORDER_TONES[statusKey] || 'paper'
}

// Custom print request lifecycle → tone (customer view of the job queue).
const PRINT_REQUEST_TONES = {
    pending_upload: 'hatch',
    pending_config: 'hatch',
    configured: 'hatch',
    quoted: 'sun',
    payment_pending: 'sun',
    paid: 'ink',
    printing: 'ink',
    printed: 'ink',
    shipped: 'ink',
    delivered: 'ok',
    cancelled: 'bad',
}

export function printRequestTone(statusKey) {
    return PRINT_REQUEST_TONES[statusKey] || 'paper'
}

// Customer-facing labels for custom print request statuses (kept from the
// legacy /account/prints page; relocation only).
export const printStatusLabel = {
    pending_upload: 'Awaiting model upload',
    pending_config: 'Awaiting configuration',
    configured: 'Configured, awaiting quote',
    quoted: 'Quote received',
    payment_pending: 'Awaiting payment',
    paid: 'Paid',
    printing: 'Printing',
    printed: 'Printed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
}

export function money(n) {
    return (Number(n) || 0).toFixed(2)
}
