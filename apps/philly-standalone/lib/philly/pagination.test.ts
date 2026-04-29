import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { parsePagination, paginatedResponse } from './pagination'

function req(url: string): NextRequest {
  return new NextRequest(url)
}

describe('parsePagination', () => {
  it('defaults to page=1 limit=50 when no params', () => {
    expect(parsePagination(req('http://x/api/foo'))).toEqual({ page: 1, limit: 50, skip: 0 })
  })

  it('parses explicit page + limit', () => {
    expect(parsePagination(req('http://x/api/foo?page=3&limit=10'))).toEqual({ page: 3, limit: 10, skip: 20 })
  })

  it('clamps limit to MAX_LIMIT (200)', () => {
    expect(parsePagination(req('http://x/?limit=999'))).toMatchObject({ limit: 200 })
  })

  it('coerces invalid page to 1', () => {
    expect(parsePagination(req('http://x/?page=foo'))).toMatchObject({ page: 1, skip: 0 })
    expect(parsePagination(req('http://x/?page=-5'))).toMatchObject({ page: 1, skip: 0 })
    expect(parsePagination(req('http://x/?page=0'))).toMatchObject({ page: 1, skip: 0 })
  })

  it('coerces invalid limit to default (50)', () => {
    expect(parsePagination(req('http://x/?limit=foo'))).toMatchObject({ limit: 50 })
  })

  it('handles limit=0 by falling back to the default (50)', () => {
    // 0 is falsy so the `|| DEFAULT_LIMIT` branch fires.
    expect(parsePagination(req('http://x/?limit=0'))).toMatchObject({ limit: 50 })
  })

  it('clamps a negative limit to >= 1', () => {
    // -3 is truthy so the fallback skips; Math.max(1, -3) snaps to 1.
    expect(parsePagination(req('http://x/?limit=-3'))).toMatchObject({ limit: 1 })
  })

  it('computes skip from page*limit', () => {
    expect(parsePagination(req('http://x/?page=5&limit=20')).skip).toBe(80)
  })
})

describe('paginatedResponse', () => {
  it('returns the standard envelope', async () => {
    const res = paginatedResponse(['a', 'b'], 25, { page: 2, limit: 10, skip: 10 })
    const body = await res.json()
    expect(body).toEqual({
      data: ['a', 'b'],
      pagination: { page: 2, limit: 10, total: 25, totalPages: 3 },
    })
  })

  it('rounds totalPages up (ceil)', async () => {
    const res = paginatedResponse([], 11, { page: 1, limit: 10, skip: 0 })
    const body = await res.json()
    expect(body.pagination.totalPages).toBe(2)
  })

  it('emits totalPages=0 when total=0', async () => {
    const res = paginatedResponse([], 0, { page: 1, limit: 10, skip: 0 })
    const body = await res.json()
    expect(body.pagination.totalPages).toBe(0)
  })
})
