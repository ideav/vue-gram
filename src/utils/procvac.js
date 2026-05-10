export const PROCVAC_TABLE_ID = '8137'
export const PROCVAC_DEFAULT_ORDER = '8140'
export const PROCVAC_EVENTS_TABLE_ID = '5616'
export const PROCVAC_EVENTS_FALLBACK_LIMIT = 10000
export const PROCVAC_REF_OPTIONS_LIMIT = 200
export const PROCVAC_ARCHIVE_PAGE_SIZE = 25
export const PROCVAC_COLUMN_WIDTH_STORAGE_KEY = 'procvac-column-widths'

export const PROCVAC_ACTIVE_STATUSES = ['в работе', 'не начато']

export const PROCVAC_STATUS_CLASSES = {
  'в работе': 'procvac-status--in-work',
  'не начато': 'procvac-status--not-started',
  'оффер принят': 'procvac-status--offer-accepted',
  'вышел': 'procvac-status--joined',
  'пауза': 'procvac-status--pause',
  'оффер': 'procvac-status--offer',
}

export const PROCVAC_STATUS_SUMMARY_ORDER = ['в работе', 'не начато', 'оффер', 'оффер принят', 'вышел', 'пауза']

export const PROCVAC_STATUS_SUMMARY_LABELS = {
  'в работе': 'В работе',
  'не начато': 'Не начато',
  'оффер': 'Оффер',
  'оффер принят': 'Оффер принят',
  'вышел': 'Вышел',
  'пауза': 'Пауза',
}

export const PROCVAC_HIRE_TYPE_SUMMARY_ORDER = ['штат', 'лагерь', 'ош']

export const PROCVAC_HIRE_TYPE_SUMMARY_LABELS = {
  'штат': 'Штат',
  'лагерь': 'Лагерь',
  'ош': 'ОШ',
}

const MONTH_SHORT_LABELS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export const PROCVAC_FIELD_DEFS = [
  { key: 'title', label: 'Вакансия актуальная', names: ['Вакансия актуальная'] },
  { key: 'status', label: 'Статус', names: ['Статус', 'Статус вакансии'] },
  { key: 'department', label: 'Отдел', names: ['Отдел', 'Департамент'] },
  { key: 'plan', label: 'План', names: ['План'] },
  { key: 'fact', label: 'Факт', names: ['Факт'] },
  { key: 'request', label: 'Заявка', names: ['Заявка'], documentLink: true },
  { key: 'responsible', label: 'Ответственный', names: ['Ответственный', 'Пользователь'] },
  { key: 'startDate', label: 'Старт работы', names: ['Старт работы'] },
  { key: 'deadline', label: 'Дедлайн', names: ['Дедлайн'] },
  { key: 'exitDate', label: 'Выход', names: ['Выход'] },
  { key: 'hireType', label: 'Штат/Лагерь/ОШ', names: ['Штат/Лагерь/ОШ', 'Тип найма'] },
  { key: 'weeksInWork', label: 'Недель в работе', derived: true, format: 'NUMBER' },
  { key: 'events', label: 'События', names: ['События'], arrId: PROCVAC_EVENTS_TABLE_ID, eventCount: true },
  { key: 'comments', label: 'Комментарии', names: ['Комментарии'] },
]

export const PROCVAC_DEFAULT_COLUMN_WIDTHS = {
  title: 190,
  status: 124,
  department: 210,
  plan: 84,
  fact: 84,
  weeksInWork: 84,
  events: 70,
  request: 70,
  responsible: 132,
  startDate: 110,
  deadline: 110,
  exitDate: 110,
  hireType: 130,
  comments: 240,
}

export const PROCVAC_MIN_COLUMN_WIDTH = 48

export function normalizeProcVacFieldName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\s_\-/]+/g, '')
    .replace(/[^\wа-я0-9]/g, '')
}

export function normalizeProcVacStatusKey(value) {
  return String(value || '').trim().toLowerCase().replace(/ё/g, 'е')
}

export function isProcVacWriteGranted(value) {
  return value === 1 || value === true || String(value || '').toUpperCase() === 'WRITE'
}

export function isProcVacMetadataWritable(metadata) {
  return isProcVacWriteGranted(metadata?.granted)
}

export function isProcVacSourceEditable(metadata, source) {
  if (!source) return false
  if (isProcVacMetadataWritable(metadata)) return true
  return isProcVacWriteGranted(source.granted)
}

export function mapProcVacTypeToFormat(typeId) {
  const map = {
    2: 'HTML',
    3: 'SHORT',
    4: 'DATETIME',
    5: 'GRANT',
    6: 'PWD',
    7: 'BUTTON',
    8: 'CHARS',
    9: 'DATE',
    10: 'FILE',
    11: 'BOOLEAN',
    12: 'MEMO',
    13: 'NUMBER',
    14: 'SIGNED',
    16: 'REPORT_COLUMN',
    17: 'CHARS',
  }
  return map[String(typeId)] || 'SHORT'
}

export function buildProcVacFieldSources(metadata = {}) {
  if (!metadata) return []

  const sources = [{
    id: String(metadata.id ?? ''),
    index: 0,
    name: metadata.val ?? metadata.name ?? '',
    type: metadata.type ?? '3',
    format: mapProcVacTypeToFormat(metadata.type ?? '3'),
    kind: 'main',
    granted: metadata.granted,
    ref_id: metadata.ref_id ?? metadata.ref ?? metadata.reft ?? null,
    orig: metadata.orig ?? metadata.id,
  }]

  const reqs = Array.isArray(metadata.reqs)
    ? metadata.reqs
    : Array.isArray(metadata.requisites)
      ? metadata.requisites
      : []

  reqs.forEach((req, index) => {
    const refId = req.ref_id ?? req.ref ?? req.reft ?? null
    sources.push({
      id: String(req.id ?? ''),
      index: index + 1,
      name: req.val ?? req.name ?? '',
      type: req.type ?? req.typeId ?? req.typ ?? '3',
      format: refId ? 'REF' : mapProcVacTypeToFormat(req.type ?? req.typeId ?? req.typ ?? '3'),
      kind: 'req',
      granted: req.granted,
      ref_id: refId,
      orig: req.orig ?? null,
      arr_id: req.arr_id ?? req.arrId ?? null,
      attrs: req.attrs ?? '',
    })
  })

  return sources
}

export function findProcVacSourceForField(def, sources = []) {
  if (def.derived) return null

  if (def.arrId) {
    const arraySource = sources.find(source => String(source.arr_id || '') === String(def.arrId))
    if (arraySource) return arraySource
  }

  const wanted = (def.names || []).map(normalizeProcVacFieldName)
  return sources.find(source => wanted.includes(normalizeProcVacFieldName(source.name))) || null
}

export function normalizeProcVacColumnWidths(widths = {}) {
  if (!widths || typeof widths !== 'object') return {}

  return Object.fromEntries(PROCVAC_FIELD_DEFS.flatMap(def => {
    if (!Object.prototype.hasOwnProperty.call(widths, def.key)) return []
    const width = Number(widths[def.key])
    if (!Number.isFinite(width)) return []
    return [[def.key, Math.max(PROCVAC_MIN_COLUMN_WIDTH, Math.round(width))]]
  }))
}

export function getProcVacDefaultColumnWidth(key) {
  return PROCVAC_DEFAULT_COLUMN_WIDTHS[key] || 100
}

export function applyProcVacColumnWidths(columns, widths = {}) {
  const normalized = normalizeProcVacColumnWidths(widths)
  return columns.map(column => ({
    ...column,
    width: normalized[column.key] || getProcVacDefaultColumnWidth(column.key),
  }))
}

export function buildProcVacColumns(metadata = {}, widths = {}) {
  const sources = buildProcVacFieldSources(metadata)
  const columns = PROCVAC_FIELD_DEFS.map(def => {
    const source = findProcVacSourceForField(def, sources)
    return {
      key: def.key,
      label: def.label,
      names: def.names || [],
      source,
      derived: Boolean(def.derived),
      eventCount: Boolean(def.eventCount),
      documentLink: Boolean(def.documentLink),
      editable: !def.derived && !def.eventCount && Boolean(source) && isProcVacSourceEditable(metadata, source),
      format: def.eventCount ? 'NUMBER' : source ? source.format : def.format || 'SHORT',
    }
  })
  return applyProcVacColumnWidths(columns, widths)
}

export function getProcVacSourceValue(rawRow, source) {
  if (!rawRow || !source || !Array.isArray(rawRow.r)) return ''
  const value = rawRow.r[source.index]
  return value === undefined || value === null ? '' : String(value)
}

export function parseProcVacReferenceValue(value) {
  const text = String(value || '')
  const index = text.indexOf(':')
  if (index <= 0) {
    return { id: text, label: text, text }
  }
  return {
    id: text.slice(0, index),
    label: text.slice(index + 1),
    text: text.slice(index + 1),
  }
}

export function abbreviateProcVacDepartmentName(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const parts = text.split(/[\s,.;:()/\\-]+/)
  const abbreviation = parts.map(part => {
    const match = String(part || '').match(/[A-Za-zА-Яа-яЁё]/)
    return match ? match[0].toUpperCase().replace('Ё', 'Е') : ''
  }).join('')
  return abbreviation || text
}

export function displayProcVacValue(rawValue, column) {
  if (!column) return ''
  let value = rawValue === undefined || rawValue === null ? '' : String(rawValue)
  if (column.format === 'REF' || column.source?.ref_id) {
    value = parseProcVacReferenceValue(rawValue).text
  }
  if (column.key === 'department') {
    return abbreviateProcVacDepartmentName(value)
  }
  return value
}

export function normalizeProcVacEventCount(value) {
  if (value === undefined || value === null || value === '') return '0'
  const number = Number.parseInt(value, 10)
  if (Number.isFinite(number)) return String(Math.max(0, number))
  return String(value)
}

export function parseProcVacDate(value) {
  const text = String(value || '').trim()
  if (!text) return null

  const ruDate = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/)
  if (ruDate) {
    return new Date(Number(ruDate[3]), Number(ruDate[2]) - 1, Number(ruDate[1]))
  }

  const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoDate) {
    return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]))
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatProcVacDateForInput(value) {
  const date = parseProcVacDate(value)
  if (!date) return ''
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function formatProcVacDateForDisplay(value) {
  if (!value) return ''
  const parts = String(value).split('-')
  if (parts.length === 3) return [parts[2], parts[1], parts[0]].join('.')
  return value
}

export function calculateWeeksInWork(startValue, now = new Date()) {
  const start = parseProcVacDate(startValue)
  if (!start) return ''
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.floor((nowMidnight.getTime() - startMidnight.getTime()) / 86400000)
  if (days < 0) return '0'
  return String(Math.round(days / 7))
}

export function normalizeProcVacRow(rawRow, columns = [], now = new Date()) {
  const row = {
    id: rawRow?.i,
    raw: rawRow,
    values: {},
    rawValues: {},
    fields: {},
  }

  columns.forEach(column => {
    if (column.key === 'events') {
      const eventRawValue = column.source ? getProcVacSourceValue(rawRow, column.source) : ''
      row.rawValues.events = normalizeProcVacEventCount(eventRawValue)
      row.values.events = row.rawValues.events
      row.fields.events = column.source || null
      return
    }

    if (column.derived) return

    const rawValue = getProcVacSourceValue(rawRow, column.source)
    row.rawValues[column.key] = rawValue
    row.values[column.key] = displayProcVacValue(rawValue, column)
    row.fields[column.key] = column.source || null
  })

  row.rawValues.weeksInWork = row.rawValues.startDate || ''
  row.values.weeksInWork = calculateWeeksInWork(row.rawValues.startDate, now)
  if (!Object.prototype.hasOwnProperty.call(row.rawValues, 'events')) {
    row.rawValues.events = row.id === undefined || row.id === null ? '' : '0'
    row.values.events = row.rawValues.events
  }
  return row
}

export function getProcVacStatusClass(value) {
  return PROCVAC_STATUS_CLASSES[normalizeProcVacStatusKey(value)] || ''
}

function statusText(row) {
  return normalizeProcVacStatusKey(row?.values?.status)
}

function sameMonth(date, now) {
  return Boolean(date) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

export function getProcVacRowSection(row, now = new Date()) {
  const status = statusText(row)
  if (PROCVAC_ACTIVE_STATUSES.includes(status)) return 'active'

  const exitDate = parseProcVacDate(row?.values?.exitDate || row?.rawValues?.exitDate)
  const deadline = parseProcVacDate(row?.values?.deadline || row?.rawValues?.deadline)
  if (sameMonth(exitDate, now) || (!exitDate && sameMonth(deadline, now))) {
    return 'closedThisMonth'
  }

  return 'archive'
}

export function groupProcVacRows(rows = [], now = new Date()) {
  const grouped = {
    active: [],
    closedThisMonth: [],
    archive: [],
  }

  rows.forEach(row => {
    grouped[getProcVacRowSection(row, now)].push(row)
  })

  return grouped
}

function buildSummary(rows = [], labels = {}, order = [], fieldKey = 'status') {
  const counters = {}
  const firstIndex = {}

  rows.forEach((row, index) => {
    const label = String(row?.values?.[fieldKey] || '').trim()
    const key = normalizeProcVacStatusKey(label)
    if (!key) return

    if (!counters[key]) {
      counters[key] = {
        key,
        label: labels[key] || label,
        count: 0,
      }
      firstIndex[key] = index
    }
    counters[key].count += 1
  })

  return Object.values(counters).sort((a, b) => {
    let aOrder = order.indexOf(a.key)
    let bOrder = order.indexOf(b.key)
    if (aOrder === -1) aOrder = order.length + firstIndex[a.key]
    if (bOrder === -1) bOrder = order.length + firstIndex[b.key]
    return aOrder - bOrder
  })
}

export function getSectionStatusSummary(rows = []) {
  return buildSummary(rows, PROCVAC_STATUS_SUMMARY_LABELS, PROCVAC_STATUS_SUMMARY_ORDER, 'status')
}

export function getSectionHireTypeSummary(rows = []) {
  return buildSummary(rows, PROCVAC_HIRE_TYPE_SUMMARY_LABELS, PROCVAC_HIRE_TYPE_SUMMARY_ORDER, 'hireType')
}

function searchableText(row) {
  return Object.values(row?.values || {}).join(' ').toLowerCase()
}

export function filterProcVacRows(rows = [], query = '') {
  const needle = String(query || '').trim().toLowerCase()
  if (!needle) return rows.slice()
  return rows.filter(row => searchableText(row).includes(needle))
}

export function highlightProcVacTextParts(value, query = '') {
  const text = String(value === undefined || value === null ? '' : value)
  const needle = String(query || '').trim()
  if (!needle) return [{ text, match: false }]

  const lower = text.toLowerCase()
  const lowerNeedle = needle.toLowerCase()
  const parts = []
  let position = 0
  let index = lower.indexOf(lowerNeedle)

  while (index !== -1) {
    if (index > position) parts.push({ text: text.slice(position, index), match: false })
    parts.push({ text: text.slice(index, index + needle.length), match: true })
    position = index + needle.length
    index = lower.indexOf(lowerNeedle, position)
  }

  if (position < text.length) parts.push({ text: text.slice(position), match: false })
  return parts.length ? parts : [{ text: '', match: false }]
}

function formatMonthKey(date) {
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function formatArchiveMonthLabel(monthKey) {
  const match = String(monthKey || '').match(/^(\d{4})-(\d{2})$/)
  if (!match) return String(monthKey || '')
  const monthIndex = Number(match[2]) - 1
  return `${MONTH_SHORT_LABELS[monthIndex] || match[2]} ${match[1]}`
}

export function getArchiveMonthKey(row) {
  const rawValue = row?.rawValues?.startDate
  const displayValue = row?.values?.startDate
  return formatMonthKey(parseProcVacDate(rawValue || displayValue))
}

export function getArchiveMonthOptions(rows = []) {
  const months = {}
  rows.forEach(row => {
    const key = getArchiveMonthKey(row)
    if (key) months[key] = true
  })

  return Object.keys(months).sort((a, b) => {
    if (a === b) return 0
    return a > b ? -1 : 1
  }).map(key => ({
    key,
    label: formatArchiveMonthLabel(key),
  }))
}

export function filterRowsByArchiveMonth(rows = [], monthKey = '') {
  const selected = String(monthKey || '')
  if (!selected) return rows.slice()
  return rows.filter(row => getArchiveMonthKey(row) === selected)
}

export function isProcVacUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

export function getProcVacCellAlignmentClass(column) {
  const format = String(column?.format || '').toUpperCase()
  if (format === 'NUMBER' || format === 'SIGNED') return 'procvac-cell--numeric'
  if (format === 'DATE' || format === 'DATETIME') return 'procvac-cell--date'
  return ''
}

export function isProcVacReferenceColumn(column) {
  return Boolean(column && (column.format === 'REF' || column.source?.ref_id))
}

export function normalizeProcVacReferenceOptions(data) {
  if (Array.isArray(data)) {
    return data.flatMap(item => {
      if (Array.isArray(item)) {
        if (item[0] === undefined) return []
        return [{ id: String(item[0]), text: String(item[1] || '') }]
      }
      if (item && typeof item === 'object') {
        const id = item.id ?? item.i ?? item.value
        const text = item.text ?? item.val ?? item.name ?? item.r?.[0]
        if (id === undefined) return []
        return [{ id: String(id), text: String(text || id) }]
      }
      return []
    })
  }

  if (data && typeof data === 'object') {
    return Object.keys(data).map(id => ({
      id: String(id),
      text: String(data[id]),
    }))
  }

  return []
}

export function applyProcVacEventCounts(rows = [], eventRows = []) {
  const wanted = {}
  rows.forEach(row => {
    if (row?.id !== undefined && row.id !== null && row.id !== '') wanted[String(row.id)] = true
  })

  const counts = {}
  ;(Array.isArray(eventRows) ? eventRows : []).forEach(eventRow => {
    let parentId = eventRow?.u
    if (parentId === undefined || parentId === null) return
    parentId = String(parentId)
    if (!wanted[parentId]) return
    counts[parentId] = (counts[parentId] || 0) + 1
  })

  return rows.map(row => {
    const count = normalizeProcVacEventCount(counts[String(row.id)] || 0)
    return {
      ...row,
      rawValues: { ...row.rawValues, events: count },
      values: { ...row.values, events: count },
    }
  })
}

export function buildProcVacSaveRequest({ rowId, column, value, xsrf = '' } = {}) {
  const source = column?.source
  if (!rowId || !source?.id) {
    throw new Error('ProcVac save request requires row id and editable source')
  }

  const body = {}
  if (xsrf) body._xsrf = xsrf
  body[`t${source.id}`] = String(value === undefined || value === null ? '' : value)

  return {
    endpoint: `${source.kind === 'main' ? '_m_save' : '_m_set'}/${encodeURIComponent(String(rowId))}`,
    jsonMode: 'JSON',
    body,
  }
}

export function updateProcVacLocalRow(row, column, rawValue, displayText = '', now = new Date()) {
  const storedRaw = isProcVacReferenceColumn(column) && rawValue
    ? `${rawValue}:${displayText || rawValue}`
    : String(rawValue === undefined || rawValue === null ? '' : rawValue)

  const nextRawValues = {
    ...row.rawValues,
    [column.key]: storedRaw,
  }
  const nextValues = {
    ...row.values,
    [column.key]: displayProcVacValue(storedRaw, column),
  }

  nextValues.weeksInWork = calculateWeeksInWork(nextRawValues.startDate, now)
  nextRawValues.weeksInWork = nextRawValues.startDate || ''

  const nextRaw = row.raw && Array.isArray(row.raw.r)
    ? { ...row.raw, r: [...row.raw.r] }
    : row.raw

  if (nextRaw?.r && column.source) {
    nextRaw.r[column.source.index] = storedRaw
  }

  return {
    ...row,
    raw: nextRaw,
    rawValues: nextRawValues,
    values: nextValues,
  }
}

export function shouldProcVacLoadEventCounts(columns = [], rows = []) {
  const column = columns.find(item => item.key === 'events')
  return Boolean(column && !column.source && rows.length)
}
