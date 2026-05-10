<template>
  <div class="crm-workspace" :data-testid="`${mode}-workspace`">
    <Toast />
    <IntegramBreadcrumb :items="breadcrumbItems" :database="database" />

    <header class="workspace-header">
      <nav class="workspace-tabs" aria-label="CRM">
        <router-link
          v-for="link in workspaceLinks"
          :key="link.mode"
          :to="link.to"
          class="workspace-tab"
          :class="{ active: mode === link.mode }"
        >
          <i :class="link.icon"></i>
          <span>{{ link.label }}</span>
        </router-link>
      </nav>

      <div class="workspace-title-row">
        <div>
          <h1>{{ pageTitle }}</h1>
          <p v-if="workspaceSummary" class="workspace-summary">{{ workspaceSummary }}</p>
        </div>
        <Button
          type="button"
          icon="fi fi-rr-refresh"
          rounded
          outlined
          size="small"
          :loading="loading"
          aria-label="Обновить"
          @click="loadActiveWorkspace"
        />
      </div>
    </header>

    <div v-if="loading" class="loading-state">
      <ProgressSpinner />
      <p>Загрузка...</p>
    </div>

    <Message v-else-if="error" severity="error" :closable="false">
      {{ error }}
    </Message>

    <template v-else>
      <section v-if="mode === 'kanban'" class="workspace-section kanban-section">
        <div class="workspace-filters">
          <IconField iconPosition="left" class="filter-search">
            <InputIcon class="fi fi-rr-search" />
            <InputText
              v-model="kanbanFilters.search"
              placeholder="Поиск карточек..."
              autocomplete="off"
              class="w-full"
            />
          </IconField>

          <label class="filter-field">
            <span>Менеджер</span>
            <select v-model="kanbanFilters.manager" class="native-select">
              <option value="">Все</option>
              <option v-for="manager in kanbanManagerOptions" :key="manager" :value="manager">
                {{ manager }}
              </option>
            </select>
          </label>

          <label class="filter-field">
            <span>Продукт</span>
            <select v-model="kanbanFilters.product" class="native-select">
              <option value="">Все</option>
              <option v-for="product in kanbanProductOptions" :key="product" :value="product">
                {{ product }}
              </option>
            </select>
          </label>

          <label class="filter-field">
            <span>Партнер</span>
            <select v-model="kanbanFilters.partner" class="native-select">
              <option value="">Все</option>
              <option v-for="partner in kanbanPartnerOptions" :key="partner" :value="partner">
                {{ partner }}
              </option>
            </select>
          </label>

          <Button
            v-if="hasKanbanFilters"
            type="button"
            icon="fi fi-rr-cross-small"
            rounded
            text
            aria-label="Сбросить фильтры"
            @click="resetKanbanFilters"
          />
        </div>

        <div v-if="kanbanGroups.length === 0" class="empty-state">
          <i class="fi fi-rr-inbox"></i>
          <span>Карточки не найдены</span>
        </div>

        <div v-else class="kanban-board" data-testid="kanban-board">
          <section
            v-for="group in kanbanGroups"
            :key="group.statusId || group.statusName"
            class="kanban-column"
            :class="{ 'drop-target': dropTargetStatusId === group.statusId }"
            :data-testid="`kanban-stage-${group.statusId || group.statusName}`"
            @dragover.prevent="markDropTarget(group)"
            @dragleave="clearDropTarget(group)"
            @drop="dropKanbanCard($event, group)"
          >
            <header class="kanban-column-header">
              <span class="stage-color" :style="{ backgroundColor: group.color || fallbackStageColor(group.statusName) }"></span>
              <div class="stage-title">
                <strong>{{ group.statusName || 'Без статуса' }}</strong>
                <small>{{ formatMoney(group.totalAmount) }}</small>
              </div>
              <Badge :value="group.cards.length" severity="secondary" />
            </header>

            <div class="kanban-card-list">
              <article
                v-for="card in group.cards"
                :key="card._cardId || getKanbanCardTitle(card)"
                class="deal-card"
                :class="{ updating: updatingCardId === String(card._cardId) }"
                :data-testid="`kanban-card-${card._cardId}`"
                :draggable="Boolean(card._cardId)"
                @dragstart="startKanbanDrag($event, card)"
                @dragend="finishKanbanDrag"
              >
                <div class="deal-card-header">
                  <h2>{{ getKanbanCardTitle(card) }}</h2>
                  <span v-if="card.Сумма" class="deal-amount">{{ formatMoney(card.Сумма) }}</span>
                </div>

                <p v-if="card.Описание" class="deal-description">{{ card.Описание }}</p>

                <div class="deal-meta">
                  <span v-if="card.Дата"><i class="fi fi-rr-calendar"></i>{{ card.Дата }}</span>
                  <span v-if="card.Контакт"><i class="fi fi-rr-user"></i>{{ card.Контакт }}</span>
                  <span v-if="getFacetValue(card, 'manager')"><i class="fi fi-rr-user-pen"></i>{{ getFacetValue(card, 'manager') }}</span>
                  <span v-if="getFacetValue(card, 'product')"><i class="fi fi-rr-box"></i>{{ getFacetValue(card, 'product') }}</span>
                  <span v-if="getFacetValue(card, 'partner')"><i class="fi fi-rr-handshake"></i>{{ getFacetValue(card, 'partner') }}</span>
                </div>

                <div class="card-actions">
                  <a
                    v-if="card.Телефон"
                    class="icon-link"
                    :href="`tel:${card.Телефон}`"
                    aria-label="Позвонить"
                    title="Позвонить"
                  >
                    <i class="fi fi-rr-phone-call"></i>
                  </a>
                  <a
                    v-if="card.Email"
                    class="icon-link"
                    :href="`mailto:${card.Email}`"
                    aria-label="Написать"
                    title="Написать"
                  >
                    <i class="fi fi-rr-envelope"></i>
                  </a>
                  <a
                    v-for="link in cardQuickLinks(card)"
                    :key="link.label"
                    class="icon-link"
                    :href="link.href"
                    :aria-label="link.label"
                    :title="link.label"
                  >
                    <i :class="link.icon"></i>
                  </a>
                </div>
              </article>
            </div>
          </section>
        </div>
      </section>

      <section v-else-if="mode === 'funnel'" class="workspace-section funnel-section">
        <div class="workspace-filters funnel-filters">
          <label class="filter-field">
            <span>Вакансия</span>
            <select v-model="funnelFilters.vacancy" class="native-select">
              <option value="">Все</option>
              <option v-for="value in funnelVacancyOptions" :key="value" :value="value">{{ value }}</option>
            </select>
          </label>

          <label class="filter-field">
            <span>Имя</span>
            <select v-model="funnelFilters.name" class="native-select">
              <option value="">Все</option>
              <option v-for="value in funnelNameOptions" :key="value" :value="value">{{ value }}</option>
            </select>
          </label>

          <label class="filter-field">
            <span>Месяц</span>
            <select v-model="funnelFilters.month" class="native-select">
              <option value="">Все</option>
              <option v-for="value in funnelMonthOptions" :key="value" :value="value">{{ formatFunnelMonth(value) }}</option>
            </select>
          </label>

          <label class="filter-field">
            <span>Тип найма</span>
            <select v-model="funnelFilters.hireType" class="native-select">
              <option value="">Все</option>
              <option v-for="value in funnelHireTypeOptions" :key="value" :value="value">{{ value }}</option>
            </select>
          </label>

          <label class="filter-field">
            <span>Дата с</span>
            <input v-model="funnelFilters.dateFrom" type="date" class="native-select" />
          </label>

          <label class="filter-field">
            <span>Дата по</span>
            <input v-model="funnelFilters.dateTo" type="date" class="native-select" />
          </label>

          <div class="segmented-control" role="tablist" aria-label="Вид воронки">
            <button
              type="button"
              :class="{ active: funnelView === 'chart' }"
              aria-label="График"
              @click="funnelView = 'chart'"
            >
              <i class="fi fi-rr-chart-histogram"></i>
            </button>
            <button
              type="button"
              :class="{ active: funnelView === 'table' }"
              aria-label="Таблица"
              @click="funnelView = 'table'"
            >
              <i class="fi fi-rr-table-rows"></i>
            </button>
          </div>
        </div>

        <div v-if="funnelEntries.length === 0" class="empty-state">
          <i class="fi fi-rr-chart-funnel"></i>
          <span>Нет данных</span>
        </div>

        <div v-else-if="funnelView === 'chart'" class="funnel-chart" data-testid="funnel-chart">
          <div
            v-for="entry in funnelEntries"
            :key="entry.stage"
            class="funnel-row"
            :data-testid="`funnel-stage-${entry.stage}`"
          >
            <div class="funnel-row-label">
              <strong>{{ entry.stage }}</strong>
              <span>{{ entry.count }}</span>
            </div>
            <div class="funnel-track">
              <div
                class="funnel-bar"
                :style="{ width: `${Math.max(entry.pct, 8)}%`, backgroundColor: entry.color }"
              ></div>
            </div>
            <span class="conversion">{{ entry.conversion === null ? '100%' : `${entry.conversion}%` }}</span>
          </div>
        </div>

        <div v-else class="funnel-table-wrap" data-testid="funnel-table">
          <table class="workspace-table">
            <thead>
              <tr>
                <th>Вакансия</th>
                <th>Имя</th>
                <th>Месяц</th>
                <th v-for="stage in funnelStages" :key="stage">{{ stage }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in visibleFunnelRows" :key="`${row['Имя']}-${index}`">
                <td>{{ row['Вакансия'] }}</td>
                <td>{{ row['Имя'] }}</td>
                <td>{{ formatFunnelMonth(row['Месяц']) }}</td>
                <td v-for="stage in funnelStages" :key="stage">{{ row[stage] ?? 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else class="workspace-section cards-section">
        <div class="workspace-filters">
          <IconField iconPosition="left" class="filter-search">
            <InputIcon class="fi fi-rr-search" />
            <InputText
              v-model="cardsFilters.search"
              placeholder="Поиск записей..."
              autocomplete="off"
              class="w-full"
            />
          </IconField>

          <label v-if="cardsStatusOptions.length" class="filter-field">
            <span>Статус</span>
            <select v-model="cardsFilters.status" class="native-select">
              <option value="">Все</option>
              <option v-for="value in cardsStatusOptions" :key="value" :value="value">{{ value }}</option>
            </select>
          </label>
        </div>

        <div v-if="visibleCardRecords.length === 0" class="empty-state">
          <i class="fi fi-rr-id-badge"></i>
          <span>Записи не найдены</span>
        </div>

        <div v-else class="cards-grid" data-testid="cards-grid">
          <article
            v-for="record in visibleCardRecords"
            :key="record.id"
            class="object-card"
            :data-testid="`crm-card-${record.id}`"
            :style="objectCardStyle(record)"
          >
            <header class="object-card-header">
              <h2>{{ cardFieldValue(record, 'title') || `#${record.id}` }}</h2>
              <span v-if="cardFieldValue(record, 'status')" class="status-pill">
                {{ cardFieldValue(record, 'status') }}
              </span>
            </header>

            <p v-if="cardFieldValue(record, 'description')" class="object-card-description">
              {{ cardFieldValue(record, 'description') }}
            </p>

            <div class="object-card-meta">
              <span v-if="cardFieldValue(record, 'date')">
                <i class="fi fi-rr-calendar"></i>{{ formatCardsDate(cardFieldValue(record, 'date')) }}
              </span>
              <span v-if="cardFieldValue(record, 'amount')">
                <i class="fi fi-rr-coins"></i>{{ formatCardsNumber(cardFieldValue(record, 'amount')) }}
              </span>
              <span v-for="field in additionalCardFields" :key="field.colId">
                <i class="fi fi-rr-info"></i>{{ field.alias || cardsColumns[field.colIdx]?.name }}: {{ record.values[field.colIdx] }}
              </span>
            </div>

            <div class="card-actions">
              <a
                v-if="cardFieldValue(record, 'phone')"
                class="icon-link"
                :href="`tel:${cardFieldValue(record, 'phone')}`"
                aria-label="Позвонить"
                title="Позвонить"
              >
                <i class="fi fi-rr-phone-call"></i>
              </a>
              <a
                v-if="cardFieldValue(record, 'email')"
                class="icon-link"
                :href="`mailto:${cardFieldValue(record, 'email')}`"
                aria-label="Написать"
                title="Написать"
              >
                <i class="fi fi-rr-envelope"></i>
              </a>
              <a
                v-for="link in recordQuickLinks(record)"
                :key="link.label"
                class="icon-link"
                :href="link.href"
                :aria-label="link.label"
                :title="link.label"
              >
                <i :class="link.icon"></i>
              </a>
            </div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'

import IntegramBreadcrumb from '@/components/integram/IntegramBreadcrumb.vue'
import integramApiClient from '@/services/integramApiClient'
import {
  DEFAULT_KANBAN_FIELD_MAPPING,
  KANBAN_FACET_FIELDS,
  buildCardsColumnsFromMetadata,
  buildKanbanStatusUpdateRequest,
  computeFunnelEntries,
  detectCardFields,
  detectFunnelStages,
  filterFunnelRows,
  filterKanbanCards,
  formatCardsDate,
  formatCardsNumber,
  formatFunnelMonth,
  getKanbanCardTitle,
  getKanbanFacetOptions,
  getUniqueFieldValues,
  groupKanbanCardsByStatus,
  normalizeKanbanObjectCards,
  normalizeKanbanReport,
  parseCardsJsonObjRows,
} from '@/utils/crmWorkspaces'

const route = useRoute()
const toast = useToast()

const loading = ref(false)
const error = ref('')

const kanbanCards = ref([])
const kanbanStatuses = ref([])
const kanbanStatusFieldId = ref('')
const kanbanActivityFieldId = ref('')
const kanbanSourceLabel = ref('')
const kanbanFilters = ref({
  search: '',
  manager: '',
  product: '',
  partner: '',
})
const draggedCardId = ref('')
const dropTargetStatusId = ref('')
const updatingCardId = ref('')

const funnelRows = ref([])
const funnelStages = ref([])
const funnelDateField = ref('')
const funnelSourceLabel = ref('')
const funnelView = ref('chart')
const funnelFilters = ref({
  vacancy: '',
  name: '',
  month: '',
  hireType: '',
  dateFrom: '',
  dateTo: '',
})

const cardsColumns = ref([])
const cardRecords = ref([])
const cardsFields = ref({})
const cardsSourceLabel = ref('')
const cardsFilters = ref({
  search: '',
  status: '',
})

const mode = computed(() => route.meta.workspace || 'kanban')
const database = computed(() => String(route.params.database || integramApiClient.getDatabase() || 'my'))

const kanbanSourceId = computed(() => String(route.params.sourceId || route.query.source || route.query.report || '7701'))
const funnelSourceId = computed(() => String(route.params.sourceId || route.query.source || route.query.report || '7701'))
const cardsTypeId = computed(() => String(route.params.typeId || route.query.typeId || route.query.source || '18'))

const breadcrumbItems = computed(() => [{
  label: pageTitle.value,
  icon: mode.value === 'kanban' ? 'fi fi-rr-layout-fluid' : mode.value === 'funnel' ? 'fi fi-rr-chart-funnel' : 'fi fi-rr-id-badge',
}])

const workspaceLinks = computed(() => [
  {
    mode: 'kanban',
    label: 'Канбан',
    icon: 'fi fi-rr-layout-fluid',
    to: `/${database.value}/kanban/${encodeURIComponent(kanbanSourceId.value)}`,
  },
  {
    mode: 'funnel',
    label: 'Воронка',
    icon: 'fi fi-rr-chart-funnel',
    to: `/${database.value}/funnel/${encodeURIComponent(funnelSourceId.value)}`,
  },
  {
    mode: 'cards',
    label: 'Карточки',
    icon: 'fi fi-rr-id-badge',
    to: `/${database.value}/cards/${encodeURIComponent(cardsTypeId.value)}`,
  },
])

const pageTitle = computed(() => {
  if (mode.value === 'kanban') return 'Канбан'
  if (mode.value === 'funnel') return 'Воронка'
  return 'Карточки'
})

const workspaceSummary = computed(() => {
  if (mode.value === 'kanban') return `${kanbanSourceLabel.value || `Источник ${kanbanSourceId.value}`} · ${kanbanCards.value.length} карточек`
  if (mode.value === 'funnel') return `${funnelSourceLabel.value || `Отчет ${funnelSourceId.value}`} · ${visibleFunnelRows.value.length} строк`
  return `${cardsSourceLabel.value || `Таблица ${cardsTypeId.value}`} · ${visibleCardRecords.value.length} записей`
})

const filteredKanbanCards = computed(() => filterKanbanCards(kanbanCards.value, kanbanFilters.value))
const kanbanGroups = computed(() => groupKanbanCardsByStatus(filteredKanbanCards.value, kanbanStatuses.value))
const kanbanManagerOptions = computed(() => getKanbanFacetOptions(kanbanCards.value, 'manager'))
const kanbanProductOptions = computed(() => getKanbanFacetOptions(kanbanCards.value, 'product'))
const kanbanPartnerOptions = computed(() => getKanbanFacetOptions(kanbanCards.value, 'partner'))
const hasKanbanFilters = computed(() => Object.values(kanbanFilters.value).some(Boolean))

const visibleFunnelRows = computed(() => filterFunnelRows(funnelRows.value, funnelFilters.value, funnelDateField.value))
const funnelEntries = computed(() => computeFunnelEntries(visibleFunnelRows.value, funnelStages.value))
const funnelVacancyOptions = computed(() => getUniqueFieldValues(funnelRows.value, 'Вакансия'))
const funnelNameOptions = computed(() => getUniqueFieldValues(funnelRows.value, 'Имя'))
const funnelMonthOptions = computed(() => getUniqueFieldValues(funnelRows.value, 'Месяц'))
const funnelHireTypeOptions = computed(() => getUniqueFieldValues(funnelRows.value, 'Тип найма'))

const cardsFieldList = computed(() => Object.values(cardsFields.value).sort((a, b) => a.order - b.order))
const additionalCardFields = computed(() => cardsFieldList.value.filter(field => field.fieldType?.startsWith('additional') || field.fieldType === 'additional'))
const cardsStatusOptions = computed(() => {
  const statusField = cardsFields.value.status
  if (!statusField) return []
  const values = new Set()
  for (const record of cardRecords.value) {
    const value = record.values[statusField.colIdx]
    if (value) values.add(String(value))
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'ru'))
})
const visibleCardRecords = computed(() => {
  const query = normalizeSearch(cardsFilters.value.search)
  const status = cardsFilters.value.status

  return cardRecords.value.filter(record => {
    if (status && cardFieldValue(record, 'status') !== status) return false
    if (!query) return true
    return record.values.map(normalizeSearch).join(' ').includes(query)
  })
})

watch(
  () => [mode.value, route.params.sourceId, route.params.typeId, JSON.stringify(route.query)],
  () => loadActiveWorkspace()
)

onMounted(() => {
  loadActiveWorkspace()
})

async function loadActiveWorkspace() {
  loading.value = true
  error.value = ''

  try {
    if (mode.value === 'kanban') {
      await loadKanbanWorkspace()
    } else if (mode.value === 'funnel') {
      await loadFunnelWorkspace()
    } else {
      await loadCardsWorkspace()
    }
  } catch (err) {
    console.error('Failed to load CRM workspace:', err)
    error.value = err.message || 'Не удалось загрузить рабочее место'
  } finally {
    loading.value = false
  }
}

async function loadKanbanWorkspace() {
  const sourceType = String(route.query.type || route.query.sourceType || 'report')
  const sourceId = kanbanSourceId.value
  let normalized

  if (sourceType === 'object') {
    const [metadata, payload] = await Promise.all([
      integramApiClient.getTypeMetadata(sourceId),
      integramApiClient.get(`object/${encodeURIComponent(sourceId)}`, requestParams(['type', 'sourceType', 'source', 'report', 'statuses', 'statusReport', 'statusField', 'activityField']), { jsonMode: 'JSON_OBJ' }),
    ])
    normalized = normalizeKanbanObjectCards(extractRows(payload), metadata)
    kanbanSourceLabel.value = metadata.val || metadata.name || `Таблица ${sourceId}`
  } else {
    const report = await integramApiClient.get(`report/${encodeURIComponent(sourceId)}`, requestParams(['type', 'sourceType', 'source', 'report', 'statuses', 'statusReport', 'statusField', 'activityField']), { jsonMode: 'JSON' })
    normalized = normalizeKanbanReport(report)
    kanbanSourceLabel.value = report.header || report.name || report.report_name || `Отчет ${sourceId}`
  }

  kanbanCards.value = normalized.cards
  kanbanStatusFieldId.value = String(route.query.statusField || normalized.statusFieldId || '')
  kanbanActivityFieldId.value = String(route.query.activityField || normalized.activityFieldId || '')
  kanbanStatuses.value = await loadKanbanStatuses(normalized.statuses)
}

async function loadKanbanStatuses(fallbackStatuses) {
  const statusSource = route.query.statuses || route.query.statusReport
  if (!statusSource) return fallbackStatuses

  try {
    const payload = await integramApiClient.get(`report/${encodeURIComponent(String(statusSource))}`, {}, { jsonMode: 'JSON_KV' })
    const statuses = normalizeStatusRows(payload)
    return statuses.length > 0 ? statuses : fallbackStatuses
  } catch (err) {
    console.warn('Failed to load kanban statuses, using card statuses:', err)
    return fallbackStatuses
  }
}

async function loadFunnelWorkspace() {
  const report = await integramApiClient.get(`report/${encodeURIComponent(funnelSourceId.value)}`, requestParams(['source', 'report']), { jsonMode: 'JSON_KV' })
  const rows = extractRows(report)
  const { stages, dateField } = detectFunnelStages(rows)

  funnelRows.value = rows
  funnelStages.value = stages
  funnelDateField.value = dateField
  funnelSourceLabel.value = report.header || report.name || report.report_name || `Отчет ${funnelSourceId.value}`
}

async function loadCardsWorkspace() {
  const params = {
    LIMIT: route.query.LIMIT || route.query.limit || '0,80',
    ...requestParams(['typeId', 'source', 'limit', 'LIMIT']),
  }
  const [metadata, payload] = await Promise.all([
    integramApiClient.getTypeMetadata(cardsTypeId.value),
    integramApiClient.get(`object/${encodeURIComponent(cardsTypeId.value)}`, params, { jsonMode: 'JSON_OBJ' }),
  ])

  const rawRows = extractRows(payload)
  const values = parseCardsJsonObjRows(rawRows)
  cardsColumns.value = buildCardsColumnsFromMetadata(metadata)
  cardsFields.value = detectCardFields(cardsColumns.value)
  cardsSourceLabel.value = metadata.val || metadata.name || `Таблица ${cardsTypeId.value}`
  cardRecords.value = values.map((rowValues, index) => ({
    id: String(rawRows[index]?.i ?? rawRows[index]?.id ?? index + 1),
    raw: rawRows[index] || {},
    values: rowValues,
  }))
}

function requestParams(excludedKeys = []) {
  const excluded = new Set(excludedKeys)
  const params = {}
  for (const [key, value] of Object.entries(route.query)) {
    if (excluded.has(key)) continue
    params[key] = Array.isArray(value) ? value[value.length - 1] : value
  }
  return params
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.object)) return payload.object
  if (Array.isArray(payload.objects)) return payload.objects
  if (Array.isArray(payload.rows) && payload.rows.every(row => row && typeof row === 'object' && !Array.isArray(row))) return payload.rows

  const reportKey = Object.keys(payload).find(key => key.startsWith('&rep.'))
  const report = reportKey ? payload[reportKey] : payload
  const columns = arrayValue(report.columns ?? report.col).map(column => (typeof column === 'string' ? column : column?.name ?? column?.val ?? column?.id))
  const matrix = arrayValue(report.rows ?? report.data)
  if (!columns.length || !matrix.length) return []

  if (matrix.every(Array.isArray) && matrix.length === columns.length && matrix.some(columnValues => columnValues.length !== columns.length)) {
    const rowCount = matrix.reduce((max, values) => Math.max(max, values.length), 0)
    return Array.from({ length: rowCount }, (_, rowIndex) => {
      return Object.fromEntries(columns.map((column, columnIndex) => [column, matrix[columnIndex]?.[rowIndex] ?? '']))
    })
  }

  return matrix.map(row => {
    if (row && typeof row === 'object' && !Array.isArray(row)) return row
    const values = Array.isArray(row) ? row : [row]
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']))
  })
}

function arrayValue(value) {
  return Array.isArray(value) ? value : []
}

function normalizeStatusRows(payload) {
  const rows = extractRows(payload)
  if (rows.length > 0) {
    return rows.map(row => ({
      Статус: row.Статус || row.status || row.name || row.val || row[0],
      СтатусID: row.СтатусID || row.statusId || row.id || row.ID || row[1],
      Цвет: row.Цвет || row.color || row.colour || null,
    })).filter(status => status.Статус)
  }

  if (payload && typeof payload === 'object') {
    return Object.entries(payload)
      .filter(([key]) => !key.startsWith('&'))
      .map(([id, name]) => ({ СтатусID: id, Статус: String(name), Цвет: null }))
  }

  return []
}

function resetKanbanFilters() {
  kanbanFilters.value = {
    search: '',
    manager: '',
    product: '',
    partner: '',
  }
}

function startKanbanDrag(event, card) {
  if (!card._cardId) {
    event.preventDefault()
    return
  }
  draggedCardId.value = String(card._cardId)
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('application/x-integram-card', draggedCardId.value)
  event.dataTransfer.setData('text/plain', draggedCardId.value)
}

function finishKanbanDrag() {
  draggedCardId.value = ''
  dropTargetStatusId.value = ''
}

function markDropTarget(group) {
  if (draggedCardId.value) dropTargetStatusId.value = group.statusId
}

function clearDropTarget(group) {
  if (dropTargetStatusId.value === group.statusId) dropTargetStatusId.value = ''
}

async function dropKanbanCard(event, group) {
  event.preventDefault()
  const cardId = event.dataTransfer.getData('application/x-integram-card') || draggedCardId.value
  const card = kanbanCards.value.find(item => String(item._cardId) === String(cardId))
  finishKanbanDrag()
  if (!card || updatingCardId.value) return

  const currentStatusId = String(card[DEFAULT_KANBAN_FIELD_MAPPING.statusId] || card.СтатусID || '')
  const nextStatusId = String(group.statusId || '')
  if (currentStatusId === nextStatusId || !nextStatusId) return

  updatingCardId.value = String(card._cardId)
  try {
    const request = buildKanbanStatusUpdateRequest({
      cardId: card._cardId,
      newStatusId: nextStatusId,
      statusFieldId: kanbanStatusFieldId.value,
      activityFieldId: kanbanActivityFieldId.value,
      xsrf: integramApiClient.xsrfToken,
    })
    await integramApiClient.post(request.endpoint, request.body, { jsonMode: request.jsonMode })

    card[DEFAULT_KANBAN_FIELD_MAPPING.status] = group.statusName
    card[DEFAULT_KANBAN_FIELD_MAPPING.statusId] = nextStatusId
    if (kanbanActivityFieldId.value) card[DEFAULT_KANBAN_FIELD_MAPPING.activity] = String(Math.floor(Date.now() / 1000))
    toast.add({ severity: 'success', summary: 'Статус обновлен', detail: getKanbanCardTitle(card), life: 2200 })
  } catch (err) {
    console.error('Failed to update kanban status:', err)
    toast.add({ severity: 'error', summary: 'Статус не обновлен', detail: err.message || 'Ошибка запроса', life: 4000 })
  } finally {
    updatingCardId.value = ''
  }
}

function cardQuickLinks(card) {
  const links = []
  if (card._cardId) {
    links.push({ label: 'Открыть', icon: 'fi fi-rr-arrow-up-right-from-square', href: `/${database.value}/edit_obj/${card._cardId}` })
  }
  const formId = firstObjectValue(card, ['ФормаID', 'FormID', 'formId'])
  const taskId = firstObjectValue(card, ['ЗадачаID', 'TaskID', 'taskId'])
  const dealId = firstObjectValue(card, ['СделкаID', 'DealID', 'dealId'])
  if (formId) links.push({ label: 'Форма', icon: 'fi fi-rr-form', href: `/${database.value}/form/${formId}` })
  if (taskId) links.push({ label: 'Задача', icon: 'fi fi-rr-clipboard-list', href: `/${database.value}/edit_obj/${taskId}` })
  if (dealId) links.push({ label: 'Сделка', icon: 'fi fi-rr-briefcase', href: `/${database.value}/edit_obj/${dealId}` })
  return links
}

function recordQuickLinks(record) {
  const links = []
  if (record.id) {
    links.push({ label: 'Открыть', icon: 'fi fi-rr-arrow-up-right-from-square', href: `/${database.value}/edit_obj/${record.id}` })
  }
  const formId = recordValueByNames(record, ['ФормаID', 'FormID', 'formId'])
  const taskId = recordValueByNames(record, ['ЗадачаID', 'TaskID', 'taskId'])
  const dealId = recordValueByNames(record, ['СделкаID', 'DealID', 'dealId'])
  if (formId) links.push({ label: 'Форма', icon: 'fi fi-rr-form', href: `/${database.value}/form/${formId}` })
  if (taskId) links.push({ label: 'Задача', icon: 'fi fi-rr-clipboard-list', href: `/${database.value}/edit_obj/${taskId}` })
  if (dealId) links.push({ label: 'Сделка', icon: 'fi fi-rr-briefcase', href: `/${database.value}/edit_obj/${dealId}` })
  return links
}

function firstObjectValue(object, fields) {
  for (const field of fields) {
    if (object[field]) return object[field]
  }
  return ''
}

function recordValueByNames(record, names) {
  const lowerNames = names.map(name => String(name).toLowerCase())
  const columnIndex = cardsColumns.value.findIndex(column => lowerNames.includes(String(column.name).toLowerCase()))
  return columnIndex >= 0 ? record.values[columnIndex] : ''
}

function cardFieldValue(record, fieldType) {
  const field = cardsFields.value[fieldType]
  if (!field) return ''
  return record.values[field.colIdx] || ''
}

function objectCardStyle(record) {
  const colorField = cardsFields.value.color
  const color = colorField ? record.values[colorField.colIdx] : ''
  return color ? { borderLeftColor: color } : {}
}

function getFacetValue(card, facet) {
  for (const field of KANBAN_FACET_FIELDS[facet] || []) {
    if (card[field]) return card[field]
  }
  return ''
}

function normalizeSearch(value) {
  return String(value ?? '').trim().toLowerCase()
}

function fallbackStageColor(value) {
  const colors = ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  const index = Math.abs(String(value || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % colors.length
  return colors[index]
}

function formatMoney(value) {
  const number = Number.parseFloat(String(value || 0).replace(/\s/g, '').replace(',', '.'))
  if (Number.isNaN(number)) return value || ''
  return number.toLocaleString('ru-RU')
}
</script>

<style scoped>
.crm-workspace {
  max-width: 1320px;
}

.workspace-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0 1.25rem;
}

.workspace-tabs {
  display: inline-flex;
  width: fit-content;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-card);
}

.workspace-tab {
  min-height: 2.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.75rem;
  border-radius: 6px;
  color: var(--text-color-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
}

.workspace-tab:hover,
.workspace-tab.active {
  color: var(--text-color);
  background: var(--surface-hover);
}

.workspace-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.workspace-title-row h1 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 650;
}

.workspace-summary {
  margin: 0.35rem 0 0;
  color: var(--text-color-secondary);
  font-size: 0.92rem;
}

.loading-state,
.empty-state {
  min-height: 15rem;
  display: grid;
  place-items: center;
  gap: 0.75rem;
  color: var(--text-color-secondary);
}

.empty-state i {
  font-size: 2rem;
}

.workspace-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workspace-filters {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.875rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-card);
}

.filter-search {
  width: min(22rem, 100%);
}

.filter-field {
  min-width: 10rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: var(--text-color-secondary);
  font-size: 0.8rem;
  font-weight: 600;
}

.native-select {
  min-height: 2.35rem;
  width: 100%;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-card);
  color: var(--text-color);
  padding: 0 0.65rem;
  font: inherit;
}

.kanban-board {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(18rem, 20rem);
  gap: 0.875rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.kanban-column {
  min-height: 28rem;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-card);
}

.kanban-column.drop-target {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 18%, transparent);
}

.kanban-column-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.875rem;
  border-bottom: 1px solid var(--surface-border);
}

.stage-color {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  flex: 0 0 auto;
}

.stage-title {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.stage-title strong,
.deal-card h2,
.object-card h2 {
  overflow: hidden;
  text-overflow: ellipsis;
}

.stage-title small {
  color: var(--text-color-secondary);
}

.kanban-card-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.75rem;
}

.deal-card,
.object-card {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-50);
  padding: 0.75rem;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.deal-card[draggable='true'] {
  cursor: grab;
}

.deal-card:hover,
.object-card:hover {
  border-color: color-mix(in srgb, var(--primary-color) 55%, var(--surface-border));
  box-shadow: 0 0.35rem 1.4rem color-mix(in srgb, var(--text-color) 8%, transparent);
  transform: translateY(-1px);
}

.deal-card.updating {
  opacity: 0.55;
}

.deal-card-header,
.object-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.deal-card h2,
.object-card h2 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 650;
  line-height: 1.3;
}

.deal-amount {
  white-space: nowrap;
  color: var(--primary-color);
  font-weight: 700;
}

.deal-description,
.object-card-description {
  margin: 0.55rem 0 0;
  color: var(--text-color-secondary);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.deal-meta,
.object-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.65rem;
}

.deal-meta span,
.object-card-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 100%;
  min-height: 1.5rem;
  padding: 0.18rem 0.45rem;
  border-radius: 4px;
  background: var(--surface-card);
  color: var(--text-color-secondary);
  font-size: 0.8rem;
}

.deal-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.7rem;
}

.icon-link {
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  color: var(--text-color-secondary);
  text-decoration: none;
  background: var(--surface-card);
}

.icon-link:hover {
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.funnel-filters {
  align-items: flex-end;
}

.segmented-control {
  display: inline-flex;
  padding: 0.25rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-card);
}

.segmented-control button {
  width: 2.25rem;
  height: 2rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-color-secondary);
  cursor: pointer;
}

.segmented-control button.active {
  background: var(--surface-hover);
  color: var(--primary-color);
}

.funnel-chart {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.875rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-card);
}

.funnel-row {
  display: grid;
  grid-template-columns: minmax(11rem, 18rem) 1fr 4rem;
  align-items: center;
  gap: 0.75rem;
}

.funnel-row-label {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.funnel-row-label strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.funnel-track {
  height: 2rem;
  overflow: hidden;
  border-radius: 6px;
  background: var(--surface-100);
}

.funnel-bar {
  height: 100%;
  border-radius: inherit;
}

.conversion {
  color: var(--text-color-secondary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.funnel-table-wrap {
  overflow: auto;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-card);
}

.workspace-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 48rem;
}

.workspace-table th,
.workspace-table td {
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--surface-border);
  text-align: left;
}

.workspace-table th {
  background: var(--surface-50);
  font-weight: 650;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: 0.875rem;
}

.object-card {
  border-left: 4px solid var(--primary-color);
  background: var(--surface-card);
}

.status-pill {
  max-width: 9rem;
  padding: 0.18rem 0.45rem;
  border-radius: 4px;
  background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  color: var(--primary-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78rem;
  font-weight: 700;
}

@media (max-width: 760px) {
  .crm-workspace {
    max-width: none;
  }

  .workspace-tabs,
  .workspace-filters {
    width: 100%;
  }

  .workspace-tab {
    flex: 1;
    justify-content: center;
  }

  .workspace-title-row {
    align-items: center;
  }

  .filter-search,
  .filter-field {
    width: 100%;
  }

  .kanban-board {
    grid-auto-columns: minmax(16rem, 86vw);
  }

  .funnel-row {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }

  .conversion {
    text-align: left;
  }
}
</style>
