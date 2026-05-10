<template>
  <div class="integram-info-page">
    <IntegramBreadcrumb :items="breadcrumbItems" />

    <section class="info-header">
      <div>
        <h1>Информация и диагностика</h1>
        <p>
          Системная сводка текущей базы Интеграма, окружения Vue-клиента и
          пользовательских рабочих ссылок.
        </p>
      </div>
      <div class="info-header-tags" aria-label="Текущая сессия">
        <Tag :value="displayDatabase" icon="fi fi-rr-database" severity="info" />
        <Tag :value="displayUser" icon="fi fi-rr-user" severity="success" />
        <Tag :value="displayRole" icon="fi fi-rr-shield" :severity="canSeeAdminSections ? 'warning' : 'secondary'" />
      </div>
    </section>

    <nav class="info-tabs" aria-label="Разделы информации">
      <button
        v-for="tab in visibleTabs"
        :key="tab.id"
        type="button"
        class="info-tab"
        :class="{ active: activeTab === tab.id }"
        :data-testid="`info-tab-${tab.id}`"
        @click="selectTab(tab.id)"
      >
        <i :class="tab.icon"></i>
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <section
      v-if="activeTab === 'diagnostics'"
      class="info-tab-content"
      data-testid="info-section-diagnostics"
    >
      <div class="info-grid">
        <article class="info-panel">
          <div class="info-panel-title">
            <i class="fi fi-rr-computer"></i>
            <h2>Среда выполнения</h2>
          </div>
          <dl class="info-kv">
            <template v-for="row in runtimeRows" :key="row.label">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </template>
          </dl>
        </article>

        <article class="info-panel">
          <div class="info-panel-title">
            <i class="fi fi-rr-database"></i>
            <h2>База данных</h2>
          </div>
          <dl class="info-kv">
            <template v-for="row in databaseRows" :key="row.label">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </template>
          </dl>
        </article>

        <article class="info-panel">
          <div class="info-panel-title">
            <i class="fi fi-rr-settings-sliders"></i>
            <h2>Окружение</h2>
          </div>
          <dl class="info-kv">
            <template v-for="row in environmentRows" :key="row.label">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </template>
          </dl>
        </article>

        <article v-if="canSeeAdminSections" class="info-panel info-panel-wide" data-testid="info-admin-debug">
          <div class="info-panel-title">
            <i class="fi fi-rr-bug"></i>
            <h2>Отладка</h2>
          </div>
          <pre class="info-debug-json">{{ formattedDebugData }}</pre>
        </article>

        <article v-else class="info-panel info-panel-wide" data-testid="info-debug-locked">
          <div class="info-panel-title">
            <i class="fi fi-rr-lock"></i>
            <h2>Отладка</h2>
          </div>
          <p class="info-muted">
            Отладочная информация, grants и служебные cookies доступны только
            администратору или владельцу базы.
          </p>
        </article>
      </div>
    </section>

    <section v-if="activeTab === 'forms'" class="info-tab-content" data-testid="info-section-forms">
      <div v-if="showFormsDescription" class="info-description">
        <p>
          На этой вкладке собраны пользовательские отчеты и формы, которые
          доступны в текущей базе данных.
        </p>
        <button type="button" class="info-link-button" @click="hideFormsDescription">
          Скрыть
        </button>
      </div>

      <div class="info-grid">
        <article class="info-panel">
          <div class="info-panel-title">
            <i class="fi fi-rr-chart-histogram"></i>
            <h2>Пользовательские отчеты</h2>
          </div>
          <div data-testid="info-report-list">
            <div v-if="normalizedReports.length === 0" class="info-empty">
              Нет пользовательских отчетов.
            </div>
            <template v-else>
              <a
                v-for="report in normalizedReports"
                :key="report.key"
                class="info-list-link"
                :class="{ priority: report.priority }"
                :href="report.href"
              >
                <span class="info-list-title">
                  <i :class="report.priority ? 'fi fi-rr-bolt' : 'fi fi-rr-document'"></i>
                  {{ report.name }}
                </span>
                <span class="info-list-description">{{ report.description }}</span>
              </a>
            </template>
          </div>
        </article>

        <article class="info-panel">
          <div class="info-panel-title">
            <i class="fi fi-rr-form"></i>
            <h2>Формы</h2>
          </div>
          <div data-testid="info-form-list">
            <div v-if="normalizedForms.length === 0" class="info-empty">
              Нет доступных форм.
            </div>
            <template v-else>
              <a
                v-for="form in normalizedForms"
                :key="form.key"
                class="info-list-link"
                :href="form.href"
              >
                <span class="info-list-title">
                  <i class="fi fi-rr-file"></i>
                  {{ form.name }}
                </span>
                <span class="info-list-description">{{ form.description }}</span>
              </a>
            </template>
          </div>
        </article>
      </div>
    </section>

    <section v-if="activeTab === 'intro' && canSeeAdminSections" class="info-tab-content" data-testid="info-section-intro">
      <div class="info-description">
        <div>
          <h2>Добро пожаловать в Интеграм</h2>
          <p>
            Это экземпляр Интеграма для работы с данными: таблицами, запросами,
            формами, файлами и правами пользователей.
          </p>
        </div>
      </div>

      <div class="info-actions">
        <article
          v-for="action in introActions"
          :key="action.id"
          class="info-action"
          :class="{ open: openAction === action.id }"
          :data-testid="`info-action-${action.id}`"
        >
          <button type="button" class="info-action-header" @click="toggleAction(action.id)">
            <span class="info-action-icon"><i :class="action.icon"></i></span>
            <span>{{ action.title }}</span>
            <i class="fi fi-rr-angle-small-down info-action-toggle"></i>
          </button>
          <div v-if="openAction === action.id" class="info-action-body">
            <p v-for="paragraph in action.paragraphs" :key="paragraph">{{ paragraph }}</p>
            <a v-if="action.href" class="info-action-link" :href="action.href">
              <i class="fi fi-rr-arrow-right"></i>
              {{ action.linkLabel }}
            </a>
            <div v-if="action.id === 'hints'" class="info-hint-controls">
              <button type="button" class="info-hint-button" @click="setHintsMode('enable')">
                <i class="fi fi-rr-bulb"></i>
                Включить
              </button>
              <button type="button" class="info-hint-button secondary" @click="setHintsMode('disable')">
                <i class="fi fi-rr-moon"></i>
                Отключить
              </button>
              <button
                type="button"
                class="info-hint-button danger"
                data-testid="info-hints-reset"
                @click="setHintsMode('reset')"
              >
                <i class="fi fi-rr-refresh"></i>
                Сбросить
              </button>
              <span class="info-hints-status">{{ hintsStatus }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import IntegramBreadcrumb from './IntegramBreadcrumb.vue'
import integramApiClient from '@/services/integramApiClient'

const props = defineProps({
  database: {
    type: String,
    default: ''
  },
  payload: {
    type: Object,
    default: null
  }
})

const COOKIE_ACTIVE_TAB = 'info_active_tab'
const COOKIE_HINTS_MODE = 'hints_mode'
const COOKIE_HINTS_SEEN = 'hints_seen_workspaces'
const COOKIE_FORMS_DESC_HIDDEN = 'info_forms_desc_hidden'

const activeTab = ref('diagnostics')
const openAction = ref('where-am-i')
const hintsStatus = ref('')
const showFormsDescription = ref(true)
const browserState = ref({
  route: '',
  userAgent: '',
  locale: '',
  viewport: ''
})

const breadcrumbItems = computed(() => [
  {
    label: 'Информация',
    icon: 'fi fi-rr-info',
    to: undefined
  }
])

const payloadSource = computed(() => {
  if (props.payload) return props.payload
  if (typeof window !== 'undefined' && window.infoPayload && typeof window.infoPayload === 'object') {
    return window.infoPayload
  }
  return {}
})

const storedSession = computed(() => readStoredSession())
const authInfo = computed(() => {
  try {
    return integramApiClient.getAuthInfo?.() || {}
  } catch {
    return {}
  }
})

const grants = computed(() => {
  const payload = payloadSource.value
  const session = storedSession.value
  const dbName = displayDatabase.value
  return payload.grants ||
    getWindowValue('grants') ||
    authInfo.value.grants ||
    session.databases?.[dbName]?.grants ||
    session.grants ||
    {}
})

const sessionInfo = computed(() => {
  const payloadSession = payloadSource.value.session || {}
  const session = storedSession.value
  const dbName = props.database ||
    payloadSession.database ||
    authInfo.value.database ||
    session.currentDatabase ||
    session.database ||
    getWindowValue('db') ||
    readLocalStorage('db') ||
    integramApiClient.getDatabase?.() ||
    'my'
  const dbSession = session.databases?.[dbName] || {}

  return {
    database: dbName,
    authDatabase: payloadSession.authDatabase || authInfo.value.authDatabase || session.authDatabase || dbSession.authDatabase || dbName,
    userId: payloadSession.userId || authInfo.value.userId || session.userId || dbSession.userId || getWindowValue('userId') || readLocalStorage('id') || '',
    userName: payloadSession.userName || authInfo.value.userName || session.userName || dbSession.userName || getWindowValue('user') || readLocalStorage('user') || 'unknown',
    userRole: payloadSession.userRole || authInfo.value.userRole || session.userRole || dbSession.userRole || getWindowValue('role') || 'user',
    roleId: payloadSession.roleId || authInfo.value.roleId || session.roleId || dbSession.roleId || getWindowValue('roleId') || '',
    tokenPresent: Boolean(payloadSession.token || authInfo.value.token || session.token || dbSession.token || readLocalStorage('token')),
    xsrfPresent: Boolean(payloadSession.xsrf || payloadSession.xsrfToken || authInfo.value.xsrf || session.xsrfToken || dbSession.xsrfToken || readLocalStorage('_xsrf'))
  }
})

const runtimeInfo = computed(() => payloadSource.value.runtime || {})
const environmentInfo = computed(() => payloadSource.value.environment || {})

const displayDatabase = computed(() => sessionInfo.value.database || 'my')
const displayUser = computed(() => sessionInfo.value.userName || 'unknown')
const displayRole = computed(() => sessionInfo.value.userRole || 'user')
const isOwner = computed(() => displayUser.value && displayDatabase.value && displayUser.value === displayDatabase.value)
const hasStructureWriteGrant = computed(() => String(grants.value?.['1'] || '').toUpperCase() === 'WRITE')
const canSeeAdminSections = computed(() => {
  const role = String(displayRole.value || '').toLowerCase()
  return Boolean(
    payloadSource.value.permissions?.admin ||
    isOwner.value ||
    role === 'admin' ||
    role === 'owner' ||
    role === 'superuser' ||
    hasStructureWriteGrant.value
  )
})

const visibleTabs = computed(() => {
  const tabs = [
    { id: 'diagnostics', label: 'Диагностика', icon: 'fi fi-rr-pulse' },
    { id: 'forms', label: 'Формы и отчеты', icon: 'fi fi-rr-file-chart-line' }
  ]
  if (canSeeAdminSections.value) {
    tabs.push({ id: 'intro', label: 'Вводная', icon: 'fi fi-rr-home' })
  }
  return tabs
})

const runtimeRows = computed(() => [
  { label: 'Версия приложения', value: runtimeInfo.value.appVersion || '1.0.0' },
  { label: 'Frontend', value: runtimeInfo.value.frontend || 'Vue 3' },
  { label: 'Режим сборки', value: environmentInfo.value.mode || getImportMode() },
  { label: 'Сформировано', value: formatDateTime(runtimeInfo.value.generatedAt || new Date().toISOString()) },
  { label: 'Текущий маршрут', value: environmentInfo.value.route || browserState.value.route || '/' }
])

const databaseRows = computed(() => [
  { label: 'База данных', value: displayDatabase.value },
  { label: 'Сервер API', value: environmentInfo.value.server || getServer() },
  { label: 'Авторизационная база', value: sessionInfo.value.authDatabase || displayDatabase.value },
  { label: 'Пользователь', value: displayUser.value },
  { label: 'ID пользователя', value: sessionInfo.value.userId || 'не указан' },
  { label: 'Роль', value: displayRole.value },
  { label: 'ID роли', value: sessionInfo.value.roleId || 'не указан' },
  { label: 'Владелец базы', value: isOwner.value ? 'да' : 'нет' },
  { label: 'Токен авторизации', value: sessionInfo.value.tokenPresent ? 'есть' : 'нет' },
  { label: 'XSRF токен', value: sessionInfo.value.xsrfPresent ? 'есть' : 'нет' }
])

const environmentRows = computed(() => [
  { label: 'Base URL', value: getBaseUrl() },
  { label: 'API mode', value: getApiMode(environmentInfo.value.server || getServer()) },
  { label: 'Язык браузера', value: browserState.value.locale || 'не определен' },
  { label: 'Viewport', value: browserState.value.viewport || 'не определен' },
  { label: 'User agent', value: browserState.value.userAgent || 'не определен' }
])

const normalizedReports = computed(() => {
  return toArray(payloadSource.value.reports || payloadSource.value.userReports || payloadSource.value.quickLinks)
    .map((item, index) => normalizeReport(item, index))
})

const normalizedForms = computed(() => {
  return toArray(payloadSource.value.forms)
    .map((item, index) => normalizeForm(item, index))
})

const formattedDebugData = computed(() => {
  return JSON.stringify({
    session: {
      database: displayDatabase.value,
      authDatabase: sessionInfo.value.authDatabase,
      userId: sessionInfo.value.userId,
      userName: displayUser.value,
      userRole: displayRole.value,
      roleId: sessionInfo.value.roleId,
      tokenPresent: sessionInfo.value.tokenPresent,
      xsrfPresent: sessionInfo.value.xsrfPresent
    },
    grants: grants.value,
    cookies: payloadSource.value.debug?.cookies || readInfoCookies(),
    localStorageKeys: payloadSource.value.debug?.localStorageKeys || readLocalStorageKeys(),
    environment: {
      mode: environmentInfo.value.mode || getImportMode(),
      server: environmentInfo.value.server || getServer(),
      route: environmentInfo.value.route || browserState.value.route
    }
  }, null, 2)
})

const introActions = computed(() => [
  {
    id: 'where-am-i',
    icon: 'fi fi-rr-map-marker',
    title: 'Где я нахожусь?',
    paragraphs: [
      'Вы находитесь на главной странице текущей базы Интеграма.',
      'Слева находится меню рабочих мест, а вверху отображается текущая сессия и база.',
      'Владелец или администратор может изменять структуру, файлы и права пользователей.'
    ],
    href: `/${displayDatabase.value}/dir_admin`,
    linkLabel: 'Перейти к файлам'
  },
  {
    id: 'hints',
    icon: 'fi fi-rr-question',
    title: 'Включить / отключить / сбросить режим подсказок',
    paragraphs: [
      'Подсказки показываются в рабочих местах краткими окнами. После первого показа они скрываются, пока режим не будет сброшен.'
    ]
  },
  {
    id: 'tables',
    icon: 'fi fi-rr-table',
    title: 'Посмотреть какие таблицы есть в системе',
    paragraphs: [
      'Даже в пустой системе уже есть базовые таблицы: пользователи, роли, запросы и связанные справочники.'
    ],
    href: `/${displayDatabase.value}/table`,
    linkLabel: 'Перейти к таблицам'
  },
  {
    id: 'upload',
    icon: 'fi fi-rr-upload',
    title: 'Загрузить данные из файла в таблицу',
    paragraphs: [
      'Загрузка позволяет добавить данные в существующую таблицу или создать новую таблицу из файла.'
    ],
    href: `/${displayDatabase.value}/upload`,
    linkLabel: 'Перейти к загрузке'
  },
  {
    id: 'users',
    icon: 'fi fi-rr-users',
    title: 'Раздать права пользователям в этой базе данных',
    paragraphs: [
      'В таблице пользователей хранятся учетные записи и роли, через которые выдаются права доступа.'
    ],
    href: `/${displayDatabase.value}/table/18`,
    linkLabel: 'Перейти к пользователям'
  }
])

watch(visibleTabs, (tabs) => {
  if (!tabs.some((tab) => tab.id === activeTab.value)) {
    activeTab.value = 'diagnostics'
  }
}, { immediate: true })

onMounted(() => {
  browserState.value = getBrowserState()
  showFormsDescription.value = getCookie(COOKIE_FORMS_DESC_HIDDEN) !== '1'
  const savedTab = getCookie(COOKIE_ACTIVE_TAB)
  if (savedTab && visibleTabs.value.some((tab) => tab.id === savedTab)) {
    activeTab.value = savedTab
  }
  updateHintsStatus()
})

function selectTab(tabId) {
  if (!visibleTabs.value.some((tab) => tab.id === tabId)) return
  activeTab.value = tabId
  setCookie(COOKIE_ACTIVE_TAB, tabId, 365)
}

function toggleAction(actionId) {
  openAction.value = openAction.value === actionId ? '' : actionId
}

function setHintsMode(action) {
  if (!canSeeAdminSections.value) return

  if (action === 'enable') {
    setCookie(COOKIE_HINTS_MODE, 'on', 365)
    hintsStatus.value = 'Режим подсказок включен.'
  } else if (action === 'disable') {
    setCookie(COOKIE_HINTS_MODE, 'off', 365)
    hintsStatus.value = 'Режим подсказок отключен.'
  } else if (action === 'reset') {
    setCookie(COOKIE_HINTS_MODE, 'on', 365)
    setCookie(COOKIE_HINTS_SEEN, '', 365)
    deleteCookiesByMask('table_info_', '_seen')
    hintsStatus.value = 'Режим подсказок сброшен.'
  }
}

function hideFormsDescription() {
  setCookie(COOKIE_FORMS_DESC_HIDDEN, '1', 365)
  showFormsDescription.value = false
}

function updateHintsStatus() {
  const mode = getCookie(COOKIE_HINTS_MODE) || payloadSource.value.debug?.cookies?.hints_mode
  hintsStatus.value = mode === 'off' ? 'Режим подсказок отключен.' : 'Режим подсказок включен.'
}

function normalizeReport(item, index) {
  const id = item.id ?? item.reportId ?? item.queryId ?? item['ЗапросID'] ?? index
  const format = item.format ?? item['Формат отчета'] ?? 'report'
  return {
    key: `${format}-${id}-${index}`,
    id,
    format,
    name: item.name ?? item.title ?? item['Запрос'] ?? `Отчет ${id}`,
    description: item.description ?? item['Описание'] ?? '',
    priority: item.priority === true || item.priority === 'X' || item['приоритет'] === 'X',
    href: item.href || `/${displayDatabase.value}/${format}/${id}`
  }
}

function normalizeForm(item, index) {
  const id = item.id ?? item.formId ?? item['ФормаID'] ?? item['ЗапросID'] ?? index
  return {
    key: `form-${id}-${index}`,
    id,
    name: item.name ?? item.title ?? item['Наименование'] ?? item['Вычисляемое'] ?? `Форма ${id}`,
    description: item.description ?? item['Описание'] ?? '',
    href: item.href || `/${displayDatabase.value}/form/${id}`
  }
}

function getServer() {
  try {
    return integramApiClient.getServer?.() || readLocalStorage('integram_server') || ''
  } catch {
    return readLocalStorage('integram_server') || ''
  }
}

function getBaseUrl() {
  if (typeof window === 'undefined') return '/'
  return window.location.origin || '/'
}

function getApiMode(server) {
  if (!server) return 'не определен'
  return /localhost|127\.0\.0\.1|dronedoc\.ru|sakhwings\.ru/.test(server)
    ? 'legacy path'
    : 'api proxy'
}

function getImportMode() {
  return import.meta.env?.MODE || 'production'
}

function getBrowserState() {
  if (typeof window === 'undefined') return {}
  return {
    route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    userAgent: navigator.userAgent || '',
    locale: navigator.language || '',
    viewport: `${window.innerWidth}x${window.innerHeight}`
  }
}

function readStoredSession() {
  try {
    const raw = readLocalStorage('integram_session')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function readLocalStorage(key) {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(key) || ''
}

function readLocalStorageKeys() {
  if (typeof localStorage === 'undefined') return []
  return Object.keys(localStorage).sort()
}

function getWindowValue(key) {
  if (typeof window === 'undefined') return undefined
  return window[key]
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function getCookie(name) {
  if (typeof document === 'undefined') return null
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name, value, days) {
  if (typeof document === 'undefined') return
  const expires = days
    ? `; expires=${new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()}`
    : ''
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/`
}

function deleteCookiesByMask(prefix, suffix) {
  if (typeof document === 'undefined') return
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.trim().split('=')[0]
    if (name.startsWith(prefix) && name.endsWith(suffix)) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    }
  })
}

function readInfoCookies() {
  if (typeof document === 'undefined') return {}
  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce((acc, cookie) => {
      const [name, ...rest] = cookie.split('=')
      if (
        name === COOKIE_ACTIVE_TAB ||
        name === COOKIE_HINTS_MODE ||
        name === COOKIE_HINTS_SEEN ||
        name === COOKIE_FORMS_DESC_HIDDEN ||
        (name.startsWith('table_info_') && name.endsWith('_seen'))
      ) {
        acc[name] = decodeURIComponent(rest.join('='))
      }
      return acc
    }, {})
}

function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value || '')
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.integram-info-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-card);
}

.info-header h1 {
  margin: 0 0 0.35rem;
  font-size: 1.5rem;
  line-height: 1.2;
}

.info-header p {
  max-width: 56rem;
  margin: 0;
  color: var(--text-color-secondary);
  line-height: 1.5;
}

.info-header-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.info-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-bottom: 1px solid var(--surface-border);
}

.info-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.5rem;
  padding: 0 0.875rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--text-color-secondary);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}

.info-tab:hover,
.info-tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.info-tab-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.info-panel {
  min-width: 0;
  padding: 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-card);
}

.info-panel-wide {
  grid-column: 1 / -1;
}

.info-panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.875rem;
  color: var(--text-color);
}

.info-panel-title h2 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.3;
}

.info-panel-title i {
  color: var(--primary-color);
}

.info-kv {
  display: grid;
  grid-template-columns: minmax(8rem, 0.8fr) minmax(0, 1.2fr);
  gap: 0.5rem 0.875rem;
  margin: 0;
}

.info-kv dt {
  color: var(--text-color-secondary);
}

.info-kv dd {
  min-width: 0;
  margin: 0;
  color: var(--text-color);
  overflow-wrap: anywhere;
}

.info-debug-json {
  max-height: 22rem;
  margin: 0;
  padding: 0.875rem;
  overflow: auto;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-ground);
  color: var(--text-color);
  font-size: 0.85rem;
  line-height: 1.45;
}

.info-description {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-ground);
}

.info-description h2 {
  margin: 0 0 0.35rem;
  font-size: 1.1rem;
}

.info-description p {
  margin: 0;
  color: var(--text-color-secondary);
  line-height: 1.5;
}

.info-link-button {
  flex-shrink: 0;
  min-height: 2rem;
  padding: 0 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-card);
  color: var(--text-color-secondary);
  cursor: pointer;
  font: inherit;
}

.info-list-link {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--surface-border);
  color: var(--text-color);
  text-decoration: none;
}

.info-list-link:first-child {
  border-top: 0;
}

.info-list-link:hover .info-list-title {
  color: var(--primary-color);
}

.info-list-link.priority .info-list-title {
  color: var(--orange-600, #c2410c);
}

.info-list-title {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 700;
}

.info-list-description,
.info-empty,
.info-muted {
  color: var(--text-color-secondary);
  line-height: 1.5;
}

.info-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-action {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-card);
}

.info-action-header {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr) 1.25rem;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 3.25rem;
  padding: 0 1rem;
  border: 0;
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-align: left;
}

.info-action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  background: var(--surface-ground);
  color: var(--primary-color);
}

.info-action-toggle {
  color: var(--text-color-secondary);
  transition: transform 0.15s ease;
}

.info-action.open .info-action-toggle {
  transform: rotate(180deg);
}

.info-action-body {
  padding: 0.875rem 1rem 1rem 3.75rem;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-ground);
}

.info-action-body p {
  margin: 0 0 0.75rem;
  color: var(--text-color-secondary);
  line-height: 1.5;
}

.info-action-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--primary-color);
  font-weight: 700;
  text-decoration: none;
}

.info-hint-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.info-hint-button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.125rem;
  padding: 0 0.75rem;
  border: 1px solid var(--primary-color);
  border-radius: 6px;
  background: var(--primary-color);
  color: var(--primary-color-text);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.info-hint-button.secondary {
  background: var(--surface-card);
  color: var(--text-color);
  border-color: var(--surface-border);
}

.info-hint-button.danger {
  background: var(--red-600, #dc2626);
  border-color: var(--red-600, #dc2626);
  color: #fff;
}

.info-hints-status {
  min-height: 1.25rem;
  color: var(--text-color-secondary);
}

@media (max-width: 960px) {
  .info-header {
    flex-direction: column;
  }

  .info-header-tags {
    justify-content: flex-start;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .info-description {
    align-items: flex-start;
    flex-direction: column;
  }

  .info-kv {
    grid-template-columns: 1fr;
  }

  .info-action-body {
    padding-left: 1rem;
  }
}
</style>
