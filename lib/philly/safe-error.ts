/* Safe error responses for API routes.

   Rules:
   - Never return raw `err.message` to the client (leaks Prisma internals, file paths,
     constraint names, env details, etc.)
   - Always log the full error server-side so it's debuggable.
   - Return a generic message + a correlation id so a support case can find the log.

   Usage:
     try { ... } catch (e) { return serverError(e, 'Failed to create contact') }
*/

import { NextResponse } from 'next/server'
import crypto from 'crypto'

export function serverError(err: unknown, publicMessage = 'Internal server error', status = 500) {
  const id = crypto.randomBytes(6).toString('hex')
  // Server-side full detail (goes to platform logs, not to client).
  console.error(`[server-error ${id}]`, err)
  return NextResponse.json(
    { error: publicMessage, errorId: id },
    { status },
  )
}

/** For expected validation failures we CAN safely surface the message. */
export function clientError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
