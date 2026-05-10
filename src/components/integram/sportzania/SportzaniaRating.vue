<template>
  <section class="sportzania-rating" data-testid="sportzania-rating">
    <header class="workspace-head">
      <div>
        <h1>Рейтинг исполнителей</h1>
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

          <template v-if="isRatingDateColumn(column)">
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

    <div class="rating-grid" :class="{ muted: loading }">
      <section class="panel leaders-panel">
        <div class="panel-head">
          <h2>Лидеры</h2>
          <p>{{ performers.length }} исполнителей</p>
        </div>

        <div v-if="!topPerformers.length" class="empty">Нет данных</div>
        <div v-else class="leader-list" data-testid="rating-leaders">
          <article v-for="(item, index) in topPerformers" :key="`${item.name}-${item.department}`" class="leader-row">
            <div class="leader-rank">{{ index + 1 }}</div>
            <div class="leader-body">
              <div class="leader-name">
                <strong>{{ item.name }}</strong>
                <span>{{ item.department || 'Без департамента' }}</span>
              </div>
              <div class="score-track" :title="`Рейтинг: ${formatPercent(item.score)}`">
                <span :style="{ width: scoreWidth(item.score) }"></span>
              </div>
            </div>
            <div class="leader-score">{{ formatPercent(item.score) }}</div>
          </article>
        </div>
      </section>

      <section class="panel table-panel">
        <div class="panel-head">
          <h2>Исполнители</h2>
          <p>{{ sortedPerformers.length }} строк</p>
        </div>

        <div v-if="!sortedPerformers.length" class="empty">Нет данных</div>
        <div v-else class="table-wrap">
          <table data-testid="rating-table">
            <thead>
              <tr>
                <th
                  v-for="column in tableColumns"
                  :key="column.id"
                  :class="{ number: column.numeric }"
                >
                  <button type="button" @click="toggleSort(column)">
                    <span>{{ column.label }}</span>
                    <i :class="sortIcon(column)"></i>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in sortedPerformers" :key="`${item.name}-${item.department}`">
                <td>{{ item.name }}</td>
                <td>{{ item.department }}</td>
                <td class="number rating-cell">{{ formatPercent(item.score) }}</td>
                <td class="number">{{ formatPercent(item.closedRate) }}</td>
                <td class="number">{{ formatPercent(item.onTimeRate) }}</td>
                <td class="number">{{ formatSportzaniaNumber(item.tasks) }}</td>
                <td>{{ formatRatingPeriod(item) || '-' }}</td>
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
  RATING_FALLBACK_COLUMNS,
  RATING_REPORT_ID,
  RATING_TABLE_COLUMNS,
  aggregateRatingPerformers,
  buildRatingReportParams,
  buildRatingSummary,
  collectRatingFilterValues,
  createQuickRanges,
  createRatingDefaultFilters,
  formatClock,
  formatPercent,
  formatRatingPeriod,
  formatSportzaniaNumber,
  getRatingFilterColumns,
  isRatingDateColumn,
  isRatingFilterColumn,
  normalizeSportzaniaColumn,
  normalizeSportzaniaReportResponse,
  reconcileSportzaniaFilters,
  sortRatingPerformers,
} from '@/utils/sportzaniaWorkspaces'

const props = defineProps({
  database: {
    type: String,
    required: true
  }
})

const columns = ref(RATING_FALLBACK_COLUMNS.map(normalizeSportzaniaColumn))
const rows = ref([])
const filters = ref(createRatingDefaultFilters(new Date().getFullYear(), columns.value))
const sort = ref({ columnId: 'score', dir: 'desc' })
const loading = ref(false)
const error = ref('')
const status = ref('Загрузка...')
const quickRanges = createQuickRanges()
const tableColumns = RATING_TABLE_COLUMNS

const filterColumns = computed(() => getRatingFilterColumns(columns.value))
const performers = computed(() => aggregateRatingPerformers(rows.value, columns.value))
const summary = computed(() => buildRatingSummary(performers.value))
const sortedPerformers = computed(() => sortRatingPerformers(performers.value, sort.value))
const topPerformers = computed(() => sortedPerformers.value.slice(0, 5))
const kpis = computed(() => [
  { label: 'Исполнителей', value: formatSportzaniaNumber(summary.value.performers), note: 'в выборке', icon: 'fi fi-rr-users' },
  { label: 'Задач', value: formatSportzaniaNumber(summary.value.tasks), note: 'всего', icon: 'fi fi-rr-list-check' },
  { label: 'Средний рейтинг', value: formatPercent(summary.value.avgScore), note: 'закрыто + в срок', icon: 'fi fi-rr-chart-histogram' },
  { label: 'Закрыто', value: formatPercent(summary.value.avgClosed), note: 'среднее', icon: 'fi fi-rr-check-circle' },
  { label: 'В срок', value: formatPercent(summary.value.avgOnTime), note: 'среднее', icon: 'fi fi-rr-clock' }
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
  return collectRatingFilterValues(rows.value, column, filterValue(column, 'value'))
}

function scoreWidth(value) {
  const number = Math.max(0, Math.min(100, Number(value) || 0))
  return `${number}%`
}

function toggleSort(column) {
  if (sort.value.columnId === column.id) {
    sort.value = { ...sort.value, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
  } else {
    sort.value = { columnId: column.id, dir: column.numeric ? 'desc' : 'asc' }
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
      RATING_REPORT_ID,
      buildRatingReportParams(columns.value, filters.value)
    )
    const normalized = normalizeSportzaniaReportResponse(payload, RATING_FALLBACK_COLUMNS)
    filters.value = reconcileSportzaniaFilters(columns.value, normalized.columns, filters.value, isRatingFilterColumn)
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
  filters.value = createRatingDefaultFilters(new Date().getFullYear(), columns.value)
  loadData()
})
</script>

<style scoped>
.sportzania-rating {
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
.kpi-head,
.leader-row {
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
.leader-name span,
.panel-head p {
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

.rating-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.85fr) minmax(440px, 1.25fr);
  gap: 14px;
  align-items: start;
}

.panel-head {
  padding: 12px 12px 0;
}

.panel-head p {
  margin-top: 0;
  font-size: 0.82rem;
}

.leader-list {
  display: grid;
  gap: 8px;
  padding: 12px;
}

.leader-row {
  align-items: center;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  padding: 10px;
}

.leader-rank {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: rgba(37, 99, 235, 0.1);
  color: var(--blue);
  font-weight: 800;
}

.leader-body {
  min-width: 0;
  flex: 1;
}

.leader-name {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.leader-name strong,
.leader-name span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leader-name span {
  font-size: 0.78rem;
}

.score-track {
  height: 8px;
  margin-top: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--bg-secondary, #eef2f7);
}

.score-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--cyan), var(--green));
}

.leader-score,
.rating-cell {
  color: var(--green);
  font-weight: 800;
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
  .rating-grid {
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
  .sportzania-rating {
    padding: 12px;
  }

  .kpi-grid {
    grid-template-columns: 1fr 1fr;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .leader-name {
    display: block;
  }
}

@media (max-width: 460px) {
  .kpi-grid,
  .range {
    grid-template-columns: 1fr;
  }
}
</style>
