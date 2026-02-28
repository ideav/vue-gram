import { ref, watch } from 'vue'

const isDarkTheme = ref(localStorage.getItem('darkTheme') === 'true')

// Apply initial state
if (isDarkTheme.value) {
  document.documentElement.classList.add('app-dark')
}

function toggleDarkMode() {
  const newValue = !isDarkTheme.value

  function applyTheme() {
    isDarkTheme.value = newValue
    if (newValue) {
      document.documentElement.classList.add('app-dark')
    } else {
      document.documentElement.classList.remove('app-dark')
    }
    localStorage.setItem('darkTheme', String(newValue))
  }

  if (document.startViewTransition) {
    document.startViewTransition(applyTheme)
  } else {
    applyTheme()
  }
}

export function useTheme() {
  return { isDarkTheme, toggleDarkMode }
}
