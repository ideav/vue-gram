export const DATA_TABLE_SETTINGS_STORAGE_KEY = 'datatable_settings'
export const LEGACY_ROWS_PER_PAGE_COOKIE = 'default_limit'

export const DEFAULT_DATA_TABLE_SETTINGS = Object.freeze({
  autoLoadAll: true,
  autoLoadDirs: true,
  maxAutoLoadSize: 20000,
  backgroundChunkSize: 1000,
  backgroundDelay: 150,
  dateStyle: 'relative'
})

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined'
}

function canUseDocument() {
  return typeof document !== 'undefined'
}

function cloneDefaultSettings() {
  return { ...DEFAULT_DATA_TABLE_SETTINGS }
}

function normalizeSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return cloneDefaultSettings()
  }

  return {
    ...DEFAULT_DATA_TABLE_SETTINGS,
    ...value
  }
}

function getCookie(name) {
  if (!canUseDocument()) return null

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name, value, maxAge = 31622400) {
  if (!canUseDocument()) return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`
}

export function loadDataTableSettings() {
  if (!canUseLocalStorage()) return cloneDefaultSettings()

  try {
    const stored = localStorage.getItem(DATA_TABLE_SETTINGS_STORAGE_KEY)
    if (stored) {
      return normalizeSettings(JSON.parse(stored))
    }

    const defaults = cloneDefaultSettings()
    localStorage.setItem(DATA_TABLE_SETTINGS_STORAGE_KEY, JSON.stringify(defaults))
    return defaults
  } catch (error) {
    console.error('[dataTableSettings] Failed to load settings:', error)
    const defaults = cloneDefaultSettings()
    try {
      localStorage.setItem(DATA_TABLE_SETTINGS_STORAGE_KEY, JSON.stringify(defaults))
    } catch {
      // Ignore storage failures after reporting the original read/parse error.
    }
    return defaults
  }
}

export function saveDataTableSettings(settings) {
  if (!canUseLocalStorage()) return false

  try {
    localStorage.setItem(DATA_TABLE_SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSettings(settings)))
    return true
  } catch (error) {
    console.error('[dataTableSettings] Failed to save settings:', error)
    return false
  }
}

export function normalizeRowsPerPagePreference(value, fallback = 50) {
  const normalizedFallback = Number.parseInt(fallback, 10)
  const safeFallback = Number.isFinite(normalizedFallback) ? normalizedFallback : 50
  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed)) return safeFallback
  return Math.min(1000, Math.max(5, parsed))
}

export function loadRowsPerPagePreference(fallback = 50) {
  return normalizeRowsPerPagePreference(getCookie(LEGACY_ROWS_PER_PAGE_COOKIE), fallback)
}

export function saveRowsPerPagePreference(value) {
  const normalizedValue = normalizeRowsPerPagePreference(value)
  setCookie(LEGACY_ROWS_PER_PAGE_COOKIE, String(normalizedValue))
  return normalizedValue
}
