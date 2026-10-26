import { useEffect, useRef } from 'react'

/**
 * Returns a ref to attach to a sentinel element. Fires onIntersect when that
 * element scrolls into view. Pass rootRef for a scrollable container other
 * than the viewport (e.g. a horizontal carousel).
 */
export function useInfiniteScrollTrigger({ onIntersect, enabled = true, rootRef = null }) {
  const sentinelRef = useRef(null)

  useEffect(() => {
    if (!enabled) return
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onIntersect()
      },
      { root: rootRef?.current ?? null, rootMargin: '200px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [onIntersect, enabled, rootRef])

  return sentinelRef
}
