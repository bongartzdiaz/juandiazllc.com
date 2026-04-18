'use client'

/**
 * useDebouncedValue — returns the input value only after `delayMs` of stillness.
 * Use for search inputs so we don't refetch on every keystroke.
 *
 *   const debounced = useDebouncedValue(query, 300)
 *   useEffect(() => { fetch(`/philly/api/x?q=${debounced}`) }, [debounced])
 */
import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])

  return debounced
}
