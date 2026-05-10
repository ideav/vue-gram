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

export function formatRequisiteValue(value) {
  if (value === null || value === undefined || value === '') return value

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
  const rawTerms = data.terms ?? {}
  const termById = Array.isArray(rawTerms)
    ? Object.fromEntries(rawTerms.map(term => [String(term.id), term.val ?? term.name ?? '']))
    : { ...rawTerms }
  const baseTypes = toArray(data.base_types ?? data.baseTypes).map(type => ({
    id: toOptionalNumber(type.id),
    name: type.name ?? type.val ?? ''
  }))

  return {
    ...data,
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
  const matrix = toArray(reportData.data)

  return {
    ...data,
    columns,
    data: matrix,
    rows: buildRowsFromColumnMatrix(columns, matrix)
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
  const message = payload.message ?? payload.failed ?? payload.error ?? data?.message ?? getDefaultErrorMessage(status, error)
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

  setCredentials(database, token, xsrf = null, authDatabase = null) {
    this.database = database
    this.token = token
    this.xsrfToken = xsrf || token
    this.authDatabase = authDatabase || database
  }

  saveSession() {
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
            const currentDBSession = this.databases[this.currentDatabase]
            this.database = this.currentDatabase
            this.token = currentDBSession.token
            this.xsrfToken = currentDBSession.xsrfToken
            this.userId = currentDBSession.userId
            this.userName = currentDBSession.userName
            this.userRole = currentDBSession.userRole
            this.authDatabase = this.currentDatabase
          }

          localStorage.setItem('integram_server', this.baseURL)
          return
        }

        // Legacy format
        this.database = sessionData.database
        this.token = sessionData.token
        this.xsrfToken = sessionData.xsrfToken
        this.userId = sessionData.userId
        this.userName = sessionData.userName
        this.userRole = sessionData.userRole
        this.authDatabase = sessionData.authDatabase || sessionData.database

        if (this.database && this.token) {
          this.databases[this.database] = {
            token: this.token,
            xsrfToken: this.xsrfToken,
            userId: this.userId,
            userName: this.userName,
            userRole: this.userRole,
            ownedDatabases: []
          }
          this.currentDatabase = this.database
          this.saveSession()
        }

        if (sessionData.authServer) {
          this.baseURL = sessionData.authServer
          localStorage.setItem('integram_server', sessionData.authServer)
        }
        return
      }

      this.loadSessionFromMyToken()
    } catch (error) {
      console.error('Failed to load session from localStorage:', error)
      localStorage.removeItem('integram_session')
    }
  }

  loadSessionFromMyToken() {
    try {
      const myToken = localStorage.getItem('my_token')
      const myXsrf = localStorage.getItem('my_xsrf')
      const myUser = localStorage.getItem('my_user')
      const myUserId = localStorage.getItem('my_id')

      if (myToken && myXsrf) {
        this.database = 'my'
        this.token = myToken
        this.xsrfToken = myXsrf
        this.userId = myUserId
        this.userName = myUser
        this.authDatabase = 'my'
        return true
      }

      const legacyToken = localStorage.getItem('token')
      const legacyXsrf = localStorage.getItem('_xsrf')
      const legacyUser = localStorage.getItem('user')
      const legacyUserId = localStorage.getItem('id')
      const currentDb = localStorage.getItem('db')

      if (legacyToken && legacyXsrf && currentDb === 'my') {
        this.database = 'my'
        this.token = legacyToken
        this.xsrfToken = legacyXsrf
        this.userId = legacyUserId
        this.userName = legacyUser
        this.authDatabase = 'my'
        return true
      }

      return false
    } catch (error) {
      return false
    }
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
    if (!this.token || !this.xsrfToken) return false
    try {
      const response = await this.get('xsrf')
      if (response.token) this.token = response.token
      if (response._xsrf) this.xsrfToken = response._xsrf
      if (response.id) this.userId = response.id
      if (response.user) this.userName = response.user
      if (response.role) this.userRole = response.role
      this.saveSession()
      return true
    } catch (error) {
      return false
    }
  }

  tryRestoreSession() {
    if (this.isAuthenticated()) return true

    const stored = localStorage.getItem('integram_session')
    if (stored) {
      try {
        const sessionData = JSON.parse(stored)

        if (sessionData.version === 2 && sessionData.databases) {
          this.databases = sessionData.databases
          this.currentDatabase = sessionData.currentDatabase
          if (this.currentDatabase && this.databases[this.currentDatabase]) {
            const s = this.databases[this.currentDatabase]
            this.database = this.currentDatabase
            this.token = s.token
            this.xsrfToken = s.xsrfToken
            this.userId = s.userId
            this.userName = s.userName
            this.userRole = s.userRole
            this.authDatabase = this.currentDatabase
          }
          if (sessionData.server) this.baseURL = sessionData.server
          return true
        }

        if (sessionData.token && sessionData.xsrfToken) {
          this.database = sessionData.database
          this.token = sessionData.token
          this.xsrfToken = sessionData.xsrfToken
          this.userId = sessionData.userId
          this.userName = sessionData.userName
          this.userRole = sessionData.userRole
          this.authDatabase = sessionData.authDatabase || sessionData.database
          if (sessionData.authServer) this.baseURL = sessionData.authServer
          return true
        }
      } catch (e) {
        // ignore
      }
    }

    return this.loadSessionFromMyToken()
  }

  getAuthInfo() {
    return {
      token: this.token,
      xsrf: this.xsrfToken,
      userId: this.userId,
      userName: this.userName,
      userRole: this.userRole,
      database: this.database
    }
  }

  buildURL(endpoint) {
    if (!this.database) {
      throw new Error('Database not set. Call setDatabase() first.')
    }

    let cleanBaseURL = this.baseURL.replace(/\/$/, '')
    const isIPAddress = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(cleanBaseURL)
    const isDronedoc = cleanBaseURL.includes('dronedoc.ru') || cleanBaseURL.includes('sakhwings.ru') || isIPAddress

    if (isDronedoc) {
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
      formData.append('login', login)
      formData.append('pwd', password)

      const response = await axios.post(url, formData, {
        params: { JSON_KV: '' },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      if (response.data.failed) {
        throw new Error('Неверный логин или пароль')
      }

      const receivedToken = response.data.token
      if (!receivedToken) {
        throw new Error('Сервер не вернул токен авторизации')
      }

      if (receivedToken === password) {
        throw new Error('Ошибка сервера: получен некорректный токен авторизации')
      }

      // Save to multi-database structure
      this.databases[database] = {
        token: receivedToken,
        xsrfToken: response.data._xsrf,
        userId: response.data.id,
        userName: login,
        userRole: response.data.role || 'user',
        ownedDatabases: []
      }

      this.currentDatabase = database
      this.token = receivedToken
      this.xsrfToken = response.data._xsrf
      this.userId = response.data.id
      this.userName = login
      this.userRole = response.data.role || 'user'
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
        xsrf: response.data._xsrf,
        userId: this.userId,
        userName: this.userName,
        userRole: this.userRole,
        ownedDatabases: this.databases[database].ownedDatabases
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Ошибка авторизации')
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
    localStorage.removeItem('integram_session')
  }

  logout() {
    this.token = null
    this.xsrfToken = null
    this.userId = null
    this.userName = null
    this.userRole = null
    this.database = null
    this.databases = {}
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
        if (this.tryRestoreSession()) {
          return normalizeApiError({
            ...error,
            canRetry: true,
            response: {
              ...error.response,
              data: {
                message: 'SESSION_RESTORED_RETRY',
                code: 'SESSION_RESTORED_RETRY'
              }
            }
          })
        }
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
    for (const [reqId, reqValue] of Object.entries(requisites)) {
      data[`t${reqId}`] = formatRequisiteValue(reqValue)
    }
    return this.post(`_m_new/${typeId}`, data, { jsonMode: 'JSON', normalize: normalizeMutationResponse })
  }

  async saveObject(objectId, typeId, value, requisites = {}) {
    const data = { [`t${typeId}`]: value }
    for (const [reqId, reqValue] of Object.entries(requisites)) {
      const formatted = formatRequisiteValue(reqValue)
      data[`t${reqId}`] = formatted !== null && formatted !== undefined ? formatted : ''
    }
    return this.post(`_m_save/${objectId}`, data, { jsonMode: 'JSON', normalize: normalizeMutationResponse })
  }

  async setObjectRequisites(objectId, requisites = {}) {
    const data = {}
    for (const [reqId, reqValue] of Object.entries(requisites)) {
      const formatted = formatRequisiteValue(reqValue)
      data[`t${reqId}`] = formatted !== null && formatted !== undefined ? formatted : ''
    }
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

  async getTypeMetadata(typeId) {
    return this.get(`metadata/${typeId}`, {}, { jsonMode: 'JSON', normalize: normalizeMetadataResponse })
  }

  async getObjectList(typeId, params = {}) {
    return this.get(`object/${typeId}`, params, { jsonMode: 'JSON_DATA', normalize: normalizeObjectListResponse })
  }

  async getObjectCount(typeId) {
    const result = await this.get(`object/${typeId}`, { _count: '' }, { jsonMode: 'JSON_DATA' })
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
    if (params._m_confirmed) {
      return this.post(`report/${reportId}`, params, { jsonMode: 'JSON', normalize: normalizeReportResponse })
    }
    return this.get(`report/${reportId}`, params, { jsonMode: 'JSON', normalize: normalizeReportResponse })
  }

  async getDirAdmin(path = '') {
    return this.get('dir_admin', { path })
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
