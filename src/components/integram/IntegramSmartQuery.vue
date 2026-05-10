<template>
  <div class="integram-smart-query-page">
    <Toast />

    <div class="mb-3">
      <IntegramBreadcrumb :items="breadcrumbItems" />
    </div>

    <header class="smartq-toolbar">
      <div class="smartq-heading">
        <Button
          v-if="selectedReportId"
          icon="fi fi-rr-arrow-left"
          text
          rounded
          size="small"
          :aria-label="'К списку SmartQ'"
          @click="closeReport"
        />
        <div>
          <h2 data-testid="smartq-title">{{ pageTitle }}</h2>
          <p v-if="selectedReportId" class="smartq-subtitle">
            ID {{ selectedReportId }}
          </p>
        </div>
      </div>

      <div class="smartq-search" data-testid="smartq-search">
        <IconField>
          <InputIcon class="fi fi-rr-search" />
          <InputText
            v-model="reportSearch"
            class="w-full"
            placeholder="Найти SmartQ"
            @focus="openSuggestions"
            @input="onReportSearchInput"
          />
        </IconField>

        <div v-if="showSuggestions" class="smartq-suggestions" data-testid="smartq-suggestions">
          <button
            v-for="report in reports"
            :key="report.id"
            type="button"
            class="smartq-suggestion"
            :data-testid="`smartq-suggestion-${report.id}`"
            @mousedown.prevent="selectReport(report.id)"
          >
            <span>{{ report.name }}</span>
            <small>ID {{ report.id }}</small>
          </button>
          <div v-if="!loadingList && reports.length === 0" class="smartq-suggestion-empty">
            SmartQ не найдены
          </div>
        </div>
      </div>

      <div class="smartq-actions">
        <Button
          icon="fi fi-rr-refresh"
          outlined
          rounded
          size="small"
          :loading="loadingList || executingReport"
          :aria-label="'Обновить'"
          @click="refreshCurrentView"
        />
        <Button
          v-if="selectedReportId"
          icon="fi fi-rr-edit"
          outlined
          rounded
          size="small"
          :aria-label="'Открыть SQL-конструктор'"
          @click="openSqlBuilder"
        />
      </div>
    </header>

    <Message v-if="listError" severity="error" :closable="false" class="mb-3">
      {{ listError }}
    </Message>

    <section v-if="!selectedReportId" class="smartq-list">
      <div v-if="loadingList && reports.length === 0" class="smartq-loading" data-testid="smartq-list-loading">
        <ProgressSpinner />
        <span>Загрузка SmartQ...</span>
      </div>

      <div v-else-if="reports.length === 0" class="smartq-empty" data-testid="smartq-empty">
        <i class="fi fi-rr-search"></i>
        <span>SmartQ не найдены</span>
      </div>

      <DataTable
        v-else
        :value="reports"
        :loading="loadingList"
        :paginator="true"
        :rows="pageSize"
        :totalRecords="totalRecords"
        :lazy="true"
        stripedRows
        showGridlines
        responsiveLayout="scroll"
        class="smartq-report-table"
        @row-click="onReportSelect"
        @page="onPageChange"
      >
        <Column field="id" header="ID" style="width: 8rem" />
        <Column field="name" header="Название" />
        <Column field="updated_at" header="Обновлен" style="width: 14rem">
          <template #body="{ data }">
            {{ formatDate(data.updated_at) }}
          </template>
        </Column>
        <Column header="" style="width: 8rem">
          <template #body="{ data }">
            <Button
              label="Открыть"
              icon="fi fi-rr-eye"
              size="small"
              outlined
              @click.stop="selectReport(data.id)"
            />
          </template>
        </Column>
      </DataTable>
    </section>

    <section v-else class="smartq-workspace">
      <main class="smartq-report-panel">
        <Message v-if="reportError" severity="error" :closable="false" data-testid="smartq-report-error">
          {{ reportError }}
        </Message>

        <div v-if="executingReport && !reportData" class="smartq-loading" data-testid="smartq-report-loading">
          <ProgressSpinner />
          <span>Выполнение SmartQ...</span>
        </div>

        <IntegramReportViewer
          v-else-if="reportData"
          :reportId="selectedReportId"
          :reportData="reportData.rows"
          :columns="reportData.columns"
          :totals="reportData.totals"
          :loading="executingReport"
          :title="reportData.report_name"
          :initialFilters="reportFilters"
          filterMode="server"
          data-testid="smartq-report-viewer"
          @refresh="executeReport"
          @apply-filters="applyReportFilters"
          @clear-filters="clearReportFilters"
          @go-home="closeReport"
        />

        <div v-else-if="!reportError" class="smartq-empty" data-testid="smartq-report-empty">
          <i class="fi fi-rr-inbox"></i>
          <span>Нет данных для отображения</span>
        </div>
      </main>

      <aside class="smartq-chat-panel" data-testid="smartq-chat">
        <div class="smartq-chat-header">
          <h3>AI-chat</h3>
          <Button
            icon="fi fi-rr-trash"
            text
            rounded
            size="small"
            :disabled="chatMessages.length === 0 || chatLoading"
            :aria-label="'Очистить историю'"
            @click="clearChat"
          />
        </div>

        <div class="smartq-chat-messages" data-testid="smartq-chat-messages">
          <div v-if="chatMessages.length === 0" class="smartq-chat-empty">
            История сообщений пуста
          </div>
          <article
            v-for="message in chatMessages"
            :key="message.id"
            class="smartq-chat-message"
            :class="`smartq-chat-message-${message.role}`"
            data-testid="smartq-chat-message"
          >
            <span class="smartq-message-role">{{ message.role === 'user' ? 'Вы' : 'AI' }}</span>
            <div class="smartq-message-content" v-html="sanitizeMessage(message)" />
          </article>
          <div v-if="chatLoading" class="smartq-chat-loading" data-testid="smartq-chat-loading">
            <ProgressSpinner style="width: 1.5rem; height: 1.5rem" />
            <span>AI отвечает...</span>
          </div>
        </div>

        <Message v-if="chatError" severity="error" :closable="false" class="mb-2" data-testid="smartq-chat-error">
          {{ chatError }}
        </Message>

        <div class="smartq-quick-prompts">
          <Button
            v-for="prompt in quickPrompts"
            :key="prompt"
            :label="prompt"
            size="small"
            text
            @click="chatDraft = prompt"
          />
        </div>

        <form class="smartq-chat-form" @submit.prevent="sendChatMessage">
          <MentionAutocomplete
            v-model="chatDraft"
            :database="database"
            data-testid="smartq-chat-input"
            placeholder="Спросить по результатам..."
            @keydown.enter.exact.prevent="sendChatMessage"
          />
          <Button
            icon="fi fi-rr-paper-plane"
            type="submit"
            :loading="chatLoading"
            :disabled="!chatDraft.trim() || chatLoading"
            :aria-label="'Отправить сообщение'"
            data-testid="smartq-chat-send"
          />
        </form>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import DOMPurify from 'dompurify'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'

import IntegramBreadcrumb from './IntegramBreadcrumb.vue'
import IntegramReportViewer from './IntegramReportViewer.vue'
import MentionAutocomplete from './MentionAutocomplete.vue'
import integramService from '@/services/integramService'
import { logger } from '@/utils/logger'
import {
  deserializeReportFilters,
  normalizeReportResponse,
  withoutReportFilterParams
} from '@/utils/reportData'
import {
  getSmartQueryLimit,
  getSmartQueryTitle,
  isSmartQueryEditData,
  normalizeSmartQueryChatResponse,
  normalizeSmartQueryParams,
  normalizeSmartQuerySuggestions,
  serializeSmartQueryFilters,
  serializeSmartQueryFilterValue,
  SMART_QUERY_TYPE_ID
} from '@/utils/smartQuery'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const loadingList = ref(false)
const executingReport = ref(false)
const reports = ref([])
const totalRecords = ref(0)
const pageSize = ref(20)
const reportSearch = ref('')
const showSuggestions = ref(false)
const listError = ref(null)

const reportMeta = ref(null)
const reportData = ref(null)
const reportError = ref(null)
const reportParams = ref({})
const reportFilters = ref({})

const chatMessages = ref([])
const chatDraft = ref('')
const chatLoading = ref(false)
const chatError = ref(null)

const quickPrompts = [
  'Кратко объясни результат',
  'Найди необычные значения',
  'Что проверить дальше?'
]

const selectedReportId = computed(() => {
  const reportId = route.params.reportId
  return reportId === undefined || reportId === null || reportId === 'undefined' ? null : String(reportId)
})

const database = computed(() => route.params.database || 'my')

const pageTitle = computed(() => {
  if (selectedReportId.value) {
    return reportData.value?.report_name || getSmartQueryTitle(reportMeta.value, `SmartQ #${selectedReportId.value}`)
  }
  return 'SmartQ'
})

const breadcrumbItems = computed(() => {
  const items = [
    {
      label: 'SmartQ',
      icon: 'fi fi-rr-search',
      to: selectedReportId.value ? `/${database.value}/smartq` : undefined
    }
  ]

  if (selectedReportId.value) {
    items.push({
      label: pageTitle.value,
      icon: 'fi fi-rr-chart-histogram'
    })
  }

  return items
})

const chatStorageKey = computed(() => {
  const id = selectedReportId.value || 'list'
  return `integram:smartq:${database.value}:${id}:chat`
})

onMounted(() => {
  loadForRoute()
})

watch(
  () => [route.params.database, route.params.reportId],
  () => {
    loadForRoute()
  }
)

watch(chatMessages, persistChatHistory, { deep: true })

async function loadForRoute() {
  loadChatHistory()
  listError.value = null
  reportError.value = null

  if (selectedReportId.value) {
    showSuggestions.value = false
    await loadSmartQuery(selectedReportId.value)
  } else {
    reportMeta.value = null
    reportData.value = null
    reportFilters.value = {}
    reportParams.value = {}
    await loadReportList()
  }
}

async function loadReportList(page = 1, size = pageSize.value) {
  loadingList.value = true
  listError.value = null

  try {
    const query = reportSearch.value.trim()
    const params = {
      LIMIT: size,
      pg: page
    }

    if (query) {
      params.F_22 = serializeSmartQueryFilterValue(query)
    }

    const response = await integramService.getObjects(SMART_QUERY_TYPE_ID, params)
    reports.value = normalizeSmartQuerySuggestions(response)
    totalRecords.value = response?.total_objects ?? response?.total ?? response?.count ?? reports.value.length
  } catch (error) {
    logger.error('Failed to load SmartQ list:', error)
    reports.value = []
    totalRecords.value = 0
    listError.value = error.message || 'Не удалось загрузить SmartQ'
  } finally {
    loadingList.value = false
  }
}

async function loadSmartQuery(reportId) {
  executingReport.value = true
  reportMeta.value = null
  reportData.value = null
  reportError.value = null

  try {
    const editData = await integramService.getEditObject(reportId)
    if (!isSmartQueryEditData(editData)) {
      throw new Error(`Объект #${reportId} не является SmartQ отчетом`)
    }

    reportMeta.value = editData
    const params = normalizeSmartQueryParams(route.query, getSmartQueryLimit(editData))
    await fetchReport(reportId, params)
  } catch (error) {
    logger.error(`Failed to load SmartQ ${reportId}:`, error)
    reportError.value = error.message || 'Не удалось загрузить SmartQ'
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: reportError.value,
      life: 5000
    })
  } finally {
    executingReport.value = false
  }
}

async function fetchReport(reportId, params = reportParams.value) {
  reportParams.value = normalizeSmartQueryParams(params, getSmartQueryLimit(reportMeta.value))
  const startTime = performance.now()
  const response = await integramService.executeReport(reportId, reportParams.value)
  const executionTimeMs = performance.now() - startTime

  reportData.value = normalizeReportResponse(response, {
    reportId,
    reportName: getSmartQueryTitle(reportMeta.value, `SmartQ #${reportId}`),
    executionTimeMs
  })
  reportFilters.value = deserializeReportFilters(reportParams.value, reportData.value.columns)
}

async function executeReport(params = reportParams.value) {
  if (!selectedReportId.value) return

  executingReport.value = true
  reportError.value = null

  try {
    await fetchReport(selectedReportId.value, params)
  } catch (error) {
    logger.error(`Failed to execute SmartQ ${selectedReportId.value}:`, error)
    reportError.value = error.message || 'Не удалось выполнить SmartQ'
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: reportError.value,
      life: 5000
    })
  } finally {
    executingReport.value = false
  }
}

async function applyReportFilters(filters) {
  const serializedFilters = serializeSmartQueryFilters(filters, reportData.value?.columns || [])
  reportParams.value = {
    ...withoutReportFilterParams(reportParams.value),
    ...serializedFilters
  }

  await syncReportQuery(reportParams.value)
  await executeReport(reportParams.value)
}

async function clearReportFilters() {
  reportParams.value = withoutReportFilterParams(reportParams.value)
  reportFilters.value = {}

  await syncReportQuery(reportParams.value)
  await executeReport(reportParams.value)
}

function onReportSelect(event) {
  selectReport(event.data.id)
}

function onPageChange(event) {
  pageSize.value = event.rows
  loadReportList(event.page + 1, event.rows)
}

async function selectReport(reportId) {
  await router.push({
    name: 'IntegramSmartQuery',
    params: {
      database: database.value,
      reportId: String(reportId)
    },
    query: {}
  })
}

async function closeReport() {
  await router.push({
    name: 'IntegramSmartQuery',
    params: {
      database: database.value
    },
    query: {}
  })
}

function syncReportQuery(params) {
  if (!selectedReportId.value) return Promise.resolve()

  return router.replace({
    name: 'IntegramSmartQuery',
    params: {
      database: database.value,
      reportId: selectedReportId.value
    },
    query: params
  })
}

function openSuggestions() {
  showSuggestions.value = true
  if (reports.value.length === 0) {
    loadReportList()
  }
}

function onReportSearchInput() {
  showSuggestions.value = true
  loadReportList()
}

function refreshCurrentView() {
  if (selectedReportId.value) {
    executeReport()
  } else {
    loadReportList()
  }
}

function openSqlBuilder() {
  if (!selectedReportId.value) return

  router.push({
    name: 'IntegramSql',
    params: {
      database: database.value,
      reportId: selectedReportId.value
    }
  })
}

async function sendChatMessage() {
  const content = chatDraft.value.trim()
  if (!content || chatLoading.value) return

  const userMessage = {
    id: `user-${Date.now()}`,
    role: 'user',
    content,
    createdAt: new Date().toISOString()
  }

  chatMessages.value.push(userMessage)
  chatDraft.value = ''
  chatLoading.value = true
  chatError.value = null

  try {
    const response = await integramService.sendAiChatMessage({
      message: content,
      history: chatMessages.value,
      reportId: selectedReportId.value,
      database: database.value
    })

    chatMessages.value.push(...normalizeSmartQueryChatResponse(response))
  } catch (error) {
    logger.error('Failed to send SmartQ AI-chat message:', error)
    chatError.value = error.message || 'Не удалось отправить сообщение'
  } finally {
    chatLoading.value = false
  }
}

function clearChat() {
  chatMessages.value = []
  chatError.value = null
  persistChatHistory()
}

function loadChatHistory() {
  if (typeof window === 'undefined') return

  try {
    const raw = window.localStorage.getItem(chatStorageKey.value)
    chatMessages.value = raw ? JSON.parse(raw) : []
  } catch {
    chatMessages.value = []
  }
}

function persistChatHistory() {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(chatStorageKey.value, JSON.stringify(chatMessages.value))
  } catch {
    // Ignore storage quota and private-mode errors; chat still works for the session.
  }
}

function sanitizeMessage(message) {
  const html = message.html || escapeHtml(message.content).replace(/\n/g, '<br>')
  const clean = DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS: ['a', 'b', 'br', 'code', 'div', 'em', 'i', 'li', 'ol', 'p', 'pre', 's', 'span', 'strong', 'ul'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  })

  return clean.replace(/<a\s/gi, '<a target="_blank" rel="noopener noreferrer" ')
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(dateString) {
  if (!dateString) return '-'

  try {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}
</script>

<style scoped>
.integram-smart-query-page {
  padding: 1rem;
  width: 100%;
}

.smartq-toolbar {
  align-items: center;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(12rem, 1fr) minmax(16rem, 28rem) auto;
  margin-bottom: 1rem;
  padding: 0.875rem;
}

.smartq-heading {
  align-items: center;
  display: flex;
  gap: 0.75rem;
  min-width: 0;
}

.smartq-heading h2 {
  font-size: 1.35rem;
  line-height: 1.2;
  margin: 0;
  overflow-wrap: anywhere;
}

.smartq-subtitle {
  color: var(--text-color-secondary);
  font-size: 0.8125rem;
  margin: 0.125rem 0 0;
}

.smartq-search {
  position: relative;
}

.smartq-suggestions {
  background: var(--surface-overlay);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  box-shadow: 0 0.75rem 1.5rem rgba(0, 0, 0, 0.12);
  left: 0;
  max-height: 22rem;
  overflow: auto;
  position: absolute;
  right: 0;
  top: calc(100% + 0.25rem);
  z-index: 30;
}

.smartq-suggestion {
  align-items: center;
  background: transparent;
  border: 0;
  color: var(--text-color);
  cursor: pointer;
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  padding: 0.75rem;
  text-align: left;
  width: 100%;
}

.smartq-suggestion:hover {
  background: var(--surface-hover);
}

.smartq-suggestion small,
.smartq-suggestion-empty {
  color: var(--text-color-secondary);
}

.smartq-suggestion-empty {
  padding: 0.75rem;
}

.smartq-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.smartq-workspace {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 24rem);
}

.smartq-report-panel,
.smartq-chat-panel,
.smartq-list {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  min-width: 0;
  padding: 1rem;
}

.smartq-report-table :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
}

.smartq-loading,
.smartq-empty {
  align-items: center;
  color: var(--text-color-secondary);
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  min-height: 12rem;
}

.smartq-empty i {
  font-size: 1.75rem;
}

.smartq-chat-panel {
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: calc(100vh - 12rem);
}

.smartq-chat-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.smartq-chat-header h3 {
  font-size: 1.05rem;
  margin: 0;
}

.smartq-chat-messages {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 14rem;
  overflow-y: auto;
}

.smartq-chat-empty,
.smartq-chat-loading {
  align-items: center;
  color: var(--text-color-secondary);
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  min-height: 6rem;
}

.smartq-chat-message {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 0.75rem;
}

.smartq-chat-message-user {
  background: var(--surface-50);
}

.smartq-message-role {
  color: var(--text-color-secondary);
  display: block;
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.smartq-message-content {
  overflow-wrap: anywhere;
}

.smartq-quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.smartq-chat-form {
  align-items: center;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: minmax(0, 1fr) auto;
}

@media (max-width: 960px) {
  .smartq-toolbar,
  .smartq-workspace {
    grid-template-columns: 1fr;
  }

  .smartq-actions {
    justify-content: flex-start;
  }

  .smartq-chat-panel {
    max-height: none;
  }
}
</style>
