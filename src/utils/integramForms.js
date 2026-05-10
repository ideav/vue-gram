import {
  getIntegramBaseType,
  isIntegramReferenceRequisite
} from './integramFieldTypes'

export const LEGACY_FORM_TYPE_ID = 137
export const LEGACY_FORM_PANEL_TYPE_ID = 138
export const LEGACY_FORM_FIELD_TYPE_ID = 144
export const LEGACY_FORM_BUTTON_TYPE_ID = 150
export const LEGACY_QUIZ_SETTINGS_TYPE_ID = 269

export const FORM_PANEL_REQS = Object.freeze({
  reportId: 161,
  filter: 181,
  typeId: 184,
  pivotConfig: 225,
  color: 254,
  backgroundColor: 255,
  group: 256,
  nextAction: 257,
  overflowMode: 258
})

export const FORM_FIELD_REQS = Object.freeze({
  fieldId: 144,
  alias: 186,
  defaultValue: 187
})

export const FORM_BUTTON_REQS = Object.freeze({
  action: 216,
  className: 218
})

export const QUIZ_REQS = Object.freeze({
  name: 269,
  kind: 271,
  config: 273
})

const CHART_PANEL_TYPES = new Set(['XYChart', 'PieChart', 'Histogram', 'Pivot', 'Bubble'])

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key)
}

export function hasValue(value) {
  return value !== undefined && value !== null && value !== ''
}

export function normalizeId(value) {
  if (!hasValue(value)) return ''
  return String(value)
}

export function isNumericId(value) {
  return /^\d+$/.test(normalizeId(value))
}

export function extractReferenceId(value) {
  if (!hasValue(value)) return ''
  if (typeof value === 'object') {
    if (hasValue(value.id)) return normalizeId(value.id)
    if (hasValue(value.ref)) return normalizeId(value.ref)
    if (hasValue(value.value)) return normalizeId(value.value)
    if (hasValue(value.val) && isNumericId(value.val)) return normalizeId(value.val)
    return ''
  }

  const text = String(value)
  const refMatch = text.match(/^(?:\d+:)?(\d+)$/)
  if (refMatch) return refMatch[1]
  return text
}

export function getLegacyReqValue(reqs, objectId, reqId, fallbackIndex = null) {
  const source = objectId !== undefined && objectId !== null && reqs && hasOwn(reqs, objectId)
    ? reqs[objectId]
    : reqs

  if (!source) return undefined

  const id = normalizeId(reqId)
  if (hasOwn(source, id)) return source[id]
  if (hasOwn(source, Number(id))) return source[Number(id)]
  if (hasOwn(source, `t${id}`)) return source[`t${id}`]
  if (hasOwn(source, `ref_${id}`)) return source[`ref_${id}`]

  if (Array.isArray(source) && fallbackIndex !== null) return source[fallbackIndex]
  return undefined
}

function normalizeObjectRecord(raw, index = 0) {
  if (!raw || typeof raw !== 'object') {
    return {
      id: raw,
      val: String(raw ?? ''),
      name: String(raw ?? ''),
      order: index
    }
  }

  return {
    ...raw,
    id: raw.id ?? raw.ID ?? raw.obj ?? raw.value ?? index,
    val: raw.val ?? raw.name ?? raw.title ?? '',
    name: raw.name ?? raw.val ?? raw.title ?? '',
    order: raw.ord ?? raw.order ?? index
  }
}

export function normalizeLegacyObjectCollection(response = {}) {
  const legacyList = response['&main.a.&uni_obj.&uni_obj_all']
  const objects = []

  if (Array.isArray(response.objects) || Array.isArray(response.object)) {
    objects.push(...(response.objects ?? response.object).map(normalizeObjectRecord))
  } else if (legacyList?.id) {
    const ids = Array.isArray(legacyList.id) ? legacyList.id : Object.values(legacyList.id)
    const values = Array.isArray(legacyList.val) ? legacyList.val : Object.values(legacyList.val || {})
    ids.forEach((id, index) => {
      objects.push(normalizeObjectRecord({
        id,
        val: values[index] ?? ''
      }, index))
    })
  } else if (response.obj) {
    objects.push(normalizeObjectRecord(response.obj))
  }

  return {
    objects,
    reqs: response.objectRequisites ?? response.reqs ?? response['&object_reqs'] ?? {}
  }
}

export function getAttrs(value) {
  if (Array.isArray(value)) return value.join(':')
  return String(value || '')
}

export function isRequiredRequisite(requisite = {}) {
  const attrs = getAttrs(requisite.attrs)
  return requisite.required === true ||
    requisite.null === false ||
    requisite.nullable === false ||
    attrs.includes(':!NULL:') ||
    attrs.includes('!NULL')
}

export function isReadonlyRequisite(requisite = {}) {
  const attrs = getAttrs(requisite.attrs)
  return requisite.readOnly === true ||
    requisite.readonly === true ||
    attrs.includes(':READONLY:') ||
    attrs.includes(':READ_ONLY:') ||
    getIntegramBaseType(requisite.type ?? requisite.base) === 'CALCULATABLE'
}

export function resolveDefaultValue(value, now = new Date()) {
  if (!hasValue(value)) return value
  if (value !== '[NOW]' && value !== '[TODAY]' && value !== '[TOMORROW]') return value

  const date = new Date(now)
  if (value === '[TOMORROW]') date.setDate(date.getDate() + 1)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  if (value === '[NOW]') return `${year}-${month}-${day}T${hours}:${minutes}`
  return `${year}-${month}-${day}`
}

function normalizeMetadataRequisite(requisite = {}) {
  const typeCode = requisite.type ?? requisite.base ?? requisite.typeId
  const baseType = requisite.baseType ?? getIntegramBaseType(typeCode)

  return {
    ...requisite,
    id: normalizeId(requisite.id),
    name: requisite.name ?? requisite.val ?? `Поле ${requisite.id}`,
    baseType,
    required: isRequiredRequisite(requisite),
    readOnly: isReadonlyRequisite(requisite),
    isReference: isIntegramReferenceRequisite(requisite),
    refTypeId: requisite.ref ? normalizeId(requisite.ref) : null,
    multi: getAttrs(requisite.attrs).includes(':MULTI:') || requisite.multi === true
  }
}

function buildConfiguredField({ panel, fieldObject, fieldReqs, metadataById }) {
  const rawFieldId = getLegacyReqValue(fieldReqs, fieldObject.id, FORM_FIELD_REQS.fieldId, 0) ?? fieldObject.fieldId ?? fieldObject.id
  const fieldId = normalizeId(extractReferenceId(rawFieldId))
  const metadata = metadataById.get(fieldId)
  const isObjectValue = fieldId === normalizeId(panel.typeId)
  const defaultValue = getLegacyReqValue(fieldReqs, fieldObject.id, FORM_FIELD_REQS.defaultValue, 2) ??
    fieldObject.defaultValue ??
    fieldObject.value ??
    metadata?.defaultValue

  return {
    ...(metadata || {}),
    id: fieldId,
    configId: normalizeId(fieldObject.id),
    name: getLegacyReqValue(fieldReqs, fieldObject.id, FORM_FIELD_REQS.alias, 1) ??
      fieldObject.alias ??
      fieldObject.val ??
      metadata?.name ??
      `Поле ${fieldId}`,
    defaultValue: resolveDefaultValue(defaultValue),
    baseType: metadata?.baseType ?? 'SHORT',
    required: metadata?.required ?? isObjectValue,
    readOnly: metadata?.readOnly ?? false,
    isReference: metadata?.isReference ?? false,
    refTypeId: metadata?.refTypeId ?? null,
    multi: metadata?.multi ?? false,
    isObjectValue
  }
}

export function buildFormPanelFields({ panel, configuredFields = [], configuredReqs = {}, metadata = {} }) {
  const metadataReqs = Array.isArray(metadata.reqs)
    ? metadata.reqs
    : Array.isArray(metadata.requisites)
      ? metadata.requisites
      : []
  const metadataById = new Map(metadataReqs.map(req => {
    const normalized = normalizeMetadataRequisite(req)
    return [normalized.id, normalized]
  }))

  if (configuredFields.length > 0) {
    return configuredFields.map(fieldObject => buildConfiguredField({
      panel,
      fieldObject,
      fieldReqs: configuredReqs,
      metadataById
    }))
  }

  return metadataReqs.map(req => normalizeMetadataRequisite(req))
}

export function normalizeFormPanel(panelObject, reqs = {}) {
  const panelId = normalizeId(panelObject.id)
  const typeId = getLegacyReqValue(reqs, panelId, FORM_PANEL_REQS.typeId, 0)
  const reportId = extractReferenceId(
    getLegacyReqValue(reqs, panelId, `ref_${FORM_PANEL_REQS.reportId}`) ??
    getLegacyReqValue(reqs, panelId, FORM_PANEL_REQS.reportId, 1)
  )

  let pivotConfig = null
  const rawConfig = getLegacyReqValue(reqs, panelId, FORM_PANEL_REQS.pivotConfig)
  if (rawConfig) {
    try {
      pivotConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig
    } catch {
      pivotConfig = null
    }
  }

  return {
    id: panelId,
    title: panelObject.name || panelObject.val || `Панель ${panelId}`,
    typeId: normalizeId(typeId),
    reportId,
    panelType: CHART_PANEL_TYPES.has(typeId) ? typeId : (pivotConfig?.panelType || (reportId ? 'Report' : 'DataEntry')),
    color: getLegacyReqValue(reqs, panelId, FORM_PANEL_REQS.color) || '#333333',
    backgroundColor: getLegacyReqValue(reqs, panelId, FORM_PANEL_REQS.backgroundColor) || '#ffffff',
    group: getLegacyReqValue(reqs, panelId, FORM_PANEL_REQS.group) || '',
    filter: getLegacyReqValue(reqs, panelId, FORM_PANEL_REQS.filter) || '',
    nextAction: getLegacyReqValue(reqs, panelId, FORM_PANEL_REQS.nextAction) || '',
    overflowMode: getLegacyReqValue(reqs, panelId, FORM_PANEL_REQS.overflowMode) || '',
    pivotConfig,
    fields: [],
    buttons: [],
    report: null
  }
}

export function parseLegacyFilter(filter = '') {
  const text = String(filter || '').replace(/^\?/, '').replace(/^JSON&?/, '')
  if (!text) return {}

  const params = new URLSearchParams(text)
  return Object.fromEntries(params.entries())
}

export function isFieldVisible(field, values = {}) {
  if (field.hidden === true) return false
  const rule = field.visibleWhen || field.showWhen
  if (!rule) return true

  const actual = values[rule.fieldId] ?? values[`t${rule.fieldId}`]
  if (hasOwn(rule, 'equals')) return String(actual ?? '') === String(rule.equals)
  if (hasOwn(rule, 'notEquals')) return String(actual ?? '') !== String(rule.notEquals)
  if (rule.hasValue) return hasValue(actual)
  return true
}

export function isSubmittedValuePresent(value) {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'boolean') return value === true
  return value !== undefined && value !== null && value !== ''
}

export function validateRequiredFields(fields, values = {}) {
  const errors = {}

  for (const field of fields) {
    if (!field.required || !isFieldVisible(field, values) || field.readOnly) continue
    const value = values[field.id] ?? values[`t${field.id}`]
    if (!isSubmittedValuePresent(value)) errors[field.id] = `Заполните поле ${field.name}`
  }

  return errors
}

export function buildSubmitPayload(fields, values = {}, options = {}) {
  const payload = {}
  let objectValue = options.defaultObjectValue ?? ''

  for (const field of fields) {
    if (field.readOnly || !isFieldVisible(field, values)) continue
    const value = values[field.id] ?? values[`t${field.id}`] ?? field.defaultValue ?? ''

    if (field.isObjectValue) {
      objectValue = value
      continue
    }

    payload[field.id] = value
  }

  return {
    objectValue,
    requisites: payload
  }
}

export function normalizeQuizConfig(rawConfig, id = null) {
  const source = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig
  const fields = Array.isArray(source.form) ? source.form : Array.isArray(source.fields) ? source.fields : []
  const typeId = normalizeId(source.type ?? source.typeId ?? source.typ)
  let page = 1

  const normalizedFields = fields.map((field) => {
    if (field.isPageBreak) {
      page += 1
      return {
        ...field,
        page,
        isPageBreak: true
      }
    }

    const fieldPage = field.page || page
    const fieldId = normalizeId(field.id)
    const baseType = field.base || field.view || getIntegramBaseType(field.type)
    const refTypeId = field.ref_type ?? field.refType ?? field.ref ?? null
    return {
      ...field,
      id: fieldId,
      label: field.label || field.name || `Поле ${field.id}`,
      name: field.name || field.label || `Поле ${field.id}`,
      baseType,
      required: field.required === true || field.required === '1' || field.required === 'true',
      hidden: field.hidden === true,
      readOnly: field.readOnly === true || field.readonly === true,
      page: fieldPage,
      defaultValue: resolveDefaultValue(field.default),
      isObjectValue: fieldId === typeId,
      isReference: baseType === 'DDL' || hasValue(refTypeId),
      refTypeId: refTypeId ? normalizeId(refTypeId) : null
    }
  }).filter(field => !field.isPageBreak)

  const totalPages = normalizedFields.reduce((max, field) => Math.max(max, Number(field.page || 1)), 1)

  return {
    ...source,
    id: id ?? source.id ?? null,
    name: source.name || '',
    description: source.descr || source.description || '',
    submitLabel: source.submit || 'Отправить',
    successMessage: source.success || 'Данные успешно отправлены, Спасибо!',
    failMessage: source.fail || 'Ошибка отправки формы, обратитесь в support@ideav.online',
    typeId,
    fields: normalizedFields,
    totalPages
  }
}

export function getQuizConfigFromSettings(settingsRecord, reqs = {}) {
  const objectId = settingsRecord?.id
  const rawConfig = getLegacyReqValue(reqs, objectId, QUIZ_REQS.config)
  if (!rawConfig) return null
  return normalizeQuizConfig(rawConfig, objectId)
}
