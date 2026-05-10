<template>
  <div class="dashboard-page integram-touch-friendly" data-testid="dashboard-view">
    <Toast />
    <IntegramBreadcrumb :items="breadcrumbItems" />

    <section class="dashboard-header">
      <div class="dashboard-title">
        <p>Dashboard</p>
        <h1>{{ dashboardTitle }}</h1>
      </div>

      <div class="dashboard-controls">
        <label class="dashboard-control">
          <span>Период</span>
          <select v-model="periodName" class="dashboard-input" aria-label="Период дэшборда">
            <option
              v-for="option in periodOptions"
              :key="option"
              :value="option"
            >
              {{ option }}
            </option>
          </select>
        </label>
        <label class="dashboard-control">
          <span>С</span>
          <input v-model="dateFrom" class="dashboard-input" type="date" aria-label="Дата начала" />
        </label>
        <label class="dashboard-control">
          <span>По</span>
          <input v-model="dateTo" class="dashboard-input" type="date" aria-label="Дата окончания" />
        </label>
        <label class="dashboard-control search-control">
          <span>Поиск</span>
          <input v-model="panelSearch" class="dashboard-input" type="search" aria-label="Поиск по панелям" />
        </label>
        <Button
          icon="fi fi-rr-refresh"
          :loading="loading"
          rounded
          outlined
          aria-label="Обновить дэшборд"
          v-tooltip.bottom="'Обновить'"
          @click="loadDashboard"
        />
      </div>
    </section>

    <Message v-if="pageError" severity="error" :closable="false" class="mb-3">
      {{ pageError }}
    </Message>

    <div v-if="loading && !dashboardState.sheets.length" class="dashboard-empty">
      <ProgressSpinner />
      <span>Загрузка дэшборда...</span>
    </div>

    <template v-else>
      <nav v-if="dashboardState.sheets.length > 1" class="dashboard-sheet-tabs" aria-label="Листы дэшборда">
        <button
          v-for="sheet in dashboardState.sheets"
          :key="sheet.id"
          class="dashboard-sheet-tab"
          :class="{ active: activeSheetId === sheet.id }"
          type="button"
          @click="activeSheetId = sheet.id"
        >
          {{ sheet.name }}
        </button>
      </nav>

      <section v-if="activeSheet" class="dashboard-grid">
        <article
          v-for="panel in visiblePanels"
          :key="panel.id"
          class="dashboard-panel"
          :style="panelStyle(panel)"
          data-testid="dashboard-panel"
        >
          <header class="dashboard-panel-header">
            <div class="panel-title">
              <h2>{{ panel.name }}</h2>
              <div class="panel-tags">
                <Tag :value="panel.period" severity="secondary" />
                <Tag v-if="panel.reportId" :value="`report #${panel.reportId}`" severity="info" />
              </div>
            </div>

            <div class="panel-actions">
              <div class="mode-switch" :aria-label="`Режим панели ${panel.name}`">
                <Button
                  v-for="mode in availableVizTypes(panel)"
                  :key="mode.id"
                  :icon="mode.icon"
                  :severity="panelMode(panel) === mode.id ? 'primary' : 'secondary'"
                  :outlined="panelMode(panel) !== mode.id"
                  rounded
                  size="small"
                  :aria-label="mode.label"
                  :data-testid="`dashboard-mode-${mode.id}`"
                  v-tooltip.bottom="mode.label"
                  @click="setPanelMode(panel, mode.id)"
                />
              </div>
              <Button
                icon="fi fi-rr-disk"
                rounded
                text
                size="small"
                :loading="savingPanelId === panel.id"
                :disabled="!panel.panelId"
                aria-label="Сохранить режим панели"
                v-tooltip.bottom="'Сохранить режим'"
                @click="savePanelMode(panel)"
              />
            </div>
          </header>

          <p v-if="panel.notes" class="panel-notes">{{ panel.notes }}</p>

          <div v-if="panelMode(panel) === 'table'" class="dashboard-table-wrap" data-testid="dashboard-table">
            <table v-if="panel.rows.length" class="dashboard-table">
              <thead>
                <tr>
                  <th v-for="header in panel.headers" :key="header.key">
                    {{ header.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in panel.rows" :key="row.id">
                  <th :style="{ paddingLeft: `${Math.max(0, row.level - 1) * 1.25 + 0.75}rem` }">
                    {{ row.name }}
                  </th>
                  <td
                    v-for="(cell, index) in row.cells"
                    :key="`${row.id}-${index}`"
                    :class="{ 'cell-error': cell.error }"
                    :title="cell.title"
                  >
                    {{ cell.displayValue }}
                  </td>
                </tr>
              </tbody>
            </table>

            <table v-else-if="panel.report" class="dashboard-table report-table">
              <thead>
                <tr>
                  <th v-for="column in panel.report.columns" :key="column.id || column.name">
                    {{ column.name }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in reportRows(panel)" :key="rowIndex">
                  <td v-for="column in panel.report.columns" :key="column.id || column.name">
                    {{ reportValue(row, column) }}
                  </td>
                </tr>
              </tbody>
            </table>

            <div v-else class="panel-empty">Нет данных</div>
          </div>

          <div v-else-if="panelMode(panel) === 'pivot'" class="dashboard-table-wrap" data-testid="dashboard-pivot">
            <table class="dashboard-table pivot-table">
              <thead>
                <tr>
                  <th>{{ pivotData(panel).rowField || 'Строка' }}</th>
                  <th v-for="column in pivotData(panel).columns" :key="column">{{ column }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in pivotData(panel).rows" :key="row">
                  <th>{{ row }}</th>
                  <td v-for="(column, columnIndex) in pivotData(panel).columns" :key="column">
                    {{ formatPivotValue(pivotData(panel).matrix[rowIndex]?.[columnIndex]) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="dashboard-chart" data-testid="dashboard-chart">
            <Chart
              :type="chartType(panelMode(panel))"
              :data="chartData(panel)"
              :options="chartOptions(panelMode(panel))"
            />
          </div>
        </article>
      </section>

      <div v-else-if="!pageError" class="dashboard-empty">
        <span>Данные дэшборда не найдены</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'

import IntegramBreadcrumb from '@/components/integram/IntegramBreadcrumb.vue'
import integramService from '@/services/integramService'
import {
  buildDashboardState,
  collectDashboardVizData,
  dashboardVizSettings,
  dashboardYmdToInputDate,
  dateToDashboardYmd,
  formatDashboardNumber,
  inputDateToDashboardDate,
  normalizeDashboardPanelFilter,
  normalizeDashboardReport,
  normalizeDashboardSettings,
  resolveDashboardPanelReportId
} from '@/utils/dashboard'

const route = useRoute()
const toast = useToast()

const dashboardRecord = ref(null)
const dashboardState = ref({ sheets: [] })
const rawModelRows = ref([])
const activeSheetId = ref('')
const panelModes = ref({})
const loading = ref(false)
const pageError = ref('')
const panelSearch = ref('')
const periodName = ref(typeof route.query.period === 'string' ? route.query.period : 'Месяц')
const dateFrom = ref('')
const dateTo = ref('')
const savingPanelId = ref('')

const vizTypes = [
  { id: 'table', label: 'Таблица', icon: 'fi fi-rr-table' },
  { id: 'bar', label: 'Столбчатая диаграмма', icon: 'fi fi-rr-chart-histogram' },
  { id: 'line', label: 'Линейный график', icon: 'fi fi-rr-chart-line-up' },
  { id: 'area', label: 'Диаграмма с областями', icon: 'fi fi-rr-chart-area' },
  { id: 'pie', label: 'Круговая диаграмма', icon: 'fi fi-rr-chart-pie' },
  { id: 'pivot', label: 'Сводная таблица', icon: 'fi fi-rr-objects-column' }
]

const chartPalette = ['#2563eb', '#0f766e', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#4d7c0f', '#be185d']

const breadcrumbItems = computed(() => [
  { label: 'Дэшборды', to: `/${route.params.database}/dash/${route.params.dashboardId}`, icon: 'fi fi-rr-chart-pie' },
  { label: dashboardTitle.value }
])

const dashboardTitle = computed(() => {
  const record = dashboardRecord.value
  return record?.val || record?.name || `Дэшборд #${route.params.dashboardId}`
})

const periodOptions = computed(() => {
  const values = rawModelRows.value
    .map(row => row.period)
    .filter(Boolean)
  const unique = [...new Set([periodName.value, ...values].filter(Boolean))]
  return unique.length ? unique : ['Месяц']
})

const activeSheet = computed(() => {
  return dashboardState.value.sheets.find(sheet => sheet.id === activeSheetId.value) ||
    dashboardState.value.sheets[0] ||
    null
})

const visiblePanels = computed(() => {
  const sheet = activeSheet.value
  if (!sheet) return []
  const query = panelSearch.value.trim().toLowerCase()
  if (!query) return sheet.panels

  return sheet.panels.filter(panel => {
    const rowMatch = panel.rows.some(row => row.name.toLowerCase().includes(query))
    const reportMatch = panel.report?.rows?.some(row => {
      return Object.values(row).some(value => String(value ?? '').toLowerCase().includes(query))
    })
    return panel.name.toLowerCase().includes(query) || rowMatch || reportMatch
  })
})

function toRows(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.rows)) return value.rows
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.object)) return value.object
  if (value && typeof value === 'object') {
    return Object.values(value).filter(item => item && typeof item === 'object')
  }
  return []
}

function dashboardDateToInput(value) {
  return dashboardYmdToInputDate(dateToDashboardYmd(value))
}

function normalizeRecord(response) {
  if (!response) return null
  if (response.obj) return response.obj
  if (Array.isArray(response.object)) return response.object[0] || null
  if (response.object && typeof response.object === 'object') return response.object
  return response
}

function applyDefaultDates(modelRows) {
  const rowsWithDates = modelRows.filter(row => row.periodFrom || row.periodTo)
  if (!dateFrom.value) {
    const from = rowsWithDates.find(row => row.periodFrom)?.periodFrom
    if (from) dateFrom.value = dashboardDateToInput(from)
  }
  if (!dateTo.value) {
    const to = [...rowsWithDates].reverse().find(row => row.periodTo)?.periodTo
    if (to) dateTo.value = dashboardDateToInput(to)
  }
}

function uniquePeriodNames(modelRows) {
  const names = new Set()
  modelRows.forEach(row => {
    if (row.period) names.add(row.period)
    if (row.RGsourceID) names.add(row.RGsourceID)
  })
  return [...names]
}

function panelFilterParams(panelFilter) {
  const normalized = normalizeDashboardPanelFilter(panelFilter)
  const params = {}
  if (!normalized) return params
  new URLSearchParams(normalized).forEach((value, key) => {
    params[key] = value
  })
  return params
}

function reportRequests(modelRows) {
  const requests = new Map()
  modelRows.forEach(row => {
    const reportId = resolveDashboardPanelReportId(row)
    if (!reportId || requests.has(reportId)) return
    requests.set(reportId, {
      reportId,
      params: panelFilterParams(row.panelFilter)
    })
  })
  return [...requests.values()]
}

async function loadDashboard() {
  loading.value = true
  pageError.value = ''

  try {
    const dashboardId = route.params.dashboardId
    const [recordResponse, modelResponse] = await Promise.all([
      integramService.getDashboardRecord(dashboardId),
      integramService.getDashboardModel(dashboardId, periodName.value)
    ])
    const record = normalizeRecord(recordResponse)

    if (!record || record.error) {
      throw new Error(record?.error || 'Дэшборд не найден')
    }
    if (record.type && record.type !== 'Дэшборд') {
      throw new Error('Объект не является дэшбордом')
    }

    const modelRows = toRows(modelResponse)
    if (!modelRows.length) {
      throw new Error('Модель дэшборда не найдена')
    }

    dashboardRecord.value = record
    rawModelRows.value = modelRows
    if (!periodName.value) periodName.value = modelRows.find(row => row.period)?.period || 'Месяц'
    applyDefaultDates(modelRows)

    const from = inputDateToDashboardDate(dateFrom.value) || modelRows.find(row => row.periodFrom)?.periodFrom || ''
    const to = inputDateToDashboardDate(dateTo.value) || [...modelRows].reverse().find(row => row.periodTo)?.periodTo || ''

    const [sourceRows, periodEntries, reportEntries] = await Promise.all([
      integramService.getDashboardValues(from, to),
      Promise.all(uniquePeriodNames(modelRows).map(async name => {
        const payload = await integramService.getDashboardPeriods(name, from, to)
        return [name, toRows(payload).length ? toRows(payload) : payload]
      })),
      Promise.all(reportRequests(modelRows).map(async request => {
        const report = await integramService.getDashboardReport(request.reportId, from, to, request.params)
        return [request.reportId, normalizeDashboardReport(report)]
      }))
    ])

    const periodData = Object.fromEntries(periodEntries)
    const reports = Object.fromEntries(reportEntries)
    const nextState = buildDashboardState({
      modelRows,
      periodData,
      sourceRows: toRows(sourceRows),
      reports
    })

    dashboardState.value = nextState
    if (!nextState.sheets.some(sheet => sheet.id === activeSheetId.value)) {
      activeSheetId.value = nextState.sheets[0]?.id || ''
    }
    syncPanelModes(nextState)
  } catch (error) {
    pageError.value = error?.message || 'Не удалось загрузить дэшборд'
    dashboardState.value = { sheets: [] }
  } finally {
    loading.value = false
  }
}

function syncPanelModes(nextState) {
  const nextModes = { ...panelModes.value }
  nextState.sheets.forEach(sheet => {
    sheet.panels.forEach(panel => {
      if (!nextModes[panel.id]) nextModes[panel.id] = panel.activeViz || 'table'
    })
  })
  panelModes.value = nextModes
}

function panelMode(panel) {
  return panelModes.value[panel.id] || panel.activeViz || 'table'
}

function setPanelMode(panel, mode) {
  panelModes.value = {
    ...panelModes.value,
    [panel.id]: mode
  }
}

function availableVizTypes(panel) {
  const configured = normalizeDashboardSettings(panel.settings)
    .map(setting => setting.type)
    .filter(Boolean)
  const defaults = panel.report ? ['table', 'bar', 'line', 'pie', 'pivot'] : ['table', 'bar', 'line', 'pivot']
  const ids = [...new Set([...defaults, ...configured])]
  return ids
    .map(id => vizTypes.find(type => type.id === id) || { id, label: id, icon: 'fi fi-rr-apps' })
}

function panelStyle(panel) {
  const layout = normalizeDashboardSettings(panel.settings).find(setting => setting.panelColumns)?.panelColumns || {}
  const span = Math.min(12, Math.max(1, Number(layout.lg || layout.md || 12) || 12))
  return { gridColumn: `span ${span}` }
}

function reportRows(panel) {
  return collectDashboardVizData(panel, 'bar', {}).records || []
}

function reportValue(row, column) {
  return row?.[column.name] ?? row?.[column.field] ?? row?.[column.id] ?? ''
}

function pivotData(panel) {
  return collectDashboardVizData(panel, 'pivot', dashboardVizSettings(panel, 'pivot'))
}

function formatPivotValue(value) {
  return formatDashboardNumber(value ?? '')
}

function chartType(mode) {
  if (mode === 'pie') return 'pie'
  if (mode === 'line' || mode === 'area') return 'line'
  return 'bar'
}

function chartData(panel) {
  const mode = panelMode(panel)
  const vizData = collectDashboardVizData(panel, mode, dashboardVizSettings(panel, mode))
  const pieMode = mode === 'pie'

  return {
    labels: vizData.labels,
    datasets: vizData.datasets.map((dataset, index) => ({
      ...dataset,
      borderColor: chartPalette[index % chartPalette.length],
      backgroundColor: pieMode
        ? vizData.labels.map((_, labelIndex) => chartPalette[labelIndex % chartPalette.length])
        : chartPalette[index % chartPalette.length],
      fill: mode === 'area',
      tension: 0.25
    }))
  }
}

function chartOptions(mode) {
  const circular = mode === 'pie'
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    },
    scales: circular
      ? {}
      : {
          x: { ticks: { maxRotation: 0, autoSkip: true } },
          y: { beginAtZero: true }
        }
  }
}

async function savePanelMode(panel) {
  const mode = panelMode(panel)
  const existing = normalizeDashboardSettings(panel.settings)
  let found = false
  const nextSettings = existing.map(setting => {
    if (!setting.type) return setting
    found = found || setting.type === mode
    return { ...setting, default: setting.type === mode }
  })
  if (!found) nextSettings.push({ type: mode, default: true })

  savingPanelId.value = panel.id
  try {
    await integramService.saveDashboardPanelSettings(panel.panelId, nextSettings)
    panel.settings = nextSettings
    toast.add({ severity: 'success', summary: 'Режим сохранен', life: 2000 })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Не удалось сохранить режим',
      detail: error?.message || '',
      life: 4000
    })
  } finally {
    savingPanelId.value = ''
  }
}

onMounted(loadDashboard)

watch(() => route.params.dashboardId, () => {
  dashboardState.value = { sheets: [] }
  activeSheetId.value = ''
  loadDashboard()
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--p-surface-border, var(--surface-border));
  border-radius: 8px;
  background: var(--p-surface-card, var(--surface-card));
}

.dashboard-title p {
  margin: 0 0 0.25rem;
  color: var(--p-text-muted-color, var(--text-color-secondary));
  font-size: 0.8rem;
  text-transform: uppercase;
}

.dashboard-title h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.dashboard-controls {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.dashboard-control {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 9rem;
  color: var(--p-text-muted-color, var(--text-color-secondary));
  font-size: 0.8rem;
}

.search-control {
  min-width: 13rem;
}

.dashboard-input {
  width: 100%;
  min-height: 2.35rem;
  border: 1px solid var(--p-surface-border, var(--surface-border));
  border-radius: 6px;
  background: var(--p-surface-ground, var(--surface-ground));
  color: var(--p-text-color, var(--text-color));
  padding: 0.45rem 0.65rem;
}

.dashboard-sheet-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.dashboard-sheet-tab {
  border: 1px solid var(--p-surface-border, var(--surface-border));
  border-radius: 6px;
  background: var(--p-surface-card, var(--surface-card));
  color: var(--p-text-color, var(--text-color));
  padding: 0.45rem 0.8rem;
  cursor: pointer;
}

.dashboard-sheet-tab.active {
  border-color: var(--p-primary-color, var(--primary-color));
  color: var(--p-primary-color, var(--primary-color));
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
}

.dashboard-panel {
  min-width: 0;
  border: 1px solid var(--p-surface-border, var(--surface-border));
  border-radius: 8px;
  background: var(--p-surface-card, var(--surface-card));
  overflow: hidden;
}

.dashboard-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--p-surface-border, var(--surface-border));
}

.panel-title {
  min-width: 0;
}

.panel-title h2 {
  margin: 0 0 0.45rem;
  font-size: 1rem;
  font-weight: 700;
}

.panel-tags,
.panel-actions,
.mode-switch {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.panel-actions {
  justify-content: flex-end;
}

.panel-notes {
  margin: 0;
  padding: 0.75rem 1rem 0;
  color: var(--p-text-muted-color, var(--text-color-secondary));
}

.dashboard-table-wrap {
  width: 100%;
  overflow: auto;
  padding: 1rem;
}

.dashboard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.dashboard-table th,
.dashboard-table td {
  border: 1px solid var(--p-surface-border, var(--surface-border));
  padding: 0.55rem 0.7rem;
  text-align: left;
  vertical-align: top;
  white-space: nowrap;
}

.dashboard-table thead th {
  background: var(--p-surface-ground, var(--surface-ground));
  font-weight: 700;
}

.dashboard-table tbody th {
  font-weight: 600;
}

.dashboard-table td:not(:first-child),
.pivot-table td {
  text-align: right;
}

.cell-error {
  color: var(--p-red-600, #dc2626);
  background: color-mix(in srgb, var(--p-red-500, #ef4444) 10%, transparent);
}

.dashboard-chart {
  height: 22rem;
  padding: 1rem;
}

.panel-empty,
.dashboard-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 10rem;
  color: var(--p-text-muted-color, var(--text-color-secondary));
}

@media (max-width: 980px) {
  .dashboard-header {
    align-items: stretch;
    flex-direction: column;
  }

  .dashboard-controls {
    align-items: stretch;
  }

  .dashboard-control,
  .search-control {
    min-width: min(100%, 14rem);
  }

  .dashboard-panel {
    grid-column: 1 / -1 !important;
  }
}
</style>
