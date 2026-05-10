import { describe, expect, it } from 'vitest'

import {
  getSmartQueryLimit,
  normalizeSmartQueryChatResponse,
  normalizeSmartQuerySuggestions,
  serializeSmartQueryFilters,
  serializeSmartQueryFilterValue
} from '../smartQuery'

describe('smartQuery utilities', () => {
  it('reads the legacy SmartQ limit requisite with a fallback', () => {
    expect(getSmartQueryLimit({ reqs: { 134: { value: '50' } } })).toBe(50)
    expect(getSmartQueryLimit({ reqs: { 134: { value: 'bad' } } })).toBe(20)
  })

  it('serializes text filters with legacy SmartQ wildcard wrapping', () => {
    expect(serializeSmartQueryFilterValue('Acme Corp', { format: 'SHORT' })).toBe('%Acme%Corp%')
    expect(serializeSmartQueryFilterValue('%Acme%', { format: 'SHORT' })).toBe('%Acme%')
    expect(serializeSmartQueryFilterValue('@my_42', { format: 'SHORT' })).toBe('@my_42')
    expect(serializeSmartQueryFilterValue('100', { format: 'NUMBER' })).toBe('100')
  })

  it('serializes viewer filter objects to report params', () => {
    const params = serializeSmartQueryFilters({
      'Customer Name': { from: 'Acme Corp', to: '' },
      Amount: { from: '100', to: '300' }
    }, [
      { name: 'Customer Name', field: 'Customer Name', format: 'SHORT' },
      { name: 'Amount', field: 'Amount', format: 'NUMBER' }
    ])

    expect(params).toEqual({
      FR_Customer_Name: '%Acme%Corp%',
      FR_Amount: '100',
      TO_Amount: '300'
    })
  })

  it('normalizes suggestions and AI-chat responses', () => {
    expect(normalizeSmartQuerySuggestions({ object: [{ id: 900, val: 'Продажи' }] })).toEqual([
      { id: 900, name: 'Продажи', created_at: null, updated_at: null }
    ])

    expect(normalizeSmartQueryChatResponse({ message: 'Готово' })[0]).toMatchObject({
      role: 'assistant',
      content: 'Готово'
    })
  })
})
