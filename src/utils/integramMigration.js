export const MIGRATION_SETTINGS_TABLE_ID = '269'
export const MIGRATION_SETTINGS_TYPE = 'migration'
export const MIGRATION_QUERY_TABLE_ID = '22'
export const MIGRATION_QUERY_COLUMNS_TABLE_ID = '28'
export const MIGRATION_EXPORT_LIMIT = '0,100000'

export const MIGRATION_TEXT_FILE_RE = /\.(html?|css|js|json|txt|md|xml|svg|csv|sql|php|py|conf|ya?ml)$/i

export function toMigrationId(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

export function getMigrationDisplayValue(value) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  const colon = text.indexOf(':')
  return colon > -1 ? text.slice(colon + 1).trim() : text.trim()
}

export function normalizeMigrationSearch(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function normalizeMigrationPath(path = '') {
  return String(path || '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/')
}

export function dirname(path = '') {
  const value = normalizeMigrationPath(path)
  const idx = value.lastIndexOf('/')
  return idx > -1 ? value.slice(0, idx) : ''
}

export function basename(path = '') {
  const value = normalizeMigrationPath(path)
  const idx = value.lastIndexOf('/')
  return idx > -1 ? value.slice(idx + 1) : value
}

export function decodeMigrationSegment(value) {
  const text = String(value || '').replace(/\+/g, ' ')
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

export function isMigrationTextFile(name = '') {
  return MIGRATION_TEXT_FILE_RE.test(String(name || ''))
}

export function makeMigrationFileItem({ root = 'templates', dir = '', path = '', name = '' } = {}) {
  const cleanDir = normalizeMigrationPath(dir)
  const cleanName = name || basename(path)
  const cleanPath = normalizeMigrationPath(path || `${cleanDir ? `${cleanDir}/` : ''}${cleanName}`)
  return {
    key: `${root}:${cleanPath}`,
    root,
    path: cleanPath,
    name: cleanName,
    dir: dirname(cleanPath),
    text: isMigrationTextFile(cleanName || cleanPath)
  }
}

function rowArray(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.list)) return data.list
  if (Array.isArray(data?.object)) return data.object
  if (Array.isArray(data?.rows)) return data.rows
  if (Array.isArray(data?.types)) return data.types
  return []
}

function sortByName(items) {
  return [...items].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru'))
}

export function normalizeMigrationTablesResponse(data = []) {
  return sortByName(rowArray(data)
    .map(item => ({
      id: toMigrationId(item.id ?? item.i),
      name: getMigrationDisplayValue(item.val ?? item.name ?? item.value ?? item.r?.[0] ?? item.id ?? item.i),
      raw: item
    }))
    .filter(item => item.id))
}

export function normalizeMigrationQueriesResponse(data = []) {
  return sortByName(rowArray(data)
    .map(item => ({
      id: toMigrationId(item.i ?? item.id),
      name: getMigrationDisplayValue(item.r?.[0] ?? item.val ?? item.name ?? item.value ?? item.i ?? item.id),
      raw: item
    }))
    .filter(item => item.id))
}

export function cloneMigrationTable(item = {}) {
  return {
    id: toMigrationId(item.id),
    name: item.name || item.val || item.value || toMigrationId(item.id),
    exportData: Boolean(item.exportData),
    filter: item.filter || ''
  }
}

export function cloneMigrationQuery(item = {}) {
  return {
    id: toMigrationId(item.id),
    name: item.name || item.val || item.value || toMigrationId(item.id)
  }
}

export function cloneMigrationFile(item = {}) {
  const root = item.root || 'templates'
  const path = normalizeMigrationPath(item.path || item.name || '')
  const name = item.name || basename(path)
  return {
    key: item.key || `${root}:${path}`,
    root,
    path,
    name,
    dir: item.dir || dirname(path),
    text: item.text ?? isMigrationTextFile(name || path)
  }
}

export function normalizeMigrationConfig(config = {}) {
  const raw = config && typeof config === 'object' ? config : {}
  return {
    version: raw.version || 1,
    type: raw.type || MIGRATION_SETTINGS_TYPE,
    name: raw.name || '',
    tables: Array.isArray(raw.tables)
      ? raw.tables.map(cloneMigrationTable).filter(item => item.id)
      : [],
    queries: Array.isArray(raw.queries)
      ? raw.queries.map(cloneMigrationQuery).filter(item => item.id)
      : [],
    files: Array.isArray(raw.files)
      ? raw.files.map(cloneMigrationFile).filter(item => item.path)
      : []
  }
}

export function serializeMigrationConfig({ name = '', tables = [], queries = [], files = [] } = {}) {
  return normalizeMigrationConfig({
    version: 1,
    type: MIGRATION_SETTINGS_TYPE,
    name,
    tables,
    queries,
    files
  })
}

export function normalizeMigrationSettingsResponse(data = []) {
  return sortByName(rowArray(data)
    .map(item => {
      const rawJson = item.r?.[2] ?? item.config ?? item.json ?? ''
      let config = null
      if (rawJson && typeof rawJson === 'object') {
        config = normalizeMigrationConfig(rawJson)
      } else if (rawJson) {
        try {
          config = normalizeMigrationConfig(JSON.parse(rawJson))
        } catch {
          config = null
        }
      }

      return {
        id: toMigrationId(item.i ?? item.id),
        name: getMigrationDisplayValue(item.r?.[0] ?? item.val ?? item.name ?? item.i ?? item.id),
        config,
        raw: item
      }
    })
    .filter(item => item.id))
}

function mapById(items = []) {
  const map = new Map()
  for (const item of items) {
    const id = toMigrationId(item.id)
    if (id) map.set(id, item)
  }
  return map
}

function mapByName(items = []) {
  const map = new Map()
  for (const item of items) {
    const name = normalizeMigrationSearch(item.name || item.val || item.value)
    if (name) map.set(name, item)
  }
  return map
}

function uniquePush(list, seen, item) {
  const id = toMigrationId(item.id)
  if (!id || seen.has(id)) return
  seen.add(id)
  list.push({ ...item, id })
}

export function parseMigrationDependencyRefs(text = '', catalog = {}) {
  const source = String(text || '')
  const tableById = mapById(catalog.tables || [])
  const queryById = mapById(catalog.queries || [])
  const queryByName = mapByName(catalog.queries || [])
  const result = { tables: [], queries: [] }
  const seenTables = new Set()
  const seenQueries = new Set()

  function addTable(id, sourceName) {
    const key = toMigrationId(id)
    if (!key || !/^\d+$/.test(key)) return
    const known = tableById.get(key)
    uniquePush(result.tables, seenTables, {
      id: key,
      name: known ? (known.name || known.val || known.value || key) : key,
      source: sourceName
    })
  }

  function addQuery(id, sourceName) {
    const key = toMigrationId(id)
    if (!key || !/^\d+$/.test(key)) return
    const known = queryById.get(key)
    uniquePush(result.queries, seenQueries, {
      id: key,
      name: known ? (known.name || known.val || known.value || key) : key,
      source: sourceName
    })
  }

  const tableRegex = /(?:^|[/"'`\s])(?:object|metadata|table|cards)\/(\d+)(?=[/?#&"'`\s]|$)/gi
  let match
  while ((match = tableRegex.exec(source)) !== null) {
    const marker = match[0].toLowerCase()
    const sourceName = marker.includes('metadata')
      ? 'metadata'
      : marker.includes('table')
        ? 'table'
        : marker.includes('cards')
          ? 'cards'
          : 'object'
    addTable(match[1], sourceName)
  }

  const queryRegex = /(?:^|[/"'`\s])(?:report|query|smartq|sql)\/([^?#"'`<>\s]+)/gi
  while ((match = queryRegex.exec(source)) !== null) {
    const raw = decodeMigrationSegment(match[1]).replace(/^\/+|\/+$/g, '')
    if (!raw || raw.includes('{') || raw.includes(':')) continue
    const marker = match[0].toLowerCase()
    const sourceName = marker.includes('report')
      ? 'report'
      : marker.includes('query')
        ? 'query'
        : marker.includes('smartq')
          ? 'smartq'
          : 'sql'
    if (/^\d+$/.test(raw)) {
      addQuery(raw, sourceName)
    } else {
      const known = queryByName.get(normalizeMigrationSearch(raw))
      if (known) {
        uniquePush(result.queries, seenQueries, {
          id: known.id,
          name: known.name || known.val || known.value || raw,
          source: `${sourceName}-name`
        })
      }
    }
  }

  return result
}

export function parseMigrationFilterParams(filter = '') {
  const params = {}
  const query = String(filter || '').replace(/^[?&]+/, '')
  if (!query) return params

  for (const [key, value] of new URLSearchParams(query)) {
    if (key) params[key] = value
  }
  return params
}

export function parseMigrationPackage(value) {
  const packageData = typeof value === 'string' ? JSON.parse(value) : value
  if (!packageData || typeof packageData !== 'object') {
    throw new Error('Пакет миграции должен быть JSON-объектом')
  }

  const config = normalizeMigrationConfig(packageData.config || packageData)
  return {
    ...packageData,
    config
  }
}

export function buildMigrationDryRunResult(packageData, catalog = {}) {
  const parsed = parseMigrationPackage(packageData)
  const config = parsed.config
  const packagedTables = Array.isArray(parsed.tables) ? parsed.tables : config.tables
  const packagedQueries = Array.isArray(parsed.queries) ? parsed.queries : config.queries
  const packagedFiles = Array.isArray(parsed.files) ? parsed.files : config.files
  const warnings = []

  if (!parsed.kind) warnings.push('В пакете не указан kind')
  if (!config.tables.length && !config.queries.length && !config.files.length) {
    warnings.push('Пакет не содержит таблиц, запросов или файлов')
  }

  const targetTables = mapById(catalog.tables || [])
  const targetQueries = mapById(catalog.queries || [])
  const existingTables = config.tables.filter(item => targetTables.has(item.id)).length
  const existingQueries = config.queries.filter(item => targetQueries.has(item.id)).length

  return {
    valid: warnings.length === 0,
    name: config.name || parsed.name || 'migration',
    counts: {
      tables: config.tables.length,
      queries: config.queries.length,
      files: config.files.length,
      packagedTables: packagedTables.length,
      packagedQueries: packagedQueries.length,
      packagedFiles: packagedFiles.length,
      existingTables,
      existingQueries
    },
    warnings
  }
}
