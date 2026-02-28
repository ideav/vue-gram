<template>
  <div class="integram-login-page">
    <div class="login-card">
      <!-- Header -->
      <div class="login-header">
        <div class="brand">
          <svg width="40" height="34" viewBox="0 0 40 34" fill="none" xmlns="http://www.w3.org/2000/svg" class="integram-logo">
            <g clip-path="url(#clip0_login)">
              <path d="M21.0983 12.4256L19.5194 14.1254L22.2153 17.0289L13.4346 26.3889L2.28812 22.7817V11.2779L13.4346 7.67068L15.452 9.87038L17.0454 8.19038L14.1005 5L0 9.56361V24.4959L14.1005 29.0595L25.3877 17.0289L21.0983 12.4256Z" fill="currentColor"/>
              <path d="M15.4718 21.634L17.0489 19.9341L14.3548 17.0307L23.1356 7.67068L34.2802 11.2779V22.7817L23.1356 26.3889L21.1127 24.1838L19.5193 25.8656L22.4679 29.0595L36.5683 24.4977V9.56361L22.4679 5L11.1807 17.0307L15.4718 21.634Z" fill="currentColor"/>
            </g>
            <defs>
              <clipPath id="clip0_login">
                <rect width="36.6316" height="24" fill="white" transform="translate(0 5)"/>
              </clipPath>
            </defs>
          </svg>
          <span class="brand-name">Integram</span>
        </div>
        <div class="lang-toggle">
          <button :class="['lang-btn', { active: locale === 'ru' }]" @click="locale = 'ru'">RU</button>
          <button :class="['lang-btn', { active: locale === 'en' }]" @click="locale = 'en'">EN</button>
        </div>
      </div>

      <!-- Active Databases -->
      <div v-if="authenticatedDatabases.length > 0 && mode === 'login'" class="databases-section">
        <div class="db-category">
          <div class="category-header">
            <i class="pi pi-check-circle"></i>
            <span>{{ t('activeDatabases') }}</span>
          </div>
          <div class="db-buttons">
            <button
              v-for="db in authenticatedDatabases"
              :key="db.name"
              class="db-btn active-db"
              @click="enterDatabase(db.name)"
            >
              <i class="pi pi-database"></i>
              {{ db.name }}
            </button>
          </div>
        </div>

        <div v-if="ownedDatabases.length > 0" class="db-category">
          <div class="category-header secondary">
            <i class="pi pi-server"></i>
            <span>{{ t('ownedDatabases') }}</span>
          </div>
          <div class="db-buttons">
            <button
              v-for="dbName in ownedDatabases"
              :key="dbName"
              class="db-btn owned-db"
              @click="enterDatabase(dbName)"
            >
              <i class="pi pi-database"></i>
              {{ dbName }}
            </button>
          </div>
        </div>

        <hr class="divider" />

        <button class="logout-btn" @click="handleLogout">
          <i class="pi pi-sign-out"></i>
          {{ t('logout') }}
        </button>
      </div>

      <!-- Login Form -->
      <form v-if="mode === 'login'" @submit.prevent="handleLogin" class="login-form">
        <h4>{{ t('loginTitle') }}</h4>

        <!-- Server Selection -->
        <div v-if="showServerInput" class="field">
          <label>{{ t('server') }}</label>
          <select v-model="loginForm.server" class="form-input">
            <option v-for="s in serverOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div class="toggle-server">
          <a href="#" @click.prevent="showServerInput = !showServerInput">
            {{ showServerInput ? t('hideServerInput') : t('showServerInput') }}
          </a>
        </div>

        <!-- Database -->
        <div class="field">
          <label>{{ t('database') }}</label>
          <input
            v-model="loginForm.database"
            class="form-input"
            :class="{ invalid: errors.database }"
          />
          <small v-if="errors.database" class="error-text">{{ errors.database }}</small>
        </div>

        <!-- Login -->
        <div class="field">
          <label>{{ t('loginLabel') }}</label>
          <input
            v-model="loginForm.login"
            class="form-input"
            :class="{ invalid: errors.login }"
            @keyup.enter="handleLogin"
          />
          <small v-if="errors.login" class="error-text">{{ errors.login }}</small>
        </div>

        <!-- Password -->
        <div class="field">
          <label>{{ t('password') }}</label>
          <input
            type="password"
            v-model="loginForm.password"
            class="form-input"
            :class="{ invalid: errors.password }"
            @keyup.enter="handleLogin"
          />
          <small v-if="errors.password" class="error-text">{{ errors.password }}</small>
        </div>

        <div v-if="error" class="error-message">
          {{ t('wrongCredentials') }}
        </div>

        <button type="submit" class="submit-btn" :disabled="loading">
          <i v-if="loading" class="pi pi-spin pi-spinner"></i>
          {{ t('signIn') }}
        </button>

        <div class="form-links">
          <a href="#" @click.prevent="mode = 'reset'">{{ t('resetPassword') }}</a>
          <a href="#" @click.prevent="mode = 'register'">{{ t('createAccount') }}</a>
        </div>
      </form>

      <!-- Registration Form -->
      <form v-else-if="mode === 'register'" @submit.prevent="handleRegister" class="login-form">
        <h4>{{ t('registerTitle') }}</h4>

        <div class="field">
          <label>{{ t('email') }}</label>
          <input type="email" v-model="registerForm.email" class="form-input" :class="{ invalid: errors.email }" />
          <small v-if="errors.email" class="error-text">{{ errors.email }}</small>
        </div>

        <div class="field">
          <label>{{ t('password') }}</label>
          <input type="password" v-model="registerForm.password" class="form-input" :class="{ invalid: errors.regPassword }" />
          <small v-if="errors.regPassword" class="error-text">{{ errors.regPassword }}</small>
        </div>

        <div class="field">
          <label>{{ t('repeatPassword') }}</label>
          <input type="password" v-model="registerForm.password2" class="form-input" :class="{ invalid: errors.regPassword2 }" />
          <small v-if="errors.regPassword2" class="error-text">{{ errors.regPassword2 }}</small>
        </div>

        <div class="field checkbox-field">
          <input type="checkbox" v-model="registerForm.agree" id="agree" />
          <label for="agree">{{ t('acceptTerms') }} {{ t('termsLink') }}</label>
        </div>

        <div v-if="registerSuccess" class="success-message">{{ t('registrationSuccess') }}</div>
        <div v-if="error" class="error-message">{{ error }}</div>

        <button v-if="!registerSuccess" type="submit" class="submit-btn" :disabled="loading">
          <i v-if="loading" class="pi pi-spin pi-spinner"></i>
          {{ t('register') }}
        </button>

        <div class="form-links">
          <a href="#" @click.prevent="mode = 'login'">{{ t('haveAccount') }}</a>
        </div>
      </form>

      <!-- Reset Password Form -->
      <form v-else-if="mode === 'reset'" @submit.prevent="handleReset" class="login-form">
        <h4>{{ t('resetPasswordTitle') }}</h4>
        <p class="form-desc">{{ t('resetInstructions') }}</p>

        <div class="field">
          <label>{{ t('database') }}</label>
          <input v-model="resetForm.database" class="form-input" />
        </div>

        <div class="field">
          <label>{{ t('loginOrEmail') }}</label>
          <input v-model="resetForm.login" class="form-input" :class="{ invalid: errors.resetLogin }" />
          <small v-if="errors.resetLogin" class="error-text">{{ errors.resetLogin }}</small>
        </div>

        <div v-if="resetSuccess" class="success-message">{{ t('resetSuccess') }}</div>
        <div v-if="error" class="error-message">{{ error }}</div>

        <button v-if="!resetSuccess" type="submit" class="submit-btn" :disabled="loading">
          <i v-if="loading" class="pi pi-spin pi-spinner"></i>
          {{ t('sendPassword') }}
        </button>

        <div class="form-links">
          <a href="#" @click.prevent="mode = 'login'">{{ t('cancel') }}</a>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import integramApiClient from '@/services/integramApiClient'
import { getSafeRedirectUrl } from '@/utils/redirectValidation'

const router = useRouter()
const route = useRoute()

const mode = ref('login')
const loading = ref(false)
const error = ref(null)
const registerSuccess = ref(false)
const resetSuccess = ref(false)
const locale = ref('ru')
const errors = ref({})
const showServerInput = ref(false)

const serverOptions = [
  { label: 'dronedoc.ru', value: 'https://dronedoc.ru' },
  { label: 'integram.io', value: 'https://integram.io' },
  { label: 'app.integram.io', value: 'https://app.integram.io' }
]

const databaseServerMap = {
  'my': 'https://dronedoc.ru',
  'a2025': 'https://dronedoc.ru',
  'andy': 'https://app.integram.io'
}

const loginForm = ref({
  server: 'https://dronedoc.ru',
  database: 'my',
  login: '',
  password: ''
})

const registerForm = ref({ email: '', password: '', password2: '', agree: false })
const resetForm = ref({ database: '', login: '' })

const authenticatedDatabases = computed(() => {
  const databases = []
  for (const [dbName, dbSession] of Object.entries(integramApiClient.databases)) {
    databases.push({
      name: dbName,
      userName: dbSession.userName,
      userRole: dbSession.userRole,
      isPrimary: dbName === 'my'
    })
  }
  return databases.sort((a, b) => {
    if (a.name === 'my') return -1
    if (b.name === 'my') return 1
    return a.name.localeCompare(b.name)
  })
})

const ownedDatabases = computed(() => {
  const mySession = integramApiClient.databases['my']
  if (!mySession || !mySession.ownedDatabases) return []
  return mySession.ownedDatabases.filter(dbName => !integramApiClient.databases[dbName])
})

watch(() => loginForm.value.database, (newDatabase) => {
  if (databaseServerMap[newDatabase]) {
    loginForm.value.server = databaseServerMap[newDatabase]
  }
})

const translations = {
  en: {
    loginTitle: 'Sign in', registerTitle: 'Create account', resetPasswordTitle: 'Reset password',
    server: 'Server', showServerInput: 'Change server', hideServerInput: 'Hide server',
    database: 'Database', loginLabel: 'Login', password: 'Password', signIn: 'Sign in',
    resetPassword: 'Forgot password?', createAccount: 'Create account',
    wrongCredentials: 'Invalid credentials', email: 'Email', repeatPassword: 'Repeat password',
    acceptTerms: 'I accept the', termsLink: 'Terms of Service', register: 'Register',
    haveAccount: 'Already have an account?',
    resetInstructions: 'Enter your database name and login or email to receive a new password.',
    loginOrEmail: 'Login / Email', sendPassword: 'Send password', cancel: 'Cancel',
    registrationSuccess: 'Registration successful! Check your email.',
    resetSuccess: 'New password sent to your email',
    activeDatabases: 'Active Databases', ownedDatabases: 'Owned databases',
    enterDatabase: 'Enter', logout: 'Logout'
  },
  ru: {
    loginTitle: 'Вход', registerTitle: 'Регистрация', resetPasswordTitle: 'Сброс пароля',
    server: 'Сервер', showServerInput: 'Сменить сервер', hideServerInput: 'Скрыть',
    database: 'База данных', loginLabel: 'Логин', password: 'Пароль', signIn: 'Войти',
    resetPassword: 'Забыли пароль?', createAccount: 'Регистрация',
    wrongCredentials: 'Неверный логин или пароль', email: 'Email', repeatPassword: 'Повторите пароль',
    acceptTerms: 'Я принимаю', termsLink: 'условия использования', register: 'Зарегистрироваться',
    haveAccount: 'Уже есть аккаунт?',
    resetInstructions: 'Введите название базы и логин или email для получения нового пароля.',
    loginOrEmail: 'Логин / Email', sendPassword: 'Отправить пароль', cancel: 'Отмена',
    registrationSuccess: 'Регистрация успешна! Проверьте почту.',
    resetSuccess: 'Новый пароль отправлен на почту',
    activeDatabases: 'Активные базы данных', ownedDatabases: 'Доступные БД',
    enterDatabase: 'Войти', logout: 'Выйти'
  }
}

const t = (key) => translations[locale.value]?.[key] || key

async function enterDatabase(dbName) {
  try {
    await integramApiClient.switchDatabase(dbName)
    router.push(`/integram/${dbName}/`)
  } catch (err) {
    console.error('Failed to enter database:', err)
    error.value = err.message
  }
}

function handleLogout() {
  integramApiClient.databases = {}
  integramApiClient.logout()
  loginForm.value = { server: 'https://dronedoc.ru', database: 'my', login: '', password: '' }
}

function validateLogin() {
  errors.value = {}
  if (!loginForm.value.login) errors.value.login = 'Обязательное поле'
  if (!loginForm.value.password) errors.value.password = 'Обязательное поле'
  return Object.keys(errors.value).length === 0
}

function validateRegister() {
  errors.value = {}
  if (!registerForm.value.email) errors.value.email = 'Обязательное поле'
  if (!registerForm.value.password || registerForm.value.password.length < 6) errors.value.regPassword = 'Минимум 6 символов'
  if (registerForm.value.password !== registerForm.value.password2) errors.value.regPassword2 = 'Пароли не совпадают'
  if (!registerForm.value.agree) errors.value.agree = true
  return Object.keys(errors.value).length === 0
}

function validateReset() {
  errors.value = {}
  if (!resetForm.value.login) errors.value.resetLogin = 'Обязательное поле'
  return Object.keys(errors.value).length === 0
}

async function handleLogin() {
  if (!validateLogin()) return
  try {
    loading.value = true
    error.value = null

    if (!loginForm.value.database) loginForm.value.database = 'my'
    const serverURL = loginForm.value.server || 'https://dronedoc.ru'
    integramApiClient.setServer(serverURL)

    const result = await integramApiClient.authenticate(
      loginForm.value.database,
      loginForm.value.login,
      loginForm.value.password
    )

    if (result.success) {
      localStorage.setItem('token', result.token)
      localStorage.setItem('_xsrf', result.xsrf || '')
      localStorage.setItem('user', result.userName || loginForm.value.login)
      localStorage.setItem('id', result.userId || '')
      localStorage.setItem('db', loginForm.value.database)
      localStorage.setItem('session_timestamp', Date.now().toString())

      const defaultRedirect = `/integram/${loginForm.value.database}/`
      const redirectUrl = getSafeRedirectUrl(route.query.redirect, defaultRedirect)
      router.push(redirectUrl)
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!validateRegister()) return
  try {
    loading.value = true
    error.value = null
    const serverURL = loginForm.value.server || 'https://dronedoc.ru'
    integramApiClient.setServer(serverURL)
    const result = await integramApiClient.register({ email: registerForm.value.email, password: registerForm.value.password })
    if (result.success) {
      registerSuccess.value = true
      setTimeout(() => { mode.value = 'login'; registerSuccess.value = false }, 3000)
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleReset() {
  if (!validateReset()) return
  try {
    loading.value = true
    error.value = null
    const serverURL = loginForm.value.server || 'https://dronedoc.ru'
    integramApiClient.setServer(serverURL)
    const result = await integramApiClient.resetPassword({ database: resetForm.value.database, login: resetForm.value.login })
    if (result.success) {
      resetSuccess.value = true
      setTimeout(() => { mode.value = 'login'; resetSuccess.value = false }, 3000)
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  integramApiClient.tryRestoreSession()
  const savedLocale = localStorage.getItem('integram_locale')
  if (savedLocale) locale.value = savedLocale
  const savedServer = localStorage.getItem('integram_server')
  if (savedServer && savedServer !== 'https://dronedoc.ru') {
    showServerInput.value = true
    loginForm.value.server = savedServer
  }
  if (route.hash === '#reg') mode.value = 'register'
  else if (route.hash === '#change') mode.value = 'reset'
})

watch(locale, (val) => localStorage.setItem('integram_locale', val))
</script>

<style scoped>
.integram-login-page {
  background: #f0f2f5;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  max-width: 450px;
  width: 100%;
}

.login-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-name {
  font-size: 1.5rem;
  font-weight: 600;
}

.integram-logo {
  color: #1976d2;
}

.lang-toggle {
  display: flex;
  gap: 4px;
}

.lang-btn {
  padding: 4px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.lang-btn.active {
  background: #1976d2;
  color: white;
  border-color: #1976d2;
}

.login-form h4 {
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
  color: #333;
}

.field {
  margin-bottom: 1rem;
}

.field label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #555;
}

.form-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.15);
}

.form-input.invalid {
  border-color: #e74c3c;
}

select.form-input {
  appearance: auto;
}

.error-text {
  color: #e74c3c;
  font-size: 0.8rem;
  margin-top: 4px;
}

.error-message {
  background: #fef0f0;
  color: #e74c3c;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  text-align: center;
}

.success-message {
  background: #f0fef4;
  color: #16a34a;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  text-align: center;
}

.submit-btn {
  width: 100%;
  padding: 0.75rem;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.submit-btn:hover {
  background: #1565c0;
}

.submit-btn:disabled {
  background: #90caf9;
  cursor: not-allowed;
}

.form-links {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
  font-size: 0.875rem;
}

.form-links a {
  color: #1976d2;
  text-decoration: none;
}

.form-links a:hover {
  text-decoration: underline;
}

.form-desc {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 1rem;
}

.toggle-server {
  text-align: center;
  margin-bottom: 1rem;
}

.toggle-server a {
  font-size: 0.8rem;
  color: #1976d2;
  text-decoration: none;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-field label {
  margin-bottom: 0;
  font-weight: normal;
}

/* Databases section */
.databases-section {
  margin-bottom: 1.5rem;
}

.db-category {
  margin-bottom: 1rem;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #4ade80 0%, #16a34a 100%);
  color: white;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-header.secondary {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
}

.db-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.db-btn {
  padding: 0.5rem 1rem;
  border: 1px solid;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s;
  background: white;
}

.db-btn.active-db {
  border-color: #16a34a;
  color: #16a34a;
}

.db-btn.active-db:hover {
  background: #16a34a;
  color: white;
}

.db-btn.owned-db {
  border-color: #3b82f6;
  color: #3b82f6;
}

.db-btn.owned-db:hover {
  background: #3b82f6;
  color: white;
}

.divider {
  border: none;
  border-top: 1px solid #eee;
  margin: 1rem 0;
}

.logout-btn {
  width: 100%;
  padding: 0.5rem;
  background: white;
  color: #e74c3c;
  border: 1px solid #e74c3c;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #e74c3c;
  color: white;
}
</style>
