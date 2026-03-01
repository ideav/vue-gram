import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import StyleClass from 'primevue/styleclass'
import 'primeflex/primeflex.css'
import '@flaticon/flaticon-uicons/css/regular/rounded.css'
import '@flaticon/flaticon-uicons/css/solid/rounded.css'
import './assets/css/theme.css'
import App from './App.vue'
import router from './router'

// PrimeVue components - global registration
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import Calendar from 'primevue/calendar'
import Card from 'primevue/card'
import Checkbox from 'primevue/checkbox'
import Chip from 'primevue/chip'
import Column from 'primevue/column'
import ConfirmDialog from 'primevue/confirmdialog'
import ContextMenu from 'primevue/contextmenu'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import Divider from 'primevue/divider'
// Dropdown removed — use Select (PrimeVue v4)
import FileUpload from 'primevue/fileupload'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Menu from 'primevue/menu'
import Menubar from 'primevue/menubar'
import Message from 'primevue/message'
import Paginator from 'primevue/paginator'
import Panel from 'primevue/panel'
import Password from 'primevue/password'
import ProgressBar from 'primevue/progressbar'
import ProgressSpinner from 'primevue/progressspinner'
import Popover from 'primevue/popover'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Toast from 'primevue/toast'
import ToggleButton from 'primevue/togglebutton'
import Editor from 'primevue/editor'

async function initApp() {
  const app = createApp(App)

  app.use(createPinia())

  const primeVueConfig = { ripple: true }

  try {
    const { default: Aura } = await import('@primevue/themes/aura')
    primeVueConfig.theme = {
      preset: Aura,
      options: { darkModeSelector: '.app-dark' }
    }
  } catch {
    // Fallback: CSS variables from theme.css
  }

  app.use(PrimeVue, primeVueConfig)

  app.directive('tooltip', Tooltip)
  app.directive('styleclass', StyleClass)

  app.use(ToastService)
  app.use(ConfirmationService)
  app.use(router)

  // Register PrimeVue components globally
  app.component('Badge', Badge)
  app.component('Button', Button)
  app.component('Calendar', Calendar)
  app.component('Card', Card)
  app.component('Checkbox', Checkbox)
  app.component('Chip', Chip)
  app.component('Column', Column)
  app.component('ConfirmDialog', ConfirmDialog)
  app.component('ContextMenu', ContextMenu)
  app.component('DataTable', DataTable)
  app.component('Dialog', Dialog)
  app.component('Divider', Divider)
  app.component('Dropdown', Select) // backward compat alias
  app.component('FileUpload', FileUpload)
  app.component('IconField', IconField)
  app.component('InputIcon', InputIcon)
  app.component('InputNumber', InputNumber)
  app.component('InputText', InputText)
  app.component('Menu', Menu)
  app.component('Menubar', Menubar)
  app.component('Message', Message)
  app.component('Paginator', Paginator)
  app.component('Panel', Panel)
  app.component('Password', Password)
  app.component('ProgressBar', ProgressBar)
  app.component('ProgressSpinner', ProgressSpinner)
  app.component('Popover', Popover)
  app.component('Select', Select)
  app.component('SelectButton', SelectButton)
  app.component('Tag', Tag)
  app.component('Textarea', Textarea)
  app.component('Tabs', Tabs)
  app.component('TabList', TabList)
  app.component('Tab', Tab)
  app.component('TabPanels', TabPanels)
  app.component('TabPanel', TabPanel)
  app.component('Toast', Toast)
  app.component('ToggleButton', ToggleButton)
  app.component('Editor', Editor)

  app.mount('#app')
}

initApp()
