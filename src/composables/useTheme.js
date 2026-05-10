import { ref } from 'vue'

const LEGACY_THEME_KEY = 'theme'
const VUE_THEME_KEY = 'darkTheme'

function canUseBrowserStorage() {
  return typeof localStorage !== 'undefined'
}

function readStoredTheme() {
  if (!canUseBrowserStorage()) return 'light'

  const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY)
  if (legacyTheme === 'dark' || legacyTheme === 'light') {
    return legacyTheme
  }

  return localStorage.getItem(VUE_THEME_KEY) === 'true' ? 'dark' : 'light'
}

const theme = ref(readStoredTheme())
const isDarkTheme = ref(theme.value === 'dark')

function applyTheme(nextTheme, persist = true) {
  const normalizedTheme = nextTheme === 'dark' ? 'dark' : 'light'

  theme.value = normalizedTheme
  isDarkTheme.value = normalizedTheme === 'dark'

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', normalizedTheme)
    document.documentElement.classList.toggle('app-dark', isDarkTheme.value)
  }

  if (persist && canUseBrowserStorage()) {
    localStorage.setItem(LEGACY_THEME_KEY, normalizedTheme)
    localStorage.setItem(VUE_THEME_KEY, String(isDarkTheme.value))
  }
}

applyTheme(theme.value, false)

function setTheme(nextTheme) {
  const run = () => applyTheme(nextTheme)

  if (typeof document !== 'undefined' && document.startViewTransition) {
    document.startViewTransition(run)
  } else {
    run()
  }
}

function toggleDarkMode() {
  setTheme(isDarkTheme.value ? 'light' : 'dark')
}

export function useTheme() {
  return { theme, isDarkTheme, setTheme, toggleDarkMode }
}
