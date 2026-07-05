import { useState, useEffect } from 'react'
import { useToast } from '@/components/General/ToastProvider'
import TextInput from './CMSFields/TextInput'
import RichTextEditor from './CMSFields/RichTextEditor'
import ImageUpload from './CMSFields/ImageUpload'
import ArrayField from './CMSFields/ArrayField'
import ProductSearch from './CMSFields/ProductSearch'
import CategoryInput from './CMSFields/CategoryInput'
import BooleanField from './CMSFields/BooleanField'
import RangeField from './CMSFields/RangeField'
import { DashCard, GlassBar, SkeletonRow, CoachMarks, useTourOffer, TourOfferStrip, TourHelpButton, TOURS } from '@/components/dashboard-ui'
import { labelCls, quietBtnCls, InfoStrip } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'
import { IoRefresh } from 'react-icons/io5'
import { MdOpenInNew } from 'react-icons/md'

const defaultContentSections = [
    {
        id: 'home/featured-section',
        name: 'Home - Featured Section',
        description: 'Featured section with title, content, and product display options (choose by category or custom list)',
        fields: ['title', 'content', 'productType', 'displayMode', 'category', 'subcategory', 'customProducts']
    },
    {
        id: 'home/hero-banner',
        name: 'Home - Hero Banner',
        description: 'Banner text displayed at the top of the homepage',
        fields: ['text', 'heroImage', 'darkOverlay']
    },
    {
        id: 'home/ad-banner',
        name: 'Home - Ad Banner',
        description: 'Top banner text displayed above the hero section',
        fields: ['text']
    },
    {
        id: 'home/testimonials',
        name: 'Home - Testimonials',
        description: 'Customer testimonials with name, role, text, and avatar',
        fields: ['testimonials']
    },
    {
        id: 'about/introduction',
        name: 'About - Introduction Section',
        description: 'Main heading and description on the about page',
        fields: ['heading', 'subheading', 'description']
    },
    {
        id: 'about/services',
        name: 'About - Services Section',
        description: 'Services section heading and description',
        fields: ['heading', 'subheading', 'description']
    },
    {
        id: 'about/services-list',
        name: 'About - Services List',
        description: 'List of services with images, titles, and descriptions',
        fields: ['services']
    },
    {
        id: 'about/benefits',
        name: 'About - Benefits Section',
        description: 'Benefits section with benefit cards (background image is fixed)',
        fields: ['benefits']
    },
    {
        id: 'shop/banner',
        name: 'Shop - Banner',
        description: 'Background banner image displayed at the top of the shop page',
        fields: ['bannerImage']
    },
    {
        id: 'prints/banner',
        name: 'Prints - Banner',
        description: 'Background banner image displayed at the top of the prints page',
        fields: ['bannerImage']
    },
    {
        id: 'terms/content',
        name: 'Terms of Service',
        description: 'Complete terms of service content',
        fields: ['title', 'subtitle', 'content']
    },
    {
        id: 'privacy/content',
        name: 'Privacy Policy',
        description: 'Complete privacy policy content',
        fields: ['title', 'subtitle', 'content']
    }
]

// Section picker groups (§9.3): one dash-label header per page prefix.
const SECTION_GROUPS = [
    { label: 'Home', prefixes: ['home/'] },
    { label: 'About', prefixes: ['about/'] },
    { label: 'Shop & Prints', prefixes: ['shop/', 'prints/'] },
    { label: 'Legal', prefixes: ['terms/', 'privacy/'] },
]

// Two-way selectable option card (display mode / product type pickers).
function OptionCard({ selected, onClick, title, body }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={`dash-hoverable p-3 sm:p-4 rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] text-left cursor-pointer ${selected
                ? 'bg-[var(--dash-sun-soft)]'
                : 'bg-[var(--dash-card)] hover:bg-[var(--dash-canvas)]'
                }`}
        >
            <div className="text-[13px] font-medium text-[var(--dash-ink)] mb-1">{title}</div>
            <div className="text-[13px] dash-soft">{body}</div>
        </button>
    )
}

export default function ContentManagement() {
    const { showToast } = useToast()
    const [contentSections, setContentSections] = useState(defaultContentSections)
    const [selectedSection, setSelectedSection] = useState(defaultContentSections[0].id)
    const [content, setContent] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [previewKey, setPreviewKey] = useState(Date.now())
    const [tourOpen, setTourOpen] = useState(false)
    const tourOffer = useTourOffer('content')

    useEffect(() => {
        fetchContent()
    }, [selectedSection])

    const fetchContent = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`/api/admin/content?path=${selectedSection}`)
            if (!response.ok) {
                throw new Error('Failed to fetch content')
            }
            const data = await response.json()
            setContent(data)
        } catch (error) {
            showToast('Failed to load content: ' + error.message, 'error')
            const section = contentSections.find(s => s.id === selectedSection)
            const emptyContent = {
                frontmatter: {},
                content: ''
            }
            section.fields.forEach(field => {
                emptyContent.frontmatter[field] = ''
            })
            setContent(emptyContent)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        if (!content) return

        setIsSaving(true)
        try {
            const response = await fetch('/api/admin/content', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contentPath: selectedSection,
                    frontmatter: content.frontmatter,
                    content: content.content,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to save content')
            }

            showToast('Content saved successfully!', 'success')
            setPreviewKey(Date.now())
        } catch (error) {
            showToast('Failed to save content: ' + error.message, 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const updateField = (field, value) => {
        if (field === 'content') {
            setContent({
                ...content,
                content: value
            })
        } else {
            setContent({
                ...content,
                frontmatter: {
                    ...content.frontmatter,
                    [field]: value
                }
            })
        }
    }

    const renderField = (field, value, onChange) => {
        const isContentField = field === 'content'
        const isComplexContent = selectedSection.includes('terms') || selectedSection.includes('privacy')

        if (isContentField) {
            return (
                <RichTextEditor
                    key={field}
                    label={field.charAt(0).toUpperCase() + field.slice(1)}
                    value={value}
                    onChange={onChange}
                    height={isComplexContent ? 500 : 300}
                    showHtmlTip={isComplexContent}
                />
            )
        }

        // image field detection: prefer explicit frontmatter fieldMeta, fallback to naming heuristic
        const getFieldMeta = (f) => {
            try {
                return content?.frontmatter?.fieldMeta?.[f] || null
            } catch (e) {
                return null
            }
        }

        const isImageField = (f) => {
            const meta = getFieldMeta(f)
            if (meta) return meta.type === 'image' || meta.type === 'images'
            const name = f.toLowerCase()
            return name.includes('image') || name.includes('photo') || name.includes('avatar')
        }

        const isArrayField = (f) => {
            const meta = getFieldMeta(f)
            return meta?.type === 'array' || Array.isArray(value)
        }

        // Handle array fields (testimonials, services, benefits, etc.)
        if (isArrayField(field)) {
            const meta = getFieldMeta(field) || {}
            return (
                <ArrayField
                    key={field}
                    label={field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                    value={value}
                    onChange={onChange}
                    fieldMeta={meta}
                />
            )
        }

        if (isImageField(field)) {
            const meta = getFieldMeta(field) || {}
            // uploadPath helps group uploads (e.g. 'home/featured'), default to selectedSection
            const uploadPath = meta.uploadPath || selectedSection
            // use a dedicated admin upload endpoint so these do not mix with product uploads
            const uploadEndpoint = meta.uploadEndpoint || '/api/admin/upload/images'

            // Cropping configuration: prefer explicit fieldMeta, fall back to
            // sensible defaults based on the section and field name.
            let cropAspectRatio = meta.aspectRatio || null
            let targetWidth = meta.width || null
            let targetHeight = meta.height || null

            // Shop / Prints banners use a wide 16:5 hero-style banner
            if (!cropAspectRatio && (selectedSection === 'shop/banner' || selectedSection === 'prints/banner') && field === 'bannerImage') {
                cropAspectRatio = 16 / 5
            }

            return (
                <ImageUpload
                    key={field}
                    label={field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                    value={value}
                    onChange={onChange}
                    uploadPath={uploadPath}
                    uploadEndpoint={uploadEndpoint}
                    cropAspectRatio={cropAspectRatio}
                    targetWidth={targetWidth}
                    targetHeight={targetHeight}
                />
            )
        }

        if (field === 'displayMode') {
            const currentMode = value || 'category'
            return (
                <div key={field} className="flex flex-col gap-2">
                    <label className={labelCls}>Display Mode</label>
                    <p className="text-[13px] dash-soft">Choose how to select which products to display</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        <OptionCard
                            selected={currentMode === 'category'}
                            onClick={() => onChange('category')}
                            title="By Category"
                            body="Show products from a specific category/subcategory"
                        />
                        <OptionCard
                            selected={currentMode === 'custom'}
                            onClick={() => onChange('custom')}
                            title="Custom List"
                            body="Hand-pick specific products in any order"
                        />
                    </div>
                </div>
            )
        }

        if (field === 'productType') {
            const currentType = value || 'print'
            return (
                <div key={field} className="flex flex-col gap-2">
                    <label className={labelCls}>Product Type</label>
                    <p className="text-[13px] dash-soft">Choose whether to feature print products or shop products.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        <OptionCard
                            selected={currentType === 'print'}
                            onClick={() => onChange('print')}
                            title="Print Products"
                            body="Use categories from your prints catalogue."
                        />
                        <OptionCard
                            selected={currentType === 'shop'}
                            onClick={() => onChange('shop')}
                            title="Shop Products"
                            body="Use categories from your shop catalogue."
                        />
                    </div>
                </div>
            )
        }

        // Handle category and subcategory fields
        if (field === 'category' || field === 'subcategory') {
            const displayMode = content?.frontmatter?.displayMode || 'category'
            if (displayMode !== 'category') return null

            const featuredProductType = content?.frontmatter?.productType || null

            return (
                <CategoryInput
                    key={field}
                    label={field.charAt(0).toUpperCase() + field.slice(1)}
                    value={value || ''}
                    onChange={onChange}
                    placeholder={field === 'category' ? 'e.g., Trending Prints' : 'e.g., Popular'}
                    helpText={field === 'category'
                        ? 'Start typing to see existing categories or enter a new one'
                        : 'Start typing to see existing subcategories or enter a new one'}
                    type={field}
                    productType={featuredProductType}
                />
            )
        }

        // Handle customProducts field
        if (field === 'customProducts') {
            const displayMode = content?.frontmatter?.displayMode || 'category'
            if (displayMode !== 'custom') return null

            return (
                <ProductSearch
                    key={field}
                    label="Select Products"
                    value={value || ''}
                    onChange={onChange}
                    helpText="Search and select products by name. Drag to reorder them - the order here is the display order on your site."
                />
            )
        }

        // Range field detection (§9.13): explicit fieldMeta, or the hero
        // overlay by name. Legacy booleans map true → 50, false/unset → 0;
        // the slider always writes NUMBERS back through the same PUT.
        const isRangeField = (f) => {
            const meta = getFieldMeta(f)
            if (meta?.type === 'range') return true
            return f === 'darkOverlay'
        }

        if (isRangeField(field)) {
            const meta = getFieldMeta(field) || {}
            const numeric = value === true ? 50 : (Number.isFinite(Number(value)) && value !== '' && value !== null && value !== false ? Number(value) : 0)
            return (
                <RangeField
                    key={field}
                    label={field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                    value={numeric}
                    onChange={(v) => onChange(Number(v))}
                    min={meta.min ?? 0}
                    max={meta.max ?? 80}
                    step={meta.step ?? 5}
                    suffix={meta.suffix ?? '%'}
                    helpText={field === 'darkOverlay' ? 'Darkens the hero image behind the banner text. 0% = no overlay.' : undefined}
                />
            )
        }

        // Boolean field detection
        const isBooleanField = (f) => {
            const meta = getFieldMeta(f)
            if (meta) return meta.type === 'boolean'
            const name = f.toLowerCase()
            return name.includes('enable') || name.includes('toggle') || name.includes('overlay')
                || name.includes('show') || name.includes('hide')
        }

        if (isBooleanField(field)) {
            return (
                <BooleanField
                    key={field}
                    label={field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                    value={!!value}
                    onChange={onChange}
                />
            )
        }

        if (field.toLowerCase().includes('description') || field.toLowerCase().includes('subtitle') || field.toLowerCase().includes('text')) {
            return (
                <TextInput
                    key={field}
                    label={field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                    value={value}
                    onChange={onChange}
                    rows={field.toLowerCase().includes('description') ? 3 : 1}
                />
            )
        }

        return (
            <TextInput
                key={field}
                label={field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                value={value}
                onChange={onChange}
            />
        )
    }



    const currentSection = contentSections.find(s => s.id === selectedSection)

    const getPreviewPath = (sectionId) => {
        if (!sectionId) return '/'
        if (sectionId.startsWith('home/')) return '/'
        if (sectionId.startsWith('about/')) return '/about'
        if (sectionId.startsWith('terms/')) return '/terms'
        if (sectionId.startsWith('privacy/')) return '/privacy'
        if (sectionId.startsWith('shop/')) return '/shop'
        if (sectionId.startsWith('products/')) return '/products'
        if (sectionId.startsWith('creators/')) return '/creators'
        if (sectionId.startsWith('prints/')) return '/prints'
        if (sectionId.startsWith('dashboard/')) return '/dashboard'
        if (sectionId.startsWith('onboarding/')) return '/onboarding'
        if (sectionId.startsWith('account/')) return '/account'
        return '/'
    }

    const previewUrl = `${getPreviewPath(selectedSection)}?previewKey=${previewKey}`

    // The generic section reset stays hidden on banner sections so the only
    // reset action there is the image field's "Reset to placeholder" button.
    const showReset = !(selectedSection === 'shop/banner' || selectedSection === 'prints/banner')

    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <div>
                <h2 className="dash-title">Site Content</h2>
                <p className="text-[13px] dash-soft mt-1">
                    Select a section to edit its content, then preview and save your changes.
                </p>
            </div>

            {/* Save / Reset — pinned in one consistent place (§5.11) */}
            <GlassBar className="justify-between" data-tour="cms-savebar">
                <span className="text-[13px] dash-soft truncate">
                    Editing <span className="font-medium text-[var(--dash-ink)]">{currentSection?.name}</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                    {showReset && (
                        <button
                            onClick={fetchContent}
                            disabled={isLoading}
                            className={quietBtnCls}
                        >
                            Reset
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isLoading || !content}
                        className="dash-hoverable rounded-full px-4 py-1.5 text-[13px] font-medium bg-[var(--dash-sun)] text-[var(--dash-ink)] cursor-pointer hover:bg-[var(--dash-sun-deep)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <TourHelpButton onClick={() => setTourOpen(true)} />
                </div>
            </GlassBar>

            {tourOffer.offered && !tourOpen && (
                <TourOfferStrip
                    onStart={() => { tourOffer.accept(); setTourOpen(true) }}
                    onDismiss={tourOffer.dismiss}
                />
            )}

            {/* Section picker — two-column card grid grouped by page (§9.3) */}
            <div className="flex flex-col gap-4" data-tour="cms-sections">
                {SECTION_GROUPS.map((group) => {
                    const sections = contentSections.filter((s) =>
                        group.prefixes.some((p) => s.id.startsWith(p))
                    )
                    if (sections.length === 0) return null
                    return (
                        <div key={group.label} className="flex flex-col gap-2">
                            <p className="dash-label">{group.label}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                {sections.map((section) => {
                                    const selected = selectedSection === section.id
                                    return (
                                        <button
                                            key={section.id}
                                            type="button"
                                            onClick={() => setSelectedSection(section.id)}
                                            aria-pressed={selected}
                                            className={`dash-hoverable p-3 sm:p-4 rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] text-left cursor-pointer ${selected
                                                ? 'bg-[var(--dash-sun-soft)]'
                                                : 'bg-[var(--dash-card)] hover:bg-[var(--dash-canvas)]'
                                                }`}
                                        >
                                            <div className="text-[13px] font-medium text-[var(--dash-ink)] mb-1">{section.name}</div>
                                            <div className="text-[13px] dash-soft line-clamp-2">
                                                {section.description}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Editor */}
            {isLoading ? (
                <div className="flex flex-col gap-2" aria-label="Loading content">
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                </div>
            ) : content && currentSection ? (
                <DashCard title={`Editing "${currentSection.name}"`} data-tour="cms-editor">
                    <div className="flex flex-col gap-6">
                        {currentSection.fields.map((field) => {
                            const value = field === 'content' ? content.content : content.frontmatter[field]
                            const onChange = (newValue) => updateField(field, newValue)

                            return renderField(field, value, onChange)
                        })}
                    </div>
                </DashCard>
            ) : (
                <InfoStrip tone="error">Failed to load content. Please try again.</InfoStrip>
            )}

            {/* Preview */}
            <DashCard data-tour="cms-preview">
                <div className="flex flex-col gap-3">
                    <GlassBar className="justify-between">
                        <div className="min-w-0">
                            <h3 className="dash-section">Preview</h3>
                            <p className="text-[13px] dash-soft">Shows the actual page using the last saved content. Save changes, then refresh if needed.</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={() => setPreviewKey(Date.now())}
                                className={`${quietBtnCls} flex items-center gap-1.5`}
                                type="button"
                            >
                                <IoRefresh aria-hidden="true" />
                                Refresh
                            </button>
                            <a
                                href={previewUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="dash-hoverable rounded-full px-3.5 py-1.5 text-[13px] font-medium bg-[var(--dash-ink)] text-[var(--dash-canvas)] cursor-pointer hover:opacity-90 flex items-center gap-1.5"
                            >
                                <MdOpenInNew aria-hidden="true" />
                                Open
                            </a>
                        </div>
                    </GlassBar>
                    <div className="relative w-full border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] overflow-hidden bg-[var(--dash-canvas)]">
                        {previewUrl ? (
                            <iframe
                                key={previewKey}
                                src={previewUrl}
                                title="Content Preview"
                                className="w-full"
                                style={{ height: '400px', border: '0' }}
                            />
                        ) : (
                            <div className="p-6 text-[13px] dash-soft">Preview unavailable.</div>
                        )}
                    </div>
                </div>
            </DashCard>

            {/* Guided tour (§9.11) */}
            <CoachMarks steps={TOURS.content} open={tourOpen} onClose={() => setTourOpen(false)} panelKey="content" />
        </div>
    )
}
