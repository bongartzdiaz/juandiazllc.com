import { describe, it, expect } from 'vitest'
import { parseMemoryMarkers } from './memory'

describe('parseMemoryMarkers', () => {
  it('extracts a single bareword memory marker', () => {
    const out = parseMemoryMarkers('Sure thing.\n\n[[remember key=pref.language value=nl]]')
    expect(out.visibleText).toBe('Sure thing.')
    expect(out.memories).toEqual([{ key: 'pref.language', value: 'nl' }])
  })

  it('extracts a quoted-value memory marker with spaces', () => {
    const out = parseMemoryMarkers(
      'Done. [[remember key=onboarding.stage value="invited team"]]',
    )
    expect(out.memories).toEqual([{ key: 'onboarding.stage', value: 'invited team' }])
    expect(out.visibleText).toBe('Done.')
  })

  it('extracts multiple markers', () => {
    const out = parseMemoryMarkers(
      'OK.\n[[remember key=pref.language value=de]]\n[[remember key=feature.kanban.familiar value=true]]',
    )
    expect(out.memories).toHaveLength(2)
    expect(out.memories[0].key).toBe('pref.language')
    expect(out.memories[1].key).toBe('feature.kanban.familiar')
    expect(out.visibleText).toBe('OK.')
  })

  it('returns the original text when there are no markers', () => {
    const out = parseMemoryMarkers('Just a plain answer with no memory.')
    expect(out.visibleText).toBe('Just a plain answer with no memory.')
    expect(out.memories).toEqual([])
  })

  it('drops markers whose key is too long', () => {
    const longKey = 'x'.repeat(200)
    const out = parseMemoryMarkers(`text [[remember key=${longKey} value=ok]]`)
    expect(out.memories).toEqual([])
  })

  it('drops markers whose value is too long', () => {
    const longValue = 'a'.repeat(2000)
    const out = parseMemoryMarkers(`text [[remember key=k value="${longValue}"]]`)
    expect(out.memories).toEqual([])
  })

  it('ignores malformed markers without crashing', () => {
    const out = parseMemoryMarkers('text [[remember bogus]] more text')
    expect(out.memories).toEqual([])
    expect(out.visibleText).toBe('text [[remember bogus]] more text')
  })

  it('strips markers from the middle of the response', () => {
    const out = parseMemoryMarkers(
      'Top.\n[[remember key=k value=v]]\nBottom.',
    )
    // Memory removed from the middle; surrounding text trimmed.
    expect(out.visibleText.includes('[[remember')).toBe(false)
    expect(out.visibleText.includes('Top.')).toBe(true)
    expect(out.visibleText.includes('Bottom.')).toBe(true)
    expect(out.memories[0].key).toBe('k')
  })
})
