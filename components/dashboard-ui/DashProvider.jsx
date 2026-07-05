'use client'
import { MotionConfig } from 'framer-motion'

/**
 * Root wrapper for both dashboard shells. Sets the `.dash` token scope
 * (app/dashboard.css) and the global motion policy: user's reduced-motion
 * preference disables transform/layout animation, opacity fades remain
 * (blueprint §4.5). Everything dashboard renders inside one of these.
 */
export default function DashProvider({ children, className = '' }) {
    return (
        <MotionConfig reducedMotion="user">
            <div className={`dash min-h-[92vh] ${className}`}>{children}</div>
        </MotionConfig>
    )
}
