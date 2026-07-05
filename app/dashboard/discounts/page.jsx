'use client'
// Discount codes — honest stub (openspec add-discount-codes). Real page shell
// + informational empty state; the "New Code" button is visible but disabled
// (the DiscountCode model/API does not exist yet).
import { GoPlus } from 'react-icons/go'
import { IoPricetagOutline } from 'react-icons/io5'
import { ComingSoon, DashProvider, EmptyState } from '@/components/dashboard-ui'

export default function DiscountsPage() {
    return (
        <DashProvider>
            <div className="mx-auto w-full max-w-[1200px] px-6 py-12 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <h1 className="dash-title">Discounts</h1>
                        <ComingSoon />
                    </div>
                    <button
                        type="button"
                        disabled
                        title="Needs backend — coming soon"
                        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium bg-[var(--dash-sun)] text-[var(--dash-ink)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        New Code
                        <GoPlus aria-hidden="true" />
                    </button>
                </div>

                <div className="bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-card)] shadow-[var(--dash-shadow-card)]">
                    <EmptyState
                        icon={<IoPricetagOutline />}
                        title="Discount Codes — Coming Soon"
                        body="Typed coupon codes for your shop — percentage or fixed amount, validity windows, usage limits and per-code stats. Today only automatic event discounts exist; codes need their own backend."
                    />
                </div>
            </div>
        </DashProvider>
    )
}
