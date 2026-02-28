import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import 'primeicons/primeicons.css'
import './assets/css/theme.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())

app.use(PrimeVue, {
  ripple: true
})

app.use(ToastService)
app.use(ConfirmationService)
app.use(router)

app.mount('#app')
