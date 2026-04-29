import { describe, it, expect } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('writes the header row first', () => {
    const csv = toCsv([], [{ header: 'Name', value: () => '' }])
    expect(csv).toBe('Name\r\n')
  })

  it('joins cells with commas and rows with CRLF', () => {
    const rows = [{ a: 1, b: 'x' }, { a: 2, b: 'y' }]
    const csv = toCsv(rows, [
      { header: 'A', value: (r) => r.a },
      { header: 'B', value: (r) => r.b },
    ])
    expect(csv).toBe('A,B\r\n1,x\r\n2,y\r\n')
  })

  it('quotes cells that contain delimiters or newlines', () => {
    const csv = toCsv(
      [{ a: 'hello, world' }, { a: 'line\nbreak' }, { a: 'has"quote' }],
      [{ header: 'A', value: (r) => r.a }],
    )
    expect(csv).toBe('A\r\n"hello, world"\r\n"line\nbreak"\r\n"has""quote"\r\n')
  })

  it('handles null / undefined as empty cells', () => {
    const csv = toCsv(
      [{ a: null, b: undefined, c: '' }],
      [
        { header: 'A', value: (r) => r.a },
        { header: 'B', value: (r) => r.b },
        { header: 'C', value: (r) => r.c },
      ],
    )
    expect(csv).toBe('A,B,C\r\n,,\r\n')
  })

  it('serialises Date as ISO and booleans as true/false', () => {
    const csv = toCsv(
      [{ d: new Date('2026-04-29T00:00:00Z'), b: true }],
      [
        { header: 'D', value: (r) => r.d },
        { header: 'B', value: (r) => r.b },
      ],
    )
    expect(csv).toBe('D,B\r\n2026-04-29T00:00:00.000Z,true\r\n')
  })

  it('quotes a header that contains a comma', () => {
    const csv = toCsv([], [{ header: 'Last, First', value: () => '' }])
    expect(csv).toBe('"Last, First"\r\n')
  })
})
