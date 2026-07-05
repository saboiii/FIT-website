'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useAccess from '@/utils/useAccess'
import ContentManagement from '@/components/Admin/DynamicContentManagement'
import BlogManagement from '@/components/Admin/BlogManagement'
import NewsletterManagement from '@/components/Admin/NewsletterManagement'
import CreatorPayments from '@/components/Admin/CreatorPayments'
import CategoryManagement from '@/components/Admin/CategoryManagement'
import DeliveryTypeManagement from '@/components/Admin/DeliveryTypeManagement'
import OrderStatusManagement from '@/components/Admin/OrderStatusManagement'
import CustomPrintProductManagement from '@/components/Admin/CustomPrintProductManagement'
import CustomPrintRequests from '@/components/Admin/CustomPrintRequests'
import QuotingPricingManagement from '@/components/Admin/QuotingPricingManagement'
import PrintTimeCalibration from '@/components/Admin/PrintTimeCalibration'
import ReviewManagement from '@/components/Admin/ReviewManagement'
import EventManagement from '@/components/Admin/EventManagement'
import Overview from '@/components/Admin/Overview'
import OnboardingWizard from '@/components/Admin/OnboardingWizard'
import { buildSetupChecklist, needsOnboarding } from '@/lib/admin/setupChecklist'
import { useUser } from '@clerk/nextjs'

// Grouped IA: daily operations first, occasional configuration last.
const NAV_GROUPS = [
    { title: null, items: [{ key: 'overview', label: 'Overview' }] },
    {
        title: 'Operations',
        items: [
            { key: 'customPrintRequests', label: 'Print Requests' },
            { key: 'orders', label: 'Orders & Statuses' },
            { key: 'payments', label: 'Payments' },
            { key: 'reviews', label: 'Reviews' },
        ],
    },
    {
        title: 'Catalogue',
        items: [
            { key: 'customPrint', label: 'Custom Print Product' },
            { key: 'categories', label: 'Categories' },
            { key: 'events', label: 'Events' },
        ],
    },
    {
        title: 'Storefront',
        items: [
            { key: 'content', label: 'Site Content' },
            { key: 'blog', label: 'Blog' },
            { key: 'newsletter', label: 'Newsletter' },
        ],
    },
    {
        title: 'Settings',
        items: [
            { key: 'quoting', label: 'Quoting & Pricing' },
            { key: 'printTiming', label: 'Print Timing' },
            { key: 'delivery', label: 'Delivery' },
        ],
    },
]

const PANELS = {
    content: ContentManagement,
    payments: CreatorPayments,
    events: EventManagement,
    categories: CategoryManagement,
    delivery: DeliveryTypeManagement,
    orders: OrderStatusManagement,
    blog: BlogManagement,
    newsletter: NewsletterManagement,
    customPrint: CustomPrintProductManagement,
    customPrintRequests: CustomPrintRequests,
    quoting: QuotingPricingManagement,
    printTiming: PrintTimeCalibration,
    reviews: ReviewManagement,
}

const VALID_TABS = new Set(['overview', ...Object.keys(PANELS)])

function AdminDashboard() {
    const { loading, isAdmin } = useAccess()
    const { user } = useUser()
    const router = useRouter()
    const searchParams = useSearchParams()

    const paramTab = searchParams.get('tab')
    const activeTab = VALID_TABS.has(paramTab) ? paramTab : 'overview'
    const setActiveTab = useCallback(
        (key) => router.replace(`/admin?tab=${key}`, { scroll: false }),
        [router],
    )

    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    const [setupData, setSetupData] = useState(null)
    const [requests, setRequests] = useState([])
    const [wizardOpen, setWizardOpen] = useState(false)
    const [wizardChecked, setWizardChecked] = useState(false)

    const loadOverviewData = useCallback(async () => {
        try {
            const [quotingRes, settingsRes, productRes, requestsRes] = await Promise.all([
                fetch('/api/admin/quoting'),
                fetch('/api/admin/settings'),
                fetch('/api/product/custom-print-config'),
                fetch('/api/admin/custom-print-requests'),
            ])
            const quoting = quotingRes.ok ? await quotingRes.json() : {}
            const settings = settingsRes.ok ? await settingsRes.json() : {}
            const product = productRes.ok ? await productRes.json() : {}
            const reqs = requestsRes.ok ? await requestsRes.json() : {}
            setSetupData({
                quotingConfig: quoting.quotingConfig,
                printColours: quoting.printColours,
                machineLimits: quoting.machineLimits,
                adminEmailPresent: quoting.adminEmailPresent,
                deliveryTypes: settings.deliveryTypes,
                customPrintProduct: product.product,
            })
            setRequests(reqs.requests || [])
        } catch {
            setSetupData({})
        }
    }, [])

    useEffect(() => {
        if (!loading && isAdmin) loadOverviewData()
    }, [loading, isAdmin, loadOverviewData])

    // First-run trigger: required checklist items incomplete + not dismissed.
    useEffect(() => {
        if (!setupData || wizardChecked) return
        setWizardChecked(true)
        let dismissed = false
        try { dismissed = Boolean(localStorage.getItem('adminOnboardingDismissed')) } catch { /* ignore */ }
        if (!dismissed && needsOnboarding(buildSetupChecklist(setupData))) setWizardOpen(true)
    }, [setupData, wizardChecked])

    const closeWizard = () => {
        setWizardOpen(false)
        loadOverviewData() // config may have changed; refresh the checklist
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="loader" />
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                    <p>You don&apos;t have permission to access this page.</p>
                </div>
            </div>
        )
    }

    const ActivePanel = PANELS[activeTab]
    const activeLabel = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.key === activeTab)?.label || 'Overview'

    const navList = (onSelect) => (
        <nav className="flex flex-col gap-4">
            {NAV_GROUPS.map((group, gi) => (
                <div key={group.title || gi} className="flex flex-col gap-1">
                    {group.title && (
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-lightColor px-3">{group.title}</p>
                    )}
                    {group.items.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => onSelect(item.key)}
                            className={`text-left text-xs px-3 py-2 rounded-md cursor-pointer whitespace-nowrap ${activeTab === item.key
                                ? 'bg-textColor text-background font-medium'
                                : 'text-lightColor hover:text-textColor hover:bg-baseColor'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            ))}
            <div className="border-t border-borderColor pt-3">
                <button
                    onClick={() => { onSelect('overview'); setWizardOpen(true) }}
                    className="text-left text-xs px-3 py-2 rounded-md text-lightColor hover:text-textColor hover:bg-baseColor cursor-pointer w-full"
                >
                    Setup wizard (re-run)
                </button>
            </div>
        </nav>
    )

    return (
        <div className="container mx-auto py-16 max-w-6xl">
            <div className="flex flex-col px-6 md:px-12 mb-8">
                <h3>Admin Dashboard</h3>
                <h1 className="flex font-bold mb-6 mt-2">Hello{user && user.firstName ? `, ${user.firstName}` : ''}.</h1>
                <p className="text-xs flex md:w-md">
                    Manage your store from here — daily operations, catalogue, storefront content and settings.
                </p>
            </div>

            {/* Mobile drawer */}
            <div className="md:hidden px-6 mb-4">
                <button
                    onClick={() => setMobileNavOpen((o) => !o)}
                    className="w-full flex items-center justify-between text-xs px-3 py-2 border border-borderColor rounded-md cursor-pointer"
                    aria-expanded={mobileNavOpen}
                >
                    <span className="font-medium text-textColor">{activeLabel}</span>
                    <span className="text-lightColor">{mobileNavOpen ? '▲' : '▼'}</span>
                </button>
                {mobileNavOpen && (
                    <div className="mt-2 border border-borderColor rounded-md p-3">
                        {navList((key) => { setActiveTab(key); setMobileNavOpen(false) })}
                    </div>
                )}
            </div>

            <div className="flex px-6 md:px-12 gap-8 items-start">
                {/* Sidebar (desktop) */}
                <aside className="hidden md:block w-52 shrink-0 sticky top-24">
                    {navList(setActiveTab)}
                </aside>

                {/* Active panel */}
                <main className="flex-1 min-w-0 border border-borderColor rounded-md">
                    {activeTab === 'overview' ? (
                        <Overview
                            setupData={setupData}
                            requests={requests}
                            onNavigate={setActiveTab}
                            onOpenWizard={() => setWizardOpen(true)}
                        />
                    ) : (
                        <ActivePanel />
                    )}
                </main>
            </div>

            {wizardOpen && (
                <OnboardingWizard
                    adminEmailPresent={Boolean(setupData?.adminEmailPresent)}
                    onClose={closeWizard}
                />
            )}
        </div>
    )
}

export default function AdminPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-screen">
                    <div className="loader" />
                </div>
            }
        >
            <AdminDashboard />
        </Suspense>
    )
}
