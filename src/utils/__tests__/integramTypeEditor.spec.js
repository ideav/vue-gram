import { describe, expect, it } from 'vitest'
import editTypesFixture from '@/services/__fixtures__/integramApi/edit-types.json'
import {
  getTypeIdFromName,
  normalizeTypeEditorData
} from '../integramTypeEditor'

describe('integramTypeEditor utilities', () => {
  it('normalizes the legacy edit_types column matrix into a metadata tree', () => {
    const types = normalizeTypeEditorData(editTypesFixture)

    expect(types).toHaveLength(3)
    expect(types[0]).toEqual(expect.objectContaining({
      id: '200',
      name: 'Clients',
      baseType: '3',
      unique: true
    }))
    expect(types[0].requisites[0]).toEqual(expect.objectContaining({
      id: '601',
      name: 'Name',
      type: 'short',
      nullable: false,
      isReference: false
    }))
    expect(types[1].requisites[0]).toEqual(expect.objectContaining({
      id: '701',
      name: 'Customer',
      type: 'reference',
      alias: 'Customer',
      defaultValue: '',
      multi: true,
      isReference: true,
      refTypeId: '200',
      refTypeName: 'Clients'
    }))
  })

  it('uses legacy numeric type identifiers for DDL save payloads', () => {
    expect(getTypeIdFromName('SHORT')).toBe(3)
    expect(getTypeIdFromName('DATE')).toBe(9)
    expect(getTypeIdFromName('200')).toBe('200')
  })
})
