import { onBeforeUnmount, ref, watch } from 'vue'

const ONE_YEAR_DAYS = 365
const FONT_COOKIE = 'integram-table-font-settings'
const FONT_SIZE_MAP = {
  smaller: '.7rem',
  normal: '.82rem',
  larger: '.95rem'
}

export const PAGE_FONT_OPTIONS = [
  { value: 'smaller', label: 'А', title: 'Шрифт меньше', fontSize: '11px' },
  { value: 'normal', label: 'А', title: 'Шрифт обычный', fontSize: '14px' },
  { value: 'larger', label: 'А', title: 'Шрифт больше', fontSize: '17px' }
]

export const BRAND_BACKGROUND_OPTIONS = [
  { value: '0', label: '-' },
  { value: '0.1', label: '10%' },
  { value: '0.2', label: '20%' },
  { value: '0.3', label: '30%' },
  { value: '0.4', label: '40%' },
  { value: '0.5', label: '50%' },
  { value: '0.6', label: '60%' },
  { value: '0.7', label: '70%' },
  { value: '0.8', label: '80%' },
  { value: '0.9', label: '90%' }
]

function canUseDocument() {
  return typeof document !== 'undefined'
}

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined'
}

function escapeCookieName(name) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getCookie(name) {
  if (!canUseDocument()) return null

  const match = document.cookie.match(new RegExp(`(?:^|; )${escapeCookieName(name)}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function setCookie(name, value, days = ONE_YEAR_DAYS) {
  if (!canUseDocument()) return

  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`
}

export function deleteCookie(name) {
  if (!canUseDocument()) return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
}

export function loadPageFontSize() {
  const raw = getCookie(FONT_COOKIE)
  if (!raw) return 'normal'

  try {
    const settings = JSON.parse(raw)
    return FONT_SIZE_MAP[settings.pageFontSize] ? settings.pageFontSize : 'normal'
  } catch {
    return 'normal'
  }
}

export function applyPageFontSize(size) {
  if (!canUseDocument()) return

  const normalizedSize = FONT_SIZE_MAP[size] ? size : 'normal'
  document.documentElement.style.fontSize = FONT_SIZE_MAP[normalizedSize]
}

export function savePageFontSize(size) {
  const normalizedSize = FONT_SIZE_MAP[size] ? size : 'normal'
  setCookie(FONT_COOKIE, JSON.stringify({ pageFontSize: normalizedSize }))
  applyPageFontSize(normalizedSize)
}

export function getBrandBackgroundCookieName(database) {
  return `brand-bg-${database || 'default'}`
}

export function normalizeBrandBackground(value) {
  const numericValue = Number.parseFloat(value)
  return numericValue > 0 && numericValue <= 0.9 ? String(value) : '0'
}

export function loadBrandBackground(database) {
  return normalizeBrandBackground(getCookie(getBrandBackgroundCookieName(database)) || '0')
}

export function applyBrandBackground(value) {
  if (!canUseDocument()) return

  const normalizedValue = normalizeBrandBackground(value)
  if (normalizedValue !== '0') {
    document.documentElement.style.setProperty('--brand-bg-opacity', normalizedValue)
    document.body.classList.add('brand-bg-on')
  } else {
    document.documentElement.style.removeProperty('--brand-bg-opacity')
    document.body.classList.remove('brand-bg-on')
  }
}

export function saveBrandBackground(database, value) {
  const normalizedValue = normalizeBrandBackground(value)
  setCookie(getBrandBackgroundCookieName(database), normalizedValue)
  applyBrandBackground(normalizedValue)
}

export function getSidebarCollapsedStorageKey(database) {
  return `appSidebarCollapsed_${database || 'default'}`
}

export function getSidebarWidthCookieName(database) {
  return `sidebarWidth_${database || 'default'}`
}

export function loadSidebarCollapsed(database) {
  if (!canUseLocalStorage()) return false
  return localStorage.getItem(getSidebarCollapsedStorageKey(database)) === 'true'
}

export function saveSidebarCollapsed(database, collapsed) {
  if (!canUseLocalStorage()) return
  localStorage.setItem(getSidebarCollapsedStorageKey(database), collapsed ? 'true' : 'false')
}

export function loadSidebarWidth(database) {
  const rawWidth = Number.parseInt(getCookie(getSidebarWidthCookieName(database)), 10)
  return Number.isFinite(rawWidth) && rawWidth >= 150 && rawWidth <= 400 ? rawWidth : null
}

export function saveSidebarWidth(database, width) {
  const normalizedWidth = Math.min(400, Math.max(150, Number.parseInt(width, 10) || 240))
  setCookie(getSidebarWidthCookieName(database), String(normalizedWidth))
}

export function deleteAuthCookies(database) {
  if (!database) return
  deleteCookie(`idb_${database}`)
  deleteCookie(database)
}

export function getLogoutStartUrl(database, username) {
  const params = new URLSearchParams()
  params.set('db', database || '')
  if (username) params.set('u', username)
  return `/start.html?${params.toString()}`
}

export function useIntegramShellSettings(databaseRef) {
  const pageFontSize = ref(loadPageFontSize())
  const brandBackground = ref('0')
  const sidebarCollapsed = ref(false)
  const sidebarWidth = ref(null)
  const cookieConsentVisible = ref(
    canUseLocalStorage() ? !localStorage.getItem('cookie_consent') : false
  )

  applyPageFontSize(pageFontSize.value)

  watch(databaseRef, (database) => {
    brandBackground.value = loadBrandBackground(database)
    sidebarCollapsed.value = loadSidebarCollapsed(database)
    sidebarWidth.value = loadSidebarWidth(database)
    applyBrandBackground(brandBackground.value)
  }, { immediate: true })

  function setPageFontSizePreference(size) {
    pageFontSize.value = FONT_SIZE_MAP[size] ? size : 'normal'
    savePageFontSize(pageFontSize.value)
  }

  function setBrandBackgroundPreference(value) {
    brandBackground.value = normalizeBrandBackground(value)
    saveBrandBackground(databaseRef.value, brandBackground.value)
  }

  function setSidebarCollapsedPreference(collapsed) {
    sidebarCollapsed.value = Boolean(collapsed)
    saveSidebarCollapsed(databaseRef.value, sidebarCollapsed.value)
  }

  function setSidebarWidthPreference(width) {
    sidebarWidth.value = Math.min(400, Math.max(150, Number.parseInt(width, 10) || 240))
    saveSidebarWidth(databaseRef.value, sidebarWidth.value)
  }

  function acceptCookieConsent() {
    if (canUseLocalStorage()) {
      localStorage.setItem('cookie_consent', '1')
    }
    cookieConsentVisible.value = false
  }

  onBeforeUnmount(() => {
    applyBrandBackground('0')
  })

  return {
    pageFontSize,
    brandBackground,
    sidebarCollapsed,
    sidebarWidth,
    cookieConsentVisible,
    setPageFontSizePreference,
    setBrandBackgroundPreference,
    setSidebarCollapsedPreference,
    setSidebarWidthPreference,
    acceptCookieConsent
  }
}
