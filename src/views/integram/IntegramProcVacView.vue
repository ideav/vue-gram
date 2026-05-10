<template>
  <div class="procvac-page" data-testid="procvac-workspace">
    <Toast />
    <IntegramBreadcrumb :items="breadcrumbItems" :database="database" />

    <section class="procvac" :aria-busy="loading ? 'true' : 'false'">
      <div class="procvac-toolbar">
        <button
          class="procvac-add-vacancy"
          type="button"
          title="Добавить вакансию"
          aria-label="Добавить вакансию"
          @click="openVacancyWorkflow"
        >
          <i class="fi fi-rr-plus"></i>
        </button>

        <div class="procvac-heading">
          <h1>ProcVac</h1>
          <span>{{ summaryLabel }}</span>
        </div>

        <div class="procvac-search">
          <i class="fi fi-rr-search"></i>
          <input
            v-model="search"
            type="search"
            placeholder="Быстрый поиск"
            autocomplete="off"
            aria-label="Быстрый поиск"
          >
        </div>

        <button
          class="procvac-refresh"
          type="button"
          title="Обновить"
          aria-label="Обновить"
          :disabled="loading"
          @click="loadData"
        >
          <i class="fi fi-rr-refresh" :class="{ 'fi-spin': loading }"></i>
        </button>
      </div>

      <div v-if="loading && !columns.length" class="procvac-loading">
        <span class="procvac-spinner"></span>
        <span>Загрузка...</span>
      </div>

      <Message v-else-if="error" severity="error" :closable="false">
        {{ error }}
      </Message>

      <div v-else class="procvac-grid" data-testid="procvac-grid">
        <table class="procvac-table">
          <colgroup>
            <col
              v-for="column in columns"
              :key="column.key"
              class="procvac-col"
              :class="`procvac-col--${column.key}`"
              :data-col-key="column.key"
              :style="{ width: `${column.width}px` }"
            >
          </colgroup>

          <thead>
            <tr>
              <th
                v-for="column in columns"
                :key="column.key"
                class="procvac-head-cell"
                :class="`procvac-head-cell--${column.key}`"
                :data-col-key="column.key"
                :style="{ width: `${column.width}px` }"
              >
                <span class="procvac-head-label">{{ column.label }}</span>
                <span
                  class="procvac-col-resize-handle"
                  :data-col-key="column.key"
                  title="Изменить ширину"
                  @mousedown="startColumnResize(column, $event)"
                ></span>
              </th>
            </tr>
          </thead>

          <tbody>
            <template v-for="section in visibleSections" :key="section.key">
              <tr class="procvac-section-gap">
                <td :colspan="columns.length"></td>
              </tr>
              <tr
                class="procvac-section-row"
                :class="`procvac-section-row--${section.key}`"
                :data-testid="`procvac-section-${section.key}`"
                @click="section.key === 'archive' ? toggleArchive() : null"
              >
                <th :colspan="columns.length">
                  <div class="procvac-section-head">
                    <span class="procvac-section-title">{{ section.title }}</span>
                    <span class="procvac-section-count">{{ section.count }}</span>

                    <span v-if="section.statusSummary.length" class="procvac-section-statuses">
                      <span
                        v-for="item in section.statusSummary"
                        :key="item.key"
                        class="procvac-section-status-badge"
                      >
                        {{ item.label }} {{ item.count }}
                      </span>
                    </span>

                    <span v-if="section.hireTypeSummary.length" class="procvac-section-hire-types">
                      <span
                        v-for="item in section.hireTypeSummary"
                        :key="item.key"
                        class="procvac-section-hire-type-badge"
                      >
                        {{ item.label }} {{ item.count }}
                      </span>
                    </span>

                    <span v-if="section.key === 'archive'" class="procvac-section-actions">
                      <label
                        v-if="archiveOpen && archiveMonthOptions.length"
                        class="procvac-archive-month-filter"
                        for="procvac-archive-month-filter"
                        @click.stop
                      >
                        <span>Месяц</span>
                        <select
                          id="procvac-archive-month-filter"
                          v-model="archiveMonth"
                          aria-label="Месяц открытия архивных вакансий"
                        >
                          <option value="">Все</option>
                          <option
                            v-for="option in archiveMonthOptions"
                            :key="option.key"
                            :value="option.key"
                          >
                            {{ option.label }}
                          </option>
                        </select>
                      </label>

                      <button
                        id="procvac-archive-toggle"
                        class="procvac-section-toggle"
                        type="button"
                        :title="archiveOpen ? 'Свернуть' : 'Развернуть'"
                        @click.stop="toggleArchive"
                      >
                        <i :class="archiveOpen ? 'fi fi-rr-angle-small-up' : 'fi fi-rr-angle-small-down'"></i>
                        <span>{{ archiveOpen ? 'Свернуть' : 'Развернуть' }}</span>
                      </button>
                    </span>
                  </div>
                </th>
              </tr>

              <tr v-if="section.collapsed" class="procvac-empty-row" :data-section="section.key">
                <td :colspan="columns.length"></td>
              </tr>

              <tr v-else-if="section.rows.length === 0" class="procvac-empty-row" :data-section="section.key">
                <td :colspan="columns.length">Нет записей</td>
              </tr>

              <tr
                v-for="row in section.rows"
                v-else
                :key="`${section.key}-${row.id}`"
                class="procvac-data-row"
                :data-row-id="row.id"
                :data-section="section.key"
                :data-testid="`procvac-row-${row.id}`"
              >
                <td
                  v-for="column in columns"
                  :key="column.key"
                  :class="cellClasses(row, column)"
                  :data-row-id="row.id"
                  :data-col-key="column.key"
                  :data-section="section.key"
                  :data-testid="`procvac-cell-${row.id}-${column.key}`"
                  @click="startCellEdit(row, column)"
                >
                  <span v-if="savingCellKey === `${row.id}:${column.key}`" class="procvac-cell-loading"></span>

                  <template v-else-if="isEditingCell(row, column)">
                    <select
                      v-if="isReferenceColumn(column)"
                      v-model="editing.value"
                      class="procvac-editor procvac-editor--select"
                      :size="referenceSelectSize(editing.options.length)"
                      :disabled="editing.loading"
                      @click.stop
                      @change="commitEditing(true)"
                      @blur="commitEditing(true)"
                      @keydown.esc.prevent="commitEditing(false)"
                    >
                      <option value=""></option>
                      <option
                        v-for="option in editingOptions(row, column)"
                        :key="option.id"
                        :value="option.id"
                      >
                        {{ option.text }}
                      </option>
                    </select>

                    <textarea
                      v-else-if="column.format === 'MEMO' || column.key === 'comments'"
                      v-model="editing.value"
                      class="procvac-editor procvac-editor--textarea"
                      @click.stop
                      @keydown.esc.prevent="commitEditing(false)"
                      @keydown.ctrl.enter.prevent="commitEditing(true)"
                      @blur="commitEditing(true)"
                    ></textarea>

                    <input
                      v-else
                      v-model="editing.value"
                      class="procvac-editor"
                      :type="editorInputType(column)"
                      :step="column.format === 'SIGNED' ? 'any' : undefined"
                      @click.stop
                      @keydown.enter.prevent="commitEditing(true)"
                      @keydown.esc.prevent="commitEditing(false)"
                      @blur="commitEditing(true)"
                    >
                  </template>

                  <template v-else-if="column.key === 'events'">
                    <span v-if="row.id === undefined || row.id === null || row.id === ''"></span>
                    <span v-else class="procvac-events-actions">
                      <a
                        class="procvac-events-count"
                        :href="eventsHref(row.id)"
                        target="_blank"
                        rel="noopener"
                        :title="`Посмотреть события: ${row.values.events}`"
                        :aria-label="`Посмотреть события: ${row.values.events}`"
                        @click.stop
                      >
                        {{ row.values.events }}
                      </a>
                      <button
                        type="button"
                        class="procvac-event-create-btn"
                        :data-row-id="row.id"
                        title="Создать событие"
                        aria-label="Создать событие"
                        @click.stop="openEventWorkflow(row.id)"
                      >
                        <i class="fi fi-rr-plus"></i>
                      </button>
                    </span>
                  </template>

                  <a
                    v-else-if="column.documentLink && isUrl(row.rawValues[column.key])"
                    class="procvac-doc-link"
                    :href="row.rawValues[column.key]"
                    target="_blank"
                    rel="noopener"
                    :title="row.rawValues[column.key]"
                    aria-label="Открыть заявку"
                    @click.stop
                  >
                    <i class="fi fi-rr-file"></i>
                  </a>

                  <template v-else>
                    <template
                      v-for="(part, index) in highlightedParts(row.values[column.key])"
                      :key="`${row.id}-${column.key}-${index}`"
                    >
                      <mark v-if="part.match">{{ part.text }}</mark>
                      <template v-else>{{ part.text }}</template>
                    </template>
                  </template>
                </td>
              </tr>

              <tr v-if="section.key === 'archive' && archiveOpen && archivePageCount > 1" class="procvac-pager-row">
                <td :colspan="columns.length">
                  <div class="procvac-pager">
                    <button
                      type="button"
                      class="procvac-pager-btn"
                      title="Предыдущая страница"
                      :disabled="archivePage <= 0"
                      @click="shiftArchivePage(-1)"
                    >
                      <i class="fi fi-rr-angle-small-left"></i>
                    </button>
                    <span>{{ archivePage + 1 }} / {{ archivePageCount }}</span>
                    <button
                      type="button"
                      class="procvac-pager-btn"
                      title="Следующая страница"
                      :disabled="archivePage >= archivePageCount - 1"
                      @click="shiftArchivePage(1)"
                    >
                      <i class="fi fi-rr-angle-small-right"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import IntegramBreadcrumb from '@/components/integram/IntegramBreadcrumb.vue'
import integramApiClient from '@/services/integramApiClient'
import {
  PROCVAC_ARCHIVE_PAGE_SIZE,
  PROCVAC_COLUMN_WIDTH_STORAGE_KEY,
  PROCVAC_DEFAULT_ORDER,
  PROCVAC_EVENTS_FALLBACK_LIMIT,
  PROCVAC_EVENTS_TABLE_ID,
  PROCVAC_REF_OPTIONS_LIMIT,
  PROCVAC_TABLE_ID,
  applyProcVacEventCounts,
  buildProcVacColumns,
  buildProcVacSaveRequest,
  filterProcVacRows,
  filterRowsByArchiveMonth,
  formatProcVacDateForDisplay,
  formatProcVacDateForInput,
  getArchiveMonthOptions,
  getProcVacCellAlignmentClass,
  getProcVacStatusClass,
  getSectionHireTypeSummary,
  getSectionStatusSummary,
  groupProcVacRows,
  highlightProcVacTextParts,
  isProcVacReferenceColumn,
  isProcVacUrl,
  normalizeProcVacColumnWidths,
  normalizeProcVacReferenceOptions,
  normalizeProcVacRow,
  parseProcVacReferenceValue,
  shouldProcVacLoadEventCounts,
  updateProcVacLocalRow,
} from '@/utils/procvac'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const loading = ref(false)
const error = ref('')
const metadata = ref(null)
const columns = ref([])
const rows = ref([])
const search = ref('')
const archiveOpen = ref(false)
const archivePage = ref(0)
const archiveMonth = ref('')
const editing = ref(null)
const savingCellKey = ref('')
const refOptionsCache = ref({})
const currentDate = ref(new Date())
const wasHidden = ref(false)
const reloadAdapter = { reload: loadData }

const database = computed(() => String(route.params.database || integramApiClient.getDatabase() || 'my'))
const breadcrumbItems = computed(() => [
  { label: 'ProcVac', to: `/${database.value}/procvac`, icon: 'fi fi-rr-briefcase' },
])

const filteredRows = computed(() => filterProcVacRows(rows.value, search.value))
const groupedRows = computed(() => groupProcVacRows(filteredRows.value, currentDate.value))
const archiveMonthOptions = computed(() => getArchiveMonthOptions(groupedRows.value.archive))
const archiveRowsForSelectedMonth = computed(() => filterRowsByArchiveMonth(groupedRows.value.archive, archiveMonth.value))
const archivePageCount = computed(() => Math.max(1, Math.ceil(archiveRowsForSelectedMonth.value.length / PROCVAC_ARCHIVE_PAGE_SIZE)))
const pagedArchiveRows = computed(() => {
  const page = Math.min(Math.max(archivePage.value, 0), archivePageCount.value - 1)
  const start = page * PROCVAC_ARCHIVE_PAGE_SIZE
  return archiveRowsForSelectedMonth.value.slice(start, start + PROCVAC_ARCHIVE_PAGE_SIZE)
})

const visibleSections = computed(() => [
  buildSection('active', 'Актуальные вакансии', groupedRows.value.active, groupedRows.value.active),
  buildSection('closedThisMonth', 'Закрыто в этом месяце', groupedRows.value.closedThisMonth, groupedRows.value.closedThisMonth),
  buildSection('archive', 'Архив', archiveRowsForSelectedMonth.value, archiveOpen.value ? pagedArchiveRows.value : []),
])

const summaryLabel = computed(() => {
  if (!rows.value.length) return 'нет записей'
  return `${rows.value.length} записей, актуальных ${groupProcVacRows(rows.value, currentDate.value).active.length}`
})

watch(search, () => {
  archivePage.value = 0
})

watch(archiveMonth, () => {
  archivePage.value = 0
})

watch(archiveMonthOptions, (options) => {
  if (!archiveMonth.value) return
  if (!options.some(option => option.key === archiveMonth.value)) archiveMonth.value = ''
})

function buildSection(key, title, headerRows, visibleRows) {
  return {
    key,
    title,
    count: headerRows.length,
    rows: visibleRows,
    collapsed: key === 'archive' && !archiveOpen.value,
    statusSummary: getSectionStatusSummary(headerRows),
    hireTypeSummary: key === 'active' ? getSectionHireTypeSummary(headerRows) : [],
  }
}

function readColumnWidths() {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem(PROCVAC_COLUMN_WIDTH_STORAGE_KEY) || readCookie(PROCVAC_COLUMN_WIDTH_STORAGE_KEY)
  if (!raw) return {}
  try {
    return normalizeProcVacColumnWidths(JSON.parse(raw))
  } catch {
    return {}
  }
}

function readCookie(name) {
  if (typeof document === 'undefined' || typeof document.cookie !== 'string') return ''
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  if (!match) return ''
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

function saveColumnWidths() {
  if (typeof window === 'undefined') return
  const widths = Object.fromEntries(columns.value.map(column => [column.key, column.width]))
  const serialized = JSON.stringify(normalizeProcVacColumnWidths(widths))
  window.localStorage.setItem(PROCVAC_COLUMN_WIDTH_STORAGE_KEY, serialized)
  if (typeof document !== 'undefined') {
    document.cookie = `${PROCVAC_COLUMN_WIDTH_STORAGE_KEY}=${encodeURIComponent(serialized)}; path=/; max-age=31536000`
  }
}

async function loadData() {
  loading.value = true
  error.value = ''
  currentDate.value = new Date()
  editing.value = null

  try {
    integramApiClient.setDatabase(database.value)
    const [metadataResponse, rowResponse] = await Promise.all([
      integramApiClient.get(`metadata/${PROCVAC_TABLE_ID}`, {}, { jsonMode: 'JSON' }),
      integramApiClient.get(`object/${PROCVAC_TABLE_ID}`, {
        LIMIT: PROCVAC_EVENTS_FALLBACK_LIMIT,
        ORDER: PROCVAC_DEFAULT_ORDER,
      }, { jsonMode: 'JSON_OBJ' }),
    ])

    const nextMetadata = Array.isArray(metadataResponse) ? metadataResponse[0] : metadataResponse
    const nextColumns = buildProcVacColumns(nextMetadata || {}, readColumnWidths())
    let nextRows = (Array.isArray(rowResponse) ? rowResponse : []).map(row => normalizeProcVacRow(row, nextColumns, currentDate.value))

    metadata.value = nextMetadata || {}
    columns.value = nextColumns
    rows.value = nextRows
    archivePage.value = 0

    if (shouldProcVacLoadEventCounts(nextColumns, nextRows)) {
      const eventRows = await integramApiClient.get(`object/${PROCVAC_EVENTS_TABLE_ID}`, {
        LIMIT: PROCVAC_EVENTS_FALLBACK_LIMIT,
      }, { jsonMode: 'JSON_OBJ' })
      nextRows = applyProcVacEventCounts(nextRows, eventRows)
      rows.value = nextRows
    }
  } catch (err) {
    error.value = err?.message || 'Не удалось загрузить ProcVac'
  } finally {
    loading.value = false
  }
}

function cellClasses(row, column) {
  return [
    'procvac-cell',
    `procvac-cell--${column.key}`,
    getProcVacCellAlignmentClass(column),
    column.key === 'status' ? getProcVacStatusClass(row.values[column.key]) : '',
    column.editable ? 'procvac-cell--editable' : '',
    !row.values[column.key] ? 'procvac-cell--empty' : '',
    isEditingCell(row, column) ? 'procvac-cell--editing' : '',
  ].filter(Boolean)
}

function highlightedParts(value) {
  return highlightProcVacTextParts(value, search.value)
}

function isUrl(value) {
  return isProcVacUrl(value)
}

function isReferenceColumn(column) {
  return isProcVacReferenceColumn(column)
}

function referenceSelectSize(optionCount) {
  return Math.min(10, Math.max(2, Number(optionCount) || 0))
}

function editorInputType(column) {
  if (column.format === 'DATE') return 'date'
  if (column.format === 'NUMBER' || column.format === 'SIGNED') return 'number'
  return 'text'
}

function findColumn(key) {
  return columns.value.find(column => column.key === key) || null
}

function findRow(rowId) {
  return rows.value.find(row => String(row.id) === String(rowId)) || null
}

function editorRawValue(row, column) {
  const currentRaw = row.rawValues[column.key] || ''
  if (isReferenceColumn(column)) return parseProcVacReferenceValue(currentRaw).id
  if (column.format === 'DATE') return formatProcVacDateForInput(currentRaw || row.values[column.key])
  return currentRaw || row.values[column.key] || ''
}

async function startCellEdit(row, column) {
  if (!column.editable || !column.source || isEditingCell(row, column)) return
  if (editing.value) await commitEditing(true)

  const nextEditing = {
    rowId: row.id,
    columnKey: column.key,
    value: editorRawValue(row, column),
    originalRaw: row.rawValues[column.key] || '',
    options: [],
    loading: false,
  }
  editing.value = nextEditing

  if (isReferenceColumn(column)) {
    editing.value = { ...nextEditing, loading: true }
    const options = await loadReferenceOptions(column)
    if (isEditingCell(row, column)) {
      editing.value = { ...editing.value, options, loading: false }
    }
  }

  await nextTick()
  const selector = `[data-testid="procvac-cell-${row.id}-${column.key}"] .procvac-editor`
  document.querySelector(selector)?.focus()
}

async function loadReferenceOptions(column) {
  const sourceId = String(column.source?.id || '')
  if (!sourceId) return []
  if (refOptionsCache.value[sourceId]) return refOptionsCache.value[sourceId]

  try {
    const payload = await integramApiClient.get(`_ref_reqs/${sourceId}`, {
      LIMIT: PROCVAC_REF_OPTIONS_LIMIT,
    }, { jsonMode: 'JSON' })
    const options = normalizeProcVacReferenceOptions(payload)
    refOptionsCache.value = { ...refOptionsCache.value, [sourceId]: options }
    return options
  } catch {
    return []
  }
}

function editingOptions(row, column) {
  if (!editing.value) return []
  const options = [...editing.value.options]
  const current = parseProcVacReferenceValue(row.rawValues[column.key])
  if (current.id && !options.some(option => String(option.id) === String(current.id))) {
    options.push({ id: current.id, text: row.values[column.key] || current.text || current.id })
  }
  return options
}

function isEditingCell(row, column) {
  return editing.value?.rowId === row.id && editing.value?.columnKey === column.key
}

function normalizeEditorValue(column, value) {
  if (column.format === 'DATE') return formatProcVacDateForDisplay(value)
  return String(value === undefined || value === null ? '' : value)
}

function editorDisplayText(row, column, value) {
  if (!isReferenceColumn(column)) return normalizeEditorValue(column, value)
  const option = editingOptions(row, column).find(item => String(item.id) === String(value))
  return option?.text || ''
}

async function commitEditing(save) {
  const current = editing.value
  if (!current) return

  const row = findRow(current.rowId)
  const column = findColumn(current.columnKey)
  const displayText = row && column ? editorDisplayText(row, column, current.value) : ''
  editing.value = null
  if (!save || !row || !column) return

  const rawValue = normalizeEditorValue(column, current.value)
  let originalComparable = String(current.originalRaw || '')
  let nextComparable = rawValue
  if (isReferenceColumn(column)) {
    originalComparable = parseProcVacReferenceValue(originalComparable).id
    nextComparable = String(current.value || '')
  }
  if (column.format === 'DATE') {
    originalComparable = formatProcVacDateForDisplay(formatProcVacDateForInput(originalComparable))
    nextComparable = rawValue
  }
  if (nextComparable === originalComparable) return

  const authInfo = integramApiClient.getAuthInfo()
  const request = buildProcVacSaveRequest({
    rowId: row.id,
    column,
    value: rawValue,
    xsrf: authInfo.xsrf || '',
  })

  savingCellKey.value = `${row.id}:${column.key}`
  try {
    await integramApiClient.post(request.endpoint, request.body, { jsonMode: request.jsonMode })
    rows.value = rows.value.map(item => {
      if (String(item.id) !== String(row.id)) return item
      return updateProcVacLocalRow(item, column, rawValue, displayText, currentDate.value)
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Не удалось сохранить',
      detail: err?.message || 'Ошибка ProcVac',
      life: 3500,
    })
  } finally {
    savingCellKey.value = ''
  }
}

function eventsHref(rowId) {
  return `/${database.value}/table/${PROCVAC_EVENTS_TABLE_ID}?F_U=${encodeURIComponent(rowId)}`
}

function openCreateRecordWorkflow(tableId, parentId = null) {
  if (typeof window !== 'undefined' && typeof window.openCreateRecordForm === 'function') {
    window.openCreateRecordForm(tableId, parentId || 1)
    return
  }

  router.push({
    name: 'IntegramDataTableView',
    params: { database: database.value, typeId: tableId },
    query: parentId ? { F_U: String(parentId), create: '1' } : { create: '1' },
  })
}

function openVacancyWorkflow() {
  openCreateRecordWorkflow(PROCVAC_TABLE_ID, 1)
}

function openEventWorkflow(rowId) {
  openCreateRecordWorkflow(PROCVAC_EVENTS_TABLE_ID, rowId)
}

function toggleArchive() {
  archiveOpen.value = !archiveOpen.value
  archivePage.value = 0
}

function shiftArchivePage(delta) {
  archivePage.value = Math.min(Math.max(archivePage.value + delta, 0), archivePageCount.value - 1)
}

function startColumnResize(column, event) {
  event.preventDefault()
  event.stopPropagation()

  const startX = event.clientX
  const startWidth = column.width

  if (document.body) {
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function applyWidth(width) {
    const [normalized] = Object.values(normalizeProcVacColumnWidths({ [column.key]: width }))
    const nextWidth = normalized || column.width
    columns.value = columns.value.map(item => item.key === column.key ? { ...item, width: nextWidth } : item)
  }

  function onMouseMove(moveEvent) {
    applyWidth(startWidth + moveEvent.clientX - startX)
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    if (document.body) {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    saveColumnWidths()
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function handleVisibilityChange() {
  if (document.hidden) {
    wasHidden.value = true
    return
  }
  if (wasHidden.value) {
    wasHidden.value = false
    loadData()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window._integramTableInstances = window._integramTableInstances || []
    window._integramTableInstances.push(reloadAdapter)
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
  loadData()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (typeof window !== 'undefined' && Array.isArray(window._integramTableInstances)) {
    window._integramTableInstances = window._integramTableInstances.filter(item => item !== reloadAdapter)
  }
})
</script>

<style scoped>
.procvac-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.procvac {
  height: 100%;
  min-height: 0;
  padding: 0;
  background: var(--bg-primary, #f8fafc);
  color: var(--text-primary, #111827);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.procvac * {
  box-sizing: border-box;
}

.procvac-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.procvac-heading {
  min-width: 118px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.procvac-heading h1 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.1;
}

.procvac-heading span {
  color: var(--text-secondary, #64748b);
  font-size: 0.76rem;
  line-height: 1.1;
  white-space: nowrap;
}

.procvac-add-vacancy,
.procvac-refresh {
  width: 30px;
  height: 30px;
  border: 1px solid #2563eb;
  border-radius: 7px;
  background: #2563eb;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: 0 0 auto;
}

.procvac-refresh {
  background: var(--card-bg, #fff);
  color: #2563eb;
}

.procvac-add-vacancy:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.procvac-refresh:hover {
  background: rgba(37, 99, 235, 0.08);
}

.procvac-refresh:disabled {
  opacity: 0.6;
  cursor: default;
}

.procvac-search {
  position: relative;
  width: min(460px, 100%);
  flex: 0 1 460px;
}

.procvac-search i {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary, #64748b);
  font-size: 0.9rem;
}

.procvac-search input {
  width: 100%;
  border: 1px solid var(--input-border, #cbd5e1);
  border-radius: 7px;
  background: var(--input-bg, #fff);
  color: var(--text-primary, #111827);
  padding: 5px 10px 5px 32px;
  font: inherit;
}

.procvac-search input:focus,
.procvac-editor:focus {
  outline: 2px solid rgba(37, 99, 235, 0.18);
  border-color: #2563eb;
}

.procvac-grid {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--border-color, #d6dee8);
  border-radius: 8px;
  background: var(--card-bg, #fff);
}

.procvac-table {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  font-size: 0.83rem;
}

.procvac-head-cell {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text-primary, #111827);
  border-bottom: 1px solid var(--border-color, #d6dee8);
  border-right: 1px solid var(--border-color, #d6dee8);
  padding: 2px 4px;
  text-align: left;
  font-weight: 700;
  line-height: 1.2;
  white-space: normal;
}

.procvac-head-cell--title {
  position: sticky;
  left: 0;
  z-index: 5;
  box-shadow: 1px 0 0 var(--border-color, #d6dee8);
}

.procvac-head-label {
  display: block;
  padding-right: 10px;
}

.procvac-col-resize-handle {
  position: absolute;
  top: 0;
  right: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  user-select: none;
  z-index: 3;
}

.procvac-col-resize-handle:hover {
  background: rgba(37, 99, 235, 0.24);
}

.procvac-head-cell:last-child .procvac-col-resize-handle {
  right: 0;
}

.procvac-cell {
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  border-right: 1px solid var(--border-color, #e2e8f0);
  padding: 2px 4px;
  vertical-align: top;
  line-height: 1.2;
  background: var(--card-bg, #fff);
  color: var(--text-primary, #111827);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.procvac-cell--title {
  position: sticky;
  left: 0;
  z-index: 1;
  box-shadow: 1px 0 0 var(--border-color, #e2e8f0);
}

.procvac-cell--numeric {
  text-align: right;
}

.procvac-cell--date {
  text-align: center;
}

.procvac-cell--events {
  text-align: center;
}

.procvac-cell--comments,
.procvac-cell--department,
.procvac-cell--title {
  white-space: normal;
  overflow-wrap: anywhere;
}

.procvac-cell--empty {
  color: var(--text-secondary, #94a3b8);
}

.procvac-cell--editable {
  cursor: cell;
}

.procvac-data-row:hover .procvac-cell {
  background: rgba(37, 99, 235, 0.035);
}

.procvac-cell--editable:hover {
  background: rgba(37, 99, 235, 0.07);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.24);
}

.procvac-cell--editing {
  padding: 1px;
  background: rgba(37, 99, 235, 0.08);
}

.procvac-cell.procvac-status--in-work {
  background: #f59e0b;
  color: #111827;
  font-weight: 650;
}

.procvac-cell.procvac-status--not-started {
  background: #92400e;
  color: #ffffff;
  font-weight: 650;
}

.procvac-cell.procvac-status--offer-accepted {
  background: #16a34a;
  color: #ffffff;
  font-weight: 650;
}

.procvac-cell.procvac-status--joined {
  background: #d1d5db;
  color: #111827;
  font-weight: 650;
}

.procvac-cell.procvac-status--pause {
  background: #f9a8d4;
  color: #831843;
  font-weight: 650;
}

.procvac-cell.procvac-status--offer {
  background: #bbf7d0;
  color: #14532d;
  font-weight: 650;
}

.procvac-cell--status.procvac-cell--editable:hover {
  box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.24);
  filter: brightness(0.98);
}

.procvac-editor {
  width: 100%;
  min-height: 24px;
  border: 1px solid #2563eb;
  border-radius: 5px;
  background: var(--input-bg, #fff);
  color: var(--text-primary, #111827);
  padding: 2px 4px;
  font: inherit;
}

.procvac-editor--select {
  height: auto;
  min-width: min(260px, calc(100vw - 16px));
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
}

.procvac-editor--textarea {
  height: 68px;
  resize: vertical;
  line-height: 1.25;
}

.procvac-events-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}

.procvac-doc-link,
.procvac-events-count,
.procvac-event-create-btn {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  text-decoration: none;
  border-radius: 6px;
}

.procvac-events-count {
  color: #0f766e;
  font-weight: 700;
}

.procvac-event-create-btn {
  border: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  font: inherit;
}

.procvac-doc-link:hover,
.procvac-events-count:hover,
.procvac-event-create-btn:hover {
  background: rgba(37, 99, 235, 0.12);
}

.procvac-section-gap td {
  height: 8px;
  padding: 0;
  border: 0;
  background: var(--bg-primary, #f8fafc);
}

.procvac-section-row th {
  position: sticky;
  left: 0;
  z-index: 1;
  padding: 0;
  border: 0;
  background: #f28c28;
  color: #111827;
}

.procvac-section-row--archive {
  cursor: pointer;
}

.procvac-section-head {
  position: sticky;
  left: 0;
  z-index: 2;
  width: min(100%, calc(100vw - 32px));
  min-height: 26px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px;
}

.procvac-section-title {
  font-weight: 750;
}

.procvac-section-count {
  min-width: 28px;
  height: 22px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #111827;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  font-size: 0.78rem;
  font-weight: 700;
}

.procvac-section-statuses,
.procvac-section-hire-types {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.procvac-section-status-badge,
.procvac-section-hire-type-badge {
  min-height: 18px;
  border: 1px solid rgba(107, 114, 128, 0.78);
  border-radius: 999px;
  background: transparent;
  color: #111827;
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.15;
  white-space: nowrap;
}

.procvac-section-hire-type-badge {
  border-color: rgba(37, 99, 235, 0.55);
  background: rgba(255, 255, 255, 0.34);
}

.procvac-section-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.procvac-archive-month-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #111827;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.procvac-archive-month-filter select {
  min-height: 26px;
  border: 1px solid rgba(17, 24, 39, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.82);
  color: #111827;
  padding: 2px 8px;
  font: inherit;
  cursor: pointer;
}

.procvac-section-toggle {
  margin-left: 0;
  min-height: 26px;
  border: 1px solid rgba(17, 24, 39, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.72);
  color: #111827;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
}

.procvac-empty-row td,
.procvac-pager-row td {
  padding: 10px;
  color: var(--text-secondary, #64748b);
  background: var(--card-bg, #fff);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.procvac-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.procvac-pager-btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-color, #d6dee8);
  border-radius: 6px;
  background: var(--card-bg, #fff);
  color: var(--text-primary, #111827);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.procvac-pager-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.procvac mark {
  padding: 0 1px;
  border-radius: 3px;
  background: #fed7aa;
  color: inherit;
}

.procvac-loading,
.procvac-error {
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-secondary, #64748b);
}

.procvac-error {
  color: #dc2626;
}

.procvac-spinner,
.procvac-cell-loading {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(37, 99, 235, 0.22);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: procvac-spin 0.8s linear infinite;
}

.procvac-cell-loading {
  display: inline-block;
  width: 16px;
  height: 16px;
}

@keyframes procvac-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 760px) {
  .procvac-toolbar {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .procvac-heading {
    min-width: calc(100% - 84px);
  }

  .procvac-search {
    flex-basis: 100%;
    order: 2;
  }

  .procvac-grid {
    min-height: 0;
  }
}
</style>
