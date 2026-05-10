import { beforeEach, describe, expect, it } from 'vitest'

import {
  DATA_TABLE_SETTINGS_STORAGE_KEY,
  DEFAULT_DATA_TABLE_SETTINGS,
  loadDataTableSettings,
  loadRowsPerPagePreference,
  saveDataTableSettings,
  saveRowsPerPagePreference
} from '../dataTableSettings'

function clearCookies() {
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0]?.trim()
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
    }
  })
}

describe('data table settings storage', () => {
  beforeEach(() => {
    localStorage.clear()
    clearCookies()
  })

  it('initializes the Vue datatable_settings key without changing legacy cookies', () => {
    document.cookie = 'default_limit=125; path=/'

    expect(loadDataTableSettings()).toEqual(DEFAULT_DATA_TABLE_SETTINGS)
    expect(JSON.parse(localStorage.getItem(DATA_TABLE_SETTINGS_STORAGE_KEY))).toEqual(DEFAULT_DATA_TABLE_SETTINGS)
    expect(loadRowsPerPagePreference()).toBe(125)
  })

  it('merges saved Vue settings with current defaults', () => {
    localStorage.setItem(DATA_TABLE_SETTINGS_STORAGE_KEY, JSON.stringify({
      autoLoadAll: false,
      dateStyle: 'classic'
    }))

    expect(loadDataTableSettings()).toEqual({
      ...DEFAULT_DATA_TABLE_SETTINGS,
      autoLoadAll: false,
      dateStyle: 'classic'
    })
  })

  it('writes Vue settings and the legacy default_limit cookie explicitly', () => {
    saveDataTableSettings({ ...DEFAULT_DATA_TABLE_SETTINGS, autoLoadDirs: false })
    saveRowsPerPagePreference(75)

    expect(JSON.parse(localStorage.getItem(DATA_TABLE_SETTINGS_STORAGE_KEY))).toMatchObject({
      autoLoadDirs: false
    })
    expect(document.cookie).toContain('default_limit=75')
    expect(loadRowsPerPagePreference()).toBe(75)
  })
})
