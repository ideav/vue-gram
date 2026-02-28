<template>
  <div class="sql-query-view">
    <div class="view-header">
      <h2>Редактор запросов SQL</h2>
      <Button label="Сохранить запрос" icon="pi pi-save" @click="saveQuery" />
    </div>

    <div class="query-builder-container">
      <!-- Report Selection Panel -->
      <Panel header="Выбор отчета" :toggleable="true" class="report-panel">
        <div class="report-selector">
          <div class="p-inputgroup">
            <InputText v-model="searchReport" placeholder="Поиск отчета..." />
            <Button icon="pi pi-search" />
          </div>
          <Listbox
            v-model="selectedReport"
            :options="reports"
            optionLabel="name"
            class="report-list"
            @change="loadReport"
          />
          <Button label="Создать новый отчет" icon="pi pi-plus" outlined class="mt-2" @click="createNewReport" />
        </div>
      </Panel>

      <!-- Query Builder Controls -->
      <div class="query-controls">
        <h3>Конструктор запроса</h3>
        <div class="control-buttons">
          <Button label="Фильтр" icon="pi pi-filter" @click="toggleFilter" size="small" outlined />
          <Button label="Формат" icon="pi pi-sliders-h" @click="openFormatDialog" size="small" outlined />
          <Button label="Функция" icon="pi pi-code" @click="openFunctionDialog" size="small" outlined />
          <Button label="Порядок" icon="pi pi-sort-alt" @click="openOrderDialog" size="small" outlined />
          <Button label="Итоги" icon="pi pi-calculator" @click="openTotalsDialog" size="small" outlined />
          <Button label="Выражение" icon="pi pi-pencil" @click="openExpressionDialog" size="small" outlined />
          <Button label="HAVING" icon="pi pi-filter-slash" @click="openHavingDialog" size="small" outlined />
          <Button label="Добавить колонку" icon="pi pi-plus-circle" @click="addColumn" size="small" />
        </div>
      </div>

      <!-- Query Table Configuration -->
      <div class="query-table-config">
        <DataTable
          :value="queryColumns"
          editMode="cell"
          @cell-edit-complete="onCellEditComplete"
          class="editable-cells-table"
          showGridlines
        >
          <Column field="name" header="Название колонки" style="width: 200px">
            <template #editor="{ data, field }">
              <InputText v-model="data[field]" autofocus />
            </template>
          </Column>

          <Column field="table" header="Таблица" style="width: 150px">
            <template #editor="{ data, field }">
              <Dropdown
                v-model="data[field]"
                :options="availableTables"
                optionLabel="label"
                optionValue="value"
                placeholder="Выберите таблицу"
              />
            </template>
          </Column>

          <Column field="filter" header="Фильтр" style="width: 200px">
            <template #body="{ data }">
              <div class="filter-cell">
                <InputText
                  v-if="showFilters"
                  v-model="data.filter"
                  placeholder="Условие фильтра"
                  @blur="updateFilter(data)"
                />
                <span v-else>{{ data.filter || '-' }}</span>
              </div>
            </template>
          </Column>

          <Column field="function" header="Функция" style="width: 150px">
            <template #editor="{ data, field }">
              <Dropdown
                v-model="data[field]"
                :options="sqlFunctions"
                optionLabel="label"
                optionValue="value"
                placeholder="Без функции"
              />
            </template>
          </Column>

          <Column field="order" header="Порядок" style="width: 120px">
            <template #editor="{ data, field }">
              <Dropdown
                v-model="data[field]"
                :options="orderOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Не сортировать"
              />
            </template>
          </Column>

          <Column field="format" header="Формат" style="width: 150px">
            <template #editor="{ data, field }">
              <InputText v-model="data[field]" placeholder="Формат вывода" />
            </template>
          </Column>

          <Column header="Действия" style="width: 100px">
            <template #body="{ data, index }">
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                @click="removeColumn(index)"
              />
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- SQL Preview -->
      <Panel header="Предварительный просмотр SQL" :toggleable="true" class="sql-preview-panel">
        <div class="sql-code">
          <pre>{{ generatedSQL }}</pre>
        </div>
        <Button label="Выполнить запрос" icon="pi pi-play" @click="executeQuery" class="mt-2" />
      </Panel>

      <!-- Results Table -->
      <div class="results-container" v-if="queryResults.length > 0">
        <h3>Результаты запроса</h3>
        <DataTable
          :value="queryResults"
          :paginator="true"
          :rows="20"
          stripedRows
          showGridlines
          :loading="loadingResults"
        >
          <Column
            v-for="col in resultColumns"
            :key="col.field"
            :field="col.field"
            :header="col.header"
            :sortable="true"
          />
        </DataTable>

        <!-- Totals Row -->
        <div class="totals-row" v-if="showTotals">
          <Card>
            <template #content>
              <div class="totals-content">
                <h4>Итоги:</h4>
                <div class="totals-grid">
                  <div v-for="(total, key) in totals" :key="key" class="total-item">
                    <span class="total-label">{{ key }}:</span>
                    <span class="total-value">{{ total }}</span>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>

    <!-- Format Dialog -->
    <Dialog v-model:visible="formatDialogVisible" header="Настройка формата" :modal="true" :style="{ width: '500px' }">
      <div class="p-fluid">
        <div class="field">
          <label for="dateFormat">Формат даты</label>
          <Dropdown
            id="dateFormat"
            v-model="currentFormat.date"
            :options="dateFormats"
            optionLabel="label"
            optionValue="value"
            placeholder="Выберите формат даты"
          />
        </div>
        <div class="field">
          <label for="numberFormat">Формат чисел</label>
          <Dropdown
            id="numberFormat"
            v-model="currentFormat.number"
            :options="numberFormats"
            optionLabel="label"
            optionValue="value"
            placeholder="Выберите формат чисел"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Отмена" icon="pi pi-times" @click="formatDialogVisible = false" text />
        <Button label="Применить" icon="pi pi-check" @click="applyFormat" autofocus />
      </template>
    </Dialog>

    <!-- Function Dialog -->
    <Dialog v-model:visible="functionDialogVisible" header="Выбор функции SQL" :modal="true" :style="{ width: '500px' }">
      <div class="p-fluid">
        <div class="field">
          <label for="sqlFunction">Агрегатная функция</label>
          <Dropdown
            id="sqlFunction"
            v-model="selectedFunction"
            :options="sqlFunctions"
            optionLabel="label"
            optionValue="value"
            placeholder="Выберите функцию"
          />
        </div>
        <div class="field">
          <label>Описание:</label>
          <p class="function-description">{{ getFunctionDescription(selectedFunction) }}</p>
        </div>
      </div>
      <template #footer>
        <Button label="Отмена" icon="pi pi-times" @click="functionDialogVisible = false" text />
        <Button label="Применить" icon="pi pi-check" @click="applyFunction" autofocus />
      </template>
    </Dialog>

    <!-- Order Dialog -->
    <Dialog v-model:visible="orderDialogVisible" header="Настройка сортировки" :modal="true" :style="{ width: '500px' }">
      <div class="p-fluid">
        <div class="field">
          <label>Порядок сортировки колонок</label>
          <OrderList v-model="orderSequence" dataKey="id" listStyle="height:auto">
            <template #item="{ item }">
              <div class="order-item">
                <span>{{ item.name }}</span>
                <Dropdown
                  v-model="item.direction"
                  :options="[{ label: 'По возрастанию', value: 'ASC' }, { label: 'По убыванию', value: 'DESC' }]"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Направление"
                  class="ml-2"
                />
              </div>
            </template>
          </OrderList>
        </div>
      </div>
      <template #footer>
        <Button label="Отмена" icon="pi pi-times" @click="orderDialogVisible = false" text />
        <Button label="Применить" icon="pi pi-check" @click="applyOrder" autofocus />
      </template>
    </Dialog>

    <!-- Expression Dialog -->
    <Dialog v-model:visible="expressionDialogVisible" header="Редактор выражений" :modal="true" :style="{ width: '600px' }">
      <div class="p-fluid">
        <div class="field">
          <label for="expression">SQL выражение</label>
          <Textarea
            id="expression"
            v-model="currentExpression"
            rows="5"
            placeholder="Введите SQL выражение, например: CASE WHEN amount > 1000 THEN 'High' ELSE 'Low' END"
          />
        </div>
        <div class="field">
          <label for="expressionAlias">Псевдоним колонки</label>
          <InputText id="expressionAlias" v-model="expressionAlias" placeholder="Название для результата" />
        </div>
      </div>
      <template #footer>
        <Button label="Отмена" icon="pi pi-times" @click="expressionDialogVisible = false" text />
        <Button label="Добавить" icon="pi pi-check" @click="addExpression" autofocus />
      </template>
    </Dialog>

    <!-- HAVING Dialog -->
    <Dialog v-model:visible="havingDialogVisible" header="Условие HAVING" :modal="true" :style="{ width: '500px' }">
      <div class="p-fluid">
        <div class="field">
          <label for="havingCondition">Условие фильтрации агрегатных функций</label>
          <Textarea
            id="havingCondition"
            v-model="havingCondition"
            rows="3"
            placeholder="Например: COUNT(*) > 5 или SUM(amount) > 10000"
          />
        </div>
        <div class="field">
          <label>Справка:</label>
          <p class="help-text">HAVING используется для фильтрации результатов агрегатных функций после GROUP BY</p>
        </div>
      </div>
      <template #footer>
        <Button label="Отмена" icon="pi pi-times" @click="havingDialogVisible = false" text />
        <Button label="Применить" icon="pi pi-check" @click="applyHaving" autofocus />
      </template>
    </Dialog>

    <!-- Totals Dialog -->
    <Dialog v-model:visible="totalsDialogVisible" header="Настройка итогов" :modal="true" :style="{ width: '500px' }">
      <div class="p-fluid">
        <div class="field">
          <label>Выберите колонки для подсчета итогов:</label>
          <div v-for="col in queryColumns" :key="col.name" class="field-checkbox">
            <Checkbox v-model="col.showTotal" :binary="true" :inputId="`total-${col.name}`" />
            <label :for="`total-${col.name}`" class="ml-2">{{ col.name }}</label>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Отмена" icon="pi pi-times" @click="totalsDialogVisible = false" text />
        <Button label="Применить" icon="pi pi-check" @click="applyTotals" autofocus />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Panel from 'primevue/panel'
import Listbox from 'primevue/listbox'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Card from 'primevue/card'
import Checkbox from 'primevue/checkbox'
import OrderList from 'primevue/orderlist'

// State
const searchReport = ref('')
const selectedReport = ref(null)
const showFilters = ref(false)
const loadingResults = ref(false)
const queryResults = ref([])
const showTotals = ref(false)
const totals = ref({})

// Dialogs
const formatDialogVisible = ref(false)
const functionDialogVisible = ref(false)
const orderDialogVisible = ref(false)
const expressionDialogVisible = ref(false)
const havingDialogVisible = ref(false)
const totalsDialogVisible = ref(false)

// Current editing states
const currentFormat = ref({ date: 'DD.MM.YYYY', number: '0.00' })
const selectedFunction = ref(null)
const currentExpression = ref('')
const expressionAlias = ref('')
const havingCondition = ref('')
const orderSequence = ref([])

// Reports list
const reports = ref([
  { id: 1, name: 'Отчет по продажам', description: 'Анализ продаж за период' },
  { id: 2, name: 'Клиенты и партнеры', description: 'Список активных клиентов' },
  { id: 3, name: 'Статистика по задачам', description: 'Выполнение задач по сотрудникам' },
  { id: 4, name: 'Финансовый отчет', description: 'Финансовые показатели' }
])

// Query columns configuration
const queryColumns = ref([
  {
    name: 'id',
    table: 'deals',
    filter: '',
    function: null,
    order: null,
    format: '',
    showTotal: false
  },
  {
    name: 'client_name',
    table: 'deals',
    filter: '',
    function: null,
    order: null,
    format: '',
    showTotal: false
  },
  {
    name: 'amount',
    table: 'deals',
    filter: '>= 1000',
    function: 'SUM',
    order: 'DESC',
    format: '0.00',
    showTotal: true
  }
])

// Available options
const availableTables = [
  { label: 'Сделки (deals)', value: 'deals' },
  { label: 'Клиенты (clients)', value: 'clients' },
  { label: 'Задачи (tasks)', value: 'tasks' },
  { label: 'Партнеры (partners)', value: 'partners' },
  { label: 'Пользователи (users)', value: 'users' }
]

const sqlFunctions = [
  { label: 'Без функции', value: null },
  { label: 'COUNT - Подсчет', value: 'COUNT' },
  { label: 'SUM - Сумма', value: 'SUM' },
  { label: 'AVG - Среднее', value: 'AVG' },
  { label: 'MIN - Минимум', value: 'MIN' },
  { label: 'MAX - Максимум', value: 'MAX' },
  { label: 'GROUP_CONCAT - Объединение', value: 'GROUP_CONCAT' }
]

const orderOptions = [
  { label: 'Не сортировать', value: null },
  { label: 'По возрастанию (ASC)', value: 'ASC' },
  { label: 'По убыванию (DESC)', value: 'DESC' }
]

const dateFormats = [
  { label: 'ДД.ММ.ГГГГ', value: 'DD.MM.YYYY' },
  { label: 'ГГГГ-ММ-ДД', value: 'YYYY-MM-DD' },
  { label: 'ДД/ММ/ГГГГ', value: 'DD/MM/YYYY' },
  { label: 'ММ/ДД/ГГГГ', value: 'MM/DD/YYYY' }
]

const numberFormats = [
  { label: 'Целое число', value: '0' },
  { label: 'Два знака после запятой', value: '0.00' },
  { label: 'С разделителем тысяч', value: '0,000.00' },
  { label: 'Процент', value: '0%' }
]

// Computed
const generatedSQL = computed(() => {
  let sql = 'SELECT\n'

  // Build SELECT clause
  const selectClauses = queryColumns.value.map(col => {
    let clause = `  ${col.table}.${col.name}`
    if (col.function) {
      clause = `  ${col.function}(${col.table}.${col.name})`
    }
    return clause
  })
  sql += selectClauses.join(',\n')

  // FROM clause
  const uniqueTables = [...new Set(queryColumns.value.map(col => col.table))]
  sql += `\nFROM ${uniqueTables.join(', ')}`

  // WHERE clause
  const whereConditions = queryColumns.value
    .filter(col => col.filter)
    .map(col => `${col.table}.${col.name} ${col.filter}`)

  if (whereConditions.length > 0) {
    sql += `\nWHERE ${whereConditions.join(' AND ')}`
  }

  // GROUP BY clause (if any functions are used)
  const hasFunctions = queryColumns.value.some(col => col.function)
  if (hasFunctions) {
    const groupByColumns = queryColumns.value
      .filter(col => !col.function)
      .map(col => `${col.table}.${col.name}`)

    if (groupByColumns.length > 0) {
      sql += `\nGROUP BY ${groupByColumns.join(', ')}`
    }
  }

  // HAVING clause
  if (havingCondition.value) {
    sql += `\nHAVING ${havingCondition.value}`
  }

  // ORDER BY clause
  const orderClauses = queryColumns.value
    .filter(col => col.order)
    .map(col => `${col.table}.${col.name} ${col.order}`)

  if (orderClauses.length > 0) {
    sql += `\nORDER BY ${orderClauses.join(', ')}`
  }

  sql += ';'
  return sql
})

const resultColumns = computed(() => {
  return queryColumns.value.map(col => ({
    field: col.name,
    header: col.name.toUpperCase()
  }))
})

// Methods
const toggleFilter = () => {
  showFilters.value = !showFilters.value
}

const openFormatDialog = () => {
  formatDialogVisible.value = true
}

const openFunctionDialog = () => {
  functionDialogVisible.value = true
}

const openOrderDialog = () => {
  orderSequence.value = queryColumns.value
    .filter(col => col.order)
    .map((col, index) => ({
      id: index,
      name: col.name,
      direction: col.order
    }))
  orderDialogVisible.value = true
}

const openExpressionDialog = () => {
  expressionDialogVisible.value = true
}

const openHavingDialog = () => {
  havingDialogVisible.value = true
}

const openTotalsDialog = () => {
  totalsDialogVisible.value = true
}

const applyFormat = () => {
  // Apply format to selected columns
  formatDialogVisible.value = false
}

const applyFunction = () => {
  // Apply function to selected column
  functionDialogVisible.value = false
}

const applyOrder = () => {
  // Apply order sequence
  orderDialogVisible.value = false
}

const addExpression = () => {
  if (currentExpression.value && expressionAlias.value) {
    queryColumns.value.push({
      name: expressionAlias.value,
      table: '(expression)',
      filter: '',
      function: null,
      order: null,
      format: '',
      showTotal: false,
      expression: currentExpression.value
    })
    currentExpression.value = ''
    expressionAlias.value = ''
    expressionDialogVisible.value = false
  }
}

const applyHaving = () => {
  havingDialogVisible.value = false
}

const applyTotals = () => {
  showTotals.value = queryColumns.value.some(col => col.showTotal)
  calculateTotals()
  totalsDialogVisible.value = false
}

const calculateTotals = () => {
  const newTotals = {}
  queryColumns.value.forEach(col => {
    if (col.showTotal && queryResults.value.length > 0) {
      const sum = queryResults.value.reduce((acc, row) => {
        const value = parseFloat(row[col.name]) || 0
        return acc + value
      }, 0)
      newTotals[col.name] = sum.toFixed(2)
    }
  })
  totals.value = newTotals
}

const addColumn = () => {
  const newColumnNumber = queryColumns.value.length + 1
  queryColumns.value.push({
    name: `column_${newColumnNumber}`,
    table: 'deals',
    filter: '',
    function: null,
    order: null,
    format: '',
    showTotal: false
  })
}

const removeColumn = (index) => {
  queryColumns.value.splice(index, 1)
}

const onCellEditComplete = (event) => {
  const { data, newValue, field } = event
  data[field] = newValue
}

const updateFilter = (data) => {
  // Auto-save filter change
  console.log('Filter updated:', data)
}

const loadReport = () => {
  console.log('Loading report:', selectedReport.value)
  // Load report configuration
}

const createNewReport = () => {
  console.log('Creating new report')
  queryColumns.value = []
}

const saveQuery = () => {
  console.log('Saving query:', generatedSQL.value)
  // Save query logic
}

const executeQuery = () => {
  loadingResults.value = true

  // Simulate API call
  setTimeout(() => {
    queryResults.value = [
      { id: 1, client_name: 'ООО "Компания 1"', amount: 15000 },
      { id: 2, client_name: 'ИП Иванов', amount: 8500 },
      { id: 3, client_name: 'ООО "Партнер"', amount: 12300 },
      { id: 4, client_name: 'ООО "Клиент 4"', amount: 20000 },
      { id: 5, client_name: 'ИП Петров', amount: 5500 }
    ]
    loadingResults.value = false

    if (showTotals.value) {
      calculateTotals()
    }
  }, 1000)
}

const getFunctionDescription = (func) => {
  const descriptions = {
    'COUNT': 'Подсчитывает количество строк',
    'SUM': 'Вычисляет сумму значений',
    'AVG': 'Вычисляет среднее значение',
    'MIN': 'Находит минимальное значение',
    'MAX': 'Находит максимальное значение',
    'GROUP_CONCAT': 'Объединяет значения в строку'
  }
  return descriptions[func] || 'Выберите функцию для получения описания'
}

onMounted(() => {
  console.log('SQL Query Editor loaded')
})
</script>

<style scoped>
.sql-query-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.view-header h2 {
  margin: 0;
  font-size: 1.75rem;
  color: #1e293b;
}

.query-builder-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.report-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.report-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-list {
  max-height: 200px;
  overflow-y: auto;
}

.query-controls {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.query-controls h3 {
  margin: 0 0 15px 0;
  font-size: 1.2rem;
  color: #1e293b;
}

.control-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.query-table-config {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filter-cell {
  width: 100%;
}

.sql-preview-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.sql-code {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 15px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  overflow-x: auto;
}

.sql-code pre {
  margin: 0;
  white-space: pre-wrap;
  color: #1e293b;
}

.results-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.results-container h3 {
  margin: 0 0 15px 0;
  font-size: 1.2rem;
  color: #1e293b;
}

.totals-row {
  margin-top: 20px;
}

.totals-content h4 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
  color: #1e293b;
}

.totals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.total-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background: #f8fafc;
  border-radius: 4px;
}

.total-label {
  font-weight: 600;
  color: #64748b;
}

.total-value {
  font-weight: 700;
  color: #1976d2;
  font-size: 1.1rem;
}

.order-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.function-description {
  color: #64748b;
  font-style: italic;
}

.help-text {
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.5;
}

.field-checkbox {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

:deep(.editable-cells-table .p-datatable-tbody > tr > td) {
  padding: 0.5rem;
}

:deep(.p-orderlist-list) {
  max-height: 300px;
}
</style>
