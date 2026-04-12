/* Edge middleware — server-side route protection.
   Currently BYPASSED so the dashboard works without login.
   To re-enable auth, uncomment the withAuth version below
   and remove the pass-through. */

import { NextResponse } from 'next/server'

// Pass-through — no auth required for now
export default function middleware() {
  return NextResponse.next()
}

/* ── Re-enable this block to enforce login ──────────────
import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  },
)
───────────────────────────────────────────────────────── */

export const config = {
  matcher: [
    '/((?!login|api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
