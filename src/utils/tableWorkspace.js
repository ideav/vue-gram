export const DEFAULT_TABLE_FOLDERS = {
  'Избранное': { open: true, tabs: ['18', '42', '440', '415'] },
  'Справочники': { open: true, tabs: ['409', '422'] },
  'Служебные': { open: false, tabs: ['22', '269'] },
  'Скрытые': { open: false, tabs: ['47', '65', '137', '29', '63'] }
}

export const TABLE_BASE_TYPES = [
  { value: '3', label: 'Короткая строка (до 127 символов)' },
  { value: '8', label: 'Строка без ограничения длины' },
  { value: '9', label: 'Дата' },
  { value: '13', label: 'Целое число' },
  { value: '14', label: 'Число с десятичной частью' },
  { value: '12', label: 'Многострочное поле' },
  { value: '4', label: 'Дата и время' },
  { value: '2', label: 'HTML-текст' },
  { value: '5', label: 'Права доступа' },
  { value: '16', label: 'Колонка отчета' }
]

const TYPE_ICON_CLASSES = {
  2: 'fi fi-rr-code',
  3: 'fi fi-rr-document',
  4: 'fi fi-rr-clock',
  5: 'fi fi-rr-lock',
  8: 'fi fi-rr-align-left',
  9: 'fi fi-rr-calendar',
  12: 'fi fi-rr-memo',
  13: 'fi fi-rr-hastag',
  14: 'fi fi-rr-calculator',
  16: 'fi fi-rr-table'
}

const DETECTION_RULES = [
  { pattern: /дата\s+и\s+время|timestamp|datetime|created\s*at|updated\s*at|время/i, type: 4, ref: false },
  { pattern: /дата|срок|deadline/i, type: 9, ref: false },
  { pattern: /^кол-?во$|^количество$|^номер$|^год$|^месяц$|^возраст$|count|quantity|number/i, type: 13, ref: false },
  { pattern: /^сумма$|^цена$|^стоимость$|^итого$|^вес$|^площадь$|amount|price|cost|total|balance/i, type: 14, ref: false },
  { pattern: /описание|комментар|примечан|memo|notes|description/i, type: 12, ref: false },
  { pattern: /html|markup/i, type: 2, ref: false },
  { pattern: /статус|состояние|тип|вид|категория|группа|отдел|должность|регион|страна|город|валюта|роль|brand|status|type|category|group|city|country|role/i, type: 3, ref: true },
  { pattern: /report\s*column|колонка\s+отчет/i, type: 16, ref: false }
]

export function cloneFolderConfig(config = DEFAULT_TABLE_FOLDERS) {
  return Object.fromEntries(
    Object.entries(config).map(([name, folder]) => [
      name,
      {
        open: folder?.open !== false,
        tabs: Array.isArray(folder?.tabs) ? folder.tabs.map(String) : []
      }
    ])
  )
}

export function normalizeFolderConfig(rawConfig) {
  if (!rawConfig) return cloneFolderConfig()

  let parsed = rawConfig
  if (typeof rawConfig === 'string') {
    try {
      parsed = JSON.parse(rawConfig)
    } catch {
      return cloneFolderConfig()
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return cloneFolderConfig()
  }

  const entries = Object.entries(parsed)
    .filter(([, folder]) => folder && typeof folder === 'object')
    .map(([name, folder]) => [
      name,
      {
        open: folder.open !== false,
        tabs: Array.isArray(folder.tabs) ? folder.tabs.map(String) : []
      }
    ])

  return entries.length > 0 ? Object.fromEntries(entries) : cloneFolderConfig()
}

export function normalizeTableList(payload) {
  if (Array.isArray(payload)) {
    return payload
      .map(table => ({
        id: String(table.id),
        type: Number(table.type ?? table.t ?? table.baseType ?? 3),
        name: String(table.name ?? table.val ?? '').replace(/&nbsp;/g, ' ').trim()
      }))
      .filter(table => table.id && table.name)
      .sort(compareTablesByName)
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.terms)) {
      return normalizeTableList(payload.terms)
    }

    if (payload.termById && typeof payload.termById === 'object') {
      const termsById = new Map(
        Array.isArray(payload.terms)
          ? payload.terms.map(term => [String(term.id), term])
          : []
      )

      return Object.entries(payload.termById)
        .map(([id, name]) => {
          const source = termsById.get(String(id)) || {}
          return {
            id: String(id),
            type: Number(source.type ?? source.t ?? source.baseType ?? 3),
            name: String(name ?? source.name ?? source.val ?? '').replace(/&nbsp;/g, ' ').trim()
          }
        })
        .filter(table => table.id && table.name)
        .sort(compareTablesByName)
    }

    return Object.entries(payload)
      .map(([id, name]) => ({
        id: String(id),
        type: 3,
        name: String(name ?? '').replace(/&nbsp;/g, ' ').trim()
      }))
      .filter(table => table.id && table.name)
      .sort(compareTablesByName)
  }

  return []
}

export function getAssignedTableIds(config) {
  const ids = new Set()
  Object.values(config || {}).forEach(folder => {
    ;(folder.tabs || []).forEach(id => ids.add(String(id)))
  })
  return ids
}

export function tableMatchesQuery(table, query) {
  const normalized = String(query || '').trim().toLowerCase()
  if (!normalized) return true
  return table.name.toLowerCase().includes(normalized)
}

export function extractTableSettings(payload) {
  if (!payload) return { settingsId: null, config: null }

  if (typeof window !== 'undefined' && window.myTablesSet && Object.keys(window.myTablesSet).length > 0) {
    const [settingsId, settingsData] = Object.entries(window.myTablesSet)[0]
    const settingsValue = settingsData?.UI ?? Object.values(settingsData || {})[0]
    return { settingsId, config: normalizeFolderConfig(settingsValue) }
  }

  const rows = Array.isArray(payload) ? payload : payload.object || payload.objects || payload.data || []
  if (!Array.isArray(rows)) return { settingsId: null, config: null }

  for (const row of rows) {
    const settingsValue = extractSettingsValue(row)
    if (settingsValue) {
      return {
        settingsId: row.id ? String(row.id) : null,
        config: normalizeFolderConfig(settingsValue)
      }
    }
  }

  return { settingsId: null, config: null }
}

export function hasStructureWriteGrant(grants) {
  return String(grants?.['1'] || '').toUpperCase() === 'WRITE'
}

export function detectTableBaseType(name) {
  const value = String(name || '').trim()
  if (!value) return null

  for (const rule of DETECTION_RULES) {
    if (rule.pattern.test(value)) {
      return { type: rule.type, ref: rule.ref }
    }
  }

  return null
}

export function getTypeIconClass(type) {
  return TYPE_ICON_CLASSES[Number(type)] || TYPE_ICON_CLASSES[3]
}

function compareTablesByName(a, b) {
  return a.name.localeCompare(b.name, 'ru')
}

function extractSettingsValue(row) {
  if (!row || typeof row !== 'object') return null

  return (
    row.UI ||
    row.settings ||
    row.t273 ||
    row.reqs?.[273]?.val ||
    row.reqs?.['273']?.val ||
    row.reqs?.[273]?.value ||
    row.reqs?.['273']?.value ||
    row.requisites?.[273]?.val ||
    row.requisites?.['273']?.val ||
    row.requisites?.[273]?.value ||
    row.requisites?.['273']?.value ||
    null
  )
}
