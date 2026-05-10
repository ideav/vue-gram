/**
 * Direct Integram API Client
 *
 * Communicates directly with the Integram API.
 * API Structure:
 * - Base URL: {server}/{database}/{endpoint}?JSON_KV
 * - Authentication: POST /{database}/auth with login/pwd
 * - All requests need X-Authorization or 'my' header
 * - All POST requests need _xsrf parameter
 */

import axios from 'axios'
import {
  buildDirAdminParams,
  normalizeAddPath,
  normalizeDirAdminFolder
} from '@/utils/integramDirAdmin'

const LEGACY_AUTH_STORAGE_KEYS = [
  'token',
  '_xsrf',
  'user',
  'id',
  'db',
  'session_timestamp',
  'my_token',
  'my_xsrf',
  'my_user',
  'my_id'
]

function firstPayload(data) {
  if (Array.isArray(data)) return data[0] || {}
  return data || {}
}

function getApiMessage(data) {
  const payload = firstPayload(data)
  return payload.error || payload.message || payload.msg || payload.warning || payload.hint || ''
}

function getCookie(name) {
  if (typeof document === 'undefined') return null
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name, value, maxAge = 2592000) {
  if (typeof document === 'undefined' || !value) return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`
}

function deleteCookie(name) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
}

function getIdbCookieDatabases() {
  if (typeof document === 'undefined') return []
  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0])
    .filter((name) => name.startsWith('idb_'))
    .map((name) => name.slice(4))
    .filter(Boolean)
}

export function formatRequisiteValue(value) {
  if (value === null || value === undefined || value === '') return value

  if (typeof value === 'boolean') {
    return value ? 'X' : ''
  }

  if (Array.isArray(value)) {
    return value.join(',')
  }

  const isDateObject = value instanceof Date ||
    (value && typeof value.getFullYear === 'function' && typeof value.getMonth === 'function')

  if (isDateObject) {
    if (isNaN(value.getTime())) return value
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    const hours = String(value.getHours()).padStart(2, '0')
    const minutes = String(value.getMinutes()).padStart(2, '0')
    const seconds = String(value.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  const strValue = String(value)
  const isoDateRegex = /^(\d{4})[-\/.](\d{2})[-\/.](\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  const match = strValue.match(isoDateRegex)
  if (match) {
    const [, year, month, day, hours, minutes, seconds] = match
    return `${year}-${month}-${day} ${hours || '00'}:${minutes || '00'}:${seconds || '00'}`
  }

  const ruDateRegex = /^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
  const ruMatch = strValue.match(ruDateRegex)
  if (ruMatch) {
    const [, day, month, year, hours, minutes, seconds] = ruMatch
    return `${year}-${month}-${day} ${hours || '00'}:${minutes || '00'}:${seconds || '00'}`
  }

  return value
}

export class IntegramApiError extends Error {
  constructor({
    message,
    code = 'INTEGRAM_API_ERROR',
    status = null,
    type = 'unknown',
    details = null,
    retryable = false,
    canRetry = false,
    raw = null
  }) {
    super(message)
    this.name = 'IntegramApiError'
    this.code = code
    this.status = status
    this.type = type
    this.details = details
    this.retryable = retryable
    this.canRetry = canRetry
    this.raw = raw
  }
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function toOptionalNumber(value) {
  if (value === null || value === undefined || value === '') return value
  const numberValue = Number(value)
  return Number.isNaN(numberValue) ? value : numberValue
}

function normalizeType(type) {
  return {
    ...type,
    id: toOptionalNumber(type.id),
    name: type.name ?? type.val ?? ''
  }
}

function normalizeRequisite(requisite) {
  return {
    ...requisite,
    id: toOptionalNumber(requisite.id),
    typeId: toOptionalNumber(requisite.typeId ?? requisite.typ),
    name: requisite.name ?? requisite.val ?? ''
  }
}

export function normalizeMetadataResponse(data = {}) {
  const types = toArray(data.types).map(normalizeType)
  const requisites = toArray(data.reqs ?? data.requisites).map(normalizeRequisite)

  return {
    ...data,
    types,
    reqs: requisites,
    requisites,
    typeById: Object.fromEntries(types.map(type => [type.id, type])),
    requisiteById: Object.fromEntries(requisites.map(requisite => [requisite.id, requisite]))
  }
}

export function normalizeTermsResponse(data = {}) {
  const isArrayPayload = Array.isArray(data)
  const hasWrappedTerms = !isArrayPayload && Object.prototype.hasOwnProperty.call(data, 'terms')
  const hasTermById = !isArrayPayload && Object.prototype.hasOwnProperty.call(data, 'termById')
  const hasBaseTypes = !isArrayPayload && (
    Object.prototype.hasOwnProperty.call(data, 'base_types') ||
    Object.prototype.hasOwnProperty.call(data, 'baseTypes')
  )
  const isDictionaryPayload = !isArrayPayload && !hasWrappedTerms && !hasTermById && !hasBaseTypes
  const rawTerms = isArrayPayload
    ? data
    : hasWrappedTerms
      ? data.terms ?? {}
      : hasTermById
        ? data.termById ?? {}
        : isDictionaryPayload
          ? data
          : {}
  const payload = isArrayPayload || isDictionaryPayload ? { terms: rawTerms } : data
  const termById = Array.isArray(rawTerms)
    ? Object.fromEntries(rawTerms.map(term => [String(term.id), term.val ?? term.name ?? '']))
    : { ...rawTerms }
  const baseTypes = toArray(payload.base_types ?? payload.baseTypes).map(type => ({
    id: toOptionalNumber(type.id),
    name: type.name ?? type.val ?? ''
  }))

  return {
    ...payload,
    termById,
    baseTypes
  }
}

export function normalizeObjectListResponse(data = {}) {
  const objects = toArray(data.object ?? data.objects)
  const objectRequisites = data.reqs ?? data.objectRequisites ?? data['&object_reqs'] ?? {}

  return {
    ...data,
    object: objects,
    objects,
    reqs: objectRequisites,
    objectRequisites,
    reqOrder: data.req_order ?? data.reqOrder ?? [],
    reqTypes: data.req_type ?? data.reqTypes ?? {},
    reqBases: data.req_base ?? data.reqBases ?? {}
  }
}

export function normalizeObjectRecordResponse(data = {}) {
  const obj = data.obj ?? (Array.isArray(data.object) ? data.object[0] : data.object) ?? null
  const objectId = obj?.id
  const legacyRequisites = objectId ? data['&object_reqs']?.[objectId] : null
  const requisites = data.reqs ?? data.requisites ?? legacyRequisites ?? {}

  return {
    ...data,
    obj,
    reqs: requisites,
    requisites,
    reqOrder: data.req_order ?? data.reqOrder ?? [],
    reqTypes: data.req_type ?? data.reqTypes ?? {},
    reqBases: data.req_base ?? data.reqBases ?? {}
  }
}

function normalizeReportColumn(column, index) {
  if (typeof column === 'string') {
    return { id: null, name: column, type: null, format: null, index }
  }

  return {
    ...column,
    id: column?.id ?? null,
    name: column?.name ?? column?.val ?? String(column?.id ?? index),
    type: column?.type ?? null,
    format: column?.format ?? null,
    index
  }
}

function buildRowsFromColumnMatrix(columns, matrix) {
  const rowCount = matrix.reduce((max, columnValues) => {
    return Array.isArray(columnValues) ? Math.max(max, columnValues.length) : max
  }, 0)

  return Array.from({ length: rowCount }, (_, rowIndex) => {
    return Object.fromEntries(columns.map((column, columnIndex) => {
      const columnValues = Array.isArray(matrix[columnIndex]) ? matrix[columnIndex] : []
      return [column.name, columnValues[rowIndex] ?? null]
    }))
  })
}

function buildRowsFromRowMatrix(columns, matrix) {
  return matrix.map(row => {
    if (row && typeof row === 'object' && !Array.isArray(row)) return row
    const values = Array.isArray(row) ? row : [row]
    return Object.fromEntries(columns.map((column, columnIndex) => {
      return [column.name, values[columnIndex] ?? null]
    }))
  })
}

function isColumnMatrix(columns, matrix) {
  if (columns.length === 0 || matrix.length !== columns.length) return false
  if (!matrix.every(Array.isArray)) return false
  return matrix.some(columnValues => columnValues.length !== columns.length)
}

export function normalizeReportResponse(data = {}) {
  if (Array.isArray(data)) {
    const columns = Object.keys(data[0] ?? {}).map((name, index) => normalizeReportColumn(name, index))
    return {
      columns,
      data,
      rows: data,
      raw: data
    }
  }

  const reportKey = Object.keys(data).find(key => key.startsWith('&rep.'))
  const reportData = reportKey ? data[reportKey] : data
  const columns = toArray(reportData.columns ?? reportData.col).map(normalizeReportColumn)
  const matrix = toArray(reportData.rows ?? reportData.data)

  return {
    ...data,
    columns,
    data: matrix,
    rows: isColumnMatrix(columns, matrix)
      ? buildRowsFromColumnMatrix(columns, matrix)
      : buildRowsFromRowMatrix(columns, matrix)
  }
}

export function normalizeReferenceOptionsResponse(data = {}) {
  if (Array.isArray(data.id) && Array.isArray(data.val)) {
    return Object.fromEntries(data.id.map((id, index) => [id, data.val[index] ?? '']))
  }

  if (data && typeof data === 'object') {
    return Object.fromEntries(Object.entries(data)
      .filter(([key]) => !['more', 'selected', 'r'].includes(key))
      .map(([id, value]) => [id, typeof value === 'object' && value !== null ? value.val ?? value.name ?? '' : value]))
  }

  return {}
}

export function normalizeMutationResponse(data = {}) {
  return {
    ...data,
    ok: data.ok ?? data.success ?? true,
    objectId: toOptionalNumber(data.id ?? data.objectId)
  }
}

function hasBackendError(data) {
  if (!data || typeof data !== 'object') return false
  if (data.failed) return true
  if (data.error && data.error !== false) return true
  if (Array.isArray(data.errors) && data.errors.length > 0) return true
  return false
}

function getBackendErrorPayload(data) {
  if (!data || typeof data !== 'object') return {}
  if (data.error && typeof data.error === 'object') return data.error
  return data
}

function getErrorType(status, error) {
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) return 'network'
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') return 'network'
  if (status === 401 || status === 403) return 'auth'
  if (status === 409) return 'conflict'
  if (status === 422 || status === 400) return 'validation'
  if (status === 404) return 'not_found'
  if (status === 200 && (error?.response?.data?.failed || error?.response?.data?.error)) return 'business'
  if (status >= 500) return 'server'
  if (status >= 400) return 'client'
  return 'unknown'
}

function getDefaultErrorMessage(status, error) {
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'Превышено время ожидания ответа от сервера.'
  }
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return 'Ошибка сети. Проверьте подключение к интернету.'
  }
  if (status === 401) return 'Сессия истекла. Обновите страницу или войдите заново.'
  if (status === 403) return 'Доступ запрещен.'
  if (status === 404) return 'Ресурс не найден.'
  if (status >= 500) return 'Ошибка сервера.'
  return error?.message || 'Ошибка запроса к API Интеграма.'
}

export function normalizeApiError(error) {
  if (error instanceof IntegramApiError) return error

  const status = error?.response?.status ?? error?.status ?? null
  const data = error?.response?.data
  const payload = getBackendErrorPayload(data)
  const payloadError = typeof payload.error === 'string' ? payload.error : null
  const payloadFailed = typeof payload.failed === 'string' ? payload.failed : null
  const message = payload.message ?? payloadFailed ?? payloadError ?? data?.message ?? getApiMessage(data) ?? getDefaultErrorMessage(status, error)
  const code = payload.code ?? data?.code ?? error?.code ?? (status ? `HTTP_${status}` : 'INTEGRAM_API_ERROR')
  const retryableStatuses = [408, 429, 500, 502, 503, 504]

  return new IntegramApiError({
    message,
    code,
    status,
    type: getErrorType(status, error),
    details: payload.details ?? data?.details ?? null,
    retryable: retryableStatuses.includes(status) || ['ECONNABORTED', 'ERR_NETWORK'].includes(error?.code),
    canRetry: Boolean(error?.canRetry),
    raw: data ?? error
  })
}

export function normalizeApiResponse(data) {
  if (hasBackendError(data)) {
    throw normalizeApiError({
      response: {
        status: 200,
        data
      }
    })
  }
  return data
}

function normalizeRequisiteKey(reqId) {
  const key = String(reqId)
  return /^(t|b)\d+$/.test(key) ? key : `t${key}`
}

export function buildRequisitePayload(requisites = {}) {
  if (!requisites || typeof requisites !== 'object') return {}

  const data = {}

  for (const [reqId, reqValue] of Object.entries(requisites)) {
    const key = normalizeRequisiteKey(reqId)
    const formatted = formatRequisiteValue(reqValue)
    data[key] = formatted !== null && formatted !== undefined ? formatted : ''

    if (typeof reqValue === 'boolean' && /^t\d+$/.test(key)) {
      data[`b${key.slice(1)}`] = '1'
    }
  }

  return data
}

export class IntegramApiClient {
  constructor() {
    const savedServer = localStorage.getItem('integram_server')
    let initialURL = savedServer || import.meta.env.VITE_INTEGRAM_URL || 'https://app.integram.io'
    initialURL = initialURL.replace(/\/$/, '')

    const dbMatch = initialURL.match(/^(https?:\/\/[^/]+)\/([a-zA-Z0-9_]+)$/)
    if (dbMatch) {
      initialURL = dbMatch[1]
      localStorage.setItem('integram_server', initialURL)
    }

    this.baseURL = initialURL

    // Multi-database support
    this.databases = {}
    this.currentDatabase = null

    // Legacy properties
    this.database = null
    this.token = null
    this.xsrfToken = null
    this.userId = null
    this.userRole = null
    this.userName = null
    this.authDatabase = null

    this.loadSession()
  }

  setServer(serverURL) {
    let cleanURL = serverURL.replace(/\/$/, '')
    const dbMatch = cleanURL.match(/^(https?:\/\/[^/]+)\/([a-zA-Z0-9_]+)$/)
    if (dbMatch) cleanURL = dbMatch[1]
    this.baseURL = cleanURL
    localStorage.setItem('integram_server', this.baseURL)
  }

  getServer() {
    return this.baseURL
  }

  setCredentials(database, token, xsrf = null, authDatabase = null, session = {}) {
    this.database = database
    this.token = token
    this.xsrfToken = xsrf || token
    this.currentDatabase = database
    this.authDatabase = authDatabase || database
    this.userId = session.userId ?? this.userId
    this.userName = session.userName ?? this.userName
    this.userRole = session.userRole ?? this.userRole

    if (database && token) {
      const existing = this.databases[database] || {}
      this.databases[database] = {
        ...existing,
        token,
        xsrfToken: this.xsrfToken,
        userId: this.userId,
        userName: this.userName,
        userRole: this.userRole,
        ownedDatabases: existing.ownedDatabases || []
      }
    }
  }

  saveSession() {
    this.saveLegacyAuthState()

    if (Object.keys(this.databases).length > 0) {
      const sessionData = {
        version: 2,
        server: this.baseURL,
        currentDatabase: this.currentDatabase,
        databases: this.databases
      }
      localStorage.setItem('integram_session', JSON.stringify(sessionData))
      return
    }

    if (this.token && this.xsrfToken && this.database) {
      const sessionData = {
        database: this.database,
        token: this.token,
        xsrfToken: this.xsrfToken,
        userId: this.userId,
        userName: this.userName,
        userRole: this.userRole,
        authServer: this.baseURL,
        authDatabase: this.authDatabase
      }
      localStorage.setItem('integram_session', JSON.stringify(sessionData))
    } else {
      localStorage.removeItem('integram_session')
    }
  }

  saveLegacyAuthState() {
    if (!this.token || !this.xsrfToken || !this.database) return

    localStorage.setItem('token', this.token)
    localStorage.setItem('_xsrf', this.xsrfToken)
    localStorage.setItem('db', this.database)
    localStorage.setItem('session_timestamp', Date.now().toString())
    if (this.userName) localStorage.setItem('user', this.userName)
    if (this.userId) localStorage.setItem('id', this.userId)

    if (this.shouldWriteSameOriginCookies()) {
      setCookie(`idb_${this.database}`, this.token)
      setCookie(this.database, this.token)
    }
  }

  applySession(database, session = {}, authDatabase = null) {
    const token = session.token || session.authToken || this.token
    const xsrfToken = session.xsrfToken || session._xsrf || session.xsrf || this.xsrfToken
    if (!database || !token) return false

    this.database = database
    this.currentDatabase = database
    this.token = token
    this.xsrfToken = xsrfToken || null
    this.userId = session.userId || session.id || this.userId
    this.userName = session.userName || session.user || this.userName
    this.userRole = session.userRole || session.role || this.userRole
    this.authDatabase = authDatabase || session.authDatabase || database

    const existing = this.databases[database] || {}
    this.databases[database] = {
      ...existing,
      token: this.token,
      xsrfToken: this.xsrfToken,
      userId: this.userId,
      userName: this.userName,
      userRole: this.userRole,
      ownedDatabases: session.ownedDatabases || existing.ownedDatabases || []
    }

    return true
  }

  loadSession() {
    try {
      const stored = localStorage.getItem('integram_session')
      if (stored) {
        const sessionData = JSON.parse(stored)

        if (sessionData.version === 2 && sessionData.databases) {
          this.baseURL = sessionData.server
          this.databases = sessionData.databases
          this.currentDatabase = sessionData.currentDatabase

          if (this.currentDatabase && this.databases[this.currentDatabase]) {
            this.applySession(this.currentDatabase, this.databases[this.currentDatabase])
          }

          localStorage.setItem('integram_server', this.baseURL)
          return
        }

        // Legacy format
        this.applySession(sessionData.database, sessionData, sessionData.authDatabase || sessionData.database)
        if (this.database && this.token) this.saveSession()

        if (sessionData.authServer) {
          this.baseURL = sessionData.authServer
          localStorage.setItem('integram_server', sessionData.authServer)
        }
        return
      }

      this.loadSessionFromLegacySources()
    } catch (error) {
      console.error('Failed to load session from localStorage:', error)
      localStorage.removeItem('integram_session')
    }
  }

  loadSessionFromLegacySources(databaseHint = null) {
    try {
      if (this.loadSessionFromWindowGlobals(databaseHint)) return true

      const myToken = localStorage.getItem('my_token')
      const myXsrf = localStorage.getItem('my_xsrf')
      const myUser = localStorage.getItem('my_user')
      const myUserId = localStorage.getItem('my_id')

      if (myToken && myXsrf) {
        return this.applySession('my', {
          token: myToken,
          xsrfToken: myXsrf,
          userId: myUserId,
          userName: myUser
        }, 'my')
      }

      const legacyToken = localStorage.getItem('token')
      const legacyXsrf = localStorage.getItem('_xsrf')
      const legacyUser = localStorage.getItem('user')
      const legacyUserId = localStorage.getItem('id')
      const currentDb = databaseHint || localStorage.getItem('db') || localStorage.getItem('last_db') || 'my'

      if (legacyToken && legacyXsrf && currentDb) {
        return this.applySession(currentDb, {
          token: legacyToken,
          xsrfToken: legacyXsrf,
          userId: legacyUserId,
          userName: legacyUser
        }, currentDb)
      }

      return false
    } catch (error) {
      return false
    }
  }

  loadSessionFromMyToken(databaseHint = null) {
    return this.loadSessionFromLegacySources(databaseHint)
  }

  loadSessionFromWindowGlobals(databaseHint = null) {
    if (typeof window === 'undefined') return false
    const database = databaseHint || window.db
    const token = window.token
    const xsrfToken = window.xsrf

    if (!database || !token || !xsrfToken) return false

    return this.applySession(database, {
      token,
      xsrfToken,
      userId: window.uid || window.id,
      userName: window.user,
      userRole: window.role
    }, database)
  }

  setDatabase(database) {
    this.database = database
  }

  getDatabase() {
    return this.database
  }

  isAuthenticated() {
    return !!this.token && !!this.xsrfToken
  }

  async validateSession() {
    if (!this.token || !this.database) return false
    try {
      const url = this.buildURL('xsrf')
      const response = await axios.get(url, {
        params: { JSON: '' },
        headers: this.getAuthHeaders(this.database),
        timeout: 30000,
        withCredentials: this.shouldUseCredentials(url)
      })
      const data = firstPayload(response.data)

      if (!data._xsrf && !data.xsrf) {
        throw new Error(getApiMessage(data) || 'Сервер не вернул XSRF токен')
      }

      this.applySession(this.database, {
        token: data.token || this.token,
        xsrfToken: data._xsrf || data.xsrf,
        userId: data.id,
        userName: data.user,
        userRole: data.role
      }, this.authDatabase || this.database)
      this.saveSession()
      return true
    } catch (error) {
      return false
    }
  }

  tryRestoreSession(databaseHint = null) {
    if (databaseHint && this.databases[databaseHint]) {
      return this.applySession(databaseHint, this.databases[databaseHint])
    }
    if (this.isAuthenticated() && (!databaseHint || this.database === databaseHint || this.authDatabase === 'my')) {
      if (databaseHint && this.database !== databaseHint && this.authDatabase === 'my') this.database = databaseHint
      return true
    }

    const stored = localStorage.getItem('integram_session')
    if (stored) {
      try {
        const sessionData = JSON.parse(stored)

        if (sessionData.version === 2 && sessionData.databases) {
          this.databases = sessionData.databases
          this.currentDatabase = databaseHint || sessionData.currentDatabase
          if (this.currentDatabase && this.databases[this.currentDatabase]) {
            this.applySession(this.currentDatabase, this.databases[this.currentDatabase])
          }
          if (sessionData.server) this.baseURL = sessionData.server
          return this.isAuthenticated()
        }

        if (sessionData.token && sessionData.xsrfToken) {
          this.applySession(databaseHint || sessionData.database, sessionData, sessionData.authDatabase || sessionData.database)
          if (sessionData.authServer) this.baseURL = sessionData.authServer
          return true
        }
      } catch (e) {
        // ignore
      }
    }

    return this.loadSessionFromLegacySources(databaseHint)
  }

  async restoreSession(databaseHint = null, options = {}) {
    const { validate = true } = options
    this.tryRestoreSession(databaseHint)

    const database = databaseHint || this.database || localStorage.getItem('db') || localStorage.getItem('last_db') || 'my'
    if (!this.token && database) {
      const cookieToken = getCookie(`idb_${database}`)
      if (cookieToken) {
        this.applySession(database, { token: cookieToken, xsrfToken: null }, database)
      }
    }

    if (!this.token) return false
    if (!this.database && database) this.database = database
    if (!validate) return this.isAuthenticated()

    const restored = await this.validateSession()
    if (!restored) this.clearDatabaseSession(database)
    return restored
  }

  getAuthInfo() {
    return {
      token: this.token,
      xsrf: this.xsrfToken,
      userId: this.userId,
      userName: this.userName,
      userRole: this.userRole,
      database: this.database,
      grants: this.databases?.[this.database]?.grants || null
    }
  }

  buildURL(endpoint) {
    if (!this.database) {
      throw new Error('Database not set. Call setDatabase() first.')
    }

    let cleanBaseURL = this.baseURL.replace(/\/$/, '')
    const isIPAddress = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(cleanBaseURL)
    const isLegacyHost = cleanBaseURL.includes('dronedoc.ru') ||
      cleanBaseURL.includes('sakhwings.ru') ||
      isIPAddress ||
      this.isSameOriginBase(cleanBaseURL)

    if (isLegacyHost) {
      const dbPathRegex = new RegExp(`/${this.database}$`)
      if (dbPathRegex.test(cleanBaseURL)) return `${cleanBaseURL}/${endpoint}`
      if (endpoint.startsWith(`${this.database}/`)) return `${cleanBaseURL}/${endpoint}`
      return `${cleanBaseURL}/${this.database}/${endpoint}`
    }

    return `${cleanBaseURL}/api/${this.database}/${endpoint}`
  }

  async authenticate(database, login, password) {
    try {
      this.database = database
      const url = this.buildURL('auth')

      const formData = new URLSearchParams()
      formData.append('db', database)
      formData.append('login', login)
      formData.append('pwd', password)

      const response = await axios.post(url, formData, {
        params: { JSON: '' },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        withCredentials: this.shouldUseCredentials(url)
      })

      const data = firstPayload(response.data)

      if (data.error || data.failed) {
        throw new Error(getApiMessage(data) || 'Неверный логин или пароль')
      }

      const receivedToken = data.token
      if (!receivedToken) {
        throw new Error(getApiMessage(data) || 'Сервер не вернул токен авторизации')
      }

      if (receivedToken === password) {
        throw new Error('Ошибка сервера: получен некорректный токен авторизации')
      }

      // Save to multi-database structure
      this.databases[database] = {
        token: receivedToken,
        xsrfToken: data._xsrf || data.xsrf,
        userId: data.id,
        userName: data.user || login,
        userRole: data.role || 'user',
        ownedDatabases: []
      }

      this.currentDatabase = database
      this.token = receivedToken
      this.xsrfToken = data._xsrf || data.xsrf
      this.userId = data.id
      this.userName = data.user || login
      this.userRole = data.role || 'user'
      this.database = database
      this.authDatabase = database

      // Load owned databases if 'my'
      if (database === 'my' && this.userId) {
        try {
          const ownedDatabases = await this.getOwnedDatabases(this.userId)
          this.databases[database].ownedDatabases = ownedDatabases
        } catch (error) {
          this.databases[database].ownedDatabases = []
        }
      }

      this.saveSession()

      return {
        success: true,
        database,
        token: receivedToken,
        xsrf: data._xsrf || data.xsrf,
        userId: this.userId,
        userName: this.userName,
        userRole: this.userRole,
        ownedDatabases: this.databases[database].ownedDatabases
      }
    } catch (error) {
      throw new Error(getApiMessage(error.response?.data) || error.message || 'Ошибка авторизации')
    }
  }

  async getOwnedDatabases(userId) {
    try {
      const originalDatabase = this.database
      this.database = 'my'
      const response = await this.get('object/271/', { F_U: userId })
      this.database = originalDatabase

      const databases = []
      if (response && response.object && Array.isArray(response.object)) {
        for (const obj of response.object) {
          if (obj.val && typeof obj.val === 'string') {
            const dbMatch = obj.val.match(/^[a-zA-Z0-9_]{2,20}$/)
            if (dbMatch) databases.push(obj.val)
          }
        }
      }
      return [...new Set(databases)].sort()
    } catch (error) {
      return []
    }
  }

  async switchDatabase(database) {
    if (!this.databases[database]) {
      if (this.databases['my']?.ownedDatabases?.includes(database)) {
        // Owned but not authenticated - use 'my' token
      } else {
        throw new Error(`No session for database: ${database}. Please authenticate first.`)
      }
    }

    this.currentDatabase = database

    if (this.databases[database]) {
      const dbSession = this.databases[database]
      this.database = database
      this.token = dbSession.token
      this.xsrfToken = dbSession.xsrfToken
      this.userId = dbSession.userId
      this.userName = dbSession.userName
      this.userRole = dbSession.userRole
      this.authDatabase = database
    } else {
      const mySession = this.databases['my']
      this.database = database
      this.token = mySession.token
      this.xsrfToken = mySession.xsrfToken
      this.userId = mySession.userId
      this.userName = mySession.userName
      this.userRole = mySession.userRole
      this.authDatabase = 'my'
    }

    this.saveSession()
    return true
  }

  getAuthHeaders(targetDatabase = null) {
    const database = targetDatabase || this.currentDatabase || this.database
    if (!database) throw new Error('No database specified for request')

    const headers = {}

    if (database === 'my') {
      if (this.databases['my']) {
        headers['X-Authorization'] = this.databases['my'].token
      } else if (this.token) {
        headers['X-Authorization'] = this.token
      }
    } else {
      if (this.databases['my']) {
        headers['my'] = this.databases['my'].token
      } else if (this.token && this.authDatabase === 'my') {
        headers['my'] = this.token
      } else {
        headers['X-Authorization'] = this.token
      }
    }

    return headers
  }

  clearSession() {
    for (const key of LEGACY_AUTH_STORAGE_KEYS) localStorage.removeItem(key)
    localStorage.removeItem('integram_session')
  }

  clearDatabaseSession(database = this.database) {
    if (database) {
      delete this.databases[database]
      deleteCookie(`idb_${database}`)
      deleteCookie(database)
    }
    if (!database || this.database === database || this.currentDatabase === database) {
      this.token = null
      this.xsrfToken = null
      this.userId = null
      this.userName = null
      this.userRole = null
      this.database = null
      this.currentDatabase = null
      this.authDatabase = null
    }
    this.clearSession()
  }

  logout(database = this.database, options = {}) {
    const { all = true } = options
    const knownDatabases = new Set([
      database,
      this.database,
      this.currentDatabase,
      localStorage.getItem('db'),
      ...Object.keys(this.databases),
      ...getIdbCookieDatabases()
    ].filter(Boolean))

    for (const dbName of knownDatabases) {
      deleteCookie(`idb_${dbName}`)
      deleteCookie(dbName)
    }

    this.token = null
    this.xsrfToken = null
    this.userId = null
    this.userName = null
    this.userRole = null
    this.database = null
    this.databases = all ? {} : this.databases
    this.currentDatabase = null
    this.clearSession()
  }

  async get(endpoint, params = {}, options = {}) {
    try {
      if (!this.isAuthenticated() && endpoint !== 'xsrf') {
        throw new Error('Not authenticated. Call authenticate() first.')
      }

      const url = this.buildURL(endpoint)
      const headers = this.getAuthHeaders(this.database)
      const { jsonMode = 'JSON_KV', normalize = null, params: optionParams = {}, ...axiosOptions } = options
      const requestParams = {
        ...(jsonMode ? { [jsonMode]: '' } : {}),
        ...params,
        ...optionParams
      }

      const response = await axios.get(url, {
        timeout: 30000,
        withCredentials: this.shouldUseCredentials(url),
        ...axiosOptions,
        params: requestParams,
        headers: {
          ...headers,
          ...(axiosOptions.headers || {})
        }
      })

      const data = normalizeApiResponse(response.data)
      return normalize ? normalize(data) : data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async getJson(endpoint, params = {}, jsonFlag = 'JSON_KV') {
    return this.get(endpoint, params, { jsonMode: jsonFlag })
  }

  async post(endpoint, data = {}, options = {}) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated. Call authenticate() first.')
      }

      const url = this.buildURL(endpoint)
      const postData = data instanceof URLSearchParams
        ? new URLSearchParams(data)
        : new URLSearchParams()

      if (!postData.has('_xsrf')) postData.append('_xsrf', this.xsrfToken)

      if (!(data instanceof URLSearchParams)) {
        for (const [key, value] of Object.entries(data)) {
          if (value !== null && value !== undefined) {
            postData.append(key, value)
          }
        }
      }

      const authHeaders = this.getAuthHeaders(this.database)
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...authHeaders
      }
      const { jsonMode = 'JSON_KV', normalize = null, params: optionParams = {}, ...axiosOptions } = options
      const requestParams = {
        ...(jsonMode ? { [jsonMode]: '' } : {}),
        ...optionParams
      }

      const response = await axios.post(url, postData, {
        timeout: 30000,
        withCredentials: this.shouldUseCredentials(url),
        ...axiosOptions,
        params: requestParams,
        headers: {
          ...headers,
          ...(axiosOptions.headers || {})
        }
      })

      const responseData = normalizeApiResponse(response.data)
      return normalize ? normalize(responseData) : responseData
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async postJson(endpoint, data = {}, jsonFlag = 'JSON_KV', options = {}) {
    return this.post(endpoint, data, { ...options, jsonMode: jsonFlag })
  }

  handleError(error) {
    if (error instanceof IntegramApiError) return error
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return normalizeApiError(error)
    }
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return normalizeApiError(error)
    }
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        this.clearDatabaseSession(this.database)
      }
      return normalizeApiError({ ...error, response: { ...error.response, data } })
    }
    if (error.request) {
      return normalizeApiError({
        ...error,
        message: 'Нет ответа от сервера. Проверьте подключение к сети.'
      })
    }
    return normalizeApiError(error)
  }

  isSameOriginBase(baseURL) {
    if (typeof window === 'undefined') return false
    try {
      return new URL(baseURL, window.location.origin).origin === window.location.origin
    } catch (error) {
      return false
    }
  }

  shouldUseCredentials(url) {
    if (typeof window === 'undefined') return false
    try {
      return new URL(url, window.location.origin).origin === window.location.origin
    } catch (error) {
      return false
    }
  }

  shouldWriteSameOriginCookies() {
    return this.isSameOriginBase(this.baseURL)
  }

  // DDL Operations
  async createType(name, baseTypeId, unique = false) {
    const data = { val: name, t: baseTypeId }
    if (unique) data.unique = 1
    return this.post('_d_new', data)
  }

  async saveType(typeId, name, baseTypeId, unique = false) {
    const data = { val: name, t: baseTypeId }
    if (unique) data.unique = 1
    return this.post(`_d_save/${typeId}`, data)
  }

  async deleteType(typeId) {
    return this.post(`_d_del/${typeId}`)
  }

  async addRequisite(typeId, requisiteTypeId) {
    return this.post(`_d_req/${typeId}`, { t: requisiteTypeId })
  }

  async deleteRequisite(requisiteId, forced = true) {
    return this.post(`_d_del_req/${requisiteId}`, forced ? { forced: '1' } : {})
  }

  async saveRequisiteAlias(requisiteId, alias) {
    return this.post(`_d_alias/${requisiteId}`, { val: alias })
  }

  async toggleRequisiteNull(requisiteId) {
    return this.post(`_d_null/${requisiteId}`)
  }

  async toggleRequisiteMulti(requisiteId) {
    return this.post(`_d_multi/${requisiteId}`)
  }

  async moveRequisiteUp(requisiteId) {
    return this.post(`_d_up/${requisiteId}`)
  }

  // DML Operations
  async createObject(typeId, value, requisites = {}, parentId = null) {
    const data = { [`t${typeId}`]: value }
    data.up = parentId || 1
    Object.assign(data, buildRequisitePayload(requisites))
    return this.post(`_m_new/${typeId}`, data, { jsonMode: 'JSON', normalize: normalizeMutationResponse })
  }

  async saveObject(objectId, typeId, value, requisites = {}) {
    const data = { [`t${typeId}`]: value }
    Object.assign(data, buildRequisitePayload(requisites))
    return this.post(`_m_save/${objectId}`, data, { jsonMode: 'JSON', normalize: normalizeMutationResponse })
  }

  async setObjectRequisites(objectId, requisites = {}) {
    const data = buildRequisitePayload(requisites)
    return this.post(`_m_set/${objectId}`, data, { jsonMode: 'JSON', normalize: normalizeMutationResponse })
  }

  async addMultiselectItem(objectId, requisiteId, referencedObjectId) {
    return this.post(`_m_set/${objectId}`, {
      [`t${requisiteId}`]: referencedObjectId
    }, { jsonMode: 'JSON', normalize: normalizeMutationResponse })
  }

  async removeMultiselectItem(multiselectItemId) {
    return this.post(`_m_del/${multiselectItemId}`, {}, { jsonMode: 'JSON', normalize: normalizeMutationResponse })
  }

  async deleteObject(objectId) {
    return this.post(`_m_del/${objectId}`, {}, { jsonMode: 'JSON', normalize: normalizeMutationResponse })
  }

  async moveObjectUp(objectId) {
    return this.post(`_m_up/${objectId}`, {}, { jsonMode: 'JSON', normalize: normalizeMutationResponse })
  }

  // Query Operations
  async getDictionary() {
    return this.get('dict')
  }

  async getMetadata(params = {}) {
    return this.get('metadata', params, { jsonMode: 'JSON', normalize: normalizeMetadataResponse })
  }

  async getTerms(params = {}) {
    return this.get('terms', params, { jsonMode: 'JSON', normalize: normalizeTermsResponse })
  }

  async getTableUiSettings() {
    const user = this.userName || this.userId || ''
    return this.get('object/269', {
      F_269: user,
      F_271: 'UI'
    })
  }

  async saveTableUiSettings(settingsId, config) {
    const settingsJson = typeof config === 'string' ? config : JSON.stringify(config)

    if (settingsId) {
      return this.post(`_m_save/${settingsId}`, {
        t273: settingsJson
      }, { jsonMode: 'JSON', normalize: normalizeMutationResponse })
    }

    return this.post('_m_new/269?JSON&up=1', {
      t269: this.userName || this.userId || '',
      t271: 'UI',
      t273: settingsJson
    }, { jsonMode: null, normalize: normalizeMutationResponse })
  }

  async getTypeMetadata(typeId) {
    return this.get(`metadata/${typeId}`, {}, { jsonMode: 'JSON', normalize: normalizeMetadataResponse })
  }

  async getObjectList(typeId, params = {}) {
    return this.get(`object/${typeId}`, params, { jsonMode: 'JSON_DATA', normalize: normalizeObjectListResponse })
  }

  async getObjectCount(typeId, params = {}) {
    const result = await this.get(`object/${typeId}`, { _count: '', ...params }, { jsonMode: 'JSON_DATA' })
    return {
      typeId,
      count: parseInt(result.count, 10) || 0
    }
  }

  async getObjectRecord(objectId, params = {}) {
    return this.get(`object/${objectId}`, params, { jsonMode: 'JSON_OBJ', normalize: normalizeObjectRecordResponse })
  }

  async getObjectEditData(objectId) {
    return this.get(`edit_obj/${objectId}`)
  }

  async getTypeEditorData() {
    return this.get('edit_types')
  }

  async executeReport(reportId, params = {}) {
    const { _jsonFormat, ...requestParams } = params || {}
    const jsonFlag = _jsonFormat || 'JSON'
    const endpoint = `report/${encodeURIComponent(String(reportId))}`

    if (requestParams._m_confirmed) {
      return this.post(endpoint, requestParams, { jsonMode: jsonFlag, normalize: normalizeReportResponse })
    }

    return this.get(endpoint, requestParams, { jsonMode: jsonFlag, normalize: normalizeReportResponse })
  }

  async sendAiChatMessage(payload = {}) {
    return this.post('ai-chat', payload, { jsonMode: 'JSON' })
  }

  async getDirAdmin(options = {}) {
    const request = typeof options === 'string' ? { addPath: options } : options
    return this.get('dir_admin', buildDirAdminParams(request.folder, request.addPath ?? request.path), {
      jsonMode: null,
      responseType: 'text',
      transformResponse: [data => data]
    })
  }

  async createDirAdminFolder({ folder = 'templates', addPath = '', name }) {
    const normalizedFolder = normalizeDirAdminFolder(folder)
    const data = new URLSearchParams()
    data.append(normalizedFolder, '1')
    data.append('add_path', normalizeAddPath(addPath))
    data.append('dir_name', name)
    data.append('mkdir', 'Создать')

    return this.post('dir_admin', data, {
      jsonMode: null,
      params: buildDirAdminParams(normalizedFolder, addPath),
      responseType: 'text',
      transformResponse: [responseData => responseData]
    })
  }

  async createDirAdminFile({ folder = 'templates', addPath = '', name }) {
    const normalizedFolder = normalizeDirAdminFolder(folder)
    const data = new URLSearchParams()
    data.append(normalizedFolder, '1')
    data.append('add_path', normalizeAddPath(addPath))
    data.append('dir_name', name)
    data.append('touch', 'Создать')

    return this.post('dir_admin', data, {
      jsonMode: null,
      params: buildDirAdminParams(normalizedFolder, addPath),
      responseType: 'text',
      transformResponse: [responseData => responseData]
    })
  }

  async deleteDirAdminItems({ folder = 'templates', addPath = '', items = [] }) {
    const normalizedFolder = normalizeDirAdminFolder(folder)
    const data = new URLSearchParams()
    data.append(normalizedFolder, '1')
    data.append('add_path', normalizeAddPath(addPath))
    data.append('delete', 'Удалить выбранные')
    for (const item of items) data.append('del[]', item)

    return this.post('dir_admin', data, {
      jsonMode: null,
      params: buildDirAdminParams(normalizedFolder, addPath),
      responseType: 'text',
      transformResponse: [responseData => responseData]
    })
  }

  async getReferenceOptions(requisiteId, objectId, restrict = null, query = null) {
    const params = { id: objectId }
    if (restrict) params.r = restrict
    if (query) { params.type = 'query'; params.q = query }
    return this.get(`_ref_reqs/${requisiteId}`, params, { jsonMode: 'JSON', normalize: normalizeReferenceOptionsResponse })
  }

  async createBackup() {
    return this.post('backup')
  }

  async uploadFile(file, path = '') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', path)
    formData.append('_xsrf', this.xsrfToken)

    const url = this.buildURL('dir_admin')
    const headers = { 'Content-Type': 'multipart/form-data' }

    if (this.database === 'my' || this.authDatabase === this.database) {
      headers['X-Authorization'] = this.token
    } else {
      headers['my'] = this.token
    }

    const response = await axios.post(url, formData, {
      params: { JSON_KV: '' },
      headers
    })
    return response.data
  }

  async uploadDirAdminFile({ file, folder = 'templates', addPath = '', rewrite = false }) {
    const normalizedFolder = normalizeDirAdminFolder(folder)
    const formData = new FormData()
    formData.append('_xsrf', this.xsrfToken)
    formData.append(normalizedFolder, '1')
    formData.append('add_path', normalizeAddPath(addPath))
    formData.append('upload', 'Загрузить')
    if (rewrite) formData.append('rewrite', '1')
    formData.append('userfile', file)

    const url = this.buildURL('dir_admin')
    const response = await axios.post(url, formData, {
      timeout: 30000,
      withCredentials: this.shouldUseCredentials(url),
      params: buildDirAdminParams(normalizedFolder, addPath),
      headers: this.getAuthHeaders(this.database),
      responseType: 'text',
      transformResponse: [responseData => responseData]
    })

    return normalizeApiResponse(response.data)
  }

  async register(data) {
    const url = `${this.baseURL}/my/auth`
    const formData = new URLSearchParams()
    formData.append('register', '1')
    formData.append('email', data.email)
    formData.append('pwd', data.password)

    const response = await axios.post(url, formData, {
      params: { JSON_KV: '' },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    if (response.data.error) throw new Error(response.data.error)
    return { success: true }
  }

  async resetPassword(data) {
    const db = data.database || 'my'
    const url = `${this.baseURL}/${db}/auth`
    const formData = new URLSearchParams()
    formData.append('reset', '1')
    formData.append('login', data.login)

    const response = await axios.post(url, formData, {
      params: { JSON_KV: '' },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    if (response.data.error) throw new Error(response.data.error)
    return { success: true }
  }
}

const integramApiClient = new IntegramApiClient()
export default integramApiClient
