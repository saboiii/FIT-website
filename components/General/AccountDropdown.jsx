'use client'
// The navbar's signed-in account affordance (reference: docs/account-ui-
// reference-images/account-dropdown-apple.png): a soft rounded floating menu
// with icon + label rows, the active row filled, a small plan badge on the
// Subscription row, and Dashboard shown only when entitled. Storefront
// vocabulary (borderColor/baseColor, Inter, rounded) — no .dash tokens here.
// Keyboard accessible: Esc closes and returns focus to the trigger.
import useAccess from '@/utils/useAccess'
import useEntitlements from '@/utils/useEntitlements'
import { SignOutButton, useUser } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
    IoPersonOutline,
    IoBagHandleOutline,
    IoDownloadOutline,
    IoPrintOutline,
    IoCardOutline,
    IoGridOutline,
    IoShieldOutline,
    IoLogOutOutline,
    IoLogInOutline,
    IoPersonAddOutline,
} from 'react-icons/io5'

const rowCls = (active) =>
    `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors duration-150 ease-in-out ${
        active
            ? 'bg-black/[0.05] text-textColor'
            : 'text-lightColor hover:bg-black/[0.03] hover:text-textColor'
    }`

function MenuRow({ href, icon: Icon, label, active = false, badge = null, onNavigate }) {
    return (
        <Link href={href} role="menuitem" onClick={onNavigate} className={rowCls(active)}>
            <Icon size={16} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{label}</span>
            {badge}
        </Link>
    )
}

function AccountDropdown() {
    const { user, isLoaded } = useUser()
    const { isAdmin } = useAccess()
    const { loading: entitlementsLoading, canAccessDashboard, isPaidTier, subscription } =
        useEntitlements()
    const [open, setOpen] = useState(false)
    const [planBadge, setPlanBadge] = useState('')
    const rootRef = useRef(null)
    const triggerRef = useRef(null)
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const tab = searchParams?.get('tab')

    // Plan badge label from the existing subscription-info endpoint (the same
    // one the tier picker uses); free tier needs no fetch.
    useEffect(() => {
        let cancelled = false
        const priceId = subscription?.priceId
        if (!priceId) {
            setPlanBadge('')
            return undefined
        }
        fetch(`/api/subscription/info?priceId=${encodeURIComponent(priceId)}`)
            .then((res) => (res.ok ? res.json() : {}))
            .then((data) => {
                if (!cancelled) setPlanBadge(data.productName || 'Member')
            })
            .catch(() => {
                if (!cancelled) setPlanBadge('Member')
            })
        return () => {
            cancelled = true
        }
    }, [subscription?.priceId])

    // Click outside closes.
    useEffect(() => {
        if (!open) return undefined
        function handleClickOutside(event) {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    // Esc closes and returns focus to the trigger.
    useEffect(() => {
        if (!open) return undefined
        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                setOpen(false)
                triggerRef.current?.focus()
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [open])

    // Close after client-side navigation (keyed on the string, not the
    // params object, whose identity can change per render).
    const searchKey = searchParams ? String(searchParams) : ''
    useEffect(() => {
        setOpen(false)
    }, [pathname, searchKey])

    const closeMenu = () => setOpen(false)

    const isAccountHub = pathname === '/account'
    const badgeText = subscription?.priceId ? planBadge || 'Member' : 'Free'
    const planBadgeEl = (
        <span
            className={`ml-auto max-w-[88px] shrink-0 truncate rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                isPaidTier
                    ? 'bg-gradient-to-br from-amber-300 to-red-400 text-white'
                    : 'border border-borderColor bg-baseColor text-lightColor'
            }`}
        >
            {badgeText}
        </span>
    )

    return (
        <div className="flex z-10 relative" ref={rootRef}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Account menu"
                className="flex w-7 h-7 rounded-full overflow-hidden cursor-pointer border border-borderColor"
            >
                <Image
                    src={user?.imageUrl || '/user.jpg'}
                    alt="User avatar"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover grayscale"
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        role="menu"
                        aria-label="Account"
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="absolute right-0 top-10 z-50 w-60 origin-top-right rounded-2xl border border-borderColor bg-background p-1.5 shadow-[0_2px_6px_rgba(17,17,17,0.05),0_16px_40px_rgba(17,17,17,0.10)]"
                    >
                        {user && isLoaded ? (
                            <>
                                <MenuRow
                                    href="/account"
                                    icon={IoPersonOutline}
                                    label="Account"
                                    active={isAccountHub && tab !== 'orders' && tab !== 'downloads'}
                                    onNavigate={closeMenu}
                                />
                                <MenuRow
                                    href="/account?tab=orders"
                                    icon={IoBagHandleOutline}
                                    label="Orders"
                                    active={isAccountHub && tab === 'orders'}
                                    onNavigate={closeMenu}
                                />
                                <MenuRow
                                    href="/account?tab=downloads"
                                    icon={IoDownloadOutline}
                                    label="Downloads"
                                    active={isAccountHub && tab === 'downloads'}
                                    onNavigate={closeMenu}
                                />
                                <MenuRow
                                    href="/account/prints"
                                    icon={IoPrintOutline}
                                    label="Print requests"
                                    active={pathname?.startsWith('/account/prints')}
                                    onNavigate={closeMenu}
                                />
                                <MenuRow
                                    href="/account/subscription"
                                    icon={IoCardOutline}
                                    label="Subscription"
                                    active={pathname?.startsWith('/account/subscription')}
                                    badge={planBadgeEl}
                                    onNavigate={closeMenu}
                                />

                                {((canAccessDashboard && !entitlementsLoading) || isAdmin) && (
                                    <div
                                        role="separator"
                                        className="-mx-1.5 my-1.5 h-0 border-t border-borderColor"
                                    />
                                )}
                                {canAccessDashboard && !entitlementsLoading && (
                                    <MenuRow
                                        href="/dashboard"
                                        icon={IoGridOutline}
                                        label="Dashboard"
                                        active={pathname?.startsWith('/dashboard')}
                                        onNavigate={closeMenu}
                                    />
                                )}
                                {isAdmin && (
                                    <MenuRow
                                        href="/admin"
                                        icon={IoShieldOutline}
                                        label="Admin"
                                        active={pathname?.startsWith('/admin')}
                                        onNavigate={closeMenu}
                                    />
                                )}

                                <div
                                    role="separator"
                                    className="-mx-1.5 my-1.5 h-0 border-t border-borderColor"
                                />
                                <SignOutButton redirectUrl="/">
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className={`${rowCls(false)} cursor-pointer text-left`}
                                    >
                                        <IoLogOutOutline size={16} aria-hidden="true" className="shrink-0" />
                                        Sign out
                                    </button>
                                </SignOutButton>
                            </>
                        ) : (
                            <>
                                <MenuRow
                                    href="/sign-in"
                                    icon={IoLogInOutline}
                                    label="Sign in"
                                    onNavigate={closeMenu}
                                />
                                <MenuRow
                                    href="/sign-up"
                                    icon={IoPersonAddOutline}
                                    label="Sign up"
                                    onNavigate={closeMenu}
                                />
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default AccountDropdown
