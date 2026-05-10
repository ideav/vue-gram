function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function firstParamValue(value) {
  if (Array.isArray(value)) return value[0]
  return value
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== ''
}

export function normalizeReportParams(params = {}) {
  const normalized = {}

  for (const [key, rawValue] of Object.entries(params || {})) {
    const value = firstParamValue(rawValue)
    if (value !== null && value !== undefined) {
      normalized[key] = value
    }
  }

  return normalized
}

export function isReportFilterParam(key) {
  return /^(FR|TO|F)_/.test(key)
}

export function withoutReportFilterParams(params = {}) {
  const filtered = {}

  for (const [key, value] of Object.entries(normalizeReportParams(params))) {
    if (!isReportFilterParam(key)) {
      filtered[key] = value
    }
  }

  return filtered
}

export function legacyReportParamName(column) {
  const name = column?.header ?? column?.name ?? column?.field ?? column?.id ?? column
  return String(name).replace(/\s+/g, '_')
}

function normalizeColumn(column, index) {
  if (isPlainObject(column)) {
    const header = column.header ?? column.name ?? column.field ?? String(column.id ?? index + 1)
    const field = column.field ?? header

    return {
      ...column,
      id: column.id ?? field,
      field,
      header,
      name: column.name ?? header,
      align: column.align || inferAlignment(column)
    }
  }

  const header = String(column)
  return {
    id: header,
    field: header,
    header,
    name: header,
    align: 'left'
  }
}

function inferAlignment(column) {
  const format = String(column?.format || '').toUpperCase()
  if (format.includes('NUMBER') || format.includes('MONEY') || format.includes('INT')) {
    return 'right'
  }
  return 'left'
}

function columnsFromRows(rows) {
  const names = []
  const seen = new Set()

  rows.forEach(row => {
    if (!isPlainObject(row)) return
    Object.keys(row).forEach(key => {
      if (!seen.has(key)) {
        seen.add(key)
        names.push(key)
      }
    })
  })

  return names.map((name, index) => normalizeColumn(name, index))
}

function normalizeRows(data, columns) {
  if (!Array.isArray(data)) return []

  if (data.length === 0) return []

  if (Array.isArray(data[0])) {
    return data.map(row => {
      const rowObject = {}
      columns.forEach((column, index) => {
        rowObject[column.field] = row[index]
      })
      return rowObject
    })
  }

  if (isPlainObject(data[0])) {
    return data
  }

  if (columns.length === data.length) {
    const rowObject = {}
    columns.forEach((column, index) => {
      rowObject[column.field] = data[index]
    })
    return [rowObject]
  }

  return data.map((value, index) => ({ value, index }))
}

function collectTotals(responseTotals, columns) {
  const totals = {}

  columns.forEach(column => {
    if (hasValue(column.totals)) {
      totals[column.field] = column.totals
    }
  })

  if (isPlainObject(responseTotals)) {
    Object.entries(responseTotals).forEach(([key, value]) => {
      if (hasValue(value)) totals[key] = value
    })
  }

  return Object.keys(totals).length > 0 ? totals : null
}

function assertUsableResponse(response) {
  if (!response) {
    throw new Error('Пустой ответ от сервера')
  }

  if (response.error || response.failed || response.message) {
    throw new Error(response.error || response.message || 'Ошибка сервера')
  }
}

export function normalizeReportResponse(response, options = {}) {
  assertUsableResponse(response)

  if (Array.isArray(response)) {
    const rows = response.filter(isPlainObject)
    const columns = columnsFromRows(rows)
    return {
      report_name: options.title || options.reportName || `Отчет #${options.reportId || ''}`.trim(),
      columns,
      rows,
      total_rows: rows.length,
      execution_time_ms: options.executionTimeMs,
      totals: null
    }
  }

  if (!isPlainObject(response)) {
    throw new Error('Неподдерживаемый формат ответа от сервера')
  }

  const rawColumns = response.columns || response.header_columns || []
  let columns = Array.isArray(rawColumns)
    ? rawColumns.map((column, index) => normalizeColumn(column, index))
    : []

  const rawRows = response.data || response.rows || response.object || []
  const rows = normalizeRows(rawRows, columns)

  if (columns.length === 0 && rows.length > 0) {
    columns = columnsFromRows(rows)
  }

  if (columns.length === 0 && Array.isArray(response.data) && response.data.length === 0) {
    columns = []
  }

  if (!Array.isArray(rawRows) && !response.columns && !response.rows && !response.data) {
    throw new Error('Неподдерживаемый формат ответа от сервера')
  }

  return {
    report_name: response.report_name || response.header || options.title || options.reportName || `Отчет #${options.reportId || ''}`.trim(),
    columns,
    rows,
    total_rows: response.total_rows ?? response.total ?? response.count ?? rows.length,
    execution_time_ms: response.execution_time_ms ?? options.executionTimeMs,
    totals: collectTotals(response.totals, columns)
  }
}

function columnLookup(columns) {
  const lookup = new Map()

  columns.forEach(column => {
    const candidates = [
      column.field,
      column.header,
      column.name,
      column.id !== undefined ? String(column.id) : null,
      legacyReportParamName(column)
    ]

    candidates.filter(Boolean).forEach(candidate => {
      lookup.set(String(candidate), column)
    })
  })

  return lookup
}

export function serializeReportFilters(filters = {}, columns = []) {
  const lookup = columnLookup(columns)
  const params = {}

  for (const [field, filter] of Object.entries(filters || {})) {
    const column = lookup.get(String(field)) || { field, header: field }
    const paramName = legacyReportParamName(column)
    const from = filter?.from
    const to = filter?.to

    if (hasValue(from)) params[`FR_${paramName}`] = from
    if (hasValue(to)) params[`TO_${paramName}`] = to
  }

  return params
}

export function deserializeReportFilters(params = {}, columns = []) {
  const normalizedParams = normalizeReportParams(params)
  const filters = {}

  columns.forEach(column => {
    const field = column.field
    const legacyName = legacyReportParamName(column)
    const id = column.id !== undefined ? String(column.id) : null
    const keys = {
      from: [`FR_${legacyName}`, id ? `FR_${id}` : null, `F_${legacyName}`, id ? `F_${id}` : null],
      to: [`TO_${legacyName}`, id ? `TO_${id}` : null]
    }

    const fromKey = keys.from.find(key => key && hasValue(normalizedParams[key]))
    const toKey = keys.to.find(key => key && hasValue(normalizedParams[key]))
    const from = fromKey ? normalizedParams[fromKey] : ''
    const to = toKey ? normalizedParams[toKey] : ''

    if (hasValue(from) || hasValue(to)) {
      filters[field] = { from, to }
    }
  })

  return filters
}
