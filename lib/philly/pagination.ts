/* ---------------------------------------------------------------
   Pagination utilities for API routes
   - Parses page/limit from query params
   - Returns a standard paginated JSON envelope
   --------------------------------------------------------------- */

import { NextRequest, NextResponse } from 'next/server'

export interface PaginationParams {
  page: number
  limit: number
  skip: number
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

/**
 * Extract pagination params from the request URL.
 * Defaults: page=1, limit=50. Clamps limit to MAX_LIMIT.
 */
export function parsePagination(req: NextRequest): PaginationParams {
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT))
  return { page, limit, skip: (page - 1) * limit }
}

/**
 * Build a standard paginated response envelope.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): NextResponse {
  return NextResponse.json({
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  })
}
