<template>
  <div class="integram-main">
    <nav class="navbar">
      <div class="navbar-left">
        <button
          id="mobile-sidebar-toggle"
          class="mobile-sidebar-toggle"
          type="button"
          aria-label="Открыть меню"
          title="Открыть меню"
          data-testid="mobile-sidebar-toggle"
          @click="toggleMobileSidebar"
        >
          <i class="fi fi-rr-menu-burger"></i>
        </button>

        <router-link :to="`/${database}/`" class="navbar-brand">
          <svg width="40" height="34" viewBox="0 0 40 34" fill="none" xmlns="http://www.w3.org/2000/svg" class="logo">
            <g clip-path="url(#clip0_integram_shell)">
              <path d="M21.0983 12.4256L19.5194 14.1254L22.2153 17.0289L13.4346 26.3889L2.28812 22.7817V11.2779L13.4346 7.67068L15.452 9.87038L17.0454 8.19038L14.1005 5L0 9.56361V24.4959L14.1005 29.0595L25.3877 17.0289L21.0983 12.4256Z" fill="currentColor"/>
              <path d="M15.4718 21.634L17.0489 19.9341L14.3548 17.0307L23.1356 7.67068L34.2802 11.2779V22.7817L23.1356 26.3889L21.1127 24.1838L19.5193 25.8656L22.4679 29.0595L36.5683 24.4977V9.56361L22.4679 5L11.1807 17.0307L15.4718 21.634Z" fill="currentColor"/>
            </g>
            <defs>
              <clipPath id="clip0_integram_shell">
                <rect width="36.6316" height="24" fill="white" transform="translate(0 5)"/>
              </clipPath>
            </defs>
          </svg>
          <span class="brand-name">{{ database }}</span>
        </router-link>
      </div>

      <div class="navbar-center">
        <div class="navbar-workspace">{{ activeWorkspaceName }}</div>
      </div>

      <div class="navbar-right">
        <Select
          v-model="selectedDatabase"
          :options="availableDatabases"
          optionLabel="label"
          optionValue="value"
          placeholder="БД"
          class="database-selector"
          aria-label="База данных"
          @change="handleDatabaseChange"
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

        <div class="user-menu-wrapper" :class="{ open: userMenuOpen }">
          <button
            id="user-menu-toggle"
            class="account-info"
            type="button"
            title="Имя пользователя / роль"
            data-testid="user-menu-toggle"
            @click.stop="toggleUserMenu"
          >
            <div id="account-avatar" class="account-avatar">{{ userInitial }}</div>
            <span id="account-email" class="account-email">{{ userLabel }}</span>
            <i class="user-menu-arrow fi fi-rr-angle-small-down"></i>
          </button>

          <div
            v-if="userMenuOpen"
            id="user-menu-dropdown"
            class="user-menu-dropdown"
            data-testid="user-menu-dropdown"
            @click.stop
          >
            <router-link
              :to="{ name: 'IntegramCabinet', params: { database } }"
              class="user-menu-item"
              @click="closeUserMenu"
            >
              <i class="user-menu-icon fi fi-rr-user"></i>
              <span>Личный кабинет</span>
            </router-link>

            <div class="user-menu-divider"></div>

            <button id="theme-toggle" class="user-menu-item" type="button" @click="handleThemeToggle">
              <i class="user-menu-icon" :class="isDarkTheme ? 'fi fi-rr-sun' : 'fi fi-rr-moon'"></i>
              <span>Тема</span>
              <span class="user-menu-value">{{ isDarkTheme ? 'Светлая' : 'Темная' }}</span>
            </button>

            <div class="user-menu-item user-menu-font-size-row" title="Размер шрифта">
              <i class="user-menu-icon fi fi-rr-settings-sliders"></i>
              <span>Шрифт</span>
              <div class="navbar-font-size-group">
                <button
                  v-for="option in pageFontOptions"
                  :key="option.value"
                  type="button"
                  class="navbar-font-size-btn"
                  :class="{ active: pageFontSize === option.value }"
                  :title="option.title"
                  :style="{ fontSize: option.fontSize }"
                  @click="setPageFontSizePreference(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>

            <label class="user-menu-item user-menu-font-size-row brand-bg-row" title="Фоновый рисунок можно изменить в меню Файлы - в main.html: background-image: url">
              <i class="user-menu-icon fi fi-rr-picture"></i>
              <span>Бренд-фон</span>
              <select
                id="brand-bg-select"
                v-model="brandBackground"
                class="brand-bg-select"
                title="Выберите интенсивность фонового рисунка для вашего удобства"
                @change="setBrandBackgroundPreference(brandBackground)"
              >
                <option
                  v-for="option in brandBackgroundOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <div class="user-menu-divider"></div>

            <button id="change-password-btn" class="user-menu-item" type="button" @click="showPasswordChange">
              <i class="user-menu-icon fi fi-rr-lock"></i>
              <span>Сменить пароль</span>
            </button>

            <div class="user-menu-divider"></div>

            <button
              id="logout-everywhere-btn"
              class="user-menu-item user-menu-item-danger"
              type="button"
              title="Выйти на всех устройствах, где совершен вход"
              @click="logoutEverywhere"
            >
              <i class="user-menu-icon fi fi-rr-sign-out-alt"></i>
              <span>Выйти везде</span>
            </button>
            <button id="logout-btn" class="user-menu-item user-menu-item-danger" type="button" @click="logout">
              <i class="user-menu-icon fi fi-rr-sign-out-alt"></i>
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </div>
    </nav>

    <div
      id="sidebar-backdrop"
      class="sidebar-backdrop"
      :class="{ visible: mobileSidebarOpen }"
      data-testid="sidebar-backdrop"
      @click="closeMobileSidebar"
    ></div>

    <div class="app-layout">
      <aside
        id="app-sidebar"
        class="app-sidebar"
        :class="{ collapsed: sidebarCollapsed, 'mobile-open': mobileSidebarOpen }"
        :style="sidebarStyle"
        data-testid="app-sidebar"
      >
        <div class="sidebar-header">
          <button
            id="sidebar-toggle"
            class="sidebar-toggle"
            type="button"
            title="Свернуть/развернуть меню"
            aria-label="Toggle sidebar"
            data-testid="sidebar-toggle"
            @click="toggleSidebarCollapsed"
          >
            <i class="fi fi-rr-menu-burger"></i>
          </button>

          <div class="menu-search-wrapper">
            <i class="fi fi-rr-search menu-search-icon"></i>
            <input
              id="menu-search"
              v-model="menuSearch"
              type="text"
              class="menu-search-input"
              placeholder="Поиск..."
              aria-label="Поиск по меню"
              autocomplete="off"
              @keydown.escape="clearMenuSearch"
            >
            <button
              v-if="menuSearch"
              type="button"
              id="menu-search-clear"
              class="menu-search-clear"
              aria-label="Очистить поиск"
              @click="clearMenuSearch"
            >
              <i class="fi fi-rr-cross-small"></i>
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
                <i class="menu-arrow fi fi-rr-angle-small-down" :class="{ rotated: row.isExpanded }"></i>
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
                class="menu-arrow fi fi-rr-angle-small-down"
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
          aria-hidden="true"
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
            autocomplete="current-password"
            @keyup.enter="changePassword"
          />
        </div>

        <div class="field">
          <label for="new-pwd">{{ t('newPassword') }}</label>
          <Password
            id="new-pwd"
            v-model="newPassword"
            toggleMask
            autocomplete="new-password"
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
            autocomplete="new-password"
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

    <div v-if="cookieConsentVisible" id="cookie-consent" class="cookie-consent">
      <span>Мы используем куки для обеспечения работы сайта. Продолжая использовать сайт, вы соглашаетесь с их использованием.</span>
      <button type="button" @click="acceptCookieConsent">Принять</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
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
  BRAND_BACKGROUND_OPTIONS,
  PAGE_FONT_OPTIONS,
  deleteAuthCookies,
  getLogoutStartUrl,
  useIntegramShellSettings
} from '@/composables/useIntegramShellSettings'
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
const userMenuOpen = ref(false)
const menuSearch = ref('')
const rawMenuData = ref([])
const expandedMenuIds = ref(new Set())
const mobileSidebarOpen = ref(false)
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)

const database = computed(() => (
  route.params.database ||
  integramApiClient.currentDatabase ||
  integramApiClient.getDatabase() ||
  'my'
))

const {
  pageFontSize,
  brandBackground,
  sidebarCollapsed,
  sidebarWidth,
  cookieConsentVisible,
  setPageFontSizePreference,
  setBrandBackgroundPreference,
  setSidebarCollapsedPreference,
  setSidebarWidthPreference,
  acceptCookieConsent
} = useIntegramShellSettings(database)

const pageFontOptions = PAGE_FONT_OPTIONS
const brandBackgroundOptions = BRAND_BACKGROUND_OPTIONS
const isMobileViewport = computed(() => viewportWidth.value <= 900)

const userName = computed(() => integramApiClient.getAuthInfo().userName || 'User')
const userRole = computed(() => integramApiClient.getAuthInfo().userRole || 'user')
const userInitial = computed(() => userName.value ? userName.value.charAt(0).toUpperCase() : 'U')
const userLabel = computed(() => `${userName.value} / ${userRole.value}`)

const shouldShowSwitchingOverlay = computed(() => {
  const isHomePage = route.path === `/${database.value}/` || route.path === `/${database.value}`
  return switchingDatabase.value && !isHomePage
})

const availableDatabases = computed(() => {
  const databases = []
  const seen = new Set()

  const addDatabase = (dbName, options = {}) => {
    if (!dbName || seen.has(dbName)) return
    seen.add(dbName)
    databases.push({
      value: dbName,
      label: dbName,
      icon: options.icon || 'fi fi-rr-database',
      isPrimary: dbName === 'my',
      isOwned: Boolean(options.isOwned)
    })
  }

  addDatabase(database.value)

  for (const dbName of Object.keys(integramApiClient.databases)) {
    addDatabase(dbName)
  }

  const mySession = integramApiClient.databases.my
  if (mySession?.ownedDatabases) {
    for (const dbName of mySession.ownedDatabases) {
      addDatabase(dbName, { icon: 'fi fi-rr-grid', isOwned: true })
    }
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
const activeWorkspaceName = computed(() => activeMenuItem.value?.label || database.value)

const sidebarStyle = computed(() => {
  if (isMobileViewport.value || sidebarCollapsed.value || !sidebarWidth.value) return {}
  return { width: `${sidebarWidth.value}px` }
})

function t(key) {
  const translations = {
    ru: {
      passwordChange: 'Смена пароля',
      currentPassword: 'Действующий пароль',
      newPassword: 'Новый пароль',
      repeatPassword: 'Повторите пароль',
      change: 'Сменить',
      cancel: 'Отменить',
      fillAllFields: 'Заполните все поля',
      passwordsDoNotMatch: 'Пароли не совпадают',
      passwordChanged: 'Пароль успешно изменен',
      wrongPassword: 'Неверный пароль'
    },
    en: {
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

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
}

function closeUserMenu() {
  userMenuOpen.value = false
}

function handleThemeToggle() {
  toggleDarkMode()
}

function showPasswordChange() {
  closeUserMenu()
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
    const response = await integramApiClient.post('auth', {
      change: 1,
      login: userName.value,
      pwd: oldPassword.value,
      npw1: newPassword.value,
      npw2: newPasswordRepeat.value
    })

    if (response.msg && !response.msg.includes('[err')) {
      passwordMessage.value = response.msg || t('passwordChanged')
      passwordMessageSeverity.value = 'success'

      if (response.token) integramApiClient.token = response.token
      if (response.xsrf || response._xsrf) integramApiClient.xsrfToken = response.xsrf || response._xsrf
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

async function handleDatabaseChange(event) {
  const newDatabase = event.value
  const oldDatabase = route.params.database || database.value

  if (!newDatabase || newDatabase === oldDatabase) return

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
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: error.message,
      life: 5000
    })
    selectedDatabase.value = oldDatabase
  } finally {
    switchingDatabase.value = false
  }
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

function expandedMenuStorageKey() {
  return `menuExpanded_${database.value || 'default'}`
}

function loadExpandedMenuState() {
  try {
    const raw = localStorage.getItem(expandedMenuStorageKey())
    const ids = raw ? JSON.parse(raw) : []
    expandedMenuIds.value = new Set(Array.isArray(ids) ? ids.map(String) : [])
  } catch {
    expandedMenuIds.value = new Set()
  }
}

function saveExpandedMenuState() {
  localStorage.setItem(expandedMenuStorageKey(), JSON.stringify([...expandedMenuIds.value]))
}

function expandActiveAncestors() {
  if (!activeMenuItem.value) return
  const ancestors = getMenuItemAncestors(menuTree.value, activeMenuItem.value.id)
  if (ancestors.length === 0) return

  const nextExpanded = new Set(expandedMenuIds.value)
  for (const id of ancestors) nextExpanded.add(id)
  expandedMenuIds.value = nextExpanded
  saveExpandedMenuState()
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

  closeMobileSidebar()
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

function clearMenuSearch() {
  menuSearch.value = ''
}

function toggleSidebarCollapsed() {
  if (isMobileViewport.value) return
  setSidebarCollapsedPreference(!sidebarCollapsed.value)
}

function toggleMobileSidebar() {
  mobileSidebarOpen.value = !mobileSidebarOpen.value
}

function closeMobileSidebar() {
  mobileSidebarOpen.value = false
}

function startSidebarResize(event) {
  if (sidebarCollapsed.value || isMobileViewport.value) return

  const sidebar = event.currentTarget.closest('.app-sidebar')
  if (!sidebar) return

  const startX = event.clientX
  const startWidth = sidebar.offsetWidth
  let latestWidth = startWidth

  const onMouseMove = (moveEvent) => {
    latestWidth = Math.min(400, Math.max(150, startWidth + (moveEvent.clientX - startX)))
    sidebar.style.width = `${latestWidth}px`
  }

  const onMouseUp = () => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    sidebar.classList.remove('resizing')
    sidebar.style.width = `${latestWidth}px`
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    setSidebarWidthPreference(latestWidth)
  }

  sidebar.classList.add('resizing')
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  event.preventDefault()
}

function logout() {
  const currentDatabase = database.value
  const currentUser = userName.value
  integramApiClient.logout()
  localStorage.removeItem('token')
  localStorage.removeItem('_xsrf')
  localStorage.removeItem('user')
  localStorage.removeItem('id')
  localStorage.removeItem('db')
  deleteAuthCookies(currentDatabase)
  window.location.href = getLogoutStartUrl(currentDatabase, currentUser)
}

async function logoutEverywhere() {
  const currentDatabase = database.value
  try {
    await fetch(`/${currentDatabase}/exit`)
  } catch {
    // The legacy action redirects even if the best-effort server logout request fails.
  }
  integramApiClient.logout()
  deleteAuthCookies(currentDatabase)
  window.location.href = `/${currentDatabase}`
}

function updateViewportWidth() {
  viewportWidth.value = window.innerWidth
}

function handleDocumentClick() {
  closeUserMenu()
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
  loadExpandedMenuState()
  expandActiveAncestors()
}, { immediate: true })

watch(activeMenuItem, () => {
  expandActiveAncestors()
}, { immediate: true })

watch(() => route.fullPath, () => {
  closeMobileSidebar()
  closeUserMenu()
})

watch(mobileSidebarOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('resize', updateViewportWidth)
  loadServerMenuData()

  await integramApiClient.restoreSession(database.value, { validate: false })

  const authInfo = integramApiClient.getAuthInfo()
  if (!authInfo.token) {
    router.replace({ path: '/login', query: { redirect: route.fullPath } })
    return
  }

  const validSession = await integramApiClient.validateSession()
  if (!validSession) {
    router.replace({ path: '/login', query: { redirect: route.fullPath } })
    return
  }

  const savedLocale = localStorage.getItem('integram_locale')
  locale.value = savedLocale ? savedLocale.toLowerCase() : 'ru'
  localStorage.setItem('integram_locale', locale.value)
  selectedDatabase.value = database.value
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('resize', updateViewportWidth)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.integram-main {
  min-height: 100vh;
  color: var(--text-primary);
  background: var(--bg-primary);
  position: relative;
}

.navbar {
  background-color: var(--nav-bg);
  border-bottom: 1px solid var(--border-color);
  padding: .3rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: background-color 0.3s ease;
}

.navbar-left,
.navbar-right {
  display: flex;
  align-items: center;
}

.navbar-left {
  gap: 1rem;
}

.navbar-right {
  gap: 1rem;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: var(--text-primary);
}

.navbar-brand:hover {
  opacity: 0.85;
}

.logo {
  height: 40px;
  width: auto;
  color: var(--button-primary);
  flex-shrink: 0;
}

.brand-name {
  font-weight: 600;
  font-size: 1.1rem;
  text-transform: capitalize;
}

.navbar-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  pointer-events: none;
}

.navbar-workspace {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.database-selector {
  min-width: 8rem;
}

.database-value,
.database-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-menu-wrapper {
  position: relative;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: none;
  cursor: pointer;
  font: inherit;
  transition: background-color 0.3s ease;
}

.account-info:hover {
  background-color: var(--border-color);
}

.account-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.9rem;
}

.account-email {
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.user-menu-arrow {
  font-size: 0.65rem;
  color: var(--text-secondary);
  margin-left: 0.25rem;
  transition: transform 0.2s ease;
}

.user-menu-wrapper.open .user-menu-arrow {
  transform: rotate(180deg);
}

.user-menu-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 16px var(--nav-shadow);
  min-width: 240px;
  z-index: 200;
  overflow: hidden;
  animation: userMenuSlideIn 0.15s ease-out;
}

@keyframes userMenuSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.875rem 1rem;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: inherit;
  transition: background-color 0.2s ease;
  gap: 0.75rem;
  text-decoration: none;
}

.user-menu-item:hover {
  background-color: var(--bg-secondary);
}

.user-menu-icon {
  font-size: 1.1rem;
  width: 1.5rem;
  text-align: center;
  flex-shrink: 0;
}

.user-menu-value {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.user-menu-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 0.25rem 0;
}

.user-menu-font-size-row {
  cursor: default;
}

.user-menu-font-size-row:hover {
  background: none;
}

.navbar-font-size-group {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}

.navbar-font-size-btn {
  font-weight: 700;
  line-height: 1;
  padding: 3px 7px;
  min-width: 28px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.navbar-font-size-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.navbar-font-size-btn.active {
  background-color: var(--button-primary);
  color: #ffffff;
  border-color: var(--button-primary);
}

.brand-bg-select {
  margin-left: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 2px 4px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
}

.user-menu-item-danger {
  color: var(--color-danger);
}

.user-menu-item-danger:hover {
  background-color: rgba(220, 53, 69, 0.1);
}

:global([data-theme="dark"]) .user-menu-item-danger:hover,
:global(.app-dark) .user-menu-item-danger:hover {
  background-color: rgba(220, 53, 69, 0.2);
}

.app-layout {
  display: flex;
  height: calc(100vh - 53px);
  overflow: hidden;
}

.app-sidebar {
  width: 240px;
  background-color: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  padding: 0;
  flex-shrink: 0;
  transition: width 0.25s ease, background-color 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 2;
}

.app-sidebar.resizing {
  transition: none;
}

:global([data-theme="dark"]) .app-sidebar,
:global(.app-dark) .app-sidebar {
  background-color: var(--bg-secondary);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.75rem 0.5rem 0;
  flex-shrink: 0;
}

.sidebar-toggle,
.mobile-sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--sidebar-toggle-size);
  height: var(--sidebar-toggle-size);
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 1.25rem;
  transition: background-color 0.2s ease, color 0.2s ease;
  flex-shrink: 0;
}

.sidebar-toggle {
  margin: 0 0 0 1.25rem;
}

.sidebar-toggle:hover,
.mobile-sidebar-toggle:hover {
  background-color: rgba(0, 0, 0, 0.04);
  color: var(--text-primary);
}

:global([data-theme="dark"]) .sidebar-toggle:hover,
:global([data-theme="dark"]) .mobile-sidebar-toggle:hover,
:global(.app-dark) .sidebar-toggle:hover,
:global(.app-dark) .mobile-sidebar-toggle:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.menu-search-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.menu-search-icon {
  position: absolute;
  left: 0.625rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  pointer-events: none;
}

.menu-search-input {
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 2rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-family: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.menu-search-input::placeholder {
  color: var(--text-secondary);
}

.menu-search-input:focus {
  outline: none;
  border-color: var(--button-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.menu-search-clear {
  position: absolute;
  right: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.75rem;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.menu-search-clear:hover {
  background-color: rgba(0, 0, 0, 0.08);
  color: var(--text-primary);
}

.app-sidebar.collapsed {
  width: 56px;
}

.app-sidebar.collapsed .sidebar-header {
  flex-direction: column;
  padding: 0.75rem 0;
}

.app-sidebar.collapsed .sidebar-toggle {
  margin: 0 auto;
}

.app-sidebar.collapsed .menu-search-wrapper,
.app-sidebar.collapsed .menu-text,
.app-sidebar.collapsed .menu-arrow,
.app-sidebar.collapsed .menu-expand-button {
  display: none;
}

.app-sidebar.collapsed .app-menu-item {
  justify-content: center;
  padding: 0.75rem 0;
}

.app-menu {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0 0.75rem;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.app-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 1rem;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: inherit;
  text-align: left;
  transition: all 0.2s ease;
  width: 100%;
  text-decoration: none;
}

.app-menu-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
  color: var(--text-primary);
  text-decoration: none;
}

.app-menu-item.active {
  background-color: rgba(0, 0, 0, 0.08);
  color: var(--text-primary);
}

.app-menu-item-folder .menu-text {
  text-transform: uppercase;
  letter-spacing: 0;
}

.app-menu-item-nested {
  font-size: 0.85rem;
}

:global([data-theme="dark"]) .app-menu-item:hover,
:global(.app-dark) .app-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

:global([data-theme="dark"]) .app-menu-item.active,
:global(.app-dark) .app-menu-item.active {
  background-color: rgba(255, 255, 255, 0.12);
}

.menu-icon {
  font-size: var(--menu-icon-size);
  width: 1.5rem;
  text-align: center;
  flex-shrink: 0;
}

.menu-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.menu-expand-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  margin-left: auto;
  border-radius: 50%;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.menu-expand-button:hover {
  background-color: rgba(0, 0, 0, 0.08);
  color: var(--text-primary);
}

.menu-arrow {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: 0.8rem;
  transition: transform 0.16s ease;
}

.menu-arrow.rotated,
.app-menu-item.expanded > .menu-arrow {
  transform: rotate(180deg);
}

.app-menu-item.search-match .menu-text {
  background: rgba(59, 130, 246, 0.16);
  border-radius: 3px;
  padding: 0 0.25rem;
  margin: 0 -0.25rem;
}

.menu-no-results {
  padding: 1rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-align: center;
}

.sidebar-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: ew-resize;
  background: transparent;
  transition: background-color 0.2s ease;
  z-index: 10;
}

.sidebar-resize-handle:hover,
.sidebar-resize-handle:active {
  background-color: var(--button-primary);
}

.app-sidebar.collapsed .sidebar-resize-handle {
  display: none;
}

.app-content {
  flex: 1;
  min-width: 0;
  padding: 12px;
  background-color: var(--bg-primary);
  overflow-y: auto;
  overflow-x: auto;
  height: 100%;
  position: relative;
  z-index: 1;
}

.content-loading {
  pointer-events: none;
}

.database-switch-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.switch-spinner-container {
  text-align: center;
  color: var(--text-primary);
}

.mobile-sidebar-toggle {
  display: none;
}

.sidebar-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 150;
}

.sidebar-backdrop.visible {
  display: block;
}

.cookie-consent {
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: rgb(30, 41, 59);
  color: rgb(241, 245, 249);
  padding: 1.75rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  box-shadow: rgba(0, 0, 0, 0.2) 0 -2px 8px;
  border-radius: 8px;
  margin: 0.75rem;
  opacity: 0.9;
}

.cookie-consent span {
  font-size: 0.9rem;
}

.cookie-consent button {
  background: #3b82f6;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.25rem;
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .mobile-sidebar-toggle {
    display: flex;
  }

  .navbar {
    gap: 0.75rem;
  }

  .navbar-center {
    display: none;
  }

  .database-selector {
    min-width: 6.25rem;
  }

  .account-email {
    display: none;
  }

  .app-layout {
    flex-direction: row;
  }

  .app-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 280px !important;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.25s ease, width 0.25s ease;
    border-right: 1px solid var(--border-color);
    box-shadow: 2px 0 16px rgba(0, 0, 0, 0.15);
    padding: 0;
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

  .app-menu {
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    gap: 0.25rem;
    padding: 0 0.75rem;
  }

  .app-menu-item {
    flex-shrink: unset;
    padding: 0.55rem 1rem;
    white-space: normal;
  }

  .sidebar-header {
    display: flex;
    padding-top: 1rem;
  }

  .sidebar-resize-handle {
    display: none;
  }

  .app-content {
    padding: 1rem;
    width: 100%;
  }
}

@media (max-width: 600px) {
  .brand-name {
    display: none;
  }

  .navbar-right {
    gap: 0.5rem;
  }

  .account-info {
    padding: 0.35rem 0.45rem;
  }

  .app-content {
    padding: 0.75rem;
  }
}
</style>
