import { evaluateMathExpression } from './mathEvaluator'

export const DASHBOARD_PANEL_SETTINGS_REQ_ID = 1165

const REPORT_FORMULA_RE = /^\[([A-Za-яЁё][A-Za-яЁё0-9 ]*)(\.[A-Za-яЁё][A-Za-яЁё0-9 ]*)(\.[A-Za-яЁё][A-Za-яЁё0-9 ]*)?\]$/
const ITEM_FORMULA_RE = /^\[([A-Za-яЁё][ A-Za-яЁё0-9()-]*)\]$/
const FORMULA_REF_RE = /\[([^\]]+)\]/g

function asString(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function normalizeKey(value) {
  return asString(value).replace(/\s+/g, ' ').trim().toLowerCase()
}

function uniq(values) {
  return [...new Set(values.filter(Boolean).map(asString))]
}

export function normalizeNumberText(value) {
  if (value === null || value === undefined) return ''
  let raw = String(value).trim()
  if (!raw) return ''
  raw = raw.replace(/[\u2212\u2012\u2013\u2014]/g, '-')
  if (!/^[+-]?[\d\s\u00a0\u202f.,]+%?$/.test(raw)) return ''

  let sign = ''
  let normalized = raw.replace(/%$/, '').replace(/[\s\u00a0\u202f]/g, '')
  if (normalized.startsWith('+') || normalized.startsWith('-')) {
    sign = normalized.slice(0, 1)
    normalized = normalized.slice(1)
  }
  normalized = normalized.replace(/[^0-9.,]/g, '')
  if (!/[0-9]/.test(normalized)) return ''

  const lastComma = normalized.lastIndexOf(',')
  const lastDot = normalized.lastIndexOf('.')
  const lastSep = Math.max(lastComma, lastDot)

  if (lastSep !== -1) {
    const hasMixedSeparators = lastComma !== -1 && lastDot !== -1
    const separator = normalized.charAt(lastSep)

    if (hasMixedSeparators) {
      const whole = normalized.slice(0, lastSep).replace(/[.,]/g, '') || '0'
      const fraction = normalized.slice(lastSep + 1).replace(/[.,]/g, '')
      return `${sign}${whole}${fraction ? `.${fraction}` : ''}`
    }

    const parts = normalized.split(separator)
    const groupedThousands = parts.length > 1 &&
      parts.slice(1).every(part => part.length === 3) &&
      parts[0].length > 0 &&
      parts[0].length <= 3 &&
      parts[0] !== '0'

    if (!groupedThousands) {
      const whole = parts.slice(0, -1).join('').replace(/[.,]/g, '') || '0'
      const fraction = parts.at(-1).replace(/[.,]/g, '')
      return `${sign}${whole}${fraction ? `.${fraction}` : ''}`
    }

    normalized = parts.join('')
  }

  return `${sign}${normalized}`
}

export function formatDashboardNumber(value) {
  if (value === null || value === undefined) return ''
  const raw = String(value).trim()
  if (!raw) return ''

  let normalized = normalizeNumberText(raw)
  if (normalized === '') return raw

  const percent = /%\s*$/.test(raw) ? '%' : ''
  let sign = ''
  if (normalized.startsWith('+') || normalized.startsWith('-')) {
    sign = normalized.slice(0, 1)
    normalized = normalized.slice(1)
  }

  const parts = normalized.split('.')
  let whole = parts[0] || '0'
  const fraction = parts.length > 1 ? parts.slice(1).join('') : ''
  if (whole.length > 1 && whole.startsWith('0')) return raw

  const decimalSeparator = fraction && raw.lastIndexOf(',') > raw.lastIndexOf('.') ? ',' : '.'
  whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${sign}${whole}${fraction ? `${decimalSeparator}${fraction}` : ''}${percent}`
}

function numberForFormula(value) {
  const normalized = normalizeNumberText(value)
  return normalized === '' ? '0' : normalized
}

export function parseDashboardFormula(formula) {
  const source = asString(formula).trim()
  if (!source || source === '[]') {
    return { type: 'empty', formula: source, references: [] }
  }

  const reportMatch = source.match(REPORT_FORMULA_RE)
  if (reportMatch) {
    const field = reportMatch[2].slice(1)
    const group = reportMatch[3] ? reportMatch[3].slice(1) : ''
    return {
      type: 'report',
      formula: source,
      report: reportMatch[1],
      field,
      group,
      fullField: group ? `${field}.${group}` : field,
      references: []
    }
  }

  const itemMatch = source.match(ITEM_FORMULA_RE)
  if (itemMatch) {
    return {
      type: 'item',
      formula: source,
      item: itemMatch[1],
      references: [itemMatch[1]]
    }
  }

  const references = uniq([...source.matchAll(FORMULA_REF_RE)].map(match => match[1]))
  return {
    type: 'expression',
    formula: source,
    references
  }
}

export function evaluateDashboardFormula(formula, resolveReference) {
  const parsed = parseDashboardFormula(formula)
  if (parsed.type !== 'expression') {
    return { value: '', expression: parsed.formula, missingReferences: [], error: null }
  }

  const missingReferences = []
  const expression = parsed.formula.replace(FORMULA_REF_RE, (match, ref) => {
    const value = resolveReference(ref)
    if (value === null || value === undefined) {
      missingReferences.push(ref)
      return match
    }
    return numberForFormula(value)
  })

  if (missingReferences.length > 0) {
    return { value: '', expression, missingReferences: uniq(missingReferences), error: null }
  }

  try {
    return {
      value: String(evaluateMathExpression(expression)),
      expression,
      missingReferences: [],
      error: null
    }
  } catch (error) {
    return { value: '', expression, missingReferences: [], error }
  }
}

export function dateToDashboardYmd(value) {
  const raw = asString(value).trim()
  let match = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (match) return `${match[3]}${match[2]}${match[1]}`

  match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[1]}${match[2]}${match[3]}`

  match = raw.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (match) return raw

  return raw
}

export function dashboardYmdToInputDate(value) {
  const raw = asString(value).trim()
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (!match) return raw
  return `${match[1]}-${match[2]}-${match[3]}`
}

export function inputDateToDashboardDate(value) {
  const raw = asString(value).trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return raw
  return `${match[3]}.${match[2]}.${match[1]}`
}

function parseSourceValueList(value) {
  if (Array.isArray(value)) return value
  const raw = asString(value).trim()
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    // Legacy source values are often stored as `{"date":...},{"date":...}`
    // and parsed by wrapping the string in square brackets.
  }

  try {
    const parsed = JSON.parse(`[${raw}]`)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeSourceRows(sourceRows = []) {
  const values = new Map()
  const valueItemIds = new Map()

  sourceRows.forEach(row => {
    const item = asString(row?.item)
    if (!item) return
    const itemKey = normalizeKey(item)
    const group = normalizeKey(row?.['Колонка группы'])
    const key = group ? `${itemKey}:${group}` : itemKey
    const label = asString(row?.['Метка'])
    const parsedValues = parseSourceValueList(row?.value).map(entry => ({
      ...entry,
      date: dateToDashboardYmd(entry?.date),
      val: entry?.val ?? entry?.value ?? '',
      label
    }))

    if (row?.valueItemID) valueItemIds.set(itemKey, asString(row.valueItemID))
    values.set(key, [...(values.get(key) || []), ...parsedValues])
  })

  return { values, valueItemIds }
}

function labelMatches(dashboardLabel, valueLabel) {
  const dash = normalizeKey(dashboardLabel)
  const value = normalizeKey(valueLabel)
  if (!dash && !value) return true
  if (!dash || !value) return false
  return dash === value || dash.includes(value) || value.includes(dash)
}

function normalizeValue(value) {
  const normalized = normalizeNumberText(value)
  return normalized === '' ? asString(value) : normalized
}

function getSourceValue(sourceIndex, item, from, to, label = '') {
  const rows = sourceIndex.values.get(normalizeKey(item))
  if (!rows) return undefined

  let valid = false
  let sum = 0
  rows.forEach(row => {
    if (label && !labelMatches(label, row.label)) return
    if (from && row.date && (row.date < from || row.date > to)) return
    valid = true
    const numberValue = Number.parseFloat(normalizeNumberText(row.val))
    if (!Number.isNaN(numberValue)) sum += numberValue
  })

  return valid ? normalizeValue(sum) : undefined
}

function periodEntries(periodData = {}, periodName) {
  const period = periodData[periodName] || []
  const rows = Array.isArray(period) ? period : Object.values(period)

  return rows
    .filter(row => Array.isArray(row?.r))
    .map(row => ({
      label: asString(row.r[0]),
      from: dateToDashboardYmd(row.r[1]),
      to: dateToDashboardYmd(row.r[2])
    }))
}

function parsePanelSettings(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'object') return [value]
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean)
  } catch {
    return []
  }
}

export function normalizeDashboardSettings(settings) {
  return parsePanelSettings(settings)
}

function unwrapSettingsValue(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  return value.val ?? value.value ?? value.UI ?? value.settings ?? value.panelSettings ?? null
}

export function extractDashboardPanelSettings(row = {}) {
  const candidates = [
    row.panelSettings,
    row.panel_settings,
    row.dashboardPanelSettings,
    row[`t${DASHBOARD_PANEL_SETTINGS_REQ_ID}`],
    row[DASHBOARD_PANEL_SETTINGS_REQ_ID],
    row[String(DASHBOARD_PANEL_SETTINGS_REQ_ID)],
    row.reqs?.[DASHBOARD_PANEL_SETTINGS_REQ_ID],
    row.reqs?.[String(DASHBOARD_PANEL_SETTINGS_REQ_ID)],
    row.reqs?.[`t${DASHBOARD_PANEL_SETTINGS_REQ_ID}`],
    row.requisites?.[DASHBOARD_PANEL_SETTINGS_REQ_ID],
    row.requisites?.[String(DASHBOARD_PANEL_SETTINGS_REQ_ID)],
    row.requisites?.[`t${DASHBOARD_PANEL_SETTINGS_REQ_ID}`]
  ]

  for (const candidate of candidates) {
    const value = unwrapSettingsValue(candidate)
    if (hasValue(value)) return parsePanelSettings(value)
  }

  return []
}

export function serializeDashboardPanelSettings(settings = []) {
  return JSON.stringify(parsePanelSettings(settings))
}

function splitList(value) {
  return asString(value)
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
}

function panelFilterParts(panelFilter) {
  return asString(panelFilter)
    .trim()
    .replace(/^[?&]+/, '')
    .split('&')
    .map(part => part.trim().replace(/^[?&]+/, ''))
    .filter(Boolean)
}

function decodeFilterPart(value) {
  try {
    return decodeURIComponent(asString(value).replace(/\+/g, ' '))
  } catch {
    return asString(value)
  }
}

function localPanelFilters(panelFilter) {
  const filters = {}
  panelFilterParts(panelFilter).forEach(part => {
    if (part.includes('=')) return
    const separator = part.indexOf(':')
    if (separator <= 0) return

    const field = decodeFilterPart(part.slice(0, separator)).trim()
    const value = decodeFilterPart(part.slice(separator + 1)).trim()
    if (!field || !value) return

    if (!filters[field]) {
      filters[field] = {
        source: 'report',
        field,
        kind: 'values',
        selected: []
      }
    }
    if (!filters[field].selected.includes(value)) filters[field].selected.push(value)
  })
  return filters
}

export function normalizeDashboardPanelFilter(panelFilter) {
  return panelFilterParts(panelFilter)
    .filter(part => part.includes('='))
    .join('&')
}

function mergeFilters(target, incoming) {
  const merged = { ...(target || {}) }
  Object.entries(incoming || {}).forEach(([key, filter]) => {
    if (!merged[key]) {
      merged[key] = { ...filter, selected: [...(filter.selected || [])] }
      return
    }
    const selected = new Set([...(merged[key].selected || []), ...(filter.selected || [])])
    merged[key] = { ...merged[key], ...filter, selected: [...selected] }
  })
  return merged
}

export function resolveDashboardPanelReportId(row = {}) {
  const keys = [
    'panelChartReportID', 'panelChartReportId', 'panelChartQueryID', 'panelChartQueryId',
    'chartReportID', 'chartReportId', 'chartQueryID', 'chartQueryId',
    'chartReport', 'chartQuery',
    'vizReportID', 'vizReportId', 'vizQueryID', 'vizQueryId',
    'vizReport', 'vizQuery',
    'panelReportID', 'panelReportId', 'panelQueryID', 'panelQueryId',
    'panelReport', 'panelQuery',
    'reportID', 'reportId', 'queryID', 'queryId', 'report', 'query',
    'ГрафикЗапросID', 'ГрафикЗапрос', 'ЗапросГрафикаID', 'ЗапросГрафика',
    'ЗапросID', 'ЗапросId', 'Запрос', 'ОтчетID', 'ОтчётID', 'Отчет', 'Отчёт'
  ]

  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) continue
    const value = asString(row[key]).trim()
    if (!value || value === '0') continue
    const match = value.match(/^\s*(\d+)(?::|$)/)
    return match ? match[1] : value
  }
  return ''
}

function normalizeReportColumn(column, index) {
  if (typeof column === 'string') {
    return { id: column, name: column, field: column, format: '', index }
  }
  const name = asString(column?.name || column?.val || column?.field || column?.id || `Колонка ${index + 1}`)
  return {
    ...column,
    id: asString(column?.id ?? name),
    name,
    field: name,
    format: asString(column?.format).toUpperCase(),
    index
  }
}

export function normalizeDashboardReport(report = {}) {
  if (Array.isArray(report)) {
    const columns = Object.keys(report[0] || {}).map(normalizeReportColumn)
    return { header: '', columns, rows: report }
  }

  const columns = (Array.isArray(report.columns) ? report.columns : report.col || []).map(normalizeReportColumn)
  const data = Array.isArray(report.data) ? report.data : Array.isArray(report.rows) ? report.rows : []
  const rows = []

  const isColumnMatrix = columns.length > 0 &&
    data.length === columns.length &&
    data.every(Array.isArray) &&
    data.some(columnValues => columnValues.length !== columns.length)

  if (isColumnMatrix) {
    const rowCount = data.reduce((max, columnData) => Math.max(max, columnData.length), 0)
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row = {}
      columns.forEach((column, columnIndex) => {
        row[column.name] = data[columnIndex]?.[rowIndex] ?? ''
      })
      rows.push(row)
    }
  } else {
    data.forEach(rawRow => {
      if (rawRow && typeof rawRow === 'object' && !Array.isArray(rawRow)) {
        const row = {}
        columns.forEach(column => {
          row[column.name] = rawRow[column.name] ?? rawRow[column.id] ?? rawRow[column.field] ?? ''
        })
        rows.push(columns.length ? row : rawRow)
      } else if (Array.isArray(rawRow)) {
        const row = {}
        columns.forEach((column, index) => {
          row[column.name] = rawRow[index] ?? ''
        })
        rows.push(row)
      }
    })
  }

  return {
    header: report.header || report.report_name || '',
    columns,
    rows
  }
}

function reportColumnByField(columns = [], field) {
  const key = asString(field)
  if (!key) return null
  return columns.find(column => asString(column.id) === key) ||
    columns.find(column => asString(column.name) === key) ||
    null
}

function reportColumnIsNumeric(column) {
  return /^(NUMBER|SIGNED|NUMERIC|INT|INTEGER|FLOAT|DOUBLE|DECIMAL|MONEY|CURRENCY|PERCENT)$/.test(asString(column?.format).toUpperCase())
}

function reportColumnNameHasIdSuffix(column) {
  const name = asString(column?.name).trim()
  return /(^|[\s_-])(id|ид)$/i.test(name) || /(ID|ИД)$/.test(name)
}

function reportColumnIsStyle(column) {
  const lower = asString(column?.name).toLowerCase()
  return lower === 'style' || lower.endsWith('.style')
}

function reportColumnIsMeasure(column) {
  return reportColumnIsNumeric(column) && !reportColumnIsStyle(column) && !column?.ref && !reportColumnNameHasIdSuffix(column)
}

function reportColumnIsDimension(column) {
  return !!column && !reportColumnIsStyle(column) && !reportColumnIsMeasure(column)
}

function reportDefaultColumn(columns, preferredField, predicate) {
  const preferred = reportColumnByField(columns, preferredField)
  if (preferred && (!predicate || predicate(preferred))) return preferred
  return columns.find(column => !predicate || predicate(column)) || columns[0] || null
}

function reportRowValue(row, column) {
  if (!row || !column) return ''
  return row[column.name] ?? row[column.field] ?? row[column.id] ?? ''
}

function reportValueLabel(value) {
  const raw = asString(value).trim()
  return raw || '(пусто)'
}

function filterReportRows(rows = [], filters = {}) {
  const active = Object.values(filters || {}).filter(filter => Array.isArray(filter?.selected) && filter.selected.length > 0)
  if (active.length === 0) return rows

  return rows.filter(row => active.every(filter => {
    const value = reportValueLabel(row[filter.field])
    return filter.selected.map(asString).includes(value)
  }))
}

function ensureSheet(state, row) {
  const id = asString(row.sheetID || row.sheet || 'sheet')
  if (state.sheetById.has(id)) return state.sheetById.get(id)

  const sheet = {
    id,
    name: asString(row.sheet || `Sheet ${state.sheets.length + 1}`),
    panels: []
  }
  state.sheetById.set(id, sheet)
  state.sheets.push(sheet)
  return sheet
}

function ensurePanel(state, sheet, row, reports) {
  const panelId = asString(row.panelID || row.panel || `panel-${sheet.panels.length + 1}`)
  const id = `fp${panelId}`
  if (state.panelById.has(id)) return state.panelById.get(id)

  const settings = extractDashboardPanelSettings(row)
  const reportId = resolveDashboardPanelReportId(row)
  const report = reportId && reports[reportId] ? reports[reportId] : null
  const panel = {
    id,
    panelId,
    name: asString(row.panel || `Panel ${sheet.panels.length + 1}`),
    period: asString(row.period || 'Месяц'),
    itemsHead: asString(row.itemsHead || row.panel || ''),
    settings,
    notes: asString(row.panelNotes || ''),
    panelFilter: asString(row.panelFilter || ''),
    filters: localPanelFilters(row.panelFilter),
    reportId,
    report,
    headers: [],
    rows: [],
    rowById: new Map(),
    rgs: [],
    rgById: new Map(),
    activeViz: defaultVizType(settings),
    raw: row
  }

  state.panelById.set(id, panel)
  sheet.panels.push(panel)
  return panel
}

function defaultVizType(settings) {
  const list = parsePanelSettings(settings).filter(entry => entry?.type)
  const selected = list.find(entry => entry.default) || list[0]
  return selected?.type || 'table'
}

function ensurePanelRow(panel, modelRow) {
  const id = asString(modelRow.itemID)
  if (!id) return null
  if (panel.rowById.has(id)) return panel.rowById.get(id)

  const row = {
    id,
    name: asString(modelRow.item),
    level: Number.parseInt(modelRow.level, 10) || 1,
    format: asString(modelRow.format).toUpperCase(),
    mu: asString(modelRow.MU),
    label: asString(modelRow['Метка']),
    formula: asString(modelRow.formulas),
    cells: [],
    raw: modelRow
  }

  panel.rowById.set(id, row)
  panel.rows.push(row)
  return row
}

function ensureRg(panel, modelRow) {
  const id = asString(modelRow.RG)
  if (!id || panel.rgById.has(id)) {
    if (id && modelRow.RGcolumns && panel.rgById.has(id)) {
      const rg = panel.rgById.get(id)
      const existing = splitList(rg.columns)
      splitList(modelRow.RGcolumns).forEach(column => {
        if (!existing.includes(column)) existing.push(column)
      })
      rg.columns = existing.join(',')
    }
    return
  }

  const rg = {
    id,
    type: asString(modelRow.RGtype || 'rg'),
    head: asString(modelRow.rgHead),
    src: asString(modelRow.RGsourceID),
    columns: asString(modelRow.RGcolumns),
    formula: asString(modelRow.RGformulas),
    raw: modelRow
  }
  panel.rgById.set(id, rg)
  panel.rgs.push(rg)
}

function addHeader(panel, header) {
  panel.headers.push({
    key: header.key || `${panel.headers.length}`,
    label: header.label || '',
    range: header.range || '-',
    column: header.column || ''
  })
}

function addCell(row, cell) {
  row.cells.push({
    value: hasValue(cell.value) ? asString(cell.value) : '',
    displayValue: hasValue(cell.value) ? formatDashboardNumber(cell.value) : '',
    ready: cell.ready !== false,
    source: cell.source || '',
    range: cell.range || '-',
    column: cell.column || '',
    formula: cell.formula || '',
    title: cell.title || '',
    editable: !!cell.editable,
    error: null
  })
}

function rowFormulaAlias(row) {
  const parsed = parseDashboardFormula(row.formula)
  return parsed.type === 'item' ? parsed.item : ''
}

function sourceValueForRow(sourceIndex, row, from, to, column = '') {
  const alias = rowFormulaAlias(row)
  const baseName = alias || row.name
  const grouped = column ? getSourceValue(sourceIndex, `${baseName}:${column}`, from, to, row.label) : undefined
  return grouped ?? getSourceValue(sourceIndex, baseName, from, to, row.label)
}

function renderRg(panel, rg, entries, sourceIndex) {
  const columns = splitList(rg.columns)
  const periods = entries.length ? entries : [{ label: rg.head || 'Значение', from: '', to: '' }]

  periods.forEach(period => {
    if (columns.length > 0) {
      columns.forEach(column => {
        addHeader(panel, {
          key: `${period.from}-${period.to}-${column}`,
          label: column,
          range: `${period.from}-${period.to}`,
          column
        })
        panel.rows.forEach(row => {
          const value = sourceValueForRow(sourceIndex, row, period.from, period.to, column)
          const formula = parseDashboardFormula(row.formula)
          addCell(row, {
            value: value ?? '',
            ready: value !== undefined || formula.type === 'empty' || formula.type === 'item',
            source: value !== undefined ? 'rg' : formula.type === 'expression' ? 'formula' : 'rg',
            formula: formula.type === 'expression' ? row.formula : '',
            range: `${period.from}-${period.to}`,
            column,
            editable: value !== undefined
          })
        })
      })
      return
    }

    addHeader(panel, {
      key: `${period.from}-${period.to}`,
      label: period.label,
      range: `${period.from}-${period.to}`,
      column: period.label
    })
    panel.rows.forEach(row => {
      const value = sourceValueForRow(sourceIndex, row, period.from, period.to)
      const formula = parseDashboardFormula(row.formula)
      addCell(row, {
        value: value ?? '',
        ready: value !== undefined || formula.type === 'empty' || formula.type === 'item',
        source: value !== undefined ? 'rg' : formula.type === 'expression' ? 'formula' : 'rg',
        formula: formula.type === 'expression' ? row.formula : '',
        range: `${period.from}-${period.to}`,
        column: period.label,
        editable: value !== undefined
      })
    })
  })
}

function renderValue(panel, rg, sourceIndex) {
  addHeader(panel, {
    key: rg.id,
    label: rg.head || 'Значение',
    range: '-',
    column: rg.head || 'Значение'
  })
  panel.rows.forEach(row => {
    const value = sourceValueForRow(sourceIndex, row, '', '', rg.head)
    const formula = parseDashboardFormula(row.formula)
    addCell(row, {
      value: value ?? '',
      ready: value !== undefined || formula.type === 'empty' || formula.type === 'item',
      source: value !== undefined ? 'value' : formula.type === 'expression' ? 'formula' : 'value',
      formula: formula.type === 'expression' ? row.formula : '',
      range: '-',
      column: rg.head,
      editable: value !== undefined
    })
  })
}

function renderMu(panel, rg) {
  addHeader(panel, { key: rg.id, label: rg.head || 'Ед.изм.', range: '-' })
  panel.rows.forEach(row => {
    addCell(row, { value: row.mu, ready: true, source: 'mu', range: '-' })
  })
}

function renderLineSum(panel, rg) {
  addHeader(panel, { key: rg.id, label: rg.head || 'Сумма', range: '-' })
  panel.rows.forEach(row => {
    const sum = row.cells.reduce((acc, cell) => {
      const numberValue = Number.parseFloat(normalizeNumberText(cell.value))
      return Number.isNaN(numberValue) ? acc : acc + numberValue
    }, 0)
    addCell(row, { value: sum, ready: true, source: 'linesum', range: '-' })
  })
}

function resolveCellFormula(panel, row, cellIndex) {
  const cell = row.cells[cellIndex]
  if (!cell || !cell.formula || cell.ready) return false

  const result = evaluateDashboardFormula(cell.formula, ref => {
    const key = normalizeKey(ref)
    const refRow = panel.rows.find(candidate => candidate.id === ref || normalizeKey(candidate.name) === key)
    const refCell = refRow?.cells[cellIndex]
    if (!refCell || !refCell.ready) return undefined
    return refCell.value
  })

  if (result.missingReferences.length || result.error) {
    cell.error = result.error
    return false
  }

  cell.value = normalizeValue(result.value)
  cell.displayValue = formatDashboardNumber(cell.value)
  cell.ready = true
  cell.title = `${cell.formula} = ${result.expression}`
  return true
}

function calculateFormulas(panel) {
  for (let iteration = 0; iteration < 100; iteration += 1) {
    let progress = false
    panel.rows.forEach(row => {
      row.cells.forEach((cell, cellIndex) => {
        if (cell.source === 'formula') {
          progress = resolveCellFormula(panel, row, cellIndex) || progress
        }
      })
    })
    if (!progress) break
  }

  panel.rows.forEach(row => {
    row.cells.forEach(cell => {
      if (!cell.ready) {
        cell.error = cell.error || new Error('Formula dependencies are not ready')
        cell.displayValue = cell.value
      }
    })
  })
}

function renderPanel(panel, periodData, sourceIndex) {
  panel.headers = []
  panel.rows.forEach(row => {
    row.cells = []
  })

  if (panel.rows.length > 0) {
    addHeader(panel, { key: 'items', label: panel.itemsHead || panel.name })
  }

  panel.rgs.forEach(rg => {
    switch (rg.type) {
      case 'value':
        renderValue(panel, rg, sourceIndex)
        break
      case 'mu':
        renderMu(panel, rg)
        break
      case 'line':
        renderLineSum(panel, rg)
        break
      case 'rg':
      default:
        renderRg(panel, rg, periodEntries(periodData, panel.period), sourceIndex)
        break
    }
  })

  calculateFormulas(panel)
}

export function buildDashboardState({ modelRows = [], periodData = {}, sourceRows = [], reports = {} } = {}) {
  const normalizedReports = Object.fromEntries(
    Object.entries(reports || {}).map(([id, report]) => [id, normalizeDashboardReport(report)])
  )
  const sourceIndex = normalizeSourceRows(sourceRows)
  const state = {
    sheets: [],
    sheetById: new Map(),
    panelById: new Map()
  }

  modelRows.forEach(modelRow => {
    const sheet = ensureSheet(state, modelRow)
    const panel = ensurePanel(state, sheet, modelRow, normalizedReports)

    if (!panel.notes && modelRow.panelNotes) panel.notes = asString(modelRow.panelNotes)
    panel.filters = mergeFilters(panel.filters, localPanelFilters(modelRow.panelFilter))
    if (!panel.reportId) {
      panel.reportId = resolveDashboardPanelReportId(modelRow)
      panel.report = panel.reportId ? normalizedReports[panel.reportId] : null
    }

    ensurePanelRow(panel, modelRow)
    ensureRg(panel, modelRow)
  })

  state.sheets.forEach(sheet => {
    sheet.panels.forEach(panel => {
      renderPanel(panel, periodData, sourceIndex)
      delete panel.rowById
      delete panel.rgById
    })
  })

  delete state.sheetById
  delete state.panelById
  return state
}

function tableRecords(panel) {
  const columns = panel.headers.slice(1)
  const records = []
  panel.rows.forEach(row => {
    row.cells.forEach((cell, index) => {
      records.push({
        Строка: row.name,
        Колонка: columns[index]?.label || cell.column || '',
        Значение: Number.parseFloat(normalizeNumberText(cell.value)) || 0,
        value: cell.value,
        row,
        cell
      })
    })
  })
  return records
}

function collectTableVizData(panel) {
  const labels = panel.headers.slice(1).map(header => header.label)
  const datasets = panel.rows.map(row => ({
    label: row.name,
    data: row.cells.map(cell => Number.parseFloat(normalizeNumberText(cell.value)) || 0)
  }))
  return { labels, datasets, records: tableRecords(panel) }
}

function collectReportChartData(panel, vizConfig = {}) {
  const report = panel.report || { columns: [], rows: [] }
  const columns = report.columns || []
  const rows = filterReportRows(report.rows || [], panel.filters)
  const fieldMap = vizConfig.fieldMap || {}
  const labelColumn = reportDefaultColumn(columns, fieldMap.labelField || fieldMap.xField, reportColumnIsDimension) || columns[0]
  const valueColumn = reportDefaultColumn(columns, fieldMap.valueField, reportColumnIsMeasure)
  const seriesColumn = reportColumnByField(columns, fieldMap.seriesField)
  const labels = []
  const series = []
  const buckets = new Map()

  rows.forEach(row => {
    const label = reportValueLabel(reportRowValue(row, labelColumn))
    const seriesName = seriesColumn ? reportValueLabel(reportRowValue(row, seriesColumn)) : valueColumn?.name || 'Количество'
    const value = valueColumn ? Number.parseFloat(normalizeNumberText(reportRowValue(row, valueColumn))) : 1
    if (!labels.includes(label)) labels.push(label)
    if (!series.includes(seriesName)) series.push(seriesName)
    const key = `${seriesName}\u0000${label}`
    buckets.set(key, (buckets.get(key) || 0) + (Number.isNaN(value) ? 0 : value))
  })

  const datasets = series.map(seriesName => ({
    label: seriesName,
    data: labels.map(label => buckets.get(`${seriesName}\u0000${label}`) || 0)
  }))

  return { labels, datasets, records: rows, columns }
}

function collectPivotData(records, rowField, colField, valueField) {
  const rows = []
  const columns = []
  const buckets = new Map()

  records.forEach(record => {
    const rowLabel = reportValueLabel(record[rowField])
    const colLabel = reportValueLabel(record[colField])
    const value = Number.parseFloat(normalizeNumberText(record[valueField])) || 0
    if (!rows.includes(rowLabel)) rows.push(rowLabel)
    if (!columns.includes(colLabel)) columns.push(colLabel)
    const key = `${rowLabel}\u0000${colLabel}`
    buckets.set(key, (buckets.get(key) || 0) + value)
  })

  return {
    rows,
    columns,
    matrix: rows.map(row => columns.map(column => buckets.get(`${row}\u0000${column}`) || 0))
  }
}

function collectReportPivotData(panel, vizConfig = {}) {
  const report = panel.report || { columns: [], rows: [] }
  const columns = report.columns || []
  const fieldMap = vizConfig.fieldMap || {}
  const rowColumn = reportDefaultColumn(columns, fieldMap.pivotRows, reportColumnIsDimension) || columns[0]
  const colColumn = reportDefaultColumn(columns, fieldMap.pivotCols, reportColumnIsDimension) || rowColumn
  const valueColumn = reportDefaultColumn(columns, fieldMap.pivotVals, reportColumnIsMeasure) || columns[0]
  const rows = filterReportRows(report.rows || [], panel.filters)
  const records = rows.map(row => {
    const record = {}
    columns.forEach(column => {
      record[column.name] = reportRowValue(row, column)
    })
    return record
  })
  return {
    ...collectPivotData(records, rowColumn?.name, colColumn?.name, valueColumn?.name),
    records,
    rowField: rowColumn?.name,
    colField: colColumn?.name,
    valueField: valueColumn?.name
  }
}

function collectTablePivotData(panel, vizConfig = {}) {
  const records = tableRecords(panel)
  const fieldMap = vizConfig.fieldMap || {}
  const rowField = fieldMap.pivotRows || 'Строка'
  const colField = fieldMap.pivotCols || 'Колонка'
  const valueField = fieldMap.pivotVals || 'Значение'
  return {
    ...collectPivotData(records, rowField, colField, valueField),
    records,
    rowField,
    colField,
    valueField
  }
}

export function collectDashboardVizData(panel, type = 'table', vizConfig = {}) {
  if (!panel) return { labels: [], datasets: [], records: [] }

  if (type === 'pivot') {
    return panel.report ? collectReportPivotData(panel, vizConfig) : collectTablePivotData(panel, vizConfig)
  }

  if (panel.report) return collectReportChartData(panel, vizConfig)
  return collectTableVizData(panel)
}

export function dashboardVizSettings(panel, type) {
  const settings = parsePanelSettings(panel?.settings)
  return settings.find(entry => entry?.type === type) || {}
}
