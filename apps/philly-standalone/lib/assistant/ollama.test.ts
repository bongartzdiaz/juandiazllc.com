import { describe, it, expect } from 'vitest'
import { cosineSimilarity } from './ollama'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
  })

  it('returns -1 for opposite-direction vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 6)
  })

  it('returns 0 for zero-length input', () => {
    expect(cosineSimilarity([], [])).toBe(0)
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0)
  })

  it('returns 0 for length-mismatched vectors', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0)
  })

  it('is order-invariant', () => {
    expect(cosineSimilarity([1, 2, 3], [4, 5, 6])).toBeCloseTo(
      cosineSimilarity([4, 5, 6], [1, 2, 3]),
      6,
    )
  })
})
