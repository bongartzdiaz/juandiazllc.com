/* eslint-disable @typescript-eslint/no-unused-vars */
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role?: string
      organizationId?: string
    } & DefaultSession['user']
  }

  interface User {
    role?: string
    organizationId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    organizationId?: string
  }
}
