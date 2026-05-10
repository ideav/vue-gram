import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TABLE_FOLDERS,
  detectTableBaseType,
  extractTableSettings,
  hasStructureWriteGrant,
  normalizeFolderConfig,
  normalizeTableList,
  tableMatchesQuery,
} from '../tableWorkspace'
import {
  adminPermissionContext,
  missingPermissionContext,
  readOnlyPermissionContext,
  writePermissionContext
} from '../__fixtures__/permissions'

describe('tableWorkspace helpers', () => {
  it('normalizes terms payloads from the legacy tables endpoint', () => {
    expect(
      normalizeTableList([
        { id: 42, type: 3, name: 'Role&nbsp;' },
        { id: 18, type: 9, name: 'User' },
        { id: 0, name: '' },
      ])
    ).toEqual([
      { id: '42', type: 3, name: 'Role' },
      { id: '18', type: 9, name: 'User' },
    ])
  })

  it('normalizes terms after the API client has wrapped the response', () => {
    expect(
      normalizeTableList({
        terms: [
          { id: 42, type: 3, name: 'Role&nbsp;' },
          { id: 18, type: 9, name: 'User' },
        ],
        termById: {
          42: 'Role',
          18: 'User',
        },
      })
    ).toEqual([
      { id: '42', type: 3, name: 'Role' },
      { id: '18', type: 9, name: 'User' },
    ])
  })

  it('normalizes dictionary-shaped table payloads as an API fallback', () => {
    expect(normalizeTableList({ 18: 'User', 42: 'Role' })).toEqual([
      { id: '42', type: 3, name: 'Role' },
      { id: '18', type: 3, name: 'User' },
    ])

    expect(normalizeTableList({ 18: 'User', 42: 'Role', termById: {}, baseTypes: [] })).toEqual([
      { id: '42', type: 3, name: 'Role' },
      { id: '18', type: 3, name: 'User' },
    ])
  })

  it('normalizes client terms payloads returned by getTerms', () => {
    expect(normalizeTableList({
      termById: {
        18: 'User&nbsp;',
        42: { val: 'Role', type: 8 },
      },
    })).toEqual([
      { id: '42', type: 8, name: 'Role' },
      { id: '18', type: 3, name: 'User' },
    ])
  })

  it('normalizes the API client terms wrapper without losing table metadata', () => {
    expect(normalizeTableList({
      terms: [
        { id: 42, type: 3, name: 'Role' },
        { id: 422, type: 9, name: 'Payment Date' },
      ],
      termById: {
        42: 'Role',
        422: 'Payment Date',
      },
    })).toEqual([
      { id: '422', type: 9, name: 'Payment Date' },
      { id: '42', type: 3, name: 'Role' },
    ])

    expect(normalizeTableList({ termById: { 18: 'User', 42: 'Role' } })).toEqual([
      { id: '42', type: 3, name: 'Role' },
      { id: '18', type: 3, name: 'User' },
    ])
  })

  it('falls back to the legacy default folders when settings are missing or invalid', () => {
    expect(normalizeFolderConfig(null)).toEqual(DEFAULT_TABLE_FOLDERS)
    expect(normalizeFolderConfig('not-json')).toEqual(DEFAULT_TABLE_FOLDERS)
  })

  it('extracts saved UI folder settings from Settings table rows', () => {
    const settings = {
      Избранное: { open: true, tabs: [18, '42'] },
      Служебные: { open: false, tabs: ['269'] },
    }

    expect(
      extractTableSettings([
        {
          id: 777,
          reqs: {
            273: { val: JSON.stringify(settings) },
          },
        },
      ])
    ).toEqual({
      settingsId: '777',
      config: {
        Избранное: { open: true, tabs: ['18', '42'] },
        Служебные: { open: false, tabs: ['269'] },
      },
    })
  })

  it('matches the legacy structure WRITE grant and hides controls otherwise', () => {
    expect(hasStructureWriteGrant({ 1: 'WRITE' })).toBe(true)
    expect(hasStructureWriteGrant({ 1: 'READ' })).toBe(false)
    expect(hasStructureWriteGrant(readOnlyPermissionContext)).toBe(false)
    expect(hasStructureWriteGrant(writePermissionContext)).toBe(true)
    expect(hasStructureWriteGrant(adminPermissionContext)).toBe(true)
    expect(hasStructureWriteGrant(missingPermissionContext)).toBe(false)
    expect(hasStructureWriteGrant(null)).toBe(false)
  })

  it('detects table type suggestions for familiar Russian names', () => {
    expect(detectTableBaseType('Дата оплаты')).toEqual({ type: 9, ref: false })
    expect(detectTableBaseType('Дата и время создания')).toEqual({ type: 4, ref: false })
    expect(detectTableBaseType('Сумма')).toEqual({ type: 14, ref: false })
    expect(detectTableBaseType('Город')).toEqual({ type: 3, ref: true })
    expect(detectTableBaseType('Активен')).toBeNull()
  })

  it('uses the same case-insensitive contains search as the legacy workspace', () => {
    expect(tableMatchesQuery({ name: 'Payment Date' }, 'pay')).toBe(true)
    expect(tableMatchesQuery({ name: 'Payment Date' }, 'role')).toBe(false)
  })
})
