export const INTEGRAM_BASE_TYPE_BY_ID = Object.freeze({
  '0': 'TAB',
  '1': 'SHORT',
  '2': 'HTML',
  '3': 'SHORT',
  '4': 'DATETIME',
  '5': 'GRANT',
  '6': 'PWD',
  '7': 'BUTTON',
  '8': 'CHARS',
  '9': 'DATE',
  '10': 'FILE',
  '11': 'BOOLEAN',
  '12': 'MEMO',
  '13': 'NUMBER',
  '14': 'SIGNED',
  '15': 'CALCULATABLE',
  '16': 'REPORT_COLUMN',
  '17': 'PATH',
  '18': 'USER',
  '19': 'CONNECT',
  '20': 'TIME'
})

function hasValue(value) {
  return value !== undefined && value !== null && value !== ''
}

function getMappedArrayTypeId(req, arrTypeMapping = {}) {
  if (!req) return null
  return arrTypeMapping[req.id] ?? arrTypeMapping[String(req.id)] ?? null
}

export function getIntegramBaseType(typeCode) {
  return INTEGRAM_BASE_TYPE_BY_ID[String(typeCode)] || 'SHORT'
}

export function getIntegramArrayTypeId(req, arrTypeMapping = {}) {
  if (!req) return null

  const mappedTypeId = getMappedArrayTypeId(req, arrTypeMapping)
  if (hasValue(mappedTypeId)) return mappedTypeId

  if (hasValue(req.arr_type)) return req.arr_type
  if (hasValue(req.arr)) return req.arr
  if (hasValue(req.arr_id)) return req.arr_id

  return null
}

export function isIntegramArrayRequisite(req, arrTypeMapping = {}) {
  return hasValue(getIntegramArrayTypeId(req, arrTypeMapping))
}

export function isIntegramReferenceRequisite(req, arrTypeMapping = {}) {
  return !isIntegramArrayRequisite(req, arrTypeMapping) && hasValue(req?.ref)
}
