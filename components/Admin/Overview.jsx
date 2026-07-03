'use client'
import { buildSetupChecklist, summarizeRequests } from '@/lib/admin/setupChecklist'

const STATUS_LABELS = {
    pending_upload: 'Awaiting upload',
    pending_config: 'Awaiting config',
    configured: 'Awaiting quote',
    quoted: 'Quoted',
    payment_pending: 'Payment pending',
    paid: 'Paid',
    printing: 'Printing',
    printed: 'Printed',
    shipped: 'Shipped',
}

// Pure-render panel: the page owns the data (it also drives the wizard trigger).
export default function Overview({ setupData, requests, onNavigate, onOpenWizard }) {
    if (!setupData) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-textColor border-t-transparent" />
            </div>
        )
    }

    const items = buildSetupChecklist(setupData)
    const done = items.filter((i) => i.ok).length
    const summary = summarizeRequests(requests)

    return (
        <div className="flex flex-col gap-6 p-6 md:p-12">
            {/* At-a-glance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button onClick={() => onNavigate('customPrintRequests')} className="text-left border border-borderColor rounded-md p-4 hover:bg-baseColor cursor-pointer">
                    <p className="text-2xl font-semibold text-textColor">{summary.openTotal}</p>
                    <p className="text-xs text-lightColor mt-1">Open print requests</p>
                </button>
                <button onClick={() => onNavigate('customPrintRequests')} className="text-left border border-borderColor rounded-md p-4 hover:bg-baseColor cursor-pointer">
                    <p className="text-2xl font-semibold text-textColor">{summary.unquoted}</p>
                    <p className="text-xs text-lightColor mt-1">Submitted, awaiting your quote</p>
                </button>
                <button onClick={() => onNavigate('customPrintRequests')} className="text-left border border-borderColor rounded-md p-4 hover:bg-baseColor cursor-pointer">
                    <p className="text-2xl font-semibold text-textColor">{summary.paidNotPrinted}</p>
                    <p className="text-xs text-lightColor mt-1">Paid, not yet printing</p>
                </button>
            </div>
            {summary.openTotal > 0 && (
                <div className="flex flex-wrap gap-2">
                    {Object.entries(summary.openByStatus).map(([status, count]) => (
                        <span key={status} className="text-[11px] px-2 py-1 border border-borderColor rounded-full text-lightColor">
                            {STATUS_LABELS[status] || status}: <span className="text-textColor font-medium">{count}</span>
                        </span>
                    ))}
                </div>
            )}

            {/* Setup checklist */}
            <div className="border border-borderColor rounded-md overflow-hidden">
                <div className="bg-borderColor/40 px-4 py-2 border-b border-borderColor flex items-center justify-between">
                    <h3 className="text-sm font-medium text-textColor">Store setup — {done}/{items.length} complete</h3>
                    <button onClick={onOpenWizard} className="text-xs px-3 py-1 border border-borderColor rounded-full hover:bg-baseColor cursor-pointer">
                        Run setup wizard
                    </button>
                </div>
                <div className="divide-y divide-borderColor">
                    {items.map((item) => (
                        <div key={item.key} className="flex items-start gap-3 px-4 py-3">
                            <span className={`mt-0.5 text-sm ${item.ok ? 'text-green-600' : 'text-amber-500'}`} aria-hidden>
                                {item.ok ? '✓' : '⚠'}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-textColor">{item.label}</p>
                                {!item.ok && <p className="text-xs text-lightColor mt-0.5">{item.consequence}</p>}
                            </div>
                            {!item.ok && (
                                <button
                                    onClick={() => onNavigate(item.tab)}
                                    className="text-xs px-3 py-1 border border-borderColor rounded-full hover:bg-baseColor whitespace-nowrap cursor-pointer"
                                >
                                    Fix now
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
