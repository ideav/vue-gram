export const REPORT_TYPE_ID = 22
export const REPORT_COLUMN_TYPE_ID = 28
export const REPORT_JOIN_TYPE_ID = 44

export const REPORT_REQS = Object.freeze({
  interactive: 95,
  joins: 261,
  limit: 134
})

export const COLUMN_REQS = Object.freeze({
  alias: 100,
  expression: 101,
  filterFrom: 102,
  filterTo: 103,
  function: 104,
  havingFrom: 105,
  havingTo: 106,
  hidden: 107,
  order: 109,
  totals: 72,
  format: 84,
  sourceAlias: 58,
  setExpression: 132
})

export const JOIN_REQS = Object.freeze({
  alias: 265,
  condition: 266
})

export const LEGACY_CONTROL_GROUPS = Object.freeze([
  Object.freeze({ id: 'filter', label: 'Фильтр', reqIds: [COLUMN_REQS.filterFrom, COLUMN_REQS.filterTo] }),
  Object.freeze({ id: 'format', label: 'Формат', reqIds: [COLUMN_REQS.format] }),
  Object.freeze({ id: 'function', label: 'Функция', reqIds: [COLUMN_REQS.function] }),
  Object.freeze({ id: 'order', label: 'Сортировка', reqIds: [COLUMN_REQS.order] }),
  Object.freeze({ id: 'totals', label: 'Итоги', reqIds: [COLUMN_REQS.totals] }),
  Object.freeze({ id: 'expression', label: 'Формула', reqIds: [COLUMN_REQS.expression] }),
  Object.freeze({ id: 'having', label: 'HAVING', reqIds: [COLUMN_REQS.havingFrom, COLUMN_REQS.havingTo] }),
  Object.freeze({ id: 'set', label: 'SET', reqIds: [COLUMN_REQS.setExpression] }),
  Object.freeze({ id: 'sourceAlias', label: 'ALIAS', reqIds: [COLUMN_REQS.sourceAlias] })
])

const TOTAL_LABEL_BY_ID = Object.freeze({
  67: 'SUM',
  68: 'AVG',
  69: 'MIN',
  70: 'MAX',
  71: 'COUNT'
})

const FUNCTION_LABEL_BY_ID = Object.freeze({
  85: 'abn_ID'
})

function asString(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function unwrapReqValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    if (value.value !== undefined) return unwrapReqValue(value.value)
    if (value.val !== undefined) return unwrapReqValue(value.val)
    if (value.id !== undefined && value.ref_val !== undefined) return `${value.id}:${value.ref_val}`
  }
  return asString(value)
}

export function getObjectReq(reqs, objectId, reqId) {
  if (!reqs || objectId === null || objectId === undefined) return ''
  const objectReqs = reqs[objectId] || reqs[String(objectId)]
  if (!objectReqs) return ''
  const direct = objectReqs[reqId] ?? objectReqs[String(reqId)]
  return unwrapReqValue(direct)
}

export function getEditReq(editReqs, reqId) {
  if (!editReqs) return ''
  const req = editReqs[reqId] || editReqs[String(reqId)]
  return unwrapReqValue(req)
}

export function decodeOrderValue(value) {
  const raw = asString(value).trim()
  if (!raw) return { orderDirection: '', orderPriority: '' }
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed === 0) {
    return { orderDirection: '', orderPriority: '' }
  }
  return {
    orderDirection: parsed < 0 ? 'DESC' : 'ASC',
    orderPriority: Math.abs(parsed)
  }
}

export function encodeOrderValue(direction, priority) {
  if (!direction || !priority) return ''
  const numericPriority = Number.parseInt(priority, 10)
  if (!Number.isFinite(numericPriority) || numericPriority <= 0) return ''
  return direction === 'DESC' ? String(-numericPriority) : String(numericPriority)
}

function normalizeRepColList(repColList = []) {
  const tables = []
  const columnsByTable = {}
  const byId = {}

  repColList.forEach((item) => {
    const id = asString(item.id)
    const tableId = asString(item.table)
    const name = item.name || item.val || `#${id}`
    const normalized = {
      id,
      tableId,
      name,
      type: item.type || '',
      format: item.format || '',
      raw: item
    }

    byId[id] = normalized

    if (id && id === tableId) {
      tables.push(normalized)
      if (!columnsByTable[id]) columnsByTable[id] = []
    } else if (tableId) {
      if (!columnsByTable[tableId]) columnsByTable[tableId] = []
      columnsByTable[tableId].push(normalized)
    }
  })

  return { tables, columnsByTable, byId }
}

function normalizeReportColumns(columnsResponse = {}, sourceColumnsById = {}) {
  const reqs = columnsResponse.reqs || {}

  return (columnsResponse.object || []).map((object, index) => {
    const id = asString(object.id)
    const sourceColumnId = asString(object.ref || object.t28 || object.value || '')
    const sourceColumn = sourceColumnsById[sourceColumnId] || {}
    const alias = getObjectReq(reqs, id, COLUMN_REQS.alias) || object.val || sourceColumn.name || `Колонка ${index + 1}`
    const order = decodeOrderValue(getObjectReq(reqs, id, COLUMN_REQS.order))

    return {
      id,
      sourceColumnId,
      sourceTableId: sourceColumn.tableId || '',
      sourceName: sourceColumn.name || object.val || alias,
      alias,
      filterFrom: getObjectReq(reqs, id, COLUMN_REQS.filterFrom),
      filterTo: getObjectReq(reqs, id, COLUMN_REQS.filterTo),
      format: getObjectReq(reqs, id, COLUMN_REQS.format),
      function: getObjectReq(reqs, id, COLUMN_REQS.function),
      totals: getObjectReq(reqs, id, COLUMN_REQS.totals),
      expression: getObjectReq(reqs, id, COLUMN_REQS.expression),
      havingFrom: getObjectReq(reqs, id, COLUMN_REQS.havingFrom),
      havingTo: getObjectReq(reqs, id, COLUMN_REQS.havingTo),
      setExpression: getObjectReq(reqs, id, COLUMN_REQS.setExpression),
      sourceAlias: getObjectReq(reqs, id, COLUMN_REQS.sourceAlias),
      hidden: getObjectReq(reqs, id, COLUMN_REQS.hidden) !== '',
      orderDirection: order.orderDirection,
      orderPriority: order.orderPriority,
      raw: object
    }
  })
}

function normalizeJoins(joinsResponse = {}) {
  const reqs = joinsResponse.reqs || {}

  return (joinsResponse.object || []).map((object) => {
    const id = asString(object.id)
    return {
      id,
      sourceTableId: asString(object.val || object.ref || object.t44 || ''),
      alias: getObjectReq(reqs, id, JOIN_REQS.alias),
      condition: getObjectReq(reqs, id, JOIN_REQS.condition),
      raw: object
    }
  })
}

export function normalizeReportPreview(response) {
  if (!response) {
    return { columns: [], rows: [], totals: null, error: null }
  }

  if (response.error || response._error) {
    return {
      columns: [],
      rows: [],
      totals: null,
      error: response.error || response._error
    }
  }

  if (Array.isArray(response)) {
    const columns = response[0] ? Object.keys(response[0]).map(field => ({ field, header: field })) : []
    return { columns, rows: response, totals: null, error: null }
  }

  if (Array.isArray(response.columns) && Array.isArray(response.data)) {
    const columns = response.columns.map((column, index) => ({
      field: column.field || column.name || column.val || column.header || `col_${index}`,
      header: column.header || column.name || column.val || column.field || `Колонка ${index + 1}`,
      format: column.format || '',
      id: column.id || ''
    }))

    const rows = []
    const rowCount = Math.max(0, ...response.data.map(columnData => Array.isArray(columnData) ? columnData.length : 0))
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row = {}
      columns.forEach((column, columnIndex) => {
        const columnData = response.data[columnIndex]
        row[column.field] = Array.isArray(columnData) ? columnData[rowIndex] : undefined
      })
      rows.push(row)
    }

    const totals = {}
    let hasTotals = false
    columns.forEach((column, index) => {
      const total = response.columns[index]?.totals
      if (total !== undefined) {
        totals[column.field] = total
        hasTotals = true
      }
    })

    return { columns, rows, totals: hasTotals ? totals : null, error: null }
  }

  if (Array.isArray(response.data) && response.data[0] && typeof response.data[0] === 'object') {
    const columns = Object.keys(response.data[0]).map(field => ({ field, header: field }))
    return { columns, rows: response.data, totals: response.totals || null, error: null }
  }

  return {
    columns: [],
    rows: [],
    totals: null,
    error: 'Неподдерживаемый формат ответа отчета'
  }
}

export function normalizeReportBuilderState({ editData = {}, columnsData = {}, joinsData = {}, previewData = null } = {}) {
  const sources = normalizeRepColList(columnsData.rep_col_list || [])
  const reportId = asString(editData.obj?.id || editData.id || '')
  const reportName = editData.obj?.val || editData.val || (reportId ? `Отчет #${reportId}` : '')

  return {
    report: {
      id: reportId,
      name: reportName,
      interactive: getEditReq(editData.reqs, REPORT_REQS.interactive) !== '',
      limit: getEditReq(editData.reqs, REPORT_REQS.limit)
    },
    columns: normalizeReportColumns(columnsData, sources.byId),
    joins: normalizeJoins(joinsData),
    availableTables: sources.tables,
    availableColumnsByTable: sources.columnsByTable,
    sourceColumnsById: sources.byId,
    preview: normalizeReportPreview(previewData)
  }
}

export function serializeReportSettings(settings = {}) {
  const payload = {}
  if (settings.interactive !== undefined) {
    payload[REPORT_REQS.interactive] = settings.interactive ? '1' : ''
  }
  if (settings.limit !== undefined) {
    payload[REPORT_REQS.limit] = asString(settings.limit)
  }
  return payload
}

export function serializeColumnSettings(column = {}) {
  return {
    [COLUMN_REQS.alias]: asString(column.alias),
    [COLUMN_REQS.filterFrom]: asString(column.filterFrom),
    [COLUMN_REQS.filterTo]: asString(column.filterTo),
    [COLUMN_REQS.format]: asString(column.format),
    [COLUMN_REQS.function]: asString(column.function),
    [COLUMN_REQS.totals]: asString(column.totals),
    [COLUMN_REQS.expression]: asString(column.expression),
    [COLUMN_REQS.havingFrom]: asString(column.havingFrom),
    [COLUMN_REQS.havingTo]: asString(column.havingTo),
    [COLUMN_REQS.setExpression]: asString(column.setExpression),
    [COLUMN_REQS.sourceAlias]: asString(column.sourceAlias),
    [COLUMN_REQS.hidden]: column.hidden ? '1' : '',
    [COLUMN_REQS.order]: encodeOrderValue(column.orderDirection, column.orderPriority)
  }
}

export function serializeSingleColumnSetting(key, value, column = {}) {
  if (key === 'hidden') return { [COLUMN_REQS.hidden]: value ? '1' : '' }
  if (key === 'orderDirection' || key === 'orderPriority') {
    const direction = key === 'orderDirection' ? value : column.orderDirection
    const priority = key === 'orderPriority' ? value : column.orderPriority
    return { [COLUMN_REQS.order]: encodeOrderValue(direction, priority) }
  }

  const reqId = COLUMN_REQS[key]
  if (!reqId) return {}
  return { [reqId]: asString(value) }
}

export function serializeNewReportColumn(sourceColumnId, alias) {
  return {
    typeId: REPORT_COLUMN_TYPE_ID,
    value: asString(sourceColumnId),
    requisites: {
      [COLUMN_REQS.alias]: asString(alias)
    }
  }
}

export function serializeNewReportJoin(sourceTableId, alias, condition) {
  return {
    typeId: REPORT_JOIN_TYPE_ID,
    value: asString(sourceTableId),
    requisites: {
      [JOIN_REQS.alias]: asString(alias),
      [JOIN_REQS.condition]: asString(condition)
    }
  }
}

function sqlIdentifier(value) {
  const raw = asString(value).trim()
  if (!raw) return ''
  if (/^[a-zA-Z_][a-zA-Z0-9_.$]*$/.test(raw)) return raw
  return `"${raw.replace(/"/g, '""')}"`
}

function functionLabel(value) {
  return FUNCTION_LABEL_BY_ID[value] || value
}

function totalLabel(value) {
  return TOTAL_LABEL_BY_ID[value] || value
}

function columnExpression(column) {
  const base = column.expression || column.sourceName || column.alias || column.id
  const fn = functionLabel(column.function)
  if (fn) return `${fn}(${base})`
  return base
}

export function generateReportSqlPreview(state = {}) {
  const columns = state.columns || []
  const visibleColumns = columns.filter(column => !column.hidden)
  const selectColumns = visibleColumns.length > 0 ? visibleColumns : columns
  const selectedTable = state.availableTables?.[0]
  const joins = state.joins || []
  const limit = state.report?.limit

  if (selectColumns.length === 0 && !selectedTable) {
    return '-- Добавьте колонки отчета для предварительного SQL-представления'
  }

  const select = selectColumns.length > 0
    ? selectColumns.map((column) => {
      const total = totalLabel(column.totals)
      const expression = total ? `${total}(${columnExpression(column)})` : columnExpression(column)
      const alias = column.alias && column.alias !== expression ? ` AS ${sqlIdentifier(column.alias)}` : ''
      return `  ${expression}${alias}`
    }).join(',\n')
    : '  *'

  const from = selectedTable
    ? sqlIdentifier(selectedTable.name)
    : 'integram_report_source'

  const sql = [`SELECT\n${select}`, `FROM ${from}`]

  joins.forEach((join) => {
    if (join.alias || join.condition) {
      const joinSource = join.alias || join.sourceTableId || 'alias'
      sql.push(`LEFT JOIN ${sqlIdentifier(joinSource)} ON ${join.condition || '/* condition */'}`)
    }
  })

  const where = []
  columns.forEach((column) => {
    const expression = columnExpression(column)
    if (column.filterFrom) where.push(`${expression} >= ${JSON.stringify(column.filterFrom)}`)
    if (column.filterTo) where.push(`${expression} <= ${JSON.stringify(column.filterTo)}`)
  })
  if (where.length > 0) sql.push(`WHERE ${where.join('\n  AND ')}`)

  const grouped = columns.some(column => column.totals || column.havingFrom || column.havingTo)
  const groupBy = visibleColumns
    .filter(column => !column.totals && !column.function && !column.expression)
    .map(column => column.sourceName || column.alias)
  if (grouped && groupBy.length > 0) sql.push(`GROUP BY ${groupBy.join(', ')}`)

  const having = []
  columns.forEach((column) => {
    const expression = columnExpression(column)
    if (column.havingFrom) having.push(`${expression} >= ${JSON.stringify(column.havingFrom)}`)
    if (column.havingTo) having.push(`${expression} <= ${JSON.stringify(column.havingTo)}`)
  })
  if (having.length > 0) sql.push(`HAVING ${having.join('\n  AND ')}`)

  const orderBy = columns
    .filter(column => column.orderDirection && column.orderPriority)
    .sort((a, b) => Number(a.orderPriority) - Number(b.orderPriority))
    .map(column => `${columnExpression(column)} ${column.orderDirection}`)
  if (orderBy.length > 0) sql.push(`ORDER BY ${orderBy.join(', ')}`)

  if (limit) sql.push(`LIMIT ${limit}`)

  return sql.join('\n')
}
