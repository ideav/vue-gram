export const TYPE_NAME_TO_ID = {
  HTML: 2,
  SHORT: 3,
  DATETIME: 4,
  GRANT: 5,
  PWD: 6,
  BUTTON: 7,
  CHARS: 8,
  DATE: 9,
  FILE: 10,
  BOOLEAN: 11,
  MEMO: 12,
  NUMBER: 13,
  SIGNED: 14,
  CALCULATABLE: 15,
  REPORT_COLUMN: 16,
  PATH: 17,
  0: 0
}

export const BASE_TYPE_NAME_BY_ID = {
  0: 'tab',
  1: 'short',
  2: 'html',
  3: 'short',
  4: 'datetime',
  5: 'grant',
  6: 'pwd',
  7: 'button',
  8: 'chars',
  9: 'date',
  10: 'file',
  11: 'boolean',
  12: 'memo',
  13: 'number',
  14: 'signed',
  15: 'calculatable',
  16: 'path',
  17: 'report_column',
  18: 'user',
  19: 'connect',
  20: 'time'
}

const BASE_TYPE_IDS = new Set(Object.keys(BASE_TYPE_NAME_BY_ID))
const NOT_NULL_MASK = /:!NULL:/gi
const MULTI_MASK = /:MULTI:/gi
const ALIAS_MASK = /:ALIAS=([^:]+):/i

export function getTypeIdFromName(typeName) {
  return TYPE_NAME_TO_ID[typeName] ?? typeName
}

export function getBaseTypeNameFromId(baseTypeId) {
  return BASE_TYPE_NAME_BY_ID[String(baseTypeId)] || 'reference'
}

export function isBaseType(typeId) {
  if (typeId === null || typeId === undefined || typeId === '') return false
  const id = String(typeId)
  return BASE_TYPE_IDS.has(id) || Number.parseInt(id, 10) <= 20
}

function getColumn(editTypes, numericKey, namedKey) {
  return editTypes?.[numericKey] || editTypes?.[namedKey] || []
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '' && value !== '0' && value !== 0
}

function parseRequisiteAttrs(attrs = '') {
  const rawAttrs = String(attrs || '')
  const alias = rawAttrs.match(ALIAS_MASK)?.[1] || ''
  const defaultValue = rawAttrs
    .replace(NOT_NULL_MASK, '')
    .replace(MULTI_MASK, '')
    .replace(ALIAS_MASK, '')

  return {
    alias,
    defaultValue,
    nullable: !/:!NULL:/i.test(rawAttrs),
    multi: /:MULTI:/i.test(rawAttrs)
  }
}

export function normalizeTypeEditorData(response = {}) {
  const editTypes = response.edit_types || response
  if (!editTypes || typeof editTypes !== 'object') return []

  const ids = getColumn(editTypes, '0', 'id')
  const baseTypes = getColumn(editTypes, '1', 't')
  const refValues = getColumn(editTypes, '2', 'ref_val')
  const uniqueFlags = getColumn(editTypes, '3', 'uniq')
  const names = getColumn(editTypes, '4', 'val')
  const orders = getColumn(editTypes, '5', 'ord')
  const requisiteIds = getColumn(editTypes, '6', 'req_id')
  const requisiteTypes = getColumn(editTypes, '7', 'req_t')
  const attrs = getColumn(editTypes, '8', 'attrs')
  const referenceTargets = getColumn(editTypes, '9', 'reft')

  const typeMap = new Map()
  const typeOrder = []

  for (let i = 0; i < ids.length; i += 1) {
    const typeId = String(ids[i])
    const order = orders[i]
    const isRequisiteRow = order !== undefined && order !== null && order !== ''

    if (!isRequisiteRow && !typeMap.has(typeId)) {
      const refVal = refValues[i]
      typeOrder.push(typeId)
      typeMap.set(typeId, {
        id: typeId,
        name: names[i] || '',
        baseType: baseTypes[i],
        baseTypeId: baseTypes[i],
        refVal,
        unique: uniqueFlags[i] === 1 || uniqueFlags[i] === '1' || uniqueFlags[i] === true,
        requisites: [],
        isReferenceTable: hasValue(refVal)
      })
      continue
    }

    if (!typeMap.has(typeId)) {
      typeOrder.push(typeId)
      typeMap.set(typeId, {
        id: typeId,
        name: names[i] || '',
        baseType: baseTypes[i],
        baseTypeId: baseTypes[i],
        refVal: refValues[i],
        unique: uniqueFlags[i] === 1 || uniqueFlags[i] === '1' || uniqueFlags[i] === true,
        requisites: [],
        isReferenceTable: hasValue(refValues[i])
      })
    }

    if (!isRequisiteRow) continue

    const reqTypeId = requisiteTypes[i]
    const targetTypeId = referenceTargets[i] || (!isBaseType(reqTypeId) ? reqTypeId : null)
    const isReference = hasValue(targetTypeId)
    const parsedAttrs = parseRequisiteAttrs(attrs[i])
    const rawName = names[i] || ''
    const displayName = parsedAttrs.alias || rawName

    typeMap.get(typeId).requisites.push({
      id: requisiteIds[i] ? String(requisiteIds[i]) : `${typeId}-req-${i}`,
      name: displayName,
      rawName,
      type: isReference ? 'reference' : getBaseTypeNameFromId(reqTypeId),
      baseTypeId: reqTypeId,
      refTypeId: isReference ? String(targetTypeId) : null,
      isReference,
      order,
      attrs: attrs[i] || '',
      alias: parsedAttrs.alias,
      defaultValue: parsedAttrs.defaultValue,
      nullable: parsedAttrs.nullable,
      multi: parsedAttrs.multi
    })
  }

  const types = typeOrder
    .map(id => typeMap.get(id))
    .filter(Boolean)

  types.forEach(type => {
    type.requisites.forEach(req => {
      if (req.refTypeId && typeMap.has(req.refTypeId)) {
        req.refTypeName = typeMap.get(req.refTypeId).name
      }
    })
    type.isService = String(type.baseType) === '0'
    type.isSimple = type.requisites.length === 0
    type.hasReferences = types.some(otherType =>
      otherType.requisites?.some(req => req.refTypeId === type.id || req.baseTypeId === type.id)
    )
  })

  return types
}
