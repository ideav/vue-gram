import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyBrandBackground,
  applyPageFontSize,
  deleteAuthCookies,
  getLogoutStartUrl,
  loadBrandBackground,
  loadPageFontSize,
  loadSidebarCollapsed,
  loadSidebarWidth,
  saveBrandBackground,
  savePageFontSize,
  saveSidebarCollapsed,
  saveSidebarWidth
} from '../useIntegramShellSettings'

function clearCookies() {
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0]?.trim()
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
    }
  })
}

describe('useIntegramShellSettings', () => {
  beforeEach(() => {
    localStorage.clear()
    clearCookies()
    document.documentElement.style.fontSize = ''
    document.documentElement.style.removeProperty('--brand-bg-opacity')
    document.body.classList.remove('brand-bg-on')
  })

  it('reads and writes the legacy page font-size cookie', () => {
    savePageFontSize('larger')

    expect(loadPageFontSize()).toBe('larger')
    expect(document.documentElement.style.fontSize).toBe('0.95rem')

    applyPageFontSize('smaller')
    expect(document.documentElement.style.fontSize).toBe('0.7rem')
  })

  it('reads and writes the per-database brand background cookie', () => {
    saveBrandBackground('my', '0.4')

    expect(loadBrandBackground('my')).toBe('0.4')
    expect(document.body.classList.contains('brand-bg-on')).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--brand-bg-opacity')).toBe('0.4')

    applyBrandBackground('0')
    expect(document.body.classList.contains('brand-bg-on')).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--brand-bg-opacity')).toBe('')
  })

  it('builds the legacy logout URL and clears current database cookies', () => {
    document.cookie = 'idb_my=token; path=/'
    document.cookie = 'my=session; path=/'

    expect(getLogoutStartUrl('my', 'demo')).toBe('/start.html?db=my&u=demo')

    deleteAuthCookies('my')

    expect(document.cookie).not.toContain('idb_my=')
    expect(document.cookie).not.toContain('my=')
  })

  it('persists sidebar collapsed state and width using legacy keys', () => {
    saveSidebarCollapsed('my', true)
    saveSidebarWidth('my', 320)

    expect(loadSidebarCollapsed('my')).toBe(true)
    expect(loadSidebarWidth('my')).toBe(320)
    expect(localStorage.getItem('appSidebarCollapsed_my')).toBe('true')
    expect(document.cookie).toContain('sidebarWidth_my=320')
  })
})
