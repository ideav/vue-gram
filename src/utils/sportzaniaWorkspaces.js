export const TASKDASH_REPORT_ID = '155675'
export const RATING_REPORT_ID = '155768'
export const STRUCT_REPORT_ID = '8027'

export const TASKDASH_FILTER_NAMES = ['месяц', 'департамент', 'статус задачи']
export const RATING_FILTER_NAMES = ['срок', 'департамент', 'фио']
export const TASKDASH_INCOMPLETE_STATUS_OPTION = { value: '!8925', label: 'Все незавершенные' }

export const TASKDASH_FALLBACK_COLUMNS = [
  { id: '155682', type: '', format: 'SHORT', name: 'Месяц' },
  { id: '155679', type: '2953', format: 'SHORT', name: 'Департамент', granted: 1, ref: 1, orig: '2859' },
  { id: '155680', type: '', format: 'SHORT', name: 'Просрочена' },
  { id: '155683', type: '', format: 'SHORT', name: 'Отложена' },
  { id: '155684', type: '', format: 'SHORT', name: 'Завершена' },
  { id: '155685', type: '', format: 'SHORT', name: 'В работе' },
  { id: '155721', type: '', format: 'SHORT', name: 'Сотрудников' },
  { id: '155724', type: '8907', format: 'SHORT', name: 'Статус задачи', granted: 1, ref: 1, orig: '2685' }
]

export const RATING_FALLBACK_COLUMNS = [
  { id: '155773', type: '2948', format: 'SHORT', name: 'ФИО', granted: 1 },
  { id: '155775', type: '2859', format: 'SHORT', name: 'Департамент', granted: 1 },
  { id: '155787', type: '', format: 'SHORT', name: 'Закрыто' },
  { id: '155779', type: '', format: 'SHORT', name: 'В срок' },
  { id: '155790', type: '', format: 'SHORT', name: 'Задач' },
  { id: '155796', type: '', format: 'SHORT', name: 'Срок' }
]

export const RATING_TABLE_COLUMNS = [
  { id: 'name', label: 'ФИО' },
  { id: 'department', label: 'Департамент' },
  { id: 'score', label: 'Рейтинг', numeric: true },
  { id: 'closedRate', label: 'Закрыто', numeric: true },
  { id: 'onTimeRate', label: 'В срок', numeric: true },
  { id: 'tasks', label: 'Задач', numeric: true },
  { id: 'period', label: 'Срок' }
]

export const SPORTZANIA_LEGACY_TEMPLATES = [
  {
    template: 'templates/sportzania/main.html',
    vueRoute: '/:database',
    status: 'covered-by-shell',
    notes: 'The Vue Integram shell covers the Sportzania main shell, sidebar, user menu, theme, font, and brand background compatibility.'
  },
  {
    template: 'templates/sportzania/procvac.html',
    vueRoute: '/:database/sportzania/procvac',
    fallback: 'Explicit fallback page keeps the legacy ProcVac bundle boundary visible until issue #32 ports js/procvac.js and css/procvac.css.',
    status: 'fallback'
  },
  {
    template: 'templates/sportzania/rating.html',
    vueRoute: '/:database/sportzania/rating',
    legacyAlias: '/:database/rating',
    reportId: RATING_REPORT_ID,
    status: 'ported'
  },
  {
    template: 'templates/sportzania/struct.html',
    vueRoute: '/:database/sportzania/struct',
    legacyAlias: '/:database/struct',
    reportId: STRUCT_REPORT_ID,
    status: 'ported'
  },
  {
    template: 'templates/sportzania/taskdash.html',
    vueRoute: '/:database/sportzania/taskdash',
    legacyAlias: '/:database/taskdash',
    reportId: TASKDASH_REPORT_ID,
    status: 'ported'
  }
]

export const SPORTZANIA_WORKSPACES = {
  taskdash: {
    key: 'taskdash',
    label: 'Пульт задач',
    icon: 'fi fi-rr-list-check',
    route: 'taskdash',
    reportId: TASKDASH_REPORT_ID,
    template: 'templates/sportzania/taskdash.html'
  },
  rating: {
    key: 'rating',
    label: 'Рейтинг исполнителей',
    icon: 'fi fi-rr-chart-histogram',
    route: 'rating',
    reportId: RATING_REPORT_ID,
    template: 'templates/sportzania/rating.html'
  },
  struct: {
    key: 'struct',
    label: 'Структура компании',
    icon: 'fi fi-rr-sitemap',
    route: 'struct',
    reportId: STRUCT_REPORT_ID,
    template: 'templates/sportzania/struct.html'
  },
  procvac: {
    key: 'procvac',
    label: 'ProcVac',
    icon: 'fi fi-rr-briefcase',
    route: 'procvac',
    template: 'templates/sportzania/procvac.html',
    fallback: SPORTZANIA_LEGACY_TEMPLATES[1].fallback
  }
}

export function normalizeSportzaniaColumn(column, index = 0) {
  if (typeof column !== 'object' || column === null) {
    return {
      id: String(index),
      name: String(column || `Поле ${index + 1}`),
      type: '',
      format: '',
      ref: '',
      orig: '',
      granted: ''
    }
  }

  const name = column.name || column.val || column.title || column.id || `Поле ${index + 1}`
  return {
    ...column,
    id: String(column.id || name || index),
    name: String(name),
    type: column.type || '',
    format: column.format || '',
    ref: column.ref || '',
    orig: column.orig || '',
    granted: column.granted || ''
  }
}

export function normalizeSportzaniaReportResponse(payload, fallbackColumns = []) {
  const columns = normalizeColumns(payload, fallbackColumns)
  const rows = normalizeRows(payload, columns)
  const finalColumns = columns.length ? columns : columnsFromRows(rows)

  return {
    columns: finalColumns,
    rows
  }
}

function normalizeColumns(payload, fallbackColumns) {
  const source = unwrapReportPayload(payload)
  const rawColumns = source?.columns || source?.col || []
  const columns = Array.isArray(rawColumns)
    ? rawColumns.map(normalizeSportzaniaColumn)
    : []

  return columns.length
    ? columns
    : (fallbackColumns || []).map(normalizeSportzaniaColumn)
}

function unwrapReportPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload
  const reportKey = Object.keys(payload).find(key => key.startsWith('&rep.'))
  return reportKey ? payload[reportKey] : payload
}

function normalizeRows(payload, columns) {
  const source = unwrapReportPayload(payload)

  if (Array.isArray(source)) {
    return source.map(item => item && typeof item === 'object' ? { ...item } : { value: item })
  }

  const rows = source?.rows
  if (Array.isArray(rows) && rows.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
    return rows.map(item => ({ ...item }))
  }

  const data = Array.isArray(source?.data) ? source.data : (Array.isArray(rows) ? rows : null)
  if (columns.length && data && data.every(Array.isArray)) {
    return isColumnMatrix(columns, data)
      ? rowsFromColumnMatrix(columns, data)
      : rowsFromRowMatrix(columns, data)
  }

  if (Array.isArray(source?.data)) {
    return source.data.map(item => item && typeof item === 'object' ? { ...item } : { value: item })
  }

  return []
}

function columnsFromRows(rows) {
  const keys = []
  rows.forEach(row => {
    Object.keys(row || {}).forEach(key => {
      if (!keys.includes(key)) keys.push(key)
    })
  })
  return keys.map((key, index) => normalizeSportzaniaColumn({ id: key || String(index), name: key || `Поле ${index + 1}` }, index))
}

function isColumnMatrix(columns, matrix) {
  return matrix.length === columns.length
}

function rowsFromColumnMatrix(columns, matrix) {
  const rowCount = matrix.reduce((max, values) => Math.max(max, values.length), 0)
  const rows = []

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = {}
    columns.forEach((column, columnIndex) => {
      row[column.name] = valueAt(matrix[columnIndex], rowIndex)
    })
    rows.push(row)
  }

  return rows
}

function rowsFromRowMatrix(columns, matrix) {
  return matrix.map(values => {
    const row = {}
    columns.forEach((column, columnIndex) => {
      row[column.name] = valueAt(values, columnIndex)
    })
    return row
  })
}

function valueAt(values, index) {
  if (!Array.isArray(values)) return ''
  return values[index] === undefined || values[index] === null ? '' : values[index]
}

export function cellText(value) {
  if (value && typeof value === 'object') {
    if (value.val !== undefined) return String(value.val)
    if (value.value !== undefined) return String(value.value)
  }
  return value === null || value === undefined ? '' : String(value)
}

export function parseSportzaniaNumber(value) {
  if (value && typeof value === 'object') value = value.val || value.value || ''
  if (value === null || value === undefined || value === '') return NaN

  const cleaned = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')

  if (!cleaned || cleaned === '-' || cleaned === '.') return NaN
  return parseFloat(cleaned)
}

export function parseSportzaniaDateValue(value) {
  if (value && typeof value === 'object') value = value.val || value.value || ''

  const text = String(value || '').trim()
  if (!text) return null

  let match = text.match(/^(\d\d\d\d)(\d\d)(\d\d)$/)
  if (match) return { year: match[1], month: match[2], day: match[3] }

  match = text.match(/^(\d\d\d\d)-(\d\d)-(\d\d)/)
  if (match) return { year: match[1], month: match[2], day: match[3] }

  match = text.match(/^(\d\d)\.(\d\d)\.(\d\d\d\d)/)
  if (match) return { year: match[3], month: match[2], day: match[1] }

  return null
}

export function sportzaniaMonthKey(value) {
  const parsed = parseSportzaniaDateValue(value)
  return parsed ? `${parsed.year}-${parsed.month}` : ''
}

export function sportzaniaMonthLabel(key) {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
  const parts = String(key || '').split('-')
  const monthIndex = parseInt(parts[1], 10) - 1
  if (parts.length !== 2 || monthIndex < 0 || monthIndex > 11) return key || ''
  return `${months[monthIndex]} ${parts[0]}`
}

export function sportzaniaDateSortKey(value) {
  const parsed = parseSportzaniaDateValue(value)
  return parsed ? `${parsed.year}${parsed.month}${parsed.day}` : ''
}

export function formatSportzaniaDateForApi(value) {
  const text = String(value || '').trim()
  const match = text.match(/^(\d\d\d\d)-(\d\d)-(\d\d)$/)
  if (match) return `${match[3]}.${match[2]}.${match[1]}`
  return text
}

export function findSportzaniaColumn(columns, names) {
  const list = Array.isArray(names) ? names : [names]
  const normalized = list.map(name => String(name || '').toLowerCase())
  const exact = columns.find(column => normalized.includes(String(column.name || '').toLowerCase()))
  if (exact) return exact

  return columns.find(column => {
    const name = String(column.name || '').toLowerCase()
    return normalized.some(part => part && name.includes(part))
  }) || null
}

export function createQuickRanges(now = new Date()) {
  function iso(year, monthIndex, day) {
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  function lastDay(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate()
  }

  const date = now instanceof Date ? now : new Date()
  const year = date.getFullYear()
  const month = date.getMonth()
  const previousMonth = new Date(year, month - 1, 1)

  return [
    { key: 'current-year', label: 'текущий год', from: iso(year, 0, 1), to: iso(year, 11, 31) },
    { key: 'previous-year', label: 'прошлый год', from: iso(year - 1, 0, 1), to: iso(year - 1, 11, 31) },
    { key: 'current-month', label: 'текущий месяц', from: iso(year, month, 1), to: iso(year, month, lastDay(year, month)) },
    {
      key: 'previous-month',
      label: 'прошлый месяц',
      from: iso(previousMonth.getFullYear(), previousMonth.getMonth(), 1),
      to: iso(previousMonth.getFullYear(), previousMonth.getMonth(), lastDay(previousMonth.getFullYear(), previousMonth.getMonth()))
    }
  ]
}

export function createTaskdashDefaultFilters(year, columns) {
  return createDateDefaultFilters(year, columns, isTaskdashFilterColumn, isTaskdashDateColumn)
}

export function createRatingDefaultFilters(year, columns) {
  return createDateDefaultFilters(year, columns, isRatingFilterColumn, isRatingDateColumn)
}

function createDateDefaultFilters(year, columns, filterPredicate, datePredicate) {
  const filters = {}
  ;(columns || []).forEach(column => {
    if (filterPredicate(column) && datePredicate(column)) {
      filters[column.id] = {
        from: `${year}-01-01`,
        to: `${year}-12-31`
      }
    }
  })
  return filters
}

export function reconcileSportzaniaFilters(oldColumns, newColumns, filters, filterPredicate) {
  const byName = {}
  const next = {}

  ;(oldColumns || []).forEach(column => {
    if (filterPredicate(column) && filters?.[column.id]) {
      byName[column.name] = filters[column.id]
    }
  })

  ;(newColumns || []).forEach(column => {
    if (!filterPredicate(column)) return
    if (filters?.[column.id]) next[column.id] = filters[column.id]
    else if (byName[column.name]) next[column.id] = byName[column.name]
  })

  return next
}

export function buildTaskdashReportParams(columns, filters) {
  const params = { _jsonFormat: 'JSON_KV' }

  ;(columns || []).forEach(column => {
    if (!isTaskdashFilterColumn(column)) return
    const filter = filters?.[column.id] || {}
    const from = filter.from ? String(filter.from).trim() : ''
    const to = filter.to ? String(filter.to).trim() : ''
    let value = filter.value ? String(filter.value).trim() : ''

    if (isTaskdashDateColumn(column)) {
      if (from) params[filterKey('FR_', column)] = formatSportzaniaDateForApi(from)
      if (to) params[filterKey('TO_', column)] = formatSportzaniaDateForApi(to)
    } else if (isTaskdashMetricColumn(column)) {
      if (from) params[filterKey('FR_', column)] = from
      if (to) params[filterKey('TO_', column)] = to
    } else if (value) {
      if (isTaskdashStatusColumn(column)) {
        value = taskdashStatusFilterValue(taskdashStatusIdsFromFilter(value))
        if (value) params[filterKey('FR_', taskdashStatusFilterColumn(column))] = value
      } else {
        params[filterKey('FR_', column)] = `%${value}%`
      }
    }
  })

  return params
}

export function buildRatingReportParams(columns, filters) {
  const params = { _jsonFormat: 'JSON_KV' }

  ;(columns || []).forEach(column => {
    if (!isRatingFilterColumn(column)) return
    const filter = filters?.[column.id] || {}
    const from = filter.from ? String(filter.from).trim() : ''
    const to = filter.to ? String(filter.to).trim() : ''
    const value = filter.value ? String(filter.value).trim() : ''

    if (isRatingDateColumn(column)) {
      if (from) params[filterKey('FR_', column)] = formatSportzaniaDateForApi(from)
      if (to) params[filterKey('TO_', column)] = formatSportzaniaDateForApi(to)
    } else if (!isRatingMetricColumn(column) && value) {
      params[filterKey('FR_', column)] = `%${value}%`
    }
  })

  return params
}

function filterKey(prefix, column) {
  return `${prefix}${column ? column.name : ''}`
}

export function isTaskdashDateColumn(column) {
  const name = String(column?.name || '').toLowerCase()
  const format = String(column?.format || '').toLowerCase()
  return name.includes('месяц') || name.includes('дата') || format.includes('date')
}

export function isRatingDateColumn(column) {
  const name = String(column?.name || '').toLowerCase()
  const format = String(column?.format || '').toLowerCase()
  if (name === 'в срок') return false
  return name.includes('срок') || name.includes('месяц') || name.includes('дата') || format.includes('date')
}

export function isTaskdashMetricColumn(column) {
  const name = String(column?.name || '').toLowerCase()
  const metrics = ['просрочена', 'отложена', 'завершена', 'в работе', 'сотрудников', 'количество', 'count']
  if (name.includes('статус')) return false
  return metrics.some(metric => name === metric || name.includes(metric))
}

export function isRatingMetricColumn(column) {
  const name = String(column?.name || '').toLowerCase()
  const metrics = ['закрыто', 'в срок', 'задач', 'рейтинг', 'количество', 'count']
  return metrics.some(metric => name === metric || name.includes(metric))
}

export function isTaskdashFilterColumn(column) {
  const name = String(column?.name || '').trim().toLowerCase()
  return TASKDASH_FILTER_NAMES.includes(name)
}

export function isRatingFilterColumn(column) {
  const name = String(column?.name || '').trim().toLowerCase()
  return RATING_FILTER_NAMES.includes(name)
}

export function getTaskdashFilterColumns(columns) {
  return orderedFilterColumns(columns, TASKDASH_FILTER_NAMES)
}

export function getRatingFilterColumns(columns) {
  return orderedFilterColumns(columns, RATING_FILTER_NAMES)
}

function orderedFilterColumns(columns, names) {
  const result = []
  names.forEach(filterName => {
    const column = (columns || []).find(item => String(item?.name || '').trim().toLowerCase() === filterName)
    if (column && !result.includes(column)) result.push(column)
  })
  return result
}

export function isTaskdashStatusColumn(column) {
  return String(column?.name || '').trim().toLowerCase() === 'статус задачи'
}

function taskdashStatusFilterColumn(column) {
  return isTaskdashStatusColumn(column) ? { name: 'СтатусID' } : column
}

export function taskdashStatusIdsFromFilter(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter((item, index, list) => item && list.indexOf(item) === index)
}

export function taskdashStatusFilterValue(ids) {
  if (!ids.length) return ''
  return ids.length === 1 ? ids[0] : `IN(${ids.join(',')})`
}

export function taskdashParseReference(value) {
  let raw = value
  if (raw && typeof raw === 'object') {
    raw = raw.id || raw.k || raw.key || raw.value || raw.val || ''
  }

  const text = String(raw === null || raw === undefined ? '' : raw).trim()
  const match = text.match(/^(\d+)\s*:\s*(.+)$/)
  if (match) return { id: match[1], name: match[2] }
  return { id: '', name: cellText(value).trim() }
}

export function taskdashStatusIdFromRow(row) {
  const direct = row && (row['СтатусID'] || row['Статус задачиID'] || row['Статус задачи ID'])
  const parsed = taskdashParseReference(direct)
  return parsed.id || cellText(direct).trim()
}

export function getTaskdashTableColumns(columns) {
  return (columns || []).filter(column => {
    const name = String(column?.name || '').trim().toLowerCase()
    return name !== 'статусid' && name !== 'статус задачиid' && name !== 'статус задачи id'
  })
}

export function buildTaskdashSummary(rows, columns) {
  const doneColumn = findSportzaniaColumn(columns, ['Завершена'])
  const activeColumn = findSportzaniaColumn(columns, ['В работе'])
  const overdueColumn = findSportzaniaColumn(columns, ['Просрочена'])
  const delayedColumn = findSportzaniaColumn(columns, ['Отложена'])
  const summary = { completed: 0, active: 0, overdue: 0, delayed: 0, total: 0, completionRate: 0 }

  ;(rows || []).forEach(row => {
    summary.completed += valueAsNumber(row, doneColumn)
    summary.active += valueAsNumber(row, activeColumn)
    summary.overdue += valueAsNumber(row, overdueColumn)
    summary.delayed += valueAsNumber(row, delayedColumn)
  })

  summary.total = summary.completed + summary.active + summary.overdue + summary.delayed
  summary.completionRate = summary.total ? Math.round(summary.completed / summary.total * 100) : 0
  return summary
}

export function taskdashBuildMonthlySeries(rows, columns) {
  const dateColumn = findSportzaniaColumn(columns, ['Месяц', 'Дата'])
  const doneColumn = findSportzaniaColumn(columns, ['Завершена'])
  const activeColumn = findSportzaniaColumn(columns, ['В работе'])
  const overdueColumn = findSportzaniaColumn(columns, ['Просрочена'])
  const delayedColumn = findSportzaniaColumn(columns, ['Отложена'])
  const grouped = {}

  ;(rows || []).forEach(row => {
    const key = dateColumn ? sportzaniaMonthKey(row[dateColumn.name]) : ''
    if (!key) return
    if (!grouped[key]) {
      grouped[key] = { key, label: sportzaniaMonthLabel(key), completed: 0, active: 0, overdue: 0, delayed: 0, total: 0 }
    }
    grouped[key].completed += valueAsNumber(row, doneColumn)
    grouped[key].active += valueAsNumber(row, activeColumn)
    grouped[key].overdue += valueAsNumber(row, overdueColumn)
    grouped[key].delayed += valueAsNumber(row, delayedColumn)
    grouped[key].total = grouped[key].completed + grouped[key].active + grouped[key].overdue + grouped[key].delayed
  })

  return Object.keys(grouped).sort().map(key => grouped[key])
}

function valueAsNumber(row, column) {
  if (!row || !column) return 0
  const value = parseSportzaniaNumber(row[column.name])
  return Number.isNaN(value) ? 0 : value
}

export function sortTaskdashRows(rows, columns, sort = { columnId: '', dir: 'asc' }) {
  const column = columns.find(item => item.id === sort.columnId) || columns[0]
  const sorted = (rows || []).slice()
  if (!column) return sorted

  sorted.sort((a, b) => {
    const av = taskdashSortValue(a[column.name], column)
    const bv = taskdashSortValue(b[column.name], column)
    const result = av > bv ? 1 : av < bv ? -1 : 0
    return sort.dir === 'desc' ? -result : result
  })

  return sorted
}

function taskdashSortValue(value, column) {
  const parsedDate = parseSportzaniaDateValue(value)
  const parsedNumber = parseSportzaniaNumber(value)
  if (isTaskdashDateColumn(column) && parsedDate) return `${parsedDate.year}${parsedDate.month}${parsedDate.day}`
  if (!Number.isNaN(parsedNumber) && isTaskdashMetricColumn(column)) return parsedNumber
  return cellText(value).toLowerCase()
}

export function collectTaskdashFilterValues(rows, column, selectedValue = '') {
  const values = []
  const selectedParts = String(selectedValue || '').trim()
    ? String(selectedValue).split(',').map(item => item.trim())
    : []

  ;(rows || []).forEach(row => {
    const item = isTaskdashStatusColumn(column)
      ? taskdashParseReference(row[column.name])
      : { id: '', name: cellText(row[column.name]).trim() }
    if (isTaskdashStatusColumn(column) && !item.id) item.id = taskdashStatusIdFromRow(row)
    const key = isTaskdashStatusColumn(column) ? item.id : item.name
    if (!key) return
    if (!values.some(existing => existing.value === key)) {
      values.push({ value: key, label: item.name || key })
    }
  })

  values.sort((a, b) => a.label.localeCompare(b.label))
  let limited = values.slice(0, 120)

  if (isTaskdashStatusColumn(column)) {
    limited = limited.filter(item => item.value !== TASKDASH_INCOMPLETE_STATUS_OPTION.value)
    limited.push(TASKDASH_INCOMPLETE_STATUS_OPTION)
  }

  selectedParts.forEach(part => {
    if (part && !limited.some(item => item.value === part)) {
      limited.unshift({ value: part, label: part })
    }
  })

  return limited
}

export function aggregateRatingPerformers(rows, columns) {
  const nameColumn = findSportzaniaColumn(columns, ['ФИО', 'Исполнитель', 'Сотрудник'])
  const departmentColumn = findSportzaniaColumn(columns, ['Департамент'])
  const closedColumn = findSportzaniaColumn(columns, ['Закрыто'])
  const onTimeColumn = findSportzaniaColumn(columns, ['В срок'])
  const tasksColumn = findSportzaniaColumn(columns, ['Задач'])
  const periodColumn = findSportzaniaColumn(columns, ['Срок', 'Месяц', 'Дата'])
  const groups = {}

  ;(rows || []).forEach(row => {
    const name = cellText(nameColumn ? row[nameColumn.name] : '').trim() || 'Без ФИО'
    const department = cellText(departmentColumn ? row[departmentColumn.name] : '').trim()
    const key = `${name}\u0000${department}`
    const tasks = valueAsNumber(row, tasksColumn)
    const weight = tasks > 0 ? tasks : 1
    const closed = valueAsNumber(row, closedColumn)
    const onTime = valueAsNumber(row, onTimeColumn)
    const periodValue = periodColumn ? row[periodColumn.name] : ''
    const dateKey = sportzaniaDateSortKey(periodValue)

    if (!groups[key]) {
      groups[key] = {
        name,
        department,
        tasks: 0,
        weight: 0,
        closedWeighted: 0,
        onTimeWeighted: 0,
        periodStart: '',
        periodEnd: ''
      }
    }

    groups[key].tasks += tasks
    groups[key].weight += weight
    groups[key].closedWeighted += closed * weight
    groups[key].onTimeWeighted += onTime * weight
    if (dateKey) {
      if (!groups[key].periodStart || dateKey < groups[key].periodStart) groups[key].periodStart = dateKey
      if (!groups[key].periodEnd || dateKey > groups[key].periodEnd) groups[key].periodEnd = dateKey
    }
  })

  return Object.keys(groups).map(key => {
    const item = groups[key]
    item.closedRate = item.weight ? item.closedWeighted / item.weight : 0
    item.onTimeRate = item.weight ? item.onTimeWeighted / item.weight : 0
    item.score = ratingScore(item.closedRate, item.onTimeRate)
    return item
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.tasks !== a.tasks) return b.tasks - a.tasks
    return a.name.localeCompare(b.name)
  })
}

export function ratingScore(closedRate, onTimeRate) {
  return (Number(closedRate) || 0) / 2 + (Number(onTimeRate) || 0) / 2
}

export function buildRatingSummary(performers) {
  const summary = { performers: 0, tasks: 0, avgScore: 0, avgClosed: 0, avgOnTime: 0 }
  let weightTotal = 0

  ;(performers || []).forEach(item => {
    const weight = item.tasks > 0 ? item.tasks : 1
    summary.performers += 1
    summary.tasks += item.tasks
    summary.avgScore += item.score * weight
    summary.avgClosed += item.closedRate * weight
    summary.avgOnTime += item.onTimeRate * weight
    weightTotal += weight
  })

  if (weightTotal) {
    summary.avgScore /= weightTotal
    summary.avgClosed /= weightTotal
    summary.avgOnTime /= weightTotal
  }

  return summary
}

export function sortRatingPerformers(performers, sort = { columnId: 'score', dir: 'desc' }) {
  const sorted = (performers || []).slice()
  const columnId = sort.columnId || 'score'

  sorted.sort((a, b) => {
    const av = ratingSortValue(a, columnId)
    const bv = ratingSortValue(b, columnId)
    let result = av > bv ? 1 : av < bv ? -1 : 0
    if (result === 0 && columnId !== 'score') result = b.score - a.score
    return sort.dir === 'desc' ? -result : result
  })

  return sorted
}

function ratingSortValue(item, columnId) {
  if (columnId === 'period') return item.periodEnd || item.periodStart || ''
  if (columnId === 'tasks' || columnId === 'score' || columnId === 'closedRate' || columnId === 'onTimeRate') {
    return Number(item[columnId]) || 0
  }
  return String(item[columnId] || '').toLowerCase()
}

export function collectRatingFilterValues(rows, column, selectedValue = '', cachedValues = []) {
  const values = []

  function push(value) {
    value = String(value || '').trim()
    if (!value) return
    if (!values.some(existing => existing.value === value)) {
      values.push({ value, label: value })
    }
  }

  cachedValues.forEach(push)
  ;(rows || []).forEach(row => push(cellText(row[column.name]).trim()))
  values.sort((a, b) => a.label.localeCompare(b.label))

  const selected = String(selectedValue || '').trim()
  const limited = values.slice(0, 160)
  if (selected && !limited.some(item => item.value === selected)) {
    limited.unshift({ value: selected, label: selected })
  }
  return limited
}

export function formatRatingPeriod(item) {
  const start = sportzaniaMonthKey(item.periodStart)
  const end = sportzaniaMonthKey(item.periodEnd)
  if (start && end && start !== end) return `${sportzaniaMonthLabel(start)} - ${sportzaniaMonthLabel(end)}`
  if (end) return sportzaniaMonthLabel(end)
  if (start) return sportzaniaMonthLabel(start)
  return ''
}

export function formatPercent(value) {
  const number = Number(value) || 0
  const rounded = Math.round(number * 10) / 10
  return `${String(rounded).replace(/\.0$/, '')}%`
}

export function formatSportzaniaNumber(value) {
  const number = Number(value) || 0
  return String(Math.round(number * 100) / 100).replace(/\B(?=(\d\d\d)+(?!\d))/g, ' ')
}

export function formatTaskdashDateCell(value) {
  const key = sportzaniaMonthKey(value)
  return key ? sportzaniaMonthLabel(key) : cellText(value)
}

export function formatTaskdashMetric(value) {
  const number = parseSportzaniaNumber(value)
  return Number.isNaN(number) ? cellText(value) : formatSportzaniaNumber(number)
}

export function formatClock(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function buildSportzaniaOrgChart(rows) {
  const departments = {}

  ;(rows || []).forEach(row => {
    const id = String(row?.ДепартаментID ?? row?.departmentId ?? '').trim()
    if (!id) return
    const parentId = String(row?.РодительскийДепартаментID ?? row?.parentDepartmentId ?? id).trim()
    const name = cellText(row?.Департамент ?? row?.department ?? id).trim() || id

    if (!departments[id]) {
      departments[id] = { id, name, parentId, heads: [], employees: [] }
    } else {
      departments[id].name = departments[id].name || name
      departments[id].parentId = departments[id].parentId || parentId
    }

    if (!row?.ФИО || cellText(row['Статус найма']).trim() !== '2985') return

    const employee = {
      name: cellText(row.ФИО).trim(),
      position: cellText(row.Должность).trim(),
      tab: cellText(row.Табельный).trim()
    }

    if (row.Руководитель) {
      const alreadyHead = departments[id].heads.some(head => head.tab === employee.tab)
      if (!alreadyHead) {
        departments[id].heads.push(employee)
        departments[id].employees = departments[id].employees.filter(item => item.tab !== employee.tab)
      }
    } else {
      const isHead = departments[id].heads.some(head => head.tab === employee.tab)
      if (!isHead) departments[id].employees.push(employee)
    }
  })

  let rootId = null
  Object.keys(departments).forEach(id => {
    const parentId = departments[id].parentId
    if (parentId === id || !departments[parentId]) {
      rootId = rootId || id
    }
  })

  const children = {}
  Object.keys(departments).forEach(id => {
    const parentId = departments[id].parentId
    if (parentId !== id) {
      if (!children[parentId]) children[parentId] = []
      children[parentId].push(id)
    }
  })

  return {
    rootId,
    departments,
    children
  }
}
