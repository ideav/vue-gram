import { beforeEach, describe, expect, it, vi } from 'vitest'

async function loadThemeComposable() {
  vi.resetModules()
  return import('../useTheme.js')
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('app-dark')
    document.documentElement.removeAttribute('data-theme')
  })

  it('restores the legacy theme storage key on import', async () => {
    localStorage.setItem('theme', 'dark')

    const { useTheme } = await loadThemeComposable()
    const { isDarkTheme, theme } = useTheme()

    expect(theme.value).toBe('dark')
    expect(isDarkTheme.value).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('app-dark')).toBe(true)
  })

  it('keeps the old darkTheme key in sync for existing Vue callers', async () => {
    const { useTheme } = await loadThemeComposable()
    const { isDarkTheme, theme, toggleDarkMode } = useTheme()

    toggleDarkMode()

    expect(theme.value).toBe('dark')
    expect(isDarkTheme.value).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(localStorage.getItem('darkTheme')).toBe('true')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
