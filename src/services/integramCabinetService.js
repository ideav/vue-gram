import integramApiClient, { normalizeMutationResponse } from './integramApiClient'

export const CABINET_DATABASE = 'my'
export const USERNAME_REGEX = /^[a-zA-Z]([a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,32}$/

function asRows(data) {
  if (Array.isArray(data)) return data

  if (data?.columns && data?.data) {
    const columns = data.columns.map(column => column.name || column.val || column.id)
    const rowCount = data.data.reduce((max, columnValues) => (
      Array.isArray(columnValues) ? Math.max(max, columnValues.length) : max
    ), 0)

    return Array.from({ length: rowCount }, (_, rowIndex) => {
      return Object.fromEntries(columns.map((columnName, columnIndex) => {
        const columnValues = Array.isArray(data.data[columnIndex]) ? data.data[columnIndex] : []
        return [columnName, columnValues[rowIndex] ?? '']
      }))
    })
  }

  if (data && typeof data === 'object') return [data]
  return []
}

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function toBoolean(value) {
  if (value === true) return true
  if (value === false || value === null || value === undefined || value === '') return false
  const normalized = String(value).toLowerCase()
  return normalized !== '0' && normalized !== 'false' && normalized !== 'no'
}

function normalizeDatabase(row = {}) {
  const id = String(row.DBID ?? row.id ?? row.ID ?? '')

  return {
    id,
    name: row.DB ?? row.db ?? '',
    template: row.Template ?? '',
    description: row.Description ?? '',
    count: toNumber(row.Count),
    createdAt: row.Date ?? row.RegDate ?? '',
    planDate: row['Plan date'] ?? row.PlanDate ?? '',
    publicName: row.PublicName ?? '',
    registrationOpen: toBoolean(row.Register),
    tokenLifetime: row.TTL ?? '',
    raw: row
  }
}

function normalizeProfile(row = {}) {
  return {
    userObjectId: String(row.User ?? row.UserID ?? row.user ?? row.id ?? ''),
    id: String(row.UserID ?? row.DBID ?? row.id ?? ''),
    name: row.Name ?? '',
    phone: row.Phone ?? '',
    email: row.Email ?? '',
    notes: row.Notes ?? '',
    photo: row.Photo ?? row.Picture ?? '',
    username: row.UserName ?? '',
    isPublic: toBoolean(row.IsPublic),
    plan: row.Plan ?? 'Free',
    planId: toNumber(row.PlanID, 1146),
    planLimit: toNumber(row.PlanLimit, 3000),
    planDate: row['Plan date'] ?? '',
    balance: toNumber(row.Balance),
    bonus: toNumber(row.Bonus),
    referrals: row.Referrals ?? '',
    raw: row
  }
}

function buildPermissions(profile, databases) {
  const freePlanAtDatabaseLimit = profile.planId < 1147 && databases.length >= 3

  return {
    canCreateDatabase: !freePlanAtDatabaseLimit,
    canRestoreAdmin: true,
    createDisabledReason: freePlanAtDatabaseLimit ? 'free-plan-database-limit' : null
  }
}

export function isValidCabinetUsername(value) {
  return USERNAME_REGEX.test(String(value || '').trim())
}

export function normalizeCabinetSnapshotResponse(data = {}) {
  const rows = asRows(data)
  const profileRow = rows[0] || {}
  const profile = normalizeProfile(profileRow)
  const databases = rows
    .filter(row => row.DB || row.DBID)
    .map(normalizeDatabase)
    .filter(database => database.id || database.name)
  const totalUsage = databases.reduce((sum, database) => sum + database.count, 0)
  const usagePercent = profile.planLimit > 0 ? (totalUsage / profile.planLimit) * 100 : 0

  return {
    profile,
    databases,
    summary: {
      totalUsage,
      usagePercent,
      planLimit: profile.planLimit
    },
    permissions: buildPermissions(profile, databases),
    rawRows: rows
  }
}

export function normalizeCabinetRowsResponse(data = {}) {
  return asRows(data)
}

export function buildCabinetProfileFormData(profile = {}) {
  const formData = new FormData()
  formData.append('t33', profile.name ?? '')
  formData.append('t30', profile.phone ?? '')
  formData.append('t39', profile.notes ?? '')
  formData.append('t307', profile.isPublic ? '1' : '')

  if (profile.photo) {
    formData.append('t38', profile.photo)
  }

  return formData
}

export function buildDatabaseSettingsPayload(settings = {}) {
  return {
    t276: settings.description ?? '',
    t305: settings.publicName ?? '',
    t367: settings.registrationOpen ? '1' : '',
    t369: settings.tokenLifetime ?? ''
  }
}

async function withCabinetDatabase(callback) {
  const previousDatabase = integramApiClient.database
  integramApiClient.setDatabase(CABINET_DATABASE)

  try {
    return await callback()
  } finally {
    if (previousDatabase) integramApiClient.setDatabase(previousDatabase)
  }
}

function getJsonValue(data, columnName, rowIndex = 0) {
  if (!data?.columns || !data?.data) return ''
  const columnIndex = data.columns.findIndex(column => (column.name || column.val || column.id) === columnName)
  if (columnIndex === -1) return ''
  const values = data.data[columnIndex]
  return Array.isArray(values) ? values[rowIndex] ?? '' : ''
}

export async function getCabinetSnapshot() {
  return withCabinetDatabase(() => (
    integramApiClient.get('report/313', {}, {
      jsonMode: 'JSON_KV',
      normalize: normalizeCabinetSnapshotResponse
    })
  ))
}

export async function getBalanceHistory() {
  return withCabinetDatabase(() => (
    integramApiClient.get('report/1095', {}, {
      jsonMode: 'JSON_KV',
      normalize: normalizeCabinetRowsResponse
    })
  ))
}

export async function getCommunityInvites() {
  return withCabinetDatabase(() => (
    integramApiClient.get('report/380', {}, {
      jsonMode: 'JSON_KV',
      normalize: normalizeCabinetRowsResponse
    })
  ))
}

export async function saveCabinetProfile(userObjectId, profile) {
  if (!userObjectId) throw new Error('Не найден идентификатор профиля')

  return withCabinetDatabase(() => (
    integramApiClient.postForm(`_m_save/${encodeURIComponent(String(userObjectId))}`, buildCabinetProfileFormData(profile), {
      jsonMode: 'JSON',
      normalize: normalizeMutationResponse
    })
  ))
}

export async function saveUsername(name) {
  const normalizedName = String(name || '').trim()
  if (!isValidCabinetUsername(normalizedName)) {
    throw new Error('Неверный формат аккаунта')
  }

  return withCabinetDatabase(() => (
    integramApiClient.post('report/236592', {
      name: normalizedName,
      confirmed: '1'
    }, {
      jsonMode: 'JSON_KV'
    })
  ))
}

export async function saveDatabaseSettings(databaseObjectId, settings) {
  if (!databaseObjectId) throw new Error('Не найден идентификатор базы данных')

  return withCabinetDatabase(() => (
    integramApiClient.setObjectRequisites(databaseObjectId, buildDatabaseSettingsPayload(settings))
  ))
}

export async function createDatabase({ name, template = 'RU' } = {}) {
  const dbName = String(name || '').trim()
  if (!/^[a-zA-Z][a-zA-Z0-9]{2,14}$/.test(dbName)) {
    throw new Error('От 3 до 15 латинских символов и цифр, начиная с буквы')
  }

  return withCabinetDatabase(async () => {
    const checkData = await integramApiClient.post('report/292', {}, {
      jsonMode: 'JSON',
      params: {
        FR_DB: dbName
      }
    })
    const existingDatabase = getJsonValue(checkData, 'DB', 0)

    if (existingDatabase !== '0' && existingDatabase !== 0 && existingDatabase !== '') {
      throw new Error('Это имя занято, придумайте другое')
    }

    return integramApiClient.post('_new_db/', {}, {
      jsonMode: 'JSON',
      params: {
        db: dbName,
        template
      },
      normalize: normalizeMutationResponse
    })
  })
}

export async function restoreDatabaseAdmin(databaseName) {
  const previousDatabase = integramApiClient.database
  integramApiClient.setDatabase(databaseName)

  try {
    return await integramApiClient.post('restore_admin', {}, { jsonMode: null })
  } finally {
    if (previousDatabase) integramApiClient.setDatabase(previousDatabase)
  }
}

export default {
  getCabinetSnapshot,
  getBalanceHistory,
  getCommunityInvites,
  saveCabinetProfile,
  saveUsername,
  saveDatabaseSettings,
  createDatabase,
  restoreDatabaseAdmin
}
