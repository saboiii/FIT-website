'use client'
// Revenue hero card (blueprint §5.2): Recharts sparse area per §4.7 — no
// gridlines, no legend, 2px ink line, sun-soft fill, 11px x-labels only.
// Replaces the old Chart.js Visualisation and guards missing `sales[]`.
import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { motion } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { swap } from '@/lib/motion/tokens'
import { DashCard } from '@/components/dashboard-ui'
import { formatMoney } from './format'

const RANGES = [7, 30, 90]

export function dailyGrossSeries(products, days) {
    const totals = {}
    ;(products || []).forEach((product) => {
        ;(product?.sales || []).forEach((sale) => {
            if (!sale?.createdAt) return
            const date = dayjs(sale.createdAt).format('YYYY-MM-DD')
            totals[date] = (totals[date] || 0) + (sale.quantity || 0) * (sale.price || 0)
        })
    })
    const series = []
    for (let i = days - 1; i >= 0; i--) {
        const d = dayjs().subtract(i, 'day')
        series.push({
            label: d.format('D MMM'),
            value: Math.round((totals[d.format('YYYY-MM-DD')] || 0) * 100) / 100,
        })
    }
    return series
}

function RevenueTooltip({ active, payload, prefix }) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] shadow-[var(--dash-shadow-float)] px-3 py-2">
            <p className="dash-label">{payload[0].payload.label}</p>
            <p className="dash-data mt-0.5">
                {prefix}
                {formatMoney(payload[0].value)}
            </p>
        </div>
    )
}

export default function RevenueCard({ products, prefix }) {
    const [range, setRange] = useState(30)
    const series = useMemo(() => dailyGrossSeries(products, range), [products, range])

    const chips = (
        <div className="flex items-center gap-1.5">
            {RANGES.map((r) => (
                <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`dash-hoverable rounded-full border px-2.5 py-0.5 text-[12px] cursor-pointer ${
                        range === r
                            ? 'border-[var(--dash-ink)] text-[var(--dash-ink)] font-medium'
                            : 'border-[var(--dash-line)] dash-soft hover:text-[var(--dash-ink)]'
                    }`}
                >
                    {r}d
                </button>
            ))}
        </div>
    )

    return (
        <DashCard title="Revenue" action={chips} className="h-full">
            <p className="dash-label mb-3">Daily gross · last {range} days</p>
            <motion.div key={range} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={swap}>
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={series} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                            <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={false}
                                minTickGap={48}
                                interval="preserveStartEnd"
                                tick={{ fontSize: 11, fill: 'var(--dash-ink-faint)' }}
                            />
                            <YAxis hide domain={[0, 'auto']} />
                            <Tooltip
                                content={<RevenueTooltip prefix={prefix} />}
                                cursor={{ stroke: 'var(--dash-line)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="var(--dash-ink)"
                                strokeWidth={2}
                                fill="var(--dash-sun-soft)"
                                fillOpacity={1}
                                dot={false}
                                activeDot={{ r: 3, fill: 'var(--dash-ink)', strokeWidth: 0 }}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
        </DashCard>
    )
}
