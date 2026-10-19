'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Subscribe to a CSS media query.
 *
 * Uses `useSyncExternalStore` so the value is read during render (no
 * setState-in-effect, no hydration mismatch) and kept in sync with the
 * browser afterwards. Server snapshot is `false` so SSR renders the
 * non-matching branch.
 */
export function useMedia(query: string): boolean {
    const subscribe = useCallback(
        (onStoreChange: () => void) => {
            const matchMedia = window.matchMedia(query)
            matchMedia.addEventListener('change', onStoreChange)
            return () => matchMedia.removeEventListener('change', onStoreChange)
        },
        [query],
    )

    const getSnapshot = useCallback(
        () => window.matchMedia(query).matches,
        [query],
    )

    const getServerSnapshot = useCallback(() => false, [])

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
