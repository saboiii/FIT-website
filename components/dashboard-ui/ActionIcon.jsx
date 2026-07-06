'use client'

import Link from 'next/link'

/**
 * Icon-only round row action — the ONE way to render per-row edit/delete/etc.
 * actions in list views (pill discipline, blueprint §10.3): a fixed 28px
 * (h-7 w-7) circle, react-icons glyph at 15px, label REQUIRED (becomes both
 * aria-label and title). Tones follow the colour law (§4.1):
 *
 * - `quiet`: neutral ink action — ink-soft glyph at rest, sun-soft wash +
 *   ink glyph on hover.
 * - `bad`: destructive intent — ink-soft at rest (never screaming), bad-bg
 *   wash + bad glyph on hover.
 *
 * Focus-visible ring comes from the global `.dash :focus-visible` tokens.
 * Pass `href` to render a Next `<Link>` with identical styling.
 *
 * @param {{
 *   icon: import('react').ComponentType<{ size?: number }>,
 *   label: string,
 *   tone?: 'quiet' | 'bad',
 *   onClick?: (e: any) => void,
 *   disabled?: boolean,
 *   href?: string,
 *   title?: string,
 *   className?: string,
 * }} props
 */
const TONES = {
    quiet: 'text-[var(--dash-ink-soft)] hover:bg-[var(--dash-sun-soft)] hover:text-[var(--dash-ink)]',
    bad: 'text-[var(--dash-ink-soft)] hover:bg-[var(--dash-bad-bg)] hover:text-[var(--dash-bad)]',
}

export default function ActionIcon({
    icon: Icon,
    label,
    tone = 'quiet',
    onClick,
    disabled = false,
    href,
    title,
    className = '',
    ...rest
}) {
    const cls = [
        'dash-hoverable inline-grid h-7 w-7 shrink-0 place-items-center rounded-full cursor-pointer',
        'disabled:cursor-not-allowed disabled:text-[var(--dash-ink-faint)] disabled:hover:bg-transparent',
        TONES[tone] || TONES.quiet,
        className,
    ].join(' ')

    if (href && !disabled) {
        return (
            <Link href={href} aria-label={label} title={title || label} onClick={onClick} className={cls} {...rest}>
                <Icon size={15} aria-hidden="true" />
            </Link>
        )
    }

    return (
        <button
            type="button"
            aria-label={label}
            title={title || label}
            onClick={onClick}
            disabled={disabled}
            className={cls}
            {...rest}
        >
            <Icon size={15} aria-hidden="true" />
        </button>
    )
}
