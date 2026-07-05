'use client'
import ImageUpload from '@/components/Admin/CMSFields/ImageUpload'

const INPUT =
    'w-full rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-2 text-[13px] outline-none'

function Field({ id, label, trailing, children }) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={id} className="dash-label">{label}</label>
                {trailing}
            </div>
            {children}
        </div>
    )
}

/**
 * The focus-mode meta rail (§5.12): everything that isn't the writing — slug,
 * excerpt, hero image, CTA, SEO, taxonomy, status/schedule and delete. Renders
 * in the sticky right rail (≥1280 px) and inside a Sheet below that; the
 * `idPrefix` keeps label/input ids unique across the two mounts.
 */
export default function MetaRail({
    idPrefix = 'meta',
    form,
    updateForm,
    tagsInput,
    onTagsInput,
    categoriesInput,
    onCategoriesInput,
    slugTaken,
    publishBlocked,
    canDelete,
    onDelete,
}) {
    const id = (name) => `${idPrefix}-${name}`
    const slugState = form.slug
        ? (slugTaken
            ? <span className="w-2 h-2 rounded-full bg-[var(--dash-bad)]" aria-hidden="true" />
            : <span className="w-2 h-2 rounded-full bg-[var(--dash-ok)]" aria-hidden="true" />)
        : null

    return (
        <div className="flex flex-col gap-5">
            <Field id={id('slug')} label="Slug" trailing={slugState}>
                <input
                    id={id('slug')}
                    className={INPUT}
                    value={form.slug}
                    onChange={(e) => updateForm({ slug: e.target.value })}
                    placeholder="auto-generated from title"
                />
                {slugTaken && (
                    <p className="text-[11px] font-medium text-[var(--dash-bad)]">This slug is already in use.</p>
                )}
            </Field>

            <Field id={id('excerpt')} label="Excerpt">
                <textarea
                    id={id('excerpt')}
                    rows={2}
                    className={`${INPUT} resize-y`}
                    value={form.excerpt}
                    onChange={(e) => updateForm({ excerpt: e.target.value })}
                />
            </Field>

            <ImageUpload
                label="Hero Image"
                value={form.heroImage}
                onChange={(v) => updateForm({ heroImage: v })}
                uploadPath={'blog'}
                uploadEndpoint={'/api/admin/upload/images'}
            />

            <Field id={id('cta-tag')} label="CTA Tag">
                <input id={id('cta-tag')} className={INPUT} value={form.cta.tag} onChange={(e) => updateForm({ cta: { ...form.cta, tag: e.target.value } })} />
            </Field>
            <Field id={id('cta-text')} label="CTA Text">
                <input id={id('cta-text')} className={INPUT} value={form.cta.text} onChange={(e) => updateForm({ cta: { ...form.cta, text: e.target.value } })} />
            </Field>
            <Field id={id('cta-url')} label="CTA URL">
                <input id={id('cta-url')} className={INPUT} value={form.cta.url} onChange={(e) => updateForm({ cta: { ...form.cta, url: e.target.value } })} />
            </Field>

            <Field
                id={id('meta-title')}
                label="Meta Title"
                trailing={<span className="dash-data dash-soft">{(form.metaTitle || '').length}/60</span>}
            >
                <input
                    id={id('meta-title')}
                    className={INPUT}
                    value={form.metaTitle}
                    onChange={(e) => updateForm({ metaTitle: e.target.value })}
                    placeholder="Optional SEO title"
                />
            </Field>
            <Field
                id={id('meta-description')}
                label="Meta Description"
                trailing={<span className="dash-data dash-soft">{(form.metaDescription || '').length}/160</span>}
            >
                <textarea
                    id={id('meta-description')}
                    rows={2}
                    className={`${INPUT} resize-y`}
                    value={form.metaDescription}
                    onChange={(e) => updateForm({ metaDescription: e.target.value })}
                    placeholder="Optional SEO description"
                />
            </Field>

            <Field id={id('tags')} label="Tags (comma separated)">
                <input
                    id={id('tags')}
                    className={INPUT}
                    value={tagsInput}
                    onChange={(e) => onTagsInput(e.target.value)}
                    placeholder="e.g. design, tutorial, printing"
                />
            </Field>
            <Field id={id('categories')} label="Categories (comma separated)">
                <input
                    id={id('categories')}
                    className={INPUT}
                    value={categoriesInput}
                    onChange={(e) => onCategoriesInput(e.target.value)}
                    placeholder="e.g. guides, news"
                />
            </Field>

            <label className="flex items-center gap-2 text-[13px] font-medium cursor-pointer">
                <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => updateForm({ featured: e.target.checked })}
                    className="accent-[var(--dash-ink)]"
                />
                Featured post
            </label>

            <Field id={id('status')} label="Status">
                <select
                    id={id('status')}
                    className={`${INPUT} cursor-pointer`}
                    value={form.status}
                    onChange={(e) => updateForm({ status: e.target.value })}
                >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="hidden">Hidden</option>
                </select>
                {publishBlocked && (
                    <p className="text-[11px] font-medium text-[var(--dash-bad)]">
                        Add a hero or inline image before publishing.
                    </p>
                )}
            </Field>

            <Field id={id('schedule')} label="Schedule publish (drafts)">
                <input
                    id={id('schedule')}
                    type="datetime-local"
                    className={INPUT}
                    value={form.scheduledFor}
                    onChange={(e) => updateForm({ scheduledFor: e.target.value })}
                    disabled={form.status === 'published'}
                />
            </Field>

            {canDelete && (
                <button
                    type="button"
                    onClick={onDelete}
                    className="dash-hoverable w-full rounded-full border border-[var(--dash-line)] px-4 py-2 text-[13px] font-medium text-[var(--dash-bad)] hover:bg-[var(--dash-bad-bg)] cursor-pointer"
                >
                    Delete post
                </button>
            )}
        </div>
    )
}
