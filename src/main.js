import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import StyleClass from 'primevue/styleclass'
import 'primeicons/primeicons.css'
import './assets/css/theme.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())

app.use(PrimeVue, {
  ripple: true,
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.app-dark'
    }
  }
})

app.directive('tooltip', Tooltip)
app.directive('styleclass', StyleClass)

app.use(ToastService)
app.use(ConfirmationService)
app.use(router)

app.mount('#app')
