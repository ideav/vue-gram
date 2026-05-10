import { describe, expect, it } from 'vitest'
import { parseIntegramDateValue } from '../integramDateValues'

describe('parseIntegramDateValue', () => {
  it('parses legacy ISO-like date and datetime strings for Calendar components', () => {
    const date = parseIntegramDateValue('2026-05-09')
    const dateTime = parseIntegramDateValue('2026-05-09 12:30:15')

    expect(date).toBeInstanceOf(Date)
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(4)
    expect(date.getDate()).toBe(9)
    expect(date.getHours()).toBe(0)

    expect(dateTime).toBeInstanceOf(Date)
    expect(dateTime.getHours()).toBe(12)
    expect(dateTime.getMinutes()).toBe(30)
    expect(dateTime.getSeconds()).toBe(15)
  })

  it('parses Russian date strings and preserves special/unparseable values', () => {
    const ruDate = parseIntegramDateValue('09.05.2026 07:08')

    expect(ruDate).toBeInstanceOf(Date)
    expect(ruDate.getFullYear()).toBe(2026)
    expect(ruDate.getMonth()).toBe(4)
    expect(ruDate.getDate()).toBe(9)
    expect(ruDate.getHours()).toBe(7)
    expect(ruDate.getMinutes()).toBe(8)

    expect(parseIntegramDateValue('[TODAY]')).toBe('[TODAY]')
    expect(parseIntegramDateValue('2026-99-99')).toBe('2026-99-99')
    expect(parseIntegramDateValue('not a date')).toBe('not a date')
  })
})
