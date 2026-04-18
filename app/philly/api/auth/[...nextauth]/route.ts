import NextAuth from 'next-auth'
import type { NextRequest } from 'next/server'
import { getAuthOptions } from '@/lib/philly/auth'

// Force dynamic so Next.js never tries to evaluate auth at build time
export const dynamic = 'force-dynamic'

// Lazily build the NextAuth handler on the first real request, so the
// PrismaAdapter (and DATABASE_URL) is only required at runtime.
let cachedHandler: ReturnType<typeof NextAuth> | null = null
function handler(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  if (!cachedHandler) {
    cachedHandler = NextAuth(getAuthOptions())
  }
  return (cachedHandler as unknown as (
    req: NextRequest,
    ctx: { params: Promise<{ nextauth: string[] }> },
  ) => Response | Promise<Response>)(req, ctx)
}

export { handler as GET, handler as POST }
