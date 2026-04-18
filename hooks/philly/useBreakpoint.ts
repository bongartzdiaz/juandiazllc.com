'use client'

/* Reactive breakpoint detection. Tailwind-ish thresholds. */

import { useEffect, useState } from 'react'

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
}

function resolve(width: number): Breakpoint {
  if (width >= BREAKPOINTS.xl) return 'xl'
  if (width >= BREAKPOINTS.lg) return 'lg'
  if (width >= BREAKPOINTS.md) return 'md'
  if (width >= BREAKPOINTS.sm) return 'sm'
  return 'xs'
}

export function useBreakpoint() {
  const [bp, setBp] = useState<Breakpoint>(() =>
    typeof window === 'undefined' ? 'lg' : resolve(window.innerWidth)
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setBp(resolve(window.innerWidth)))
    }
    window.addEventListener('resize', onResize, { passive: true })
    onResize()
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return {
    bp,
    isMobile: bp === 'xs' || bp === 'sm',
    isTablet: bp === 'md',
    isDesktop: bp === 'lg' || bp === 'xl',
    /** True when viewport is at least the given breakpoint. */
    atLeast(target: Breakpoint) {
      return BREAKPOINTS[bp] >= BREAKPOINTS[target]
    },
  }
}
