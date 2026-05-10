<template>
  <section class="sportzania-dashboard" data-testid="sportzania-taskdash">
    <header class="workspace-head">
      <div>
        <h1>Пульт задач</h1>
        <p>{{ status }}</p>
      </div>
      <button type="button" class="icon-button" aria-label="Обновить" title="Обновить" @click="loadData">
        <i class="fi fi-rr-refresh" :class="{ spinning: loading }"></i>
      </button>
    </header>

    <form class="filter-panel" @submit.prevent="loadData">
      <div class="filter-grid">
        <label v-for="column in filterColumns" :key="column.id" class="filter-field">
          <span>{{ column.name }}</span>

          <template v-if="isTaskdashDateColumn(column)">
            <div class="range">
              <input
                type="date"
                :value="filterValue(column, 'from')"
                @change="setFilter(column, 'from', $event.target.value)"
              >
              <input
                type="date"
                :value="filterValue(column, 'to')"
                @change="setFilter(column, 'to', $event.target.value)"
              >
            </div>
            <div class="quick-links">
              <button
                v-for="rangeItem in quickRanges"
                :key="rangeItem.key"
                type="button"
                @click="applyQuickRange(column, rangeItem)"
              >
                {{ rangeItem.label }}
              </button>
            </div>
          </template>

          <select
            v-else
            :value="filterValue(column, 'value')"
            @change="setFilter(column, 'value', $event.target.value)"
          >
            <option value="">Все</option>
            <option
              v-for="option in selectOptions(column)"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <button class="clear-button" type="button" @click="clearFilters">
        <i class="fi fi-rr-cross-small"></i>
        <span>Очистить фильтр</span>
      </button>
    </form>

    <Message v-if="error" severity="error" :closable="false" class="mb-3">
      {{ error }}
    </Message>

    <div class="kpi-grid" :class="{ muted: loading }">
      <article v-for="item in kpis" :key="item.label" class="kpi">
        <div class="kpi-head">
          <span>{{ item.label }}</span>
          <i :class="item.icon"></i>
        </div>
        <strong>{{ item.value }}</strong>
        <small>{{ item.note }}</small>
      </article>
    </div>

    <div class="dashboard-grid" :class="{ muted: loading }">
      <section class="panel">
        <div class="panel-head">
          <h2>Динамика по месяцам</h2>
          <div class="legend">
            <span><i class="dot done"></i>Завершена</span>
            <span><i class="dot active"></i>В работе</span>
            <span><i class="dot overdue"></i>Просрочена</span>
            <span><i class="dot delayed"></i>Отложена</span>
          </div>
        </div>

        <div v-if="!series.length" class="empty">Нет данных</div>
        <div v-else class="bars" data-testid="taskdash-monthly-series">
          <div v-for="item in series" :key="item.key" class="bar-wrap">
            <div class="bar-total">{{ formatSportzaniaNumber(item.total) }}</div>
            <div class="bar" :title="`${item.label}: ${formatSportzaniaNumber(item.total)}`">
              <span class="segment done" :style="{ height: segmentHeight(item.completed) }"></span>
              <span class="segment active" :style="{ height: segmentHeight(item.active) }"></span>
              <span class="segment overdue" :style="{ height: segmentHeight(item.overdue) }"></span>
              <span class="segment delayed" :style="{ height: segmentHeight(item.delayed) }"></span>
            </div>
            <div class="bar-label">{{ item.label }}</div>
          </div>
        </div>
      </section>

      <section class="panel table-panel">
        <div class="panel-head">
          <h2>Задачи</h2>
          <p>{{ sortedRows.length }} строк</p>
        </div>

        <div v-if="!sortedRows.length" class="empty">Нет данных</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th v-for="column in tableColumns" :key="column.id">
                  <button type="button" @click="toggleSort(column)">
                    <span>{{ column.name }}</span>
                    <i :class="sortIcon(column)"></i>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in sortedRows" :key="index">
                <td
                  v-for="column in tableColumns"
                  :key="column.id"
                  :class="{ number: isTaskdashMetricColumn(column) }"
                >
                  <span v-if="isStatusColumn(column)" class="status-pill" :class="statusClass(row[column.name])">
                    {{ cellText(row[column.name]) || '-' }}
                  </span>
                  <template v-else-if="isTaskdashDateColumn(column)">
                    {{ formatTaskdashDateCell(row[column.name]) }}
                  </template>
                  <template v-else-if="isTaskdashMetricColumn(column)">
                    {{ formatTaskdashMetric(row[column.name]) }}
                  </template>
                  <template v-else>
                    {{ cellText(row[column.name]) }}
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import integramService from '@/services/integramService'
import {
  TASKDASH_FALLBACK_COLUMNS,
  TASKDASH_REPORT_ID,
  buildTaskdashReportParams,
  buildTaskdashSummary,
  cellText,
  collectTaskdashFilterValues,
  createQuickRanges,
  createTaskdashDefaultFilters,
  formatClock,
  formatSportzaniaNumber,
  formatTaskdashDateCell,
  formatTaskdashMetric,
  getTaskdashFilterColumns,
  getTaskdashTableColumns,
  isTaskdashDateColumn,
  isTaskdashFilterColumn,
  isTaskdashMetricColumn,
  isTaskdashStatusColumn,
  normalizeSportzaniaColumn,
  normalizeSportzaniaReportResponse,
  reconcileSportzaniaFilters,
  sortTaskdashRows,
  taskdashBuildMonthlySeries,
} from '@/utils/sportzaniaWorkspaces'

const props = defineProps({
  database: {
    type: String,
    required: true
  }
})

const columns = ref(TASKDASH_FALLBACK_COLUMNS.map(normalizeSportzaniaColumn))
const rows = ref([])
const filters = ref(createTaskdashDefaultFilters(new Date().getFullYear(), columns.value))
const sort = ref({ columnId: '155682', dir: 'asc' })
const loading = ref(false)
const error = ref('')
const status = ref('Загрузка...')
const quickRanges = createQuickRanges()

const filterColumns = computed(() => getTaskdashFilterColumns(columns.value))
const tableColumns = computed(() => getTaskdashTableColumns(columns.value))
const summary = computed(() => buildTaskdashSummary(rows.value, columns.value))
const series = computed(() => taskdashBuildMonthlySeries(rows.value, columns.value))
const maxSeriesTotal = computed(() => series.value.reduce((max, item) => Math.max(max, item.total), 0))
const sortedRows = computed(() => sortTaskdashRows(rows.value, columns.value, sort.value))
const kpis = computed(() => [
  { label: 'Всего задач', value: formatSportzaniaNumber(summary.value.total), note: `${summary.value.completionRate}% завершено`, icon: 'fi fi-rr-list-check' },
  { label: 'Завершена', value: formatSportzaniaNumber(summary.value.completed), note: 'готово', icon: 'fi fi-rr-check-circle' },
  { label: 'В работе', value: formatSportzaniaNumber(summary.value.active), note: 'активно', icon: 'fi fi-rr-clock' },
  { label: 'Просрочена', value: formatSportzaniaNumber(summary.value.overdue), note: 'просрочено', icon: 'fi fi-rr-exclamation' },
  { label: 'Отложена', value: formatSportzaniaNumber(summary.value.delayed), note: 'ожидает', icon: 'fi fi-rr-pause' }
])

function filterValue(column, part) {
  return filters.value[column.id]?.[part] || ''
}

function setFilter(column, part, value, reload = true) {
  const current = { ...(filters.value[column.id] || {}) }
  if (value) current[part] = value
  else delete current[part]
  filters.value = { ...filters.value, [column.id]: current }
  if (reload) loadData()
}

function applyQuickRange(column, range) {
  filters.value = {
    ...filters.value,
    [column.id]: {
      ...(filters.value[column.id] || {}),
      from: range.from,
      to: range.to
    }
  }
  loadData()
}

function clearFilters() {
  filters.value = {}
  loadData()
}

function selectOptions(column) {
  return collectTaskdashFilterValues(rows.value, column, filterValue(column, 'value'))
}

function segmentHeight(value) {
  if (!maxSeriesTotal.value || value <= 0) return '0'
  return `${Math.max((value / maxSeriesTotal.value) * 100, 1.5)}%`
}

function isStatusColumn(column) {
  return isTaskdashStatusColumn(column) || String(column.name || '').toLowerCase().includes('статус')
}

function statusClass(value) {
  const lower = cellText(value).toLowerCase()
  if (lower.includes('заверш')) return 'done'
  if (lower.includes('работ') || lower.includes('прин')) return 'active'
  if (lower.includes('отлож')) return 'delayed'
  if (lower.includes('проср')) return 'overdue'
  return ''
}

function toggleSort(column) {
  if (sort.value.columnId === column.id) {
    sort.value = { ...sort.value, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
  } else {
    sort.value = { columnId: column.id, dir: 'asc' }
  }
}

function sortIcon(column) {
  if (sort.value.columnId !== column.id) return 'fi fi-rr-sort'
  return sort.value.dir === 'asc' ? 'fi fi-rr-angle-small-up' : 'fi fi-rr-angle-small-down'
}

async function loadData() {
  loading.value = true
  error.value = ''
  status.value = 'Загрузка...'

  try {
    const payload = await integramService.executeReport(
      TASKDASH_REPORT_ID,
      buildTaskdashReportParams(columns.value, filters.value)
    )
    const normalized = normalizeSportzaniaReportResponse(payload, TASKDASH_FALLBACK_COLUMNS)
    filters.value = reconcileSportzaniaFilters(columns.value, normalized.columns, filters.value, isTaskdashFilterColumn)
    columns.value = normalized.columns
    rows.value = normalized.rows
    status.value = `Обновлено: ${formatClock(new Date())}`
  } catch (err) {
    rows.value = []
    error.value = err?.message || 'Ошибка загрузки данных'
    status.value = error.value
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
watch(() => props.database, () => {
  filters.value = createTaskdashDefaultFilters(new Date().getFullYear(), columns.value)
  loadData()
})
</script>

<style scoped>
.sportzania-dashboard {
  --blue: #2563eb;
  --green: #16a34a;
  --amber: #d97706;
  --red: #dc2626;
  --cyan: #0891b2;
  min-height: 100%;
  padding: 16px;
  background: var(--bg-primary, #f8fafc);
  color: var(--text-primary, #111827);
}

.workspace-head,
.panel-head,
.kpi-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.workspace-head {
  margin-bottom: 14px;
}

h1,
h2,
p {
  margin: 0;
  letter-spacing: 0;
}

h1 {
  font-size: 1.45rem;
  line-height: 1.2;
}

h2 {
  font-size: 0.98rem;
  line-height: 1.25;
}

p,
.kpi small,
.legend,
.bar-label,
.bar-total {
  color: var(--text-secondary, #64748b);
}

p {
  margin-top: 0.35rem;
  font-size: 0.86rem;
}

.icon-button,
.clear-button {
  border: 1px solid var(--border-color, #d6dee8);
  border-radius: 7px;
  background: var(--card-bg, #fff);
  color: var(--text-primary, #111827);
  cursor: pointer;
}

.icon-button {
  width: 2.25rem;
  height: 2.25rem;
  display: grid;
  place-items: center;
}

.clear-button {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 5px 10px;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 700;
  white-space: nowrap;
}

.icon-button:hover,
.clear-button:hover {
  border-color: var(--blue);
  color: var(--blue);
}

.filter-panel {
  border: 1px solid var(--border-color, #d6dee8);
  border-radius: 8px;
  background: var(--card-bg, #fff);
  padding: 10px 12px;
  margin-bottom: 14px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: end;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.95fr) repeat(2, minmax(150px, 0.55fr));
  gap: 8px;
}

.filter-field {
  min-width: 0;
}

.filter-field > span {
  display: block;
  margin-bottom: 4px;
  color: var(--text-secondary, #64748b);
  font-size: 0.74rem;
  font-weight: 700;
}

input,
select {
  width: 100%;
  min-height: 32px;
  border: 1px solid var(--input-border, #cbd5e1);
  border-radius: 7px;
  background: var(--input-bg, #fff);
  color: var(--text-primary, #111827);
  padding: 5px 8px;
  font: inherit;
  font-size: 0.84rem;
}

.range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 8px;
}

.quick-links button {
  border: 0;
  background: transparent;
  color: var(--blue);
  padding: 0;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: underline;
  text-decoration-style: dashed;
  text-underline-offset: 3px;
  cursor: pointer;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(130px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.kpi,
.panel {
  border: 1px solid var(--border-color, #d6dee8);
  border-radius: 8px;
  background: var(--card-bg, #fff);
}

.kpi {
  padding: 12px;
}

.kpi-head {
  color: var(--text-secondary, #64748b);
  font-size: 0.78rem;
  font-weight: 700;
}

.kpi strong {
  display: block;
  margin-top: 8px;
  font-size: 1.35rem;
  line-height: 1.1;
}

.kpi small {
  display: block;
  margin-top: 4px;
  font-size: 0.78rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.95fr) minmax(360px, 1.25fr);
  gap: 14px;
  align-items: start;
}

.panel-head {
  padding: 12px 12px 0;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  font-size: 0.78rem;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  display: inline-block;
}

.done {
  background: var(--green);
}

.active {
  background: var(--cyan);
}

.overdue {
  background: var(--red);
}

.delayed {
  background: var(--amber);
}

.bars {
  height: 260px;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(42px, 1fr);
  gap: 10px;
  align-items: end;
  overflow-x: auto;
  padding: 22px 14px 12px;
}

.bar-wrap {
  min-width: 42px;
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 6px;
  align-items: end;
}

.bar-total,
.bar-label {
  text-align: center;
  font-size: 0.72rem;
}

.bar {
  width: min(34px, 100%);
  height: 100%;
  justify-self: center;
  display: flex;
  flex-direction: column-reverse;
  border-radius: 7px 7px 3px 3px;
  overflow: hidden;
  background: var(--bg-secondary, #eef2f7);
}

.segment {
  min-height: 0;
}

.table-panel {
  overflow: hidden;
}

.table-wrap {
  max-height: 520px;
  overflow: auto;
  margin-top: 10px;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.86rem;
  min-width: 760px;
}

th,
td {
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  padding: 8px 10px;
  text-align: left;
  vertical-align: middle;
  background: var(--card-bg, #fff);
}

th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text-secondary, #475569);
  white-space: nowrap;
}

th button {
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.number {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  min-height: 24px;
  border-radius: 999px;
  padding: 2px 8px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--blue);
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.status-pill.done {
  background: rgba(22, 163, 74, 0.11);
  color: var(--green);
}

.status-pill.active {
  background: rgba(8, 145, 178, 0.12);
  color: var(--cyan);
}

.status-pill.delayed {
  background: rgba(217, 119, 6, 0.12);
  color: var(--amber);
}

.status-pill.overdue {
  background: rgba(220, 38, 38, 0.1);
  color: var(--red);
}

.empty {
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #64748b);
  text-align: center;
  padding: 24px;
}

.muted {
  opacity: 0.65;
  pointer-events: none;
}

.spinning {
  animation: sportzania-spin 0.8s linear infinite;
}

@keyframes sportzania-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1120px) {
  .filter-panel,
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .filter-grid {
    grid-template-columns: minmax(240px, 1fr) repeat(2, minmax(150px, 0.7fr));
  }

  .kpi-grid {
    grid-template-columns: repeat(3, minmax(130px, 1fr));
  }
}

@media (max-width: 720px) {
  .sportzania-dashboard {
    padding: 12px;
  }

  .kpi-grid {
    grid-template-columns: 1fr 1fr;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 460px) {
  .kpi-grid,
  .range {
    grid-template-columns: 1fr;
  }
}
</style>
