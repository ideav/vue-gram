import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import 'primeicons/primeicons.css'
import './assets/css/theme.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(PrimeVue, {
  ripple: true
})

app.use(router)

app.mount('#app')
