<template>
  <div class="integram-main">
    <!-- Navigation Bar -->
    <nav class="integram-navbar">
      <div class="nav-left">
        <router-link :to="`/integram/${database}`" class="nav-brand">
          <svg width="28" height="24" viewBox="0 0 40 34" fill="none" xmlns="http://www.w3.org/2000/svg" class="integram-logo">
            <g clip-path="url(#clip0_nav)">
              <path d="M21.0983 12.4256L19.5194 14.1254L22.2153 17.0289L13.4346 26.3889L2.28812 22.7817V11.2779L13.4346 7.67068L15.452 9.87038L17.0454 8.19038L14.1005 5L0 9.56361V24.4959L14.1005 29.0595L25.3877 17.0289L21.0983 12.4256Z" fill="currentColor"/>
              <path d="M15.4718 21.634L17.0489 19.9341L14.3548 17.0307L23.1356 7.67068L34.2802 11.2779V22.7817L23.1356 26.3889L21.1127 24.1838L19.5193 25.8656L22.4679 29.0595L36.5683 24.4977V9.56361L22.4679 5L11.1807 17.0307L15.4718 21.634Z" fill="currentColor"/>
            </g>
            <defs>
              <clipPath id="clip0_nav">
                <rect width="36.6316" height="24" fill="white" transform="translate(0 5)"/>
              </clipPath>
            </defs>
          </svg>
        </router-link>

        <div class="nav-links">
          <router-link
            v-for="item in menuItems"
            :key="item.href"
            :to="`/integram/${database}/${item.href}`"
            class="nav-link"
            active-class="active"
          >
            <i :class="item.icon"></i>
            <span class="nav-link-text">{{ locale === 'ru' ? item.ruName : item.enName }}</span>
          </router-link>
        </div>
      </div>

      <div class="nav-right">
        <!-- Database Selector -->
        <div class="db-selector">
          <select v-model="selectedDatabase" @change="handleDatabaseChange" class="db-select">
            <option v-for="db in availableDatabases" :key="db.value" :value="db.value">
              {{ db.label }}
            </option>
          </select>
        </div>

        <button class="nav-icon-btn" @click="toggleLocale" title="EN/RU">
          <i class="pi pi-globe"></i>
        </button>

        <div class="user-menu-wrapper">
          <button class="nav-icon-btn" @click="showUserMenu = !showUserMenu" :title="userName">
            <i class="pi pi-user"></i>
          </button>
          <div v-if="showUserMenu" class="user-dropdown">
            <div class="dropdown-header">
              <i class="pi pi-user"></i>
              <span>{{ userName }}</span>
            </div>
            <hr />
            <button @click="showPasswordDialog = true; showUserMenu = false">
              <i class="pi pi-key"></i> {{ t('changePassword') }}
            </button>
            <button @click="logout" class="danger">
              <i class="pi pi-sign-out"></i> {{ t('exit') }}
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="integram-content">
      <router-view :key="database" />
    </div>

    <!-- Password Change Dialog -->
    <div v-if="showPasswordDialog" class="modal-overlay" @click.self="showPasswordDialog = false">
      <div class="modal-card">
        <h3>{{ t('passwordChange') }}</h3>
        <div v-if="passwordMessage" :class="['alert', passwordMessageSeverity]">
          {{ passwordMessage }}
        </div>
        <div class="field">
          <label>{{ t('currentPassword') }}</label>
          <input type="password" v-model="oldPassword" class="form-input" />
        </div>
        <div class="field">
          <label>{{ t('newPassword') }}</label>
          <input type="password" v-model="newPassword" class="form-input" />
        </div>
        <div class="field">
          <label>{{ t('repeatPassword') }}</label>
          <input type="password" v-model="newPasswordRepeat" class="form-input" @keyup.enter="changePassword" />
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showPasswordDialog = false">{{ t('cancel') }}</button>
          <button class="btn-primary" @click="changePassword" :disabled="passwordChanging">{{ t('change') }}</button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="integram-footer">
      <small>Integram v1.0.0</small>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import integramApiClient from '@/services/integramApiClient'

const router = useRouter()
const route = useRoute()

const selectedDatabase = ref(null)
const showUserMenu = ref(false)
const showPasswordDialog = ref(false)
const passwordChanging = ref(false)
const passwordMessage = ref('')
const passwordMessageSeverity = ref('info')
const oldPassword = ref('')
const newPassword = ref('')
const newPasswordRepeat = ref('')
const locale = ref('ru')

const database = computed(() => {
  return route.params.database || integramApiClient.currentDatabase || integramApiClient.getDatabase() || 'my'
})

const userName = computed(() => integramApiClient.getAuthInfo().userName || 'User')

const availableDatabases = computed(() => {
  const databases = []
  for (const [dbName] of Object.entries(integramApiClient.databases)) {
    databases.push({ value: dbName, label: dbName })
  }
  const mySession = integramApiClient.databases['my']
  if (mySession?.ownedDatabases) {
    for (const dbName of mySession.ownedDatabases) {
      if (!integramApiClient.databases[dbName]) {
        databases.push({ value: dbName, label: `${dbName}` })
      }
    }
  }
  return databases.sort((a, b) => {
    if (a.value === 'my') return -1
    if (b.value === 'my') return 1
    return a.value.localeCompare(b.value)
  })
})

const menuItems = [
  { href: 'dict', icon: 'pi pi-database', ruName: 'Объекты', enName: 'Objects' },
  { href: 'table', icon: 'pi pi-table', ruName: 'Таблицы', enName: 'Tables' },
  { href: 'edit_types', icon: 'pi pi-sitemap', ruName: 'Структура', enName: 'Structure' },
  { href: 'sql', icon: 'pi pi-code', ruName: 'SQL', enName: 'SQL' },
  { href: 'report', icon: 'pi pi-chart-bar', ruName: 'Запросы', enName: 'Queries' },
  { href: 'form', icon: 'pi pi-file', ruName: 'Формы', enName: 'Forms' },
  { href: 'upload', icon: 'pi pi-upload', ruName: 'Загрузка', enName: 'Upload' },
  { href: 'dir_admin', icon: 'pi pi-folder', ruName: 'Файлы', enName: 'Files' },
  { href: 'info', icon: 'pi pi-info-circle', ruName: 'Инфо', enName: 'Info' }
]

function t(key) {
  const translations = {
    ru: {
      changePassword: 'Сменить пароль', exit: 'Выход',
      passwordChange: 'Смена пароля', currentPassword: 'Действующий пароль',
      newPassword: 'Новый пароль', repeatPassword: 'Повторите пароль',
      change: 'Сменить', cancel: 'Отменить',
      fillAllFields: 'Заполните все поля', passwordsDoNotMatch: 'Пароли не совпадают',
      passwordChanged: 'Пароль успешно изменён', wrongPassword: 'Неверный пароль'
    },
    en: {
      changePassword: 'Change Password', exit: 'Exit',
      passwordChange: 'Password Change', currentPassword: 'Current Password',
      newPassword: 'New Password', repeatPassword: 'Repeat Password',
      change: 'Change', cancel: 'Cancel',
      fillAllFields: 'Please fill in all fields', passwordsDoNotMatch: 'Passwords do not match',
      passwordChanged: 'Password changed successfully', wrongPassword: 'Wrong password'
    }
  }
  return translations[locale.value]?.[key] || key
}

function toggleLocale() {
  locale.value = locale.value === 'ru' ? 'en' : 'ru'
  localStorage.setItem('integram_locale', locale.value)
}

async function handleDatabaseChange(event) {
  const newDatabase = event.target.value
  try {
    await integramApiClient.switchDatabase(newDatabase)
    router.push(`/integram/${newDatabase}/`)
  } catch (error) {
    console.error('Failed to switch database:', error)
    selectedDatabase.value = route.params.database
  }
}

async function changePassword() {
  if (!oldPassword.value || !newPassword.value || !newPasswordRepeat.value) {
    passwordMessage.value = t('fillAllFields')
    passwordMessageSeverity.value = 'error'
    return
  }
  if (newPassword.value !== newPasswordRepeat.value) {
    passwordMessage.value = t('passwordsDoNotMatch')
    passwordMessageSeverity.value = 'error'
    return
  }
  passwordChanging.value = true
  passwordMessage.value = ''
  try {
    const response = await integramApiClient.post('auth?JSON', {
      change: 1,
      login: integramApiClient.getAuthInfo().userName,
      pwd: oldPassword.value,
      npw1: newPassword.value,
      npw2: newPasswordRepeat.value
    })
    if (response.msg && !response.msg.includes('[err')) {
      passwordMessage.value = t('passwordChanged')
      passwordMessageSeverity.value = 'success'
      if (response.token) integramApiClient.token = response.token
      if (response.xsrf) integramApiClient.xsrfToken = response.xsrf
      integramApiClient.saveSession()
      setTimeout(() => { showPasswordDialog.value = false }, 2000)
    } else {
      passwordMessage.value = response.msg ? response.msg.replace(/ ?\[.+\]/, '') : t('wrongPassword')
      passwordMessageSeverity.value = 'error'
    }
  } catch (error) {
    passwordMessage.value = error.message || t('wrongPassword')
    passwordMessageSeverity.value = 'error'
  } finally {
    passwordChanging.value = false
  }
}

function logout() {
  integramApiClient.logout()
  router.push('/integram/login')
}

watch(() => route.params.database, async (newDb) => {
  if (newDb && newDb !== selectedDatabase.value) {
    selectedDatabase.value = newDb
    try {
      await integramApiClient.switchDatabase(newDb)
    } catch (error) {
      console.warn('Failed to switch database from route change:', error)
    }
  }
}, { immediate: true })

onMounted(async () => {
  integramApiClient.tryRestoreSession()

  const authInfo = integramApiClient.getAuthInfo()
  if (!authInfo.token || !authInfo.xsrf) {
    // Auto-authenticate with default credentials
    const serverURL = import.meta.env.VITE_INTEGRAM_URL || `${window.location.protocol}//${window.location.hostname}`
    const defaultDatabase = database.value || 'my'
    try {
      await integramApiClient.authenticate(defaultDatabase, 'd', 'd')
      integramApiClient.saveSession()
    } catch (error) {
      console.error('[IntegramMain] Auto-authentication failed:', error)
      return
    }
  }

  try {
    await integramApiClient.validateSession()
  } catch (e) {
    // ignore
  }

  const savedLocale = localStorage.getItem('integram_locale')
  if (savedLocale) locale.value = savedLocale.toLowerCase()
})
</script>

<style scoped>
.integram-main {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

/* Navbar */
.integram-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 1rem;
  height: 52px;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  overflow-x: auto;
}

.nav-brand {
  display: flex;
  align-items: center;
  text-decoration: none;
  flex-shrink: 0;
}

.integram-logo {
  color: #1976d2;
}

.nav-links {
  display: flex;
  gap: 2px;
  align-items: center;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  text-decoration: none;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.nav-link:hover {
  background: #f1f5f9;
  color: #1976d2;
}

.nav-link.active {
  background: #e3f2fd;
  color: #1976d2;
}

.nav-link i {
  font-size: 0.9rem;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.db-selector {
  position: relative;
}

.db-select {
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.8rem;
  background: white;
  color: #334155;
  cursor: pointer;
}

.nav-icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: all 0.2s;
}

.nav-icon-btn:hover {
  background: #f1f5f9;
  color: #1976d2;
}

/* User dropdown */
.user-menu-wrapper {
  position: relative;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  z-index: 1001;
  padding: 0.5rem 0;
  margin-top: 4px;
}

.dropdown-header {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #334155;
}

.user-dropdown hr {
  border: none;
  border-top: 1px solid #f1f5f9;
  margin: 0;
}

.user-dropdown button {
  width: 100%;
  padding: 0.625rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #334155;
  transition: background 0.2s;
  text-align: left;
}

.user-dropdown button:hover {
  background: #f8fafc;
}

.user-dropdown button.danger {
  color: #dc2626;
}

/* Content */
.integram-content {
  flex: 1;
  padding: 1rem;
  min-height: calc(100vh - 100px);
}

/* Footer */
.integram-footer {
  background: #f1f5f9;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  padding: 0.75rem;
  color: #94a3b8;
  margin-top: auto;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-card h3 {
  margin: 0 0 1.5rem;
  color: #334155;
}

.modal-card .field {
  margin-bottom: 1rem;
}

.modal-card label {
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
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #1976d2;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.btn-primary {
  padding: 0.5rem 1.25rem;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary:hover { background: #1565c0; }
.btn-primary:disabled { background: #90caf9; cursor: not-allowed; }

.btn-secondary {
  padding: 0.5rem 1.25rem;
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
}

.btn-secondary:hover { background: #f8fafc; }

.alert {
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.alert.error { background: #fef0f0; color: #dc2626; }
.alert.success { background: #f0fef4; color: #16a34a; }
.alert.info { background: #eff6ff; color: #2563eb; }

@media (max-width: 768px) {
  .nav-link-text { display: none; }
  .nav-link { padding: 6px 8px; }
}
</style>
