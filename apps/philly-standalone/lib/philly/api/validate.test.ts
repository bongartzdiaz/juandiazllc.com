import { describe, it, expect } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { parseBody, parseQuery } from './validate'

/* BE-05 — pins the shared request-validation contract that all 81 swept
 * routes depend on. The 400 shape (fieldErrors map) is load-bearing for the
 * CSV/XLSX import flows, which surface per-field errors to the user. */

function req(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/x', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const schema = z.object({
  email: z.string().email(),
  age: z.coerce.number().int().min(0),
})

describe('parseBody', () => {
  it('returns typed data on a valid body', async () => {
    const out = await parseBody(req({ email: 'a@b.com', age: '30' }), schema)
    expect(out).not.toBeInstanceOf(NextResponse)
    expect(out).toEqual({ email: 'a@b.com', age: 30 })
  })

  it('returns a 400 NextResponse with a fieldErrors map on schema miss', async () => {
    const out = await parseBody(req({ email: 'nope', age: -1 }), schema)
    expect(out).toBeInstanceOf(NextResponse)
    const res = out as NextResponse
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Validation failed')
    expect(Object.keys(json.fieldErrors)).toEqual(expect.arrayContaining(['email', 'age']))
  })

  it('returns 400 "Invalid JSON" when the body is not parseable', async () => {
    const bad = new NextRequest('http://localhost/api/x', {
      method: 'POST',
      body: '{ not json',
      headers: { 'content-type': 'application/json' },
    })
    const out = await parseBody(bad, schema)
    expect(out).toBeInstanceOf(NextResponse)
    const json = await (out as NextResponse).json()
    expect(json.error).toBe('Invalid JSON')
  })
})

describe('parseQuery', () => {
  const qschema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    status: z.enum(['open', 'closed']).optional(),
    tag: z.array(z.string()).optional(),
  })

  it('coerces single params and applies defaults', () => {
    const sp = new URLSearchParams('status=open')
    const out = parseQuery(sp, qschema)
    expect(out).toEqual({ page: 1, status: 'open' })
  })

  it('collapses repeated keys into an array', () => {
    const sp = new URLSearchParams('tag=a&tag=b&page=2')
    const out = parseQuery(sp, qschema)
    expect(out).toEqual({ page: 2, tag: ['a', 'b'] })
  })

  it('returns 400 on an invalid enum value', () => {
    const sp = new URLSearchParams('status=banana')
    const out = parseQuery(sp, qschema)
    expect(out).toBeInstanceOf(NextResponse)
    expect((out as NextResponse).status).toBe(400)
  })
})
