/* Edge middleware — server-side route protection.
   Bounces unauthenticated requests to /login with a callbackUrl.
   Runs BEFORE the React tree, so it's the first line of defense
   (the client-side AuthShell is the second). */

import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

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

/* Match all page routes except:
   - /login (the sign-in page itself)
   - /api/* (API routes do their own auth via requireScope() and must
              return 401 JSON, not redirect to HTML)
   - /_next/* (build assets)
   - public files (favicons, images)

   API routes are intentionally excluded so unauthenticated calls receive
   a proper { error: 'Unauthorized' } 401 instead of an HTML redirect.
*/
export const config = {
  matcher: [
    '/((?!login|api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
