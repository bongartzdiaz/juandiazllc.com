import type { KeyboardEvent } from 'react'

/* A11Y-10 — make a non-semantic clickable element (a `<div onClick>` row or
 * card) keyboard-operable, the way a real button/link already is.
 *
 * Spread the result onto the element; it adds role="button", tabIndex=0, the
 * click handler, and an Enter/Space key handler that calls the same action:
 *
 *     <div {...keyboardClickable(() => router.push(`/deals/${id}`))} ... >
 *
 * Use this ONLY when the element can't be a real <button>/<a> (e.g. it wraps
 * other interactive controls). Prefer a <Link>/<button> when possible.
 */
export function keyboardClickable(onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      // Enter and Space are the native button activation keys. Space would
      // otherwise scroll the page, so preventDefault on it.
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onActivate()
      }
    },
  }
}
