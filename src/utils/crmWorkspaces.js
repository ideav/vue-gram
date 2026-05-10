export const DEFAULT_KANBAN_FIELD_MAPPING = {
  title: 'Карточка',
  description: 'Описание',
  contact: 'Контакт',
  status: 'Статус',
  statusId: 'СтатусID',
  date: 'Дата',
  phone: 'Телефон',
  email: 'Email',
  amount: 'Сумма',
  activity: 'Activity',
  cardId: 'ID',
  manager: 'Менеджер',
  product: 'Продукт',
  partner: 'Партнер',
}

export const DEFAULT_STATUS_MAPPING = {
  name: 'Статус',
  id: 'СтатусID',
  color: 'Цвет',
}

export const KANBAN_FACET_FIELDS = {
  manager: ['Менеджер', 'Ответственный', 'manager', 'Manager'],
  product: ['Продукт', 'product', 'Product'],
  partner: ['Партнер', 'Партнёр', 'partner', 'Partner'],
}

export const CARD_FIELD_TYPES = {
  TITLE: 'title',
  DESCRIPTION: 'description',
  DATE: 'date',
  AMOUNT: 'amount',
  STATUS: 'status',
  ADDITIONAL: 'additional',
  PHONE: 'phone',
  EMAIL: 'email',
}

const TEXT_TYPES = new Set(['3', '8', '12', '17'])
const DATE_TYPES = new Set(['4', '9'])
const NUM_TYPES = new Set(['13', '14'])
const LIST_TYPES = new Set(['5', '16'])
const FILE_TYPES = new Set(['10'])

const FUNNEL_FILTER_FIELDS = ['Вакансия', 'Имя', 'Месяц', 'Тип найма']
const FUNNEL_DATE_FIELD_NAMES = [
  'дата',
  'date',
  'createdat',
  'created',
  'month',
  'месяц',
]

const FUNNEL_PALETTE = [
  '#2563eb',
  '#3b82f6',
  '#0ea5e9',
  '#06b6d4',
  '#10b981',
  '#22c55e',
  '#84cc16',
  '#eab308',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
]

function toArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.object)) return value.object
  if (Array.isArray(value?.objects)) return value.objects
  if (Array.isArray(value?.data)) return value.data
  return []
}

function toStringValue(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function fieldName(column) {
  return column?.name ?? column?.val ?? String(column?.id ?? '')
}

function normalizeReportColumn(column, index) {
  if (typeof column === 'string') {
    return { id: null, name: column, type: null, format: null, index }
  }

  return {
    ...column,
    id: column?.id ?? null,
    name: fieldName(column) || String(index),
    type: column?.type ?? column?.id ?? null,
    format: column?.format ?? null,
    index,
  }
}

function looksLikeReferenceValue(value) {
  return typeof value === 'string' && /^\d+(?:,\d+)*:/.test(value)
}

export function parseReferenceValue(value) {
  if (!looksLikeReferenceValue(value)) {
    return { id: null, label: value }
  }

  const index = value.indexOf(':')
  return {
    id: value.slice(0, index),
    label: value.slice(index + 1),
  }
}

function getValueByField(card, fields) {
  for (const field of fields) {
    const value = card?.[field]
    if (value !== null && value !== undefined && value !== '') return value
  }
  return ''
}

function normalizeQuery(value) {
  return toStringValue(value).trim().toLowerCase()
}

function numericAmount(value) {
  if (value === null || value === undefined || value === '') return 0
  const normalized = String(value).replace(/\s/g, '').replace(',', '.')
  const number = Number.parseFloat(normalized)
  return Number.isNaN(number) ? 0 : number
}

function maybeColumnMatrix(columns, matrix) {
  if (!Array.isArray(matrix) || columns.length === 0 || matrix.length !== columns.length) return false
  if (!matrix.every(Array.isArray)) return false
  return matrix.some(columnValues => columnValues.length !== columns.length)
}

function reportRowsFromMatrix(columns, matrix) {
  if (!Array.isArray(matrix)) return []

  if (maybeColumnMatrix(columns, matrix)) {
    const rowCount = matrix.reduce((max, values) => Math.max(max, values.length), 0)
    return Array.from({ length: rowCount }, (_, rowIndex) => {
      return columns.map((_, columnIndex) => matrix[columnIndex]?.[rowIndex] ?? null)
    })
  }

  return matrix.map(row => Array.isArray(row) ? row : [row])
}

function unwrapReportPayload(rawReport = {}) {
  if (!rawReport || typeof rawReport !== 'object' || Array.isArray(rawReport)) return rawReport
  const reportKey = Object.keys(rawReport).find(key => key.startsWith('&rep.'))
  return reportKey ? rawReport[reportKey] : rawReport
}

export function normalizeKanbanReport(rawReport = {}, options = {}) {
  const report = unwrapReportPayload(rawReport)
  const fieldMapping = { ...DEFAULT_KANBAN_FIELD_MAPPING, ...(options.fieldMapping || {}) }
  const columns = toArray(report.columns ?? report.col).map(normalizeReportColumn)
  const rows = report.rows && Array.isArray(report.rows)
    ? report.rows
    : reportRowsFromMatrix(columns, report.data ?? report.rows ?? [])

  let statusFieldId = null
  let activityFieldId = null

  const cards = rows.map(row => {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      return { ...row, _cardId: toStringValue(row._cardId ?? row[fieldMapping.cardId] ?? row.ID ?? row.id) }
    }

    const card = {}
    columns.forEach((column, index) => {
      card[column.name] = row[index] ?? ''
      if (column.name === fieldMapping.status || column.name === 'Статус') {
        statusFieldId = toStringValue(column.type ?? column.id)
      }
      if (column.name === fieldMapping.activity || column.name === 'Activity') {
        activityFieldId = toStringValue(column.type ?? column.id)
      }
    })

    const explicitId = card[fieldMapping.cardId] || card.ID || card.id
    const idColumnIndex = columns.findIndex(column => /id$/i.test(column.name))
    card._cardId = toStringValue(explicitId || (idColumnIndex >= 0 ? row[idColumnIndex] : ''))
    return card
  })

  return {
    cards,
    columns,
    statuses: deriveKanbanStatuses(cards, options.statusMapping),
    statusFieldId,
    activityFieldId,
  }
}

export function normalizeKanbanObjectCards(rawRows = [], metadata = {}, options = {}) {
  const fieldMapping = { ...DEFAULT_KANBAN_FIELD_MAPPING, ...(options.fieldMapping || {}) }
  const statusMapping = { ...DEFAULT_STATUS_MAPPING, ...(options.statusMapping || {}) }
  const reqs = toArray(metadata.reqs ?? metadata.requisites)
  let statusFieldId = null
  let activityFieldId = null

  const cards = toArray(rawRows).map(item => {
    const row = item.r || item.row || []
    const card = {
      _cardId: toStringValue(item.i ?? item.id ?? item._cardId),
    }

    const mainField = metadata.val || metadata.name
    if (mainField) card[mainField] = row[0] ?? ''
    card._value = row[0] ?? ''

    reqs.forEach((req, index) => {
      const name = req.val || req.name || String(req.id)
      const rawValue = row[index + 1] ?? ''
      const parsed = parseReferenceValue(rawValue)

      if (parsed.id !== null) {
        card[`${name}ID`] = parsed.id
        card[name] = parsed.label
      } else {
        card[name] = parsed.label
      }

      if (name === fieldMapping.status || name === 'Статус') statusFieldId = toStringValue(req.id)
      if (name === fieldMapping.activity || name === 'Activity') activityFieldId = toStringValue(req.id)
    })

    if (!card[fieldMapping.title] && card._value) {
      card[fieldMapping.title] = card._value
    }

    return card
  })

  return {
    cards,
    columns: buildCardsColumnsFromMetadata(metadata),
    statuses: deriveKanbanStatuses(cards, statusMapping),
    statusFieldId,
    activityFieldId,
  }
}

export function deriveKanbanStatuses(cards = [], statusMapping = DEFAULT_STATUS_MAPPING, fieldMapping = DEFAULT_KANBAN_FIELD_MAPPING) {
  const statusFields = { ...DEFAULT_STATUS_MAPPING, ...statusMapping }
  const mapping = { ...DEFAULT_KANBAN_FIELD_MAPPING, ...fieldMapping }
  const seen = new Set()
  const statuses = []

  for (const card of cards) {
    const statusName = card[mapping.status] || card[statusFields.name] || ''
    const statusId = card[mapping.statusId] || card[statusFields.id] || ''
    if (!statusName) continue

    const key = `${statusId}||${statusName}`
    if (seen.has(key)) continue
    seen.add(key)
    statuses.push({
      [statusFields.name]: statusName,
      [statusFields.id]: statusId,
      [statusFields.color]: card[statusFields.color] || card.color || null,
    })
  }

  return statuses
}

export function groupKanbanCardsByStatus(cards = [], statuses = [], options = {}) {
  const fieldMapping = { ...DEFAULT_KANBAN_FIELD_MAPPING, ...(options.fieldMapping || {}) }
  const statusMapping = { ...DEFAULT_STATUS_MAPPING, ...(options.statusMapping || {}) }

  const orderedCards = [...cards].sort((a, b) => {
    const activityA = toStringValue(a[fieldMapping.activity])
    const activityB = toStringValue(b[fieldMapping.activity])
    return activityB.localeCompare(activityA)
  })

  return statuses.map(status => {
    const statusName = status[statusMapping.name]
    const statusId = status[statusMapping.id]
    const stageCards = orderedCards.filter(card => {
      const cardStatusId = card[fieldMapping.statusId] ?? card[statusMapping.id]
      const cardStatus = card[fieldMapping.status] ?? card[statusMapping.name]
      return String(cardStatusId) === String(statusId) || String(cardStatus) === String(statusName)
    })

    return {
      status,
      statusName,
      statusId: toStringValue(statusId),
      color: status[statusMapping.color] || status.color || null,
      cards: stageCards,
      totalAmount: stageCards.reduce((sum, card) => sum + numericAmount(card[fieldMapping.amount]), 0),
    }
  })
}

export function filterKanbanCards(cards = [], filters = {}, options = {}) {
  const fieldMapping = { ...DEFAULT_KANBAN_FIELD_MAPPING, ...(options.fieldMapping || {}) }
  const facetFields = { ...KANBAN_FACET_FIELDS, ...(options.facetFields || {}) }
  const search = normalizeQuery(filters.search)

  return cards.filter(card => {
    if (search) {
      const searchText = [
        card[fieldMapping.title],
        card[fieldMapping.description],
        card[fieldMapping.contact],
        card[fieldMapping.amount],
        card[fieldMapping.date],
        card[fieldMapping.phone],
        card[fieldMapping.email],
        card[fieldMapping.status],
        getValueByField(card, facetFields.manager),
        getValueByField(card, facetFields.product),
        getValueByField(card, facetFields.partner),
      ].map(normalizeQuery).join(' ')

      if (!searchText.includes(search)) return false
    }

    for (const facet of ['manager', 'product', 'partner']) {
      const requested = toStringValue(filters[facet])
      if (!requested) continue
      const actual = toStringValue(getValueByField(card, facetFields[facet]))
      if (actual !== requested) return false
    }

    return true
  })
}

export function getKanbanFacetOptions(cards = [], facet = 'manager', options = {}) {
  const facetFields = { ...KANBAN_FACET_FIELDS, ...(options.facetFields || {}) }
  const values = new Set()
  for (const card of cards) {
    const value = getValueByField(card, facetFields[facet] || [])
    if (value) values.add(String(value))
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'ru'))
}

export function getKanbanCardTitle(card = {}, fieldMapping = DEFAULT_KANBAN_FIELD_MAPPING) {
  return (
    card[fieldMapping.title] ||
    card['Карточка'] ||
    card['Проект'] ||
    card['Клиент'] ||
    card['Лид'] ||
    card._value ||
    'Без названия'
  )
}

export function buildKanbanStatusUpdateRequest({
  cardId,
  newStatusId,
  statusFieldId,
  activityFieldId = null,
  xsrf = null,
  now = new Date(),
} = {}) {
  if (!cardId) throw new Error('cardId is required')
  if (!statusFieldId) throw new Error('statusFieldId is required')

  const body = {
    [`t${statusFieldId}`]: toStringValue(newStatusId),
  }

  if (activityFieldId) {
    body[`t${activityFieldId}`] = String(Math.floor(now.getTime() / 1000))
  }

  if (xsrf) body._xsrf = xsrf

  return {
    endpoint: `_m_set/${cardId}`,
    jsonMode: 'JSON',
    body,
  }
}

function normalizeFunnelFieldName(name) {
  return String(name || '').toLowerCase().replace(/[\s_\-.:]/g, '')
}

function funnelNameContainsDateWord(name) {
  const normalized = normalizeFunnelFieldName(name)
  return normalized.includes('дата') || normalized.includes('date')
}

function isFunnelDateFieldName(name) {
  const normalized = normalizeFunnelFieldName(name)
  return FUNNEL_DATE_FIELD_NAMES.includes(normalized) || funnelNameContainsDateWord(name)
}

function funnelDateKeyFromParts(year, month, day) {
  const y = Number.parseInt(year, 10)
  const m = Number.parseInt(month, 10)
  const d = Number.parseInt(day, 10)
  if (!y || !m || !d || y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null

  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return y * 10000 + m * 100 + d
}

export function parseFunnelDateValue(value) {
  const text = String(value || '').trim()
  if (!text) return null

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) return funnelDateKeyFromParts(match[1], match[2], match[3])

  match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (match) return funnelDateKeyFromParts(match[3], match[2], match[1])

  match = text.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (match) return funnelDateKeyFromParts(match[1], match[2], match[3])

  match = text.match(/^(\d{4})(\d{2})$/)
  if (match) return funnelDateKeyFromParts(match[1], match[2], 1)

  match = text.match(/^(\d{4})-(\d{1,2})$/)
  if (match) return funnelDateKeyFromParts(match[1], match[2], 1)

  match = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/)
  if (match) return funnelDateKeyFromParts(match[1], match[2], match[3])

  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (match) return funnelDateKeyFromParts(match[3], match[2], match[1])

  return null
}

function funnelFieldHasDateValues(field, rows) {
  let checked = 0
  for (const row of rows) {
    if (checked >= 20) break
    const value = row[field]
    if (value === null || value === undefined || value === '') continue
    checked += 1
    if (parseFunnelDateValue(value) === null) return false
  }
  return checked > 0
}

export function findFunnelDateField(rows = []) {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])

  for (const candidate of FUNNEL_DATE_FIELD_NAMES) {
    const found = keys.find(key => normalizeFunnelFieldName(key) === candidate && funnelFieldHasDateValues(key, rows))
    if (found) return found
  }

  return keys.find(key => isFunnelDateFieldName(key) && funnelFieldHasDateValues(key, rows)) || ''
}

export function detectFunnelStages(rows = []) {
  if (!rows.length) return { stages: [], dateField: '' }
  const dateField = findFunnelDateField(rows)
  const stages = Object.keys(rows[0]).filter(key => {
    if (FUNNEL_FILTER_FIELDS.includes(key)) return false
    if (key === dateField) return false
    if (funnelNameContainsDateWord(key)) return false
    return !(FUNNEL_DATE_FIELD_NAMES.includes(normalizeFunnelFieldName(key)) && funnelFieldHasDateValues(key, rows))
  })

  return { stages, dateField }
}

export function getFunnelRowDateKey(row, dateField = '') {
  const fieldKey = dateField ? parseFunnelDateValue(row[dateField]) : null
  if (fieldKey !== null) return fieldKey
  return parseFunnelDateValue(row['Месяц'])
}

export function filterFunnelRows(rows = [], filters = {}, dateField = '') {
  const dateFrom = parseFunnelDateValue(filters.dateFrom)
  const dateTo = parseFunnelDateValue(filters.dateTo)
  const hasDateRange = dateFrom !== null || dateTo !== null

  return rows.filter(row => {
    if (filters.vacancy && row['Вакансия'] !== filters.vacancy) return false
    if (filters.name && row['Имя'] !== filters.name) return false
    if (filters.month && row['Месяц'] !== filters.month) return false
    if (filters.hireType && row['Тип найма'] !== filters.hireType) return false

    if (hasDateRange) {
      const rowDate = getFunnelRowDateKey(row, dateField)
      if (rowDate === null) return false
      if (dateFrom !== null && rowDate < dateFrom) return false
      if (dateTo !== null && rowDate > dateTo) return false
    }

    return true
  })
}

export function funnelNumber(value) {
  const number = Number.parseInt(value, 10)
  return Number.isNaN(number) ? 0 : number
}

export function funnelStageTotal(rows = [], stage) {
  return rows.reduce((sum, row) => sum + funnelNumber(row[stage]), 0)
}

export function visibleFunnelStageIndices(totals = []) {
  let lastNonZero = -1
  for (let i = totals.length - 1; i >= 0; i -= 1) {
    if (totals[i] > 0) {
      lastNonZero = i
      break
    }
  }

  return totals
    .map((total, index) => ({ total, index }))
    .filter(({ total, index }) => total > 0 || index > lastNonZero)
    .map(({ index }) => index)
}

export function computeFunnelEntries(rows = [], stages = []) {
  const totals = stages.map(stage => funnelStageTotal(rows, stage))
  const visibleIndices = visibleFunnelStageIndices(totals)
  const max = visibleIndices.length ? totals[visibleIndices[0]] || 1 : 1

  return visibleIndices.map((stageIndex, position) => {
    const count = totals[stageIndex]
    const previous = position > 0 ? totals[visibleIndices[position - 1]] : null
    const conversion = previous !== null && previous > 0 ? Math.round((count / previous) * 100) : null

    return {
      stage: stages[stageIndex],
      count,
      pct: Math.round((count / max) * 100),
      conversion,
      color: FUNNEL_PALETTE[stageIndex % FUNNEL_PALETTE.length],
    }
  })
}

export function getUniqueFieldValues(rows = [], field) {
  const values = new Set()
  for (const row of rows) {
    const value = row[field]
    if (value !== null && value !== undefined && value !== '') values.add(String(value))
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'ru'))
}

export function formatFunnelMonth(value) {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{4})(\d{2})(?:\d{2})?$/) || text.match(/^(\d{4})-(\d{1,2})/)
  if (!match) return value || ''

  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
  const year = match[1]
  const month = Number.parseInt(match[2], 10)
  return months[month - 1] ? `${months[month - 1]} ${year}` : value
}

export function formatFunnelDate(value) {
  const key = parseFunnelDateValue(value)
  if (key === null) return value || ''
  const text = String(key)
  return `${text.slice(6, 8)}.${text.slice(4, 6)}.${text.slice(0, 4)}`
}

export function buildCardsColumnsFromMetadata(metadata = {}) {
  const columns = [{
    id: String(metadata.id ?? ''),
    name: metadata.val || metadata.name || 'Значение',
    type: String(metadata.type || '3'),
    ref: metadata.ref || null,
  }]

  for (const req of toArray(metadata.reqs ?? metadata.requisites)) {
    columns.push({
      id: String(req.id ?? ''),
      name: req.val || req.name || '',
      type: String(req.type || '3'),
      ref: req.ref || null,
    })
  }

  return columns
}

export function parseCardsJsonObjRows(payload = []) {
  return toArray(payload).map(item => {
    const values = item.r || item.row || []
    return values.map(value => parseReferenceValue(value).label)
  })
}

function isPhoneField(name) {
  const normalized = String(name || '').toLowerCase()
  return ['телефон', 'phone', 'тел', 'mob', 'mobile'].includes(normalized)
}

function isEmailField(name) {
  const normalized = String(name || '').toLowerCase()
  return ['email', 'почта', 'e-mail', 'mail'].includes(normalized)
}

function isColorField(name) {
  const normalized = String(name || '').toLowerCase()
  return normalized === 'цвет' || normalized === 'color'
}

function isRefField(column) {
  return column?.ref !== null && column?.ref !== undefined && column?.ref !== ''
}

function makeCardField(column, colIdx, fieldType, order, overrides = {}) {
  return {
    colId: column.id,
    colIdx,
    visible: true,
    showLabel: fieldType === CARD_FIELD_TYPES.ADDITIONAL,
    alias: null,
    order,
    fieldType,
    ...overrides,
  }
}

export function detectCardFields(columns = [], savedSettings = null) {
  if (Array.isArray(savedSettings) && savedSettings.length > 0) {
    return Object.fromEntries(savedSettings
      .filter(field => field.visible !== false)
      .map(field => [field.fieldType, field]))
  }

  const textIndices = []
  const dateIndices = []
  const numIndices = []
  const listIndices = []
  const additional = []
  let phoneIndex = -1
  let emailIndex = -1
  let colorIndex = -1

  columns.forEach((column, index) => {
    const type = String(column.type || '3')
    const name = column.name || ''

    if (isPhoneField(name)) {
      phoneIndex = index
    } else if (isEmailField(name)) {
      emailIndex = index
    } else if (isColorField(name)) {
      colorIndex = index
    } else if (LIST_TYPES.has(type) || isRefField(column)) {
      listIndices.push(index)
    } else if (TEXT_TYPES.has(type)) {
      textIndices.push(index)
    } else if (DATE_TYPES.has(type)) {
      dateIndices.push(index)
    } else if (NUM_TYPES.has(type)) {
      numIndices.push(index)
    } else if (FILE_TYPES.has(type)) {
      additional.push(index)
    }
  })

  const fields = {}
  const used = new Set()
  let order = 0

  const titleIndex = textIndices[0] !== undefined ? textIndices[0] : 0
  if (columns[titleIndex]) {
    fields.title = makeCardField(columns[titleIndex], titleIndex, CARD_FIELD_TYPES.TITLE, order++, { showLabel: false })
    used.add(titleIndex)
  }

  if (textIndices[1] !== undefined) {
    fields.description = makeCardField(columns[textIndices[1]], textIndices[1], CARD_FIELD_TYPES.DESCRIPTION, order++, { showLabel: false })
    used.add(textIndices[1])
  }

  if (dateIndices[0] !== undefined) {
    fields.date = makeCardField(columns[dateIndices[0]], dateIndices[0], CARD_FIELD_TYPES.DATE, order++, { showLabel: false })
    used.add(dateIndices[0])
  }

  if (listIndices[0] !== undefined) {
    fields.status = makeCardField(columns[listIndices[0]], listIndices[0], CARD_FIELD_TYPES.STATUS, order++, { showLabel: false })
    used.add(listIndices[0])
  }

  if (numIndices[0] !== undefined) {
    fields.amount = makeCardField(columns[numIndices[0]], numIndices[0], CARD_FIELD_TYPES.AMOUNT, order++, { showLabel: false })
    used.add(numIndices[0])
  }

  for (const index of additional) {
    if (used.has(index)) continue
    fields[`additional-${columns[index].id}`] = makeCardField(columns[index], index, CARD_FIELD_TYPES.ADDITIONAL, order++)
    used.add(index)
  }

  if (phoneIndex >= 0) {
    fields.phone = makeCardField(columns[phoneIndex], phoneIndex, CARD_FIELD_TYPES.PHONE, order++, { showLabel: false })
    used.add(phoneIndex)
  }

  if (emailIndex >= 0) {
    fields.email = makeCardField(columns[emailIndex], emailIndex, CARD_FIELD_TYPES.EMAIL, order++, { showLabel: false })
    used.add(emailIndex)
  }

  if (colorIndex >= 0) {
    fields.color = makeCardField(columns[colorIndex], colorIndex, 'color', order++, { visible: false })
  }

  return fields
}

export function formatCardsDate(value) {
  if (!value) return ''
  const text = String(value)
  const iso = text.match(/^(\d\d\d\d-\d\d-\d\d)/)
  if (iso) return iso[1]
  const ru = text.match(/^(\d\d\.\d\d\.\d\d\d\d)/)
  if (ru) return ru[1]
  const timestamp = Number(text)
  if (!Number.isNaN(timestamp) && timestamp > 0) {
    const date = new Date(timestamp < 1e10 ? timestamp * 1000 : timestamp)
    return date.toLocaleDateString('ru-RU')
  }
  return text.split('T')[0] || text
}

export function formatCardsNumber(value) {
  if (value === null || value === undefined || value === '') return ''
  const number = Number.parseFloat(String(value).replace(/\s/g, '').replace(',', '.'))
  return Number.isNaN(number) ? String(value) : number.toLocaleString('ru-RU')
}
