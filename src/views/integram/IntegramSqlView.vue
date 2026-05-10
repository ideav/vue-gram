<template>
  <div class="integram-sql-container integram-touch-friendly">
    <Toast />

    <div class="mb-3">
      <IntegramBreadcrumb :items="breadcrumbItems" />
    </div>

    <section class="sql-page-header">
      <div>
        <p class="sql-kicker">SQL / query</p>
        <h1>Конструктор SQL-отчетов</h1>
      </div>
      <div v-if="currentReportId" class="header-actions">
        <Button
          label="Query"
          icon="fi fi-rr-chart-histogram"
          outlined
          size="small"
          @click="openQueryView"
        />
        <Button
          label="Report"
          icon="fi fi-rr-play"
          outlined
          size="small"
          @click="openReportView"
        />
        <Button
          label="Объект"
          icon="fi fi-rr-edit"
          outlined
          size="small"
          @click="openObjectEditor"
        />
      </div>
    </section>

    <Message v-if="pageError" severity="error" :closable="false" class="mb-3">
      {{ pageError }}
    </Message>

    <template v-if="!currentReportId">
      <Panel header="Отчеты" class="mb-3">
        <div class="report-toolbar">
          <input
            v-model="reportSearch"
            class="sql-input"
            type="search"
            placeholder="Поиск отчета"
            aria-label="Поиск отчета"
          />
          <input
            v-model="newReportName"
            class="sql-input"
            type="text"
            placeholder="Название нового отчета"
            aria-label="Название нового отчета"
          />
          <Button
            label="Создать"
            icon="fi fi-rr-plus"
            :loading="creatingReport"
            :disabled="!newReportName.trim()"
            @click="createReport"
          />
        </div>

        <div v-if="loadingReports" class="empty-state">Загрузка отчетов...</div>
        <div v-else-if="filteredReports.length === 0" class="empty-state">
          Отчеты не найдены
        </div>
        <div v-else class="report-list" data-testid="report-list">
          <button
            v-for="report in filteredReports"
            :key="report.id"
            class="report-row"
            type="button"
            :data-testid="`report-row-${report.id}`"
            @click="openReport(report.id)"
          >
            <span class="report-name">{{ report.name }}</span>
            <span class="report-id">#{{ report.id }}</span>
          </button>
        </div>
      </Panel>
    </template>

    <template v-else>
      <Panel class="mb-3">
        <template #header>
          <div class="panel-heading">
            <span data-testid="sql-report-title">{{ builderState.report.name || `Отчет #${currentReportId}` }}</span>
            <Tag :value="`#${currentReportId}`" severity="secondary" />
          </div>
        </template>

        <div v-if="loadingReport" class="empty-state">Загрузка отчета...</div>
        <div v-else class="settings-grid">
          <label class="inline-control">
            <input
              v-model="builderState.report.interactive"
              type="checkbox"
              @change="saveReportSetting('interactive', builderState.report.interactive)"
            />
            Интерактивный отчет
          </label>
          <label class="field-control">
            <span>LIMIT</span>
            <input
              v-model="builderState.report.limit"
              class="sql-input compact"
              type="number"
              min="0"
              @blur="saveReportSetting('limit', builderState.report.limit)"
              @keyup.enter="saveReportSetting('limit', builderState.report.limit)"
            />
          </label>
          <Button
            label="Обновить предпросмотр"
            icon="fi fi-rr-refresh"
            data-testid="builder-preview-button"
            :loading="previewLoading"
            @click="refreshPreview"
          />
        </div>
      </Panel>

      <Panel header="Колонки" class="mb-3">
        <div class="control-switches" aria-label="Настройки колонок">
          <label
            v-for="group in controlGroups"
            :key="group.id"
            class="control-switch"
          >
            <input v-model="activeControls" type="checkbox" :value="group.id" />
            {{ group.label }}
          </label>
        </div>

        <div class="add-column-grid">
          <label class="field-control">
            <span>Таблица</span>
            <select v-model="selectedTableId" class="sql-input" @change="selectFirstColumn">
              <option value="">Выберите таблицу</option>
              <option
                v-for="table in builderState.availableTables"
                :key="table.id"
                :value="table.id"
              >
                {{ table.name }}
              </option>
            </select>
          </label>

          <label class="field-control">
            <span>Колонка</span>
            <select v-model="selectedColumnId" class="sql-input">
              <option value="">Выберите колонку</option>
              <option
                v-for="column in availableColumnsForSelectedTable"
                :key="column.id"
                :value="column.id"
              >
                {{ column.name }}
              </option>
            </select>
          </label>

          <Button
            label="Добавить колонку"
            icon="fi fi-rr-plus"
            :loading="creatingColumn"
            :disabled="!selectedColumnId"
            @click="addSelectedColumn"
          />

          <Button
            label="Вычисляемая"
            icon="fi fi-rr-calculator"
            outlined
            :loading="creatingColumn"
            @click="addCalculatedColumn"
          />
        </div>

        <div v-if="builderState.columns.length === 0" class="empty-state">
          Добавьте колонки отчета
        </div>
        <div v-else class="column-editor-list">
          <section
            v-for="column in builderState.columns"
            :key="column.id"
            class="column-editor"
          >
            <div class="column-editor-main">
              <label class="field-control column-alias-control">
                <span>Колонка</span>
                <input
                  v-model="column.alias"
                  class="sql-input"
                  type="text"
                  :data-testid="`column-alias-${column.id}`"
                  @blur="saveColumnSetting(column, 'alias', column.alias)"
                  @keyup.enter="saveColumnSetting(column, 'alias', column.alias)"
                />
              </label>
              <div class="source-block">
                <span class="source-label">Источник</span>
                <span class="source-name">{{ column.sourceName }}</span>
                <span class="source-id">#{{ column.sourceColumnId || column.id }}</span>
              </div>
              <label class="inline-control muted-control">
                <input
                  v-model="column.hidden"
                  type="checkbox"
                  @change="saveColumnSetting(column, 'hidden', column.hidden)"
                />
                Скрыть
              </label>
              <div class="row-actions">
                <Button
                  icon="fi fi-rr-arrow-small-up"
                  text
                  rounded
                  size="small"
                  aria-label="Поднять колонку"
                  @click="moveColumnUp(column)"
                />
                <Button
                  icon="fi fi-rr-key"
                  text
                  rounded
                  size="small"
                  aria-label="Добавить ID колонку"
                  @click="addIdColumn(column)"
                />
                <Button
                  icon="fi fi-rr-trash"
                  text
                  rounded
                  size="small"
                  severity="danger"
                  aria-label="Удалить колонку"
                  @click="deleteColumn(column)"
                />
              </div>
            </div>

            <div class="column-controls-grid">
              <fieldset v-if="hasControl('filter')" class="control-fieldset">
                <legend>Фильтр</legend>
                <div class="paired-fields">
                  <input
                    v-model="column.filterFrom"
                    class="sql-input"
                    type="text"
                    placeholder="от"
                    :data-testid="`column-filter-from-${column.id}`"
                    @blur="saveColumnSetting(column, 'filterFrom', column.filterFrom)"
                    @keyup.enter="saveColumnSetting(column, 'filterFrom', column.filterFrom)"
                  />
                  <input
                    v-model="column.filterTo"
                    class="sql-input"
                    type="text"
                    placeholder="до"
                    @blur="saveColumnSetting(column, 'filterTo', column.filterTo)"
                    @keyup.enter="saveColumnSetting(column, 'filterTo', column.filterTo)"
                  />
                </div>
              </fieldset>

              <label v-if="hasControl('format')" class="field-control">
                <span>Формат</span>
                <input
                  v-model="column.format"
                  class="sql-input"
                  type="text"
                  @blur="saveColumnSetting(column, 'format', column.format)"
                  @keyup.enter="saveColumnSetting(column, 'format', column.format)"
                />
              </label>

              <label v-if="hasControl('function')" class="field-control">
                <span>Функция</span>
                <select
                  v-model="column.function"
                  class="sql-input"
                  @change="saveColumnSetting(column, 'function', column.function)"
                >
                  <option value="">Нет</option>
                  <option value="85">abn_ID</option>
                </select>
              </label>

              <fieldset v-if="hasControl('order')" class="control-fieldset">
                <legend>Сортировка</legend>
                <div class="paired-fields">
                  <select
                    v-model="column.orderDirection"
                    class="sql-input"
                    @change="saveColumnSetting(column, 'orderDirection', column.orderDirection)"
                  >
                    <option value="">Нет</option>
                    <option value="ASC">ASC</option>
                    <option value="DESC">DESC</option>
                  </select>
                  <input
                    v-model="column.orderPriority"
                    class="sql-input"
                    type="number"
                    min="1"
                    placeholder="#"
                    @blur="saveColumnSetting(column, 'orderPriority', column.orderPriority)"
                    @keyup.enter="saveColumnSetting(column, 'orderPriority', column.orderPriority)"
                  />
                </div>
              </fieldset>

              <label v-if="hasControl('totals')" class="field-control">
                <span>Итоги</span>
                <select
                  v-model="column.totals"
                  class="sql-input"
                  @change="saveColumnSetting(column, 'totals', column.totals)"
                >
                  <option value="">Нет</option>
                  <option value="67">SUM</option>
                  <option value="68">AVG</option>
                  <option value="69">MIN</option>
                  <option value="70">MAX</option>
                  <option value="71">COUNT</option>
                </select>
              </label>

              <label v-if="hasControl('expression')" class="field-control wide-control">
                <span>Формула</span>
                <textarea
                  v-model="column.expression"
                  class="sql-textarea"
                  rows="3"
                  @blur="saveColumnSetting(column, 'expression', column.expression)"
                />
              </label>

              <fieldset v-if="hasControl('having')" class="control-fieldset">
                <legend>HAVING</legend>
                <div class="paired-fields">
                  <input
                    v-model="column.havingFrom"
                    class="sql-input"
                    type="text"
                    placeholder="от"
                    @blur="saveColumnSetting(column, 'havingFrom', column.havingFrom)"
                    @keyup.enter="saveColumnSetting(column, 'havingFrom', column.havingFrom)"
                  />
                  <input
                    v-model="column.havingTo"
                    class="sql-input"
                    type="text"
                    placeholder="до"
                    @blur="saveColumnSetting(column, 'havingTo', column.havingTo)"
                    @keyup.enter="saveColumnSetting(column, 'havingTo', column.havingTo)"
                  />
                </div>
              </fieldset>

              <label v-if="hasControl('set')" class="field-control wide-control">
                <span>SET</span>
                <textarea
                  v-model="column.setExpression"
                  class="sql-textarea"
                  rows="3"
                  @blur="saveColumnSetting(column, 'setExpression', column.setExpression)"
                />
              </label>

              <label v-if="hasControl('sourceAlias')" class="field-control">
                <span>ALIAS</span>
                <input
                  v-model="column.sourceAlias"
                  class="sql-input"
                  type="text"
                  @blur="saveColumnSetting(column, 'sourceAlias', column.sourceAlias)"
                  @keyup.enter="saveColumnSetting(column, 'sourceAlias', column.sourceAlias)"
                />
              </label>
            </div>
          </section>
        </div>
      </Panel>

      <Panel header="JOIN" class="mb-3">
        <div class="join-toolbar">
          <select v-model="newJoin.sourceTableId" class="sql-input">
            <option value="">Таблица</option>
            <option
              v-for="table in builderState.availableTables"
              :key="table.id"
              :value="table.id"
            >
              {{ table.name }}
            </option>
          </select>
          <input
            v-model="newJoin.alias"
            class="sql-input"
            type="text"
            placeholder="alias"
          />
          <input
            v-model="newJoin.condition"
            class="sql-input join-condition"
            type="text"
            placeholder="aorders.id=r501.t"
          />
          <Button
            label="Добавить JOIN"
            icon="fi fi-rr-plus"
            :disabled="!newJoin.sourceTableId"
            :loading="creatingJoin"
            @click="addJoin"
          />
        </div>

        <div v-if="builderState.joins.length === 0" class="empty-state compact-state">
          Ручные JOIN не заданы
        </div>
        <div v-else class="join-list">
          <div v-for="join in builderState.joins" :key="join.id" class="join-row">
            <input
              v-model="join.alias"
              class="sql-input"
              type="text"
              placeholder="alias"
              @blur="saveJoinSetting(join, 'alias')"
              @keyup.enter="saveJoinSetting(join, 'alias')"
            />
            <input
              v-model="join.condition"
              class="sql-input join-condition"
              type="text"
              placeholder="condition"
              @blur="saveJoinSetting(join, 'condition')"
              @keyup.enter="saveJoinSetting(join, 'condition')"
            />
            <Button
              icon="fi fi-rr-trash"
              text
              rounded
              severity="danger"
              aria-label="Удалить JOIN"
              @click="deleteJoin(join)"
            />
          </div>
        </div>
      </Panel>

      <div class="result-grid">
        <Panel header="SQL preview" class="mb-3">
          <pre class="sql-preview" data-testid="sql-preview">{{ sqlPreview }}</pre>
        </Panel>

        <Panel header="Результаты" class="mb-3">
          <Message v-if="builderState.preview.error" severity="warn" :closable="false" class="mb-3">
            {{ builderState.preview.error }}
          </Message>
          <div v-if="previewLoading" class="empty-state">Загрузка предпросмотра...</div>
          <div v-else-if="builderState.preview.rows.length === 0" class="empty-state">
            Нет данных предпросмотра
          </div>
          <div v-else class="sql-table-scroll">
            <table class="preview-table" data-testid="preview-table">
              <thead>
                <tr>
                  <th v-for="column in builderState.preview.columns" :key="column.field">
                    {{ column.header }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in builderState.preview.rows" :key="rowIndex">
                  <td v-for="column in builderState.preview.columns" :key="column.field">
                    {{ row[column.field] }}
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="builderState.preview.totals">
                <tr>
                  <td v-for="column in builderState.preview.columns" :key="column.field">
                    {{ builderState.preview.totals[column.field] || '' }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import IntegramBreadcrumb from '@/components/integram/IntegramBreadcrumb.vue'
import integramService from '@/services/integramService'
import { logger } from '@/utils/logger'
import {
  COLUMN_REQS,
  JOIN_REQS,
  LEGACY_CONTROL_GROUPS,
  REPORT_COLUMN_TYPE_ID,
  REPORT_JOIN_TYPE_ID,
  REPORT_TYPE_ID,
  generateReportSqlPreview,
  normalizeReportBuilderState,
  normalizeReportPreview,
  serializeNewReportColumn,
  serializeNewReportJoin,
  serializeReportSettings,
  serializeSingleColumnSetting
} from '@/utils/integramReportBuilder'

defineProps({
  session: {
    type: Object,
    required: false
  }
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const controlGroups = LEGACY_CONTROL_GROUPS
const activeControls = ref(controlGroups.map(group => group.id))
const reports = ref([])
const reportSearch = ref('')
const newReportName = ref('')
const loadingReports = ref(false)
const loadingReport = ref(false)
const previewLoading = ref(false)
const creatingReport = ref(false)
const creatingColumn = ref(false)
const creatingJoin = ref(false)
const pageError = ref('')
const selectedTableId = ref('')
const selectedColumnId = ref('')
const newJoin = ref({ sourceTableId: '', alias: '', condition: '' })

const builderState = ref(createEmptyBuilderState())

const currentReportId = computed(() => {
  const value = route.params.reportId
  return value === null || value === undefined ? '' : String(value)
})

const databaseName = computed(() => route.params.database || '')

const breadcrumbItems = computed(() => {
  const items = [
    {
      label: 'SQL',
      icon: 'fi fi-rr-code',
      to: databaseName.value ? `/${databaseName.value}/sql` : '/sql'
    }
  ]

  if (currentReportId.value) {
    items.push({
      label: builderState.value.report.name || `Отчет #${currentReportId.value}`,
      icon: 'fi fi-rr-chart-histogram'
    })
  }

  return items
})

const filteredReports = computed(() => {
  const search = reportSearch.value.trim().toLowerCase()
  if (!search) return reports.value
  return reports.value.filter(report => {
    return report.name.toLowerCase().includes(search) || report.id.includes(search)
  })
})

const availableColumnsForSelectedTable = computed(() => {
  if (!selectedTableId.value) return []
  return builderState.value.availableColumnsByTable[selectedTableId.value] || []
})

const sqlPreview = computed(() => generateReportSqlPreview(builderState.value))

watch(
  () => currentReportId.value,
  async (reportId) => {
    pageError.value = ''
    if (reportId) {
      await loadReport(reportId)
    } else {
      builderState.value = createEmptyBuilderState()
      await loadReports()
    }
  },
  { immediate: true }
)

function createEmptyBuilderState() {
  return {
    report: {
      id: '',
      name: '',
      interactive: false,
      limit: '25'
    },
    columns: [],
    joins: [],
    availableTables: [],
    availableColumnsByTable: {},
    sourceColumnsById: {},
    preview: {
      columns: [],
      rows: [],
      totals: null,
      error: null
    }
  }
}

function normalizeReportList(response) {
  const objects = Array.isArray(response)
    ? response
    : response?.object || response?.objects || response?.data || []

  return objects
    .map((object) => {
      const id = object.id === null || object.id === undefined ? '' : String(object.id)
      return {
        id,
        name: object.val || object.name || object.title || `Отчет #${id}`,
        raw: object
      }
    })
    .filter(report => report.id)
}

async function loadReports() {
  loadingReports.value = true
  pageError.value = ''

  try {
    const response = await integramService.getObjects(REPORT_TYPE_ID, { LIMIT: 1000 })
    reports.value = normalizeReportList(response)
  } catch (error) {
    logger.error('Failed to load SQL reports:', error)
    pageError.value = error.message || 'Не удалось загрузить список отчетов'
  } finally {
    loadingReports.value = false
  }
}

async function loadReport(reportId) {
  loadingReport.value = true
  pageError.value = ''
  builderState.value = createEmptyBuilderState()

  try {
    const [editData, columnsData, joinsData, previewData] = await Promise.all([
      integramService.getEditObject(reportId),
      integramService.getObjects(REPORT_COLUMN_TYPE_ID, { F_U: reportId, LIMIT: 1000 }),
      integramService.getObjects(REPORT_JOIN_TYPE_ID, { F_U: reportId, LIMIT: 1000 }).catch((error) => {
        logger.warn('Failed to load SQL joins:', error)
        return {}
      }),
      integramService.executeReport(reportId, { LIMIT: 25 }).catch((error) => ({
        error: error.message || 'Не удалось загрузить предпросмотр'
      }))
    ])

    builderState.value = normalizeReportBuilderState({
      editData,
      columnsData,
      joinsData,
      previewData
    })
    ensureDefaultSelections()
  } catch (error) {
    logger.error('Failed to load SQL report builder:', error)
    pageError.value = error.message || 'Не удалось загрузить отчет'
  } finally {
    loadingReport.value = false
  }
}

function ensureDefaultSelections() {
  if (!selectedTableId.value || !builderState.value.availableTables.some(table => table.id === selectedTableId.value)) {
    selectedTableId.value = builderState.value.availableTables[0]?.id || ''
  }
  selectFirstColumn()
  if (!newJoin.value.sourceTableId) {
    newJoin.value.sourceTableId = selectedTableId.value
  }
}

function selectFirstColumn() {
  const columns = availableColumnsForSelectedTable.value
  if (!columns.some(column => column.id === selectedColumnId.value)) {
    selectedColumnId.value = columns[0]?.id || ''
  }
}

function hasControl(controlId) {
  return activeControls.value.includes(controlId)
}

function openReport(reportId) {
  router.push({
    name: 'IntegramSql',
    params: {
      database: databaseName.value,
      reportId
    }
  })
}

function openQueryView() {
  router.push({
    name: 'IntegramQuery',
    params: {
      database: databaseName.value,
      reportId: currentReportId.value
    }
  })
}

function openReportView() {
  router.push({
    name: 'IntegramReport',
    params: {
      database: databaseName.value,
      reportId: currentReportId.value
    }
  })
}

function openObjectEditor() {
  router.push({
    name: 'IntegramObjectEdit',
    params: {
      database: databaseName.value,
      objectId: currentReportId.value
    }
  })
}

function extractCreatedId(response) {
  if (!response) return ''
  return String(response.id || response.obj?.id || response.object?.id || response.object?.[0]?.id || '')
}

async function createReport() {
  const name = newReportName.value.trim()
  if (!name) return

  creatingReport.value = true
  try {
    const response = await integramService.createReport(name, serializeReportSettings({ limit: 25 }))
    const createdId = extractCreatedId(response)
    newReportName.value = ''

    if (createdId) {
      openReport(createdId)
    } else {
      await loadReports()
    }
  } catch (error) {
    handleActionError(error, 'Не удалось создать отчет')
  } finally {
    creatingReport.value = false
  }
}

function columnAliasFromSource(sourceColumn) {
  const name = sourceColumn?.name || 'Колонка'
  const parts = name.split(' -> ')
  return parts[parts.length - 1] || name
}

async function addSelectedColumn() {
  if (!selectedColumnId.value) return

  const sourceColumn = builderState.value.sourceColumnsById[selectedColumnId.value]
  const payload = serializeNewReportColumn(selectedColumnId.value, columnAliasFromSource(sourceColumn))
  await createReportColumn(payload)
}

async function addCalculatedColumn() {
  const index = builderState.value.columns.length + 1
  const payload = serializeNewReportColumn(0, `Вычисляемая ${index}`)
  payload.requisites[COLUMN_REQS.expression] = ''
  await createReportColumn(payload)
}

async function addIdColumn(column) {
  const sourceColumnId = column.sourceColumnId || selectedColumnId.value
  if (!sourceColumnId) return

  const alias = `${column.alias || column.sourceName || 'Колонка'}ID`
  const payload = serializeNewReportColumn(sourceColumnId, alias)
  payload.requisites[COLUMN_REQS.function] = '85'
  await createReportColumn(payload)
}

async function createReportColumn(payload) {
  creatingColumn.value = true
  try {
    await integramService.createObject(
      payload.typeId,
      payload.value,
      payload.requisites,
      currentReportId.value
    )
    await loadReport(currentReportId.value)
  } catch (error) {
    handleActionError(error, 'Не удалось добавить колонку')
  } finally {
    creatingColumn.value = false
  }
}

async function saveReportSetting(key, value) {
  try {
    await integramService.setRequisites(currentReportId.value, serializeReportSettings({ [key]: value }))
  } catch (error) {
    handleActionError(error, 'Не удалось сохранить настройки отчета')
  }
}

async function saveColumnSetting(column, key, value) {
  try {
    const payload = serializeSingleColumnSetting(key, value, column)
    if (Object.keys(payload).length === 0) return
    await integramService.setRequisites(column.id, payload)
  } catch (error) {
    handleActionError(error, 'Не удалось сохранить колонку')
  }
}

async function moveColumnUp(column) {
  try {
    await integramService.moveObjectUp(column.id)
    await loadReport(currentReportId.value)
  } catch (error) {
    handleActionError(error, 'Не удалось переместить колонку')
  }
}

async function deleteColumn(column) {
  if (!window.confirm(`Удалить колонку "${column.alias}"?`)) return

  try {
    await integramService.deleteObject(column.id)
    await loadReport(currentReportId.value)
  } catch (error) {
    handleActionError(error, 'Не удалось удалить колонку')
  }
}

async function addJoin() {
  const payload = serializeNewReportJoin(
    newJoin.value.sourceTableId,
    newJoin.value.alias,
    newJoin.value.condition
  )

  creatingJoin.value = true
  try {
    await integramService.createObject(
      payload.typeId,
      payload.value,
      payload.requisites,
      currentReportId.value
    )
    newJoin.value = { sourceTableId: selectedTableId.value, alias: '', condition: '' }
    await loadReport(currentReportId.value)
  } catch (error) {
    handleActionError(error, 'Не удалось добавить JOIN')
  } finally {
    creatingJoin.value = false
  }
}

async function saveJoinSetting(join, key) {
  const reqId = JOIN_REQS[key]
  if (!reqId) return

  try {
    await integramService.setRequisites(join.id, { [reqId]: join[key] })
  } catch (error) {
    handleActionError(error, 'Не удалось сохранить JOIN')
  }
}

async function deleteJoin(join) {
  if (!window.confirm(`Удалить JOIN "${join.alias || join.id}"?`)) return

  try {
    await integramService.deleteObject(join.id)
    await loadReport(currentReportId.value)
  } catch (error) {
    handleActionError(error, 'Не удалось удалить JOIN')
  }
}

async function refreshPreview() {
  previewLoading.value = true
  try {
    const response = await integramService.executeReport(currentReportId.value, {
      LIMIT: builderState.value.report.limit || 25
    })
    builderState.value.preview = normalizeReportPreview(response)
  } catch (error) {
    builderState.value.preview = normalizeReportPreview({
      error: error.message || 'Не удалось выполнить отчет'
    })
  } finally {
    previewLoading.value = false
  }
}

function handleActionError(error, fallbackMessage) {
  logger.error(fallbackMessage, error)
  const detail = error.message || fallbackMessage
  pageError.value = detail
  toast.add({
    severity: 'error',
    summary: 'Ошибка',
    detail,
    life: 5000
  })
}
</script>

<style scoped>
.integram-sql-container {
  padding: 1rem;
}

.sql-page-header {
  align-items: center;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.sql-page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
}

.sql-kicker {
  color: var(--text-color-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  margin: 0 0 0.25rem;
  text-transform: uppercase;
}

.header-actions,
.report-toolbar,
.join-toolbar,
.join-row,
.add-column-grid,
.settings-grid,
.row-actions,
.control-switches {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.report-toolbar {
  margin-bottom: 1rem;
}

.settings-grid {
  justify-content: flex-start;
}

.panel-heading {
  align-items: center;
  display: flex;
  gap: 0.75rem;
}

.field-control {
  display: flex;
  flex-direction: column;
  flex: 1 1 12rem;
  gap: 0.35rem;
  min-width: 0;
}

.field-control span {
  color: var(--text-color-secondary);
  font-size: 0.8rem;
  font-weight: 600;
}

.inline-control,
.control-switch {
  align-items: center;
  display: inline-flex;
  gap: 0.4rem;
}

.muted-control {
  color: var(--text-color-secondary);
  font-size: 0.85rem;
  margin-top: 0.35rem;
}

.control-switches {
  border-bottom: 1px solid var(--surface-border);
  margin-bottom: 1rem;
  padding-bottom: 1rem;
}

.add-column-grid {
  margin-bottom: 1rem;
}

.sql-input,
.sql-textarea {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  box-sizing: border-box;
  color: var(--text-color);
  font: inherit;
  min-height: 2.35rem;
  padding: 0.45rem 0.6rem;
  width: 100%;
}

.sql-input:focus,
.sql-textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
  outline: none;
}

.sql-input.compact,
.sql-input.narrow {
  width: 8rem;
}

.sql-textarea {
  min-width: 0;
  resize: vertical;
}

.report-list {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
}

.report-row {
  align-items: center;
  background: var(--surface-card);
  border: 0;
  border-bottom: 1px solid var(--surface-border);
  color: var(--text-color);
  cursor: pointer;
  display: flex;
  font: inherit;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  text-align: left;
  width: 100%;
}

.report-row:last-child {
  border-bottom: 0;
}

.report-row:hover {
  background: var(--surface-hover);
}

.report-name {
  font-weight: 600;
}

.report-id,
.source-id {
  color: var(--text-color-secondary);
  font-size: 0.85rem;
}

.preview-table {
  border-collapse: collapse;
  min-width: 100%;
}

.preview-table th,
.preview-table td {
  border-bottom: 1px solid var(--surface-border);
  padding: 0.65rem;
  text-align: left;
  vertical-align: top;
}

.preview-table th {
  background: var(--surface-ground);
  color: var(--text-color-secondary);
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}

.column-editor-list {
  display: grid;
  gap: 1rem;
}

.column-editor {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1rem;
}

.column-editor-main {
  align-items: flex-start;
  border-bottom: 1px solid var(--surface-border);
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(13rem, 1.2fr) minmax(12rem, 1fr) auto auto;
  padding-bottom: 1rem;
}

.column-alias-control {
  min-width: 0;
}

.source-block {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.source-label {
  color: var(--text-color-secondary);
  font-size: 0.8rem;
  font-weight: 600;
}

.source-name {
  display: block;
  overflow-wrap: anywhere;
}

.column-controls-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  padding-top: 1rem;
}

.control-fieldset {
  border: 0;
  margin: 0;
  min-width: 0;
  padding: 0;
}

.control-fieldset legend {
  color: var(--text-color-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
  padding: 0;
}

.paired-fields {
  display: grid;
  gap: 0.4rem;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.wide-control {
  grid-column: span 2;
}

.join-condition {
  flex: 1 1 22rem;
}

.join-list {
  display: grid;
  gap: 0.75rem;
}

.join-row {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 0.75rem;
}

.result-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
}

.sql-preview {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  margin: 0;
  max-height: 36rem;
  overflow: auto;
  padding: 1rem;
  white-space: pre-wrap;
}

.empty-state {
  color: var(--text-color-secondary);
  padding: 1.5rem;
  text-align: center;
}

.compact-state {
  padding: 0.75rem;
}

@media (max-width: 900px) {
  .sql-page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .result-grid {
    grid-template-columns: 1fr;
  }

  .field-control,
  .sql-input.compact,
  .sql-input.narrow {
    width: 100%;
  }

  .column-editor-main,
  .paired-fields {
    grid-template-columns: 1fr;
  }

  .wide-control {
    grid-column: auto;
  }
}
</style>
