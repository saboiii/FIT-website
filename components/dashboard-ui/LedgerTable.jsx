'use client'

/**
 * Date-grouped calm ledger (§4.8 #5, Stripe anatomy): group headers with a
 * sun dot; rows with hairline dividers, no zebra; numerals tabular and
 * right-aligned; ONE StatusPill per row.
 *
 * groups: [{ key, label, rows: [{ key, onClick?, selected?, cells: node[] }] }]
 * columns: [{ key, label, align?: 'right' }]
 */
export default function LedgerTable({ columns, groups, className = '' }) {
    return (
        <div className={className}>
            <div
                className="grid px-4 py-2"
                style={{ gridTemplateColumns: columns.map((c) => c.width || '1fr').join(' ') }}
            >
                {columns.map((c) => (
                    <span key={c.key} className={`dash-label ${c.align === 'right' ? 'text-right' : ''}`}>
                        {c.label}
                    </span>
                ))}
            </div>
            {groups.map((g) => (
                <div key={g.key}>
                    {g.label && (
                        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--dash-sun)]" />
                            <span className="dash-label">{g.label}</span>
                        </div>
                    )}
                    <div className="divide-y divide-[var(--dash-line)]">
                        {g.rows.map((row) => {
                            const Tag = row.onClick ? 'button' : 'div'
                            return (
                                <Tag
                                    key={row.key}
                                    onClick={row.onClick}
                                    className={`grid items-center w-full text-left px-4 py-2.5 ${
                                        row.onClick ? 'dash-hoverable cursor-pointer hover:bg-[var(--dash-canvas)]' : ''
                                    } ${row.selected ? 'bg-[var(--dash-sun-soft)] rounded-[var(--dash-r-inner)]' : ''}`}
                                    style={{ gridTemplateColumns: columns.map((c) => c.width || '1fr').join(' ') }}
                                >
                                    {row.cells.map((cell, i) => (
                                        <div
                                            key={columns[i]?.key || i}
                                            className={`min-w-0 text-[13px] ${columns[i]?.align === 'right' ? 'text-right dash-data' : ''}`}
                                        >
                                            {cell}
                                        </div>
                                    ))}
                                </Tag>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
