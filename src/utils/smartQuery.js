import { legacyReportParamName, normalizeReportParams } from './reportData'

export const SMART_QUERY_TYPE_ID = 22
export const SMART_QUERY_DEFAULT_LIMIT = 20

function hasValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function requisiteValue(requisite) {
  if (requisite && typeof requisite === 'object' && !Array.isArray(requisite)) {
    return requisite.value ?? requisite.val ?? requisite.name ?? ''
  }
  return requisite
}

export function getSmartQueryLimit(editData) {
  const rawLimit = requisiteValue(editData?.reqs?.[134] ?? editData?.requisites?.[134])
  const limit = parseInt(rawLimit, 10)
  return Number.isFinite(limit) && limit > 0 ? limit : SMART_QUERY_DEFAULT_LIMIT
}

export function getSmartQueryTitle(editData, fallback = 'SmartQ') {
  return editData?.obj?.val || editData?.obj?.name || editData?.name || fallback
}

export function isSmartQueryEditData(editData) {
  const typeId = editData?.obj?.typ ?? editData?.obj?.type ?? editData?.obj?.typeId ?? editData?.typ
  return typeId === null || typeId === undefined || String(typeId) === String(SMART_QUERY_TYPE_ID)
}

function isRangeColumn(column = {}) {
  const descriptor = `${column.format ?? ''} ${column.type ?? ''}`.toUpperCase()
  return /(SIGNED|NUMBER|MONEY|INTEGER|INT|FLOAT|DECIMAL|DATETIME|DATE|TIME|BOOLEAN|BOOL)/.test(descriptor)
}

function isSpecialSmartQueryFilter(value) {
  const trimmed = String(value).trim()
  return (
    trimmed.includes('%') ||
    trimmed.startsWith('@') ||
    trimmed.startsWith('!@')
  )
}

export function serializeSmartQueryFilterValue(value, column = {}) {
  if (!hasValue(value)) return ''

  const text = String(value).trim()
  if (!text) return ''

  if (isRangeColumn(column) || isSpecialSmartQueryFilter(text)) {
    return text
  }

  return `%${text.replace(/\s+/g, '%')}%`
}

function columnLookup(columns) {
  const lookup = new Map()

  columns.forEach(column => {
    const keys = [
      column.field,
      column.header,
      column.name,
      column.id !== undefined ? String(column.id) : null,
      legacyReportParamName(column)
    ]

    keys.filter(Boolean).forEach(key => {
      lookup.set(String(key), column)
    })
  })

  return lookup
}

export function serializeSmartQueryFilters(filters = {}, columns = []) {
  const lookup = columnLookup(columns)
  const params = {}

  for (const [field, filter] of Object.entries(filters || {})) {
    const column = lookup.get(String(field)) || { field, header: field }
    const paramName = legacyReportParamName(column)
    const from = serializeSmartQueryFilterValue(filter?.from, column)
    const to = serializeSmartQueryFilterValue(filter?.to, column)

    if (hasValue(from)) params[`FR_${paramName}`] = from
    if (hasValue(to)) params[`TO_${paramName}`] = to
  }

  return params
}

export function normalizeSmartQuerySuggestions(response = {}) {
  const objects = Array.isArray(response)
    ? response
    : response.objects || response.object || []

  return objects.map(object => ({
    id: object.id ?? object.ID,
    name: object.name ?? object.val ?? object.value ?? `SmartQ #${object.id ?? object.ID}`,
    created_at: object.created_at ?? object.createdAt ?? null,
    updated_at: object.updated_at ?? object.updatedAt ?? null
  })).filter(object => object.id !== null && object.id !== undefined)
}

function normalizeChatMessage(message, index = 0) {
  if (typeof message === 'string') {
    return {
      id: `assistant-${Date.now()}-${index}`,
      role: 'assistant',
      content: message,
      createdAt: new Date().toISOString()
    }
  }

  const role = message?.role || message?.sender || 'assistant'
  const content = message?.content ?? message?.message ?? message?.answer ?? message?.text ?? ''

  return {
    id: message?.id || `${role}-${Date.now()}-${index}`,
    role,
    content,
    html: message?.html,
    createdAt: message?.createdAt || message?.created_at || new Date().toISOString()
  }
}

export function normalizeSmartQueryChatResponse(response) {
  if (Array.isArray(response)) {
    return response.map(normalizeChatMessage)
  }

  if (response?.messages && Array.isArray(response.messages)) {
    return response.messages.map(normalizeChatMessage)
  }

  const content = response?.answer ?? response?.message ?? response?.content ?? response?.text ?? response?.result ?? response
  return [normalizeChatMessage({
    role: 'assistant',
    content,
    html: response?.html
  })]
}

export function normalizeSmartQueryParams(params = {}, limit = SMART_QUERY_DEFAULT_LIMIT) {
  const normalized = normalizeReportParams(params)
  return {
    LIMIT: normalized.LIMIT ?? limit,
    ...normalized
  }
}
