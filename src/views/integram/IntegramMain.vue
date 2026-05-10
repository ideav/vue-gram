<template>
  <div class="integram-main">
    <nav class="integram-navbar">
      <div class="navbar-left">
        <button
          class="mobile-sidebar-toggle"
          type="button"
          aria-label="Открыть меню"
          :aria-expanded="mobileSidebarOpen"
          @click="toggleMobileSidebar"
        >
          <i class="pi pi-bars"></i>
        </button>

        <router-link :to="`/${database}`" class="integram-brand" aria-label="Integram">
          <svg width="32" height="27" viewBox="0 0 40 34" fill="none" xmlns="http://www.w3.org/2000/svg" class="integram-logo">
            <g clip-path="url(#clip0_integram)">
              <path d="M21.0983 12.4256L19.5194 14.1254L22.2153 17.0289L13.4346 26.3889L2.28812 22.7817V11.2779L13.4346 7.67068L15.452 9.87038L17.0454 8.19038L14.1005 5L0 9.56361V24.4959L14.1005 29.0595L25.3877 17.0289L21.0983 12.4256Z" fill="currentColor"/>
              <path d="M15.4718 21.634L17.0489 19.9341L14.3548 17.0307L23.1356 7.67068L34.2802 11.2779V22.7817L23.1356 26.3889L21.1127 24.1838L19.5193 25.8656L22.4679 29.0595L36.5683 24.4977V9.56361L22.4679 5L11.1807 17.0307L15.4718 21.634Z" fill="currentColor"/>
            </g>
            <defs>
              <clipPath id="clip0_integram">
                <rect width="36.6316" height="24" fill="white" transform="translate(0 5)"/>
              </clipPath>
            </defs>
          </svg>
          <span class="brand-name">{{ database }}</span>
        </router-link>
      </div>

      <div class="navbar-center" aria-live="polite">
        <span class="workspace-title">{{ currentWorkspaceLabel }}</span>
      </div>

      <div class="navbar-right">
        <Select
          v-model="selectedDatabase"
          :options="availableDatabases"
          optionLabel="label"
          optionValue="value"
          placeholder="БД"
          @change="handleDatabaseChange"
          class="database-selector"
        >
          <template #value="slotProps">
            <div v-if="slotProps.value" class="database-value">
              <i class="fi fi-rr-database"></i>
              <span>{{ slotProps.value }}</span>
            </div>
            <span v-else>БД</span>
          </template>
          <template #option="slotProps">
            <div class="database-option">
              <i :class="slotProps.option.icon"></i>
              <span>{{ slotProps.option.label }}</span>
              <Tag v-if="slotProps.option.isPrimary" severity="success" value="Primary" size="small" />
              <Tag v-else-if="slotProps.option.isOwned" severity="info" value="Owned" size="small" />
            </div>
          </template>
        </Select>

        <Button
          :icon="isDarkTheme ? 'fi fi-rr-sun' : 'fi fi-rr-moon'"
          text
          rounded
          @click="toggleDarkMode"
          severity="secondary"
          v-tooltip.bottom="isDarkTheme ? 'Light mode' : 'Dark mode'"
          aria-label="Toggle theme"
        />
        <Button
          icon="fi fi-rr-question"
          text
          rounded
          @click="openHelp"
          severity="secondary"
          v-tooltip.bottom="t('help')"
          aria-label="Помощь"
        />
        <Button
          icon="fi fi-rr-user"
          text
          rounded
          @click="toggleUserMenu"
          severity="secondary"
          v-tooltip.bottom="userName"
          aria-label="Меню пользователя"
        />
        <Menu ref="userMenu" :model="userMenuItems" popup />
      </div>
    </nav>

    <div
      class="sidebar-backdrop"
      :class="{ visible: mobileSidebarOpen }"
      @click="closeMobileSidebar"
    ></div>

    <div class="app-layout">
      <aside
        ref="sidebarRef"
        id="app-sidebar"
        class="app-sidebar"
        :class="{ collapsed: sidebarCollapsed, 'mobile-open': mobileSidebarOpen }"
        :style="sidebarStyle"
      >
        <div class="sidebar-header">
          <button
            id="sidebar-toggle"
            class="sidebar-toggle"
            type="button"
            :title="sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'"
            :aria-label="sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'"
            :aria-expanded="!sidebarCollapsed"
            @click="toggleSidebar"
          >
            <i class="pi pi-bars"></i>
          </button>

          <div class="menu-search-wrapper">
            <i class="pi pi-search menu-search-icon"></i>
            <input
              v-model="menuSearch"
              id="menu-search"
              class="menu-search-input"
              type="text"
              placeholder="Поиск..."
              aria-label="Поиск по меню"
              autocomplete="off"
              @keydown.escape="clearMenuSearch(true)"
            >
            <button
              v-if="menuSearch"
              type="button"
              id="menu-search-clear"
              class="menu-search-clear"
              aria-label="Очистить поиск"
              @click="clearMenuSearch()"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>
        </div>

        <nav class="app-menu" id="app-menu" aria-label="Главное меню">
          <template v-for="row in visibleMenuRows" :key="row.item.id">
            <a
              v-if="row.item.href"
              class="app-menu-item"
              :class="menuRowClasses(row)"
              :href="getMenuHref(row.item)"
              :title="row.item.label"
              :data-menu-id="row.item.id"
              :data-menu-up="row.item.parentId"
              :data-level="row.level"
              :aria-current="isMenuItemActive(row.item) ? 'page' : undefined"
              :style="menuItemStyle(row)"
              @click.prevent="navigateMenuItem(row.item)"
            >
              <span class="menu-icon" aria-hidden="true">
                <i v-if="row.item.iconClass" :class="row.item.iconClass"></i>
                <span v-else>{{ row.item.iconText }}</span>
              </span>
              <span class="menu-text">{{ row.item.label }}</span>
              <span
                v-if="row.hasChildren && !sidebarCollapsed"
                class="menu-expand-button"
                role="button"
                tabindex="0"
                :aria-label="row.isExpanded ? 'Свернуть раздел' : 'Развернуть раздел'"
                :aria-expanded="row.isExpanded"
                @click.prevent.stop="toggleMenuItem(row.item)"
                @keydown.enter.prevent.stop="toggleMenuItem(row.item)"
                @keydown.space.prevent.stop="toggleMenuItem(row.item)"
              >
                <i class="menu-arrow pi pi-chevron-down" :class="{ rotated: row.isExpanded }"></i>
              </span>
            </a>

            <button
              v-else
              class="app-menu-item app-menu-item-folder"
              :class="menuRowClasses(row)"
              type="button"
              :title="row.item.label"
              :data-menu-id="row.item.id"
              :data-menu-up="row.item.parentId"
              :data-level="row.level"
              :aria-expanded="row.hasChildren ? row.isExpanded : undefined"
              :style="menuItemStyle(row)"
              @click="toggleMenuItem(row.item)"
            >
              <span class="menu-icon" aria-hidden="true">
                <i v-if="row.item.iconClass" :class="row.item.iconClass"></i>
                <span v-else>{{ row.item.iconText }}</span>
              </span>
              <span class="menu-text">{{ row.item.label }}</span>
              <i
                v-if="row.hasChildren && !sidebarCollapsed"
                class="menu-arrow pi pi-chevron-down"
                :class="{ rotated: row.isExpanded }"
                aria-hidden="true"
              ></i>
            </button>
          </template>

          <div v-if="menuSearch && visibleMenuRows.length === 0" class="menu-no-results">
            Ничего не найдено
          </div>
        </nav>

        <div
          class="sidebar-resize-handle"
          role="separator"
          aria-orientation="vertical"
          title="Изменить ширину меню"
          @mousedown="startSidebarResize"
        ></div>
      </aside>

      <main class="app-content" :class="{ 'content-loading': shouldShowSwitchingOverlay }">
        <div v-if="shouldShowSwitchingOverlay" class="database-switch-overlay">
          <div class="switch-spinner-container">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
            <p class="mt-3 text-lg font-semibold">Переключение БД...</p>
          </div>
        </div>

        <router-view :key="database" />

        <div class="footer text-center py-3">
          <small class="text-muted">Integram v{{ version }}</small>
        </div>
      </main>
    </div>

    <Dialog
      v-model:visible="passwordChangeVisible"
      :header="t('passwordChange')"
      :modal="true"
      :style="{ width: '400px' }"
    >
      <div class="p-fluid">
        <Message v-if="passwordMessage" :severity="passwordMessageSeverity">
          {{ passwordMessage }}
        </Message>

        <div class="field">
          <label for="old-pwd">{{ t('currentPassword') }}</label>
          <Password
            id="old-pwd"
            v-model="oldPassword"
            :feedback="false"
            toggleMask
            @keyup.enter="changePassword"
          />
        </div>

        <div class="field">
          <label for="new-pwd">{{ t('newPassword') }}</label>
          <Password
            id="new-pwd"
            v-model="newPassword"
            toggleMask
            @keyup.enter="changePassword"
          />
        </div>

        <div class="field">
          <label for="new-again">{{ t('repeatPassword') }}</label>
          <Password
            id="new-again"
            v-model="newPasswordRepeat"
            :feedback="false"
            toggleMask
            @keyup.enter="changePassword"
          />
        </div>
      </div>

      <template #footer>
        <Button
          :label="t('cancel')"
          icon="fi fi-rr-cross-small"
          @click="passwordChangeVisible = false"
          text
        />
        <Button
          :label="t('change')"
          icon="fi fi-rr-check"
          @click="changePassword"
          :loading="passwordChanging"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Menu from 'primevue/menu'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Password from 'primevue/password'
import Message from 'primevue/message'
import integramApiClient from '@/services/integramApiClient'
import { useTheme } from '@/composables/useTheme'
import {
  buildLegacyMenuPath,
  filterMenuTree,
  findActiveMenuItem,
  flattenMenuTree,
  getMenuItemAncestors,
  isExternalMenuHref,
  normalizeMenuData
} from '@/utils/integramMenu'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { isDarkTheme, toggleDarkMode } = useTheme()

const userMenu = ref()
const sidebarRef = ref()
const selectedDatabase = ref(null)
const switchingDatabase = ref(false)
const passwordChangeVisible = ref(false)
const passwordChanging = ref(false)
const passwordMessage = ref('')
const passwordMessageSeverity = ref('info')
const oldPassword = ref('')
const newPassword = ref('')
const newPasswordRepeat = ref('')
const locale = ref('ru')
const version = ref('1.0.0')
const menuSearch = ref('')
const rawMenuData = ref([])
const expandedMenuIds = ref(new Set())
const sidebarCollapsed = ref(false)
const sidebarWidth = ref(null)
const mobileSidebarOpen = ref(false)
const resizeState = ref(null)

const database = computed(() => {
  return route.params.database || integramApiClient.currentDatabase || integramApiClient.getDatabase() || 'my'
})

const userName = computed(() => integramApiClient.getAuthInfo().userName || 'User')

const shouldShowSwitchingOverlay = computed(() => {
  const isHomePage = route.path === `/${database.value}/` || route.path === `/${database.value}`
  return switchingDatabase.value && !isHomePage
})

const availableDatabases = computed(() => {
  const databases = []

  for (const [dbName] of Object.entries(integramApiClient.databases)) {
    databases.push({
      value: dbName,
      label: dbName,
      icon: 'fi fi-rr-database',
      isPrimary: dbName === 'my',
      isOwned: false
    })
  }

  const mySession = integramApiClient.databases.my
  if (mySession?.ownedDatabases) {
    for (const dbName of mySession.ownedDatabases) {
      if (!integramApiClient.databases[dbName]) {
        databases.push({
          value: dbName,
          label: dbName,
          icon: 'fi fi-rr-grid',
          isPrimary: false,
          isOwned: true
        })
      }
    }
  }

  if (databases.length === 0 && database.value) {
    databases.push({
      value: database.value,
      label: database.value,
      icon: 'fi fi-rr-database',
      isPrimary: database.value === 'my',
      isOwned: false
    })
  }

  return databases.sort((a, b) => {
    if (a.value === 'my') return -1
    if (b.value === 'my') return 1
    return a.value.localeCompare(b.value)
  })
})

const menuTree = computed(() => normalizeMenuData(rawMenuData.value))
const filteredMenuTree = computed(() => filterMenuTree(menuTree.value, menuSearch.value))
const visibleMenuRows = computed(() => {
  const forceExpanded = Boolean(menuSearch.value.trim()) && !sidebarCollapsed.value
  const expandedIds = sidebarCollapsed.value ? new Set() : expandedMenuIds.value
  return flattenMenuTree(filteredMenuTree.value, expandedIds, { forceExpanded })
})
const activeMenuItem = computed(() => findActiveMenuItem(menuTree.value, route.fullPath, database.value))
const currentWorkspaceLabel = computed(() => activeMenuItem.value?.label || route.meta?.title || 'Integram')
const sidebarStyle = computed(() => {
  if (sidebarCollapsed.value || !sidebarWidth.value) return {}
  return { width: `${sidebarWidth.value}px` }
})

const userMenuItems = computed(() => [
  {
    label: t('help'),
    icon: 'fi fi-rr-question',
    command: openHelp
  },
  {
    label: t('myAccount'),
    icon: 'fi fi-rr-user',
    command: () => window.open(`/my?login=${database.value}`, '_blank')
  },
  {
    separator: true
  },
  {
    label: 'EN/RU',
    icon: 'fi fi-rr-globe',
    command: toggleLocale
  },
  {
    label: t('changePassword'),
    icon: 'fi fi-rr-key',
    command: showPasswordChange
  },
  {
    separator: true
  },
  {
    label: t('exit'),
    icon: 'fi fi-rr-sign-out-alt',
    command: logout,
    class: 'text-red-500'
  }
])

function t(key) {
  const translations = {
    ru: {
      help: 'Помощь',
      myAccount: 'ЛК / Счет',
      changePassword: 'Сменить пароль',
      exit: 'Выход',
      passwordChange: 'Смена пароля',
      currentPassword: 'Действующий пароль',
      newPassword: 'Новый пароль',
      repeatPassword: 'Повторите пароль',
      change: 'Сменить',
      cancel: 'Отменить',
      fillAllFields: 'Заполните все поля',
      passwordsDoNotMatch: 'Пароли не совпадают',
      passwordChanged: 'Пароль успешно изменён',
      wrongPassword: 'Неверный пароль'
    },
    en: {
      help: 'Help',
      myAccount: 'My account',
      changePassword: 'Change Password',
      exit: 'Exit',
      passwordChange: 'Password Change',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      repeatPassword: 'Repeat Password',
      change: 'Change',
      cancel: 'Cancel',
      fillAllFields: 'Please fill in all fields',
      passwordsDoNotMatch: 'Passwords do not match',
      passwordChanged: 'Password changed successfully',
      wrongPassword: 'Wrong password'
    }
  }

  return translations[locale.value]?.[key] || key
}

function getCookie(name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`
}

function sidebarCollapsedStorageKey() {
  return `appSidebarCollapsed_${database.value || 'default'}`
}

function sidebarWidthCookieName() {
  return `sidebarWidth_${database.value || 'default'}`
}

function expandedCookieName() {
  return `menuExpanded_${database.value || 'default'}`
}

function loadServerMenuData() {
  const candidates = [
    window.menuData,
    window.__INTEGRAM_MENU_DATA__,
    window.integramMenuData
  ]

  const serverMenu = candidates.find(candidate => Array.isArray(candidate) && candidate.length > 0)
  rawMenuData.value = serverMenu ? [...serverMenu] : []
}

function loadSidebarState() {
  sidebarCollapsed.value = localStorage.getItem(sidebarCollapsedStorageKey()) === 'true'
  const savedWidth = parseInt(getCookie(sidebarWidthCookieName()), 10)
  sidebarWidth.value = Number.isFinite(savedWidth) ? Math.min(Math.max(savedWidth, 150), 400) : null
}

function loadExpandedMenuState() {
  const raw = getCookie(expandedCookieName())
  if (!raw) {
    expandedMenuIds.value = new Set()
    return
  }

  try {
    const expandedMap = JSON.parse(raw)
    expandedMenuIds.value = new Set(
      Object.entries(expandedMap)
        .filter(([, value]) => value === '1')
        .map(([key]) => key)
    )
  } catch {
    expandedMenuIds.value = new Set()
  }
}

function saveExpandedMenuState() {
  const expandedMap = {}
  for (const id of expandedMenuIds.value) {
    expandedMap[id] = '1'
  }
  setCookie(expandedCookieName(), JSON.stringify(expandedMap))
}

function expandActiveAncestors() {
  if (!activeMenuItem.value) return
  const ancestors = getMenuItemAncestors(menuTree.value, activeMenuItem.value.id)
  if (ancestors.length === 0) return

  const nextExpanded = new Set(expandedMenuIds.value)
  for (const id of ancestors) nextExpanded.add(id)
  expandedMenuIds.value = nextExpanded
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem(sidebarCollapsedStorageKey(), sidebarCollapsed.value ? 'true' : 'false')
}

function isMobile() {
  return window.matchMedia('(max-width: 900px)').matches
}

function openMobileSidebar() {
  mobileSidebarOpen.value = true
  document.body.style.overflow = 'hidden'
}

function closeMobileSidebar() {
  mobileSidebarOpen.value = false
  document.body.style.overflow = ''
}

function toggleMobileSidebar() {
  if (mobileSidebarOpen.value) {
    closeMobileSidebar()
  } else {
    openMobileSidebar()
  }
}

function handleWindowResize() {
  if (!isMobile()) closeMobileSidebar()
}

function startSidebarResize(event) {
  if (sidebarCollapsed.value || isMobile() || !sidebarRef.value) return

  resizeState.value = {
    startX: event.clientX,
    startWidth: sidebarRef.value.offsetWidth
  }

  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', handleSidebarResize)
  document.addEventListener('mouseup', stopSidebarResize)
  event.preventDefault()
}

function handleSidebarResize(event) {
  if (!resizeState.value) return
  const width = resizeState.value.startWidth + (event.clientX - resizeState.value.startX)
  sidebarWidth.value = Math.min(Math.max(width, 150), 400)
}

function stopSidebarResize() {
  if (resizeState.value && sidebarWidth.value) {
    setCookie(sidebarWidthCookieName(), Math.round(sidebarWidth.value))
  }
  resizeState.value = null
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', handleSidebarResize)
  document.removeEventListener('mouseup', stopSidebarResize)
}

function menuRowClasses(row) {
  return {
    active: isMenuItemActive(row.item),
    expanded: row.isExpanded,
    'app-menu-item-parent': row.hasChildren,
    'app-menu-item-nested': row.level > 0,
    'search-match': row.isSearchMatch
  }
}

function menuItemStyle(row) {
  if (sidebarCollapsed.value) return {}
  return { paddingLeft: `${1 + row.level * 0.9}rem` }
}

function isMenuItemActive(item) {
  return activeMenuItem.value?.id === item.id
}

function getMenuHref(item) {
  return buildLegacyMenuPath(database.value, item.href)
}

function navigateMenuItem(item) {
  const href = getMenuHref(item)
  if (!href) return

  if (isExternalMenuHref(href)) {
    window.location.assign(href)
  } else {
    router.push(href)
  }

  if (isMobile()) closeMobileSidebar()
}

function toggleMenuItem(item) {
  if (!item.children.length) return
  const nextExpanded = new Set(expandedMenuIds.value)
  if (nextExpanded.has(item.id)) {
    nextExpanded.delete(item.id)
  } else {
    nextExpanded.add(item.id)
  }
  expandedMenuIds.value = nextExpanded
  saveExpandedMenuState()
}

function clearMenuSearch(blur = false) {
  menuSearch.value = ''
  if (blur) document.getElementById('menu-search')?.blur()
}

function toggleUserMenu(event) {
  userMenu.value?.toggle(event)
}

function openHelp() {
  router.push('/api-docs')
}

function showPasswordChange() {
  passwordChangeVisible.value = true
  oldPassword.value = ''
  newPassword.value = ''
  newPasswordRepeat.value = ''
  passwordMessage.value = ''
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

      setTimeout(() => {
        passwordChangeVisible.value = false
        oldPassword.value = ''
        newPassword.value = ''
        newPasswordRepeat.value = ''
      }, 2000)
    } else {
      const errorMsg = response.msg ? response.msg.replace(/ ?\[.+\]/, '') : t('wrongPassword')
      passwordMessage.value = errorMsg
      passwordMessageSeverity.value = 'error'
    }
  } catch (error) {
    passwordMessage.value = error.message || t('wrongPassword')
    passwordMessageSeverity.value = 'error'
  } finally {
    passwordChanging.value = false
  }
}

function toggleLocale() {
  locale.value = locale.value === 'ru' ? 'en' : 'ru'
  localStorage.setItem('integram_locale', locale.value)
  document.cookie = `${database.value}_locale=${locale.value};Path=/`
}

async function handleDatabaseChange(event) {
  const newDatabase = event.value
  const oldDatabase = route.params.database

  switchingDatabase.value = true

  toast.add({
    severity: 'info',
    summary: 'Переключение БД',
    detail: `Переход на "${newDatabase}"...`,
    life: 2000
  })

  try {
    await integramApiClient.switchDatabase(newDatabase)
    await router.push(`/${newDatabase}/`)
    switchingDatabase.value = false
  } catch (error) {
    console.error('Failed to switch database:', error)
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: error.message,
      life: 5000
    })
    selectedDatabase.value = oldDatabase
    switchingDatabase.value = false
  }
}

function logout() {
  integramApiClient.logout()
  document.cookie = `${database.value}=;Path=/`
  router.push('/login')
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

watch(database, () => {
  loadSidebarState()
  loadExpandedMenuState()
  expandActiveAncestors()
}, { immediate: true })

watch(activeMenuItem, () => {
  expandActiveAncestors()
}, { immediate: true })

watch(() => route.fullPath, () => {
  if (isMobile()) closeMobileSidebar()
})

onMounted(async () => {
  loadServerMenuData()
  window.addEventListener('resize', handleWindowResize)

  integramApiClient.tryRestoreSession()

  const authInfo = integramApiClient.getAuthInfo()
  if (!authInfo.token || !authInfo.xsrf) {
    const serverURL = import.meta.env.VITE_INTEGRAM_URL || `${window.location.protocol}//${window.location.hostname}`
    const defaultDatabase = database.value || 'my'
    const defaultUsername = 'd'
    const defaultPassword = 'd'

    try {
      integramApiClient.setServer(serverURL)
      await integramApiClient.authenticate(defaultDatabase, defaultUsername, defaultPassword)

      const response = await integramApiClient.get(`/${defaultDatabase}/auth?JSON`)
      if (response.data) {
        const dbSession = integramApiClient.databases[defaultDatabase]
        if (dbSession) {
          dbSession.userName = response.data.login || defaultUsername
          dbSession.userRole = response.data.role || 'user'
          dbSession.authInfo = {
            userName: response.data.login || defaultUsername,
            userRole: response.data.role || 'user',
            token: dbSession.token,
            xsrf: dbSession.xsrfToken
          }

          if (response.data.bases && Array.isArray(response.data.bases)) {
            dbSession.ownedDatabases = response.data.bases
          }
        }
      }

      integramApiClient.saveSession()
    } catch (error) {
      console.error('[IntegramMain] Auto-authentication failed:', error)
      toast.add({
        severity: 'error',
        summary: 'Ошибка автоматической авторизации',
        detail: error.message || 'Не удалось войти в систему',
        life: 5000
      })
      return
    }
  }

  try {
    await integramApiClient.validateSession()
  } catch (e) {
    console.warn('Session validation skipped:', e.message)
  }

  const savedLocale = localStorage.getItem('integram_locale')
  if (savedLocale) {
    locale.value = savedLocale.toLowerCase()
  } else {
    locale.value = 'ru'
    localStorage.setItem('integram_locale', 'ru')
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize)
  stopSidebarResize()
  document.body.style.overflow = ''
})
</script>

<style scoped>
.integram-main {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--p-surface-0);
  color: var(--p-text-color);
}

.integram-navbar {
  position: sticky;
  top: 0;
  z-index: 120;
  min-height: 64px;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto minmax(240px, 1fr);
  align-items: center;
  gap: 1rem;
  padding: 0 1rem;
  background: var(--p-surface-0);
  border-bottom: 1px solid var(--p-surface-200);
  box-shadow: 0 1px 6px rgba(15, 23, 42, 0.08);
}

.navbar-left,
.navbar-right,
.database-value,
.database-option {
  display: flex;
  align-items: center;
}

.navbar-left {
  gap: 0.75rem;
  min-width: 0;
}

.navbar-center {
  min-width: 0;
  text-align: center;
}

.navbar-right {
  justify-content: flex-end;
  gap: 0.5rem;
  min-width: 0;
}

.database-value,
.database-option {
  gap: 0.5rem;
}

.database-selector {
  min-width: 8rem;
  max-width: 12rem;
}

.workspace-title {
  display: inline-block;
  max-width: min(42vw, 32rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.integram-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  color: var(--p-text-color);
  text-decoration: none;
}

.integram-brand:hover {
  opacity: 0.84;
}

.integram-logo {
  color: var(--p-primary-color);
  flex-shrink: 0;
}

.brand-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1.05rem;
  font-weight: 700;
}

.app-layout {
  flex: 1;
  display: flex;
  min-height: 0;
  height: calc(100vh - 64px);
  overflow: hidden;
}

.app-sidebar {
  position: relative;
  width: 240px;
  min-width: 150px;
  max-width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--p-surface-0);
  border-right: 1px solid var(--p-surface-200);
  transition: width 0.2s ease, transform 0.2s ease;
}

.app-sidebar.collapsed {
  width: 56px !important;
  min-width: 56px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.75rem 0.5rem 0;
  flex-shrink: 0;
}

.sidebar-toggle,
.mobile-sidebar-toggle,
.menu-search-clear,
.menu-expand-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--p-text-muted-color);
  cursor: pointer;
  font: inherit;
}

.sidebar-toggle,
.mobile-sidebar-toggle {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.sidebar-toggle {
  margin-left: 1.25rem;
}

.sidebar-toggle:hover,
.mobile-sidebar-toggle:hover,
.menu-search-clear:hover,
.menu-expand-button:hover {
  background: var(--p-surface-100);
  color: var(--p-text-color);
}

.mobile-sidebar-toggle {
  display: none;
}

.menu-search-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}

.menu-search-icon {
  position: absolute;
  left: 0.625rem;
  color: var(--p-text-muted-color);
  font-size: 0.85rem;
  pointer-events: none;
}

.menu-search-input {
  width: 100%;
  min-width: 0;
  padding: 0.5rem 2rem 0.5rem 2rem;
  border: 1px solid var(--p-surface-300);
  border-radius: 6px;
  background: var(--p-surface-50);
  color: var(--p-text-color);
  font: inherit;
  font-size: 0.85rem;
}

.menu-search-input:focus {
  outline: none;
  border-color: var(--p-primary-color);
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.12);
}

.menu-search-clear {
  position: absolute;
  right: 0.375rem;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  font-size: 0.75rem;
}

.app-sidebar.collapsed .sidebar-header {
  justify-content: center;
  padding: 0.75rem 0;
}

.app-sidebar.collapsed .sidebar-toggle {
  margin: 0;
}

.app-sidebar.collapsed .menu-search-wrapper,
.app-sidebar.collapsed .menu-text,
.app-sidebar.collapsed .menu-arrow,
.app-sidebar.collapsed .menu-expand-button {
  display: none;
}

.app-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0 0.75rem 0.75rem;
  overflow-x: hidden;
  overflow-y: auto;
}

.app-menu-item {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.5rem;
  padding: 0.55rem 1rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--p-text-color);
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  text-align: left;
  text-decoration: none;
}

.app-menu-item:hover {
  background: var(--p-surface-100);
  color: var(--p-text-color);
  text-decoration: none;
}

.app-menu-item.active {
  background: color-mix(in srgb, var(--p-primary-color) 14%, transparent);
  color: var(--p-primary-color);
}

.app-menu-item-folder .menu-text {
  text-transform: uppercase;
  letter-spacing: 0;
}

.app-menu-item-nested {
  font-size: 0.85rem;
}

.app-sidebar.collapsed .app-menu {
  padding: 0 0.5rem 0.75rem;
}

.app-sidebar.collapsed .app-menu-item {
  justify-content: center;
  padding: 0.55rem 0;
}

.menu-icon {
  width: 1.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.15rem;
}

.menu-text {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-expand-button {
  width: 1.75rem;
  height: 1.75rem;
  margin-left: auto;
  border-radius: 50%;
  flex-shrink: 0;
}

.menu-arrow {
  font-size: 0.7rem;
  color: var(--p-text-muted-color);
  transition: transform 0.16s ease;
}

.menu-arrow.rotated,
.app-menu-item.expanded > .menu-arrow {
  transform: rotate(180deg);
}

.app-menu-item.search-match .menu-text {
  background: color-mix(in srgb, var(--p-primary-color) 18%, transparent);
  border-radius: 3px;
  padding: 0 0.25rem;
  margin: 0 -0.25rem;
}

.menu-no-results {
  padding: 1rem;
  text-align: center;
  color: var(--p-text-muted-color);
  font-size: 0.85rem;
}

.sidebar-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: ew-resize;
  background: transparent;
}

.sidebar-resize-handle:hover {
  background: var(--p-primary-color);
}

.app-sidebar.collapsed .sidebar-resize-handle {
  display: none;
}

.sidebar-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 140;
  background: rgba(15, 23, 42, 0.52);
}

.sidebar-backdrop.visible {
  display: block;
}

.app-content {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: auto;
  padding: 1rem;
  position: relative;
  background: var(--p-surface-50);
}

.content-loading {
  pointer-events: none;
  opacity: 0.6;
}

.database-switch-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.switch-spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--p-surface-0);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.14);
}

.footer {
  margin-top: 1rem;
  padding: 1rem 0 0;
}

.text-muted {
  color: var(--p-text-muted-color);
}

@media (max-width: 900px) {
  .integram-navbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .navbar-center {
    display: none;
  }

  .navbar-right {
    gap: 0.25rem;
  }

  .database-selector {
    max-width: 7.5rem;
  }

  .mobile-sidebar-toggle {
    display: inline-flex;
  }

  .app-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 160;
    height: 100vh;
    width: 280px !important;
    max-width: 85vw;
    transform: translateX(-100%);
    box-shadow: 2px 0 18px rgba(15, 23, 42, 0.18);
  }

  .app-sidebar.mobile-open {
    transform: translateX(0);
  }

  .app-sidebar.collapsed {
    width: 56px !important;
    transform: translateX(-100%);
  }

  .app-sidebar.collapsed.mobile-open {
    transform: translateX(0);
  }

  .sidebar-resize-handle {
    display: none;
  }

  .app-content {
    width: 100%;
    padding: 0.75rem;
  }
}

@media (max-width: 600px) {
  .integram-navbar {
    padding: 0 0.5rem;
  }

  .brand-name {
    display: none;
  }
}
</style>
