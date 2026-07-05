import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// Panels mirror sub-view state into ?sub= (useUrlSub). jsdom keeps the URL
// across tests in a file, so without a reset one test's tab click changes
// which sub-view the next test's mount starts on.
afterEach(() => {
    if (typeof window !== 'undefined' && window.location.search) {
        window.history.replaceState(null, '', window.location.pathname)
    }
})
