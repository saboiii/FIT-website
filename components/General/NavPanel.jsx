'use client'
// Mega panel for the desktop navbar (references: docs/navbar/navbar-drawer.png
// for the rounded floating panel with a featured tile, navbar-drawer-2.png for
// the uppercase hairline-underlined column headers and quiet link lists).
// Pure presentation: Navbar owns open state, hover intent and keyboard wiring.
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BsBadge3D } from 'react-icons/bs'

// Primary bar link/trigger typography: small, uppercase, letter-spaced,
// quiet grey that inks on hover; the active item is marked by NavUnderline.
export const navItemCls = (active) =>
    `relative flex items-center py-1 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors duration-200 ease-in-out ${
        active ? 'text-textColor' : 'text-lightColor hover:text-textColor'
    }`

// Thin ink underline shared across primary items via layoutId, so it slides
// between the active link and whichever panel trigger is open.
export function NavUnderline({ reduceMotion }) {
    return (
        <motion.span
            aria-hidden="true"
            layoutId="nav-underline"
            transition={reduceMotion ? { duration: 0 } : { type: 'tween', duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-x-0 -bottom-0.5 h-px bg-textColor"
        />
    )
}

const subcategoryHref = (type, category, sub) =>
    `/${type}?productType=${type}&productCategory=${encodeURIComponent(category.displayName)}&productSubCategory=${encodeURIComponent(sub.displayName)}`

function NavPanel({ id, type, label, categories, reduceMotion, onNavigate, onMouseEnter, onMouseLeave }) {
    return (
        <motion.div
            id={id}
            role="region"
            aria-label={`${label} menu`}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            transition={{ type: 'tween', duration: 0.18, ease: 'easeOut' }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="absolute inset-x-4 top-full z-50 mt-2 rounded-2xl border border-borderColor bg-background p-8 shadow-[0_2px_6px_rgba(17,17,17,0.05),0_16px_40px_rgba(17,17,17,0.10)] max-lg:hidden"
        >
            <div className="flex items-start gap-12">
                {/* Featured tile (Descript's left region, one tile only): icon
                    chip carries the single gradient accent, bold label, one
                    quiet line of description. */}
                <div className="flex w-56 shrink-0 flex-col">
                    <Link
                        href="/products/custom-print-request"
                        onClick={onNavigate}
                        className="flex flex-col items-start gap-3 rounded-xl border border-borderColor bg-baseColor p-5 transition-colors duration-200 ease-in-out hover:border-lightColor/40"
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-red-400 text-white">
                            <BsBadge3D size={18} aria-hidden="true" />
                        </span>
                        <span className="text-sm font-semibold text-textColor">Print your model</span>
                        <span className="text-xs leading-relaxed text-lightColor">
                            Upload a 3D model and get an instant quote.
                        </span>
                    </Link>
                    <Link
                        href={`/${type}`}
                        onClick={onNavigate}
                        className="mt-5 text-[11px] font-medium uppercase tracking-[0.18em] text-lightColor transition-colors duration-200 ease-in-out hover:text-textColor"
                    >
                        Browse all {label.toLowerCase()}
                    </Link>
                </div>

                {/* Category columns (Nixon): uppercase group headers over a
                    hairline, then quiet link lists with generous whitespace. */}
                <div className="grid flex-1 grid-cols-2 gap-x-10 gap-y-10 xl:grid-cols-4">
                    {categories.map((category) => (
                        <div key={category.name} className="flex flex-col">
                            <p className="border-b border-borderColor pb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-textColor">
                                {category.displayName}
                            </p>
                            <ul className="mt-3.5 flex flex-col gap-2.5">
                                {(category.subcategories || [])
                                    .filter((sub) => sub.isActive)
                                    .map((sub) => (
                                        <li key={sub.name}>
                                            <Link
                                                href={subcategoryHref(type, category, sub)}
                                                onClick={onNavigate}
                                                className="text-xs text-lightColor transition-colors duration-200 ease-in-out hover:text-textColor"
                                            >
                                                {sub.displayName}
                                            </Link>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    ))}
                    {categories.length === 0 && (
                        <p className="text-xs text-lightColor">Nothing here yet. Check back soon.</p>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

export default NavPanel
