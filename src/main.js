import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import StyleClass from 'primevue/styleclass'
import 'primeicons/primeicons.css'
import './assets/css/theme.css'
import App from './App.vue'
import router from './router'

async function initApp() {
  const app = createApp(App)

  app.use(createPinia())

  const primeVueConfig = { ripple: true }

  // Try to load Aura theme (PrimeVue 4 styled mode)
  try {
    const { default: Aura } = await import('@primevue/themes/aura')
    primeVueConfig.theme = {
      preset: Aura,
      options: { darkModeSelector: '.app-dark' }
    }
  } catch {
    // Fallback: unstyled mode with CSS variables from theme.css
  }

  app.use(PrimeVue, primeVueConfig)

  app.directive('tooltip', Tooltip)
  app.directive('styleclass', StyleClass)

  app.use(ToastService)
  app.use(ConfirmationService)
  app.use(router)

  app.mount('#app')
}

initApp()
