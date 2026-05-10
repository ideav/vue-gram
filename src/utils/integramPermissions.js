export const ACCESS_LEVELS = Object.freeze({
  NONE: 0,
  READ: 1,
  WRITE: 2,
  ADMIN: 3
})

export const STRUCTURE_TYPE_ID = '1'

const ADMIN_ROLES = new Set(['admin', 'administrator', 'owner', 'root', 'superadmin'])
const WRITE_ROLES = new Set(['write', 'writer', 'editor'])
const READ_ROLES = new Set(['read', 'reader', 'readonly', 'read-only', 'viewer', 'guest'])

const ADMIN_VALUES = new Set(['ADMIN', 'ADMINISTRATOR', 'OWNER', 'ROOT', 'SUPERADMIN', '3'])
const WRITE_VALUES = new Set(['WRITE', 'WRITER', 'EDIT', 'EDITOR', 'UPDATE', 'CREATE', 'DELETE', 'W', '2'])
const READ_VALUES = new Set(['READ', 'READER', 'VIEW', 'VIEWER', 'R', 'TRUE', 'YES', 'Y', '1'])
const DENY_VALUES = new Set(['BARRED', 'DENY', 'DENIED', 'NONE', 'NO', 'FALSE', 'N', '0'])

function canUseWindow() {
  return typeof window !== 'undefined'
}

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined'
}

function toRole(value) {
  return String(value || '').trim().toLowerCase()
}

function compactContext(context = {}) {
  return {
    token: context.token,
    xsrf: context.xsrf,
    userId: context.userId ?? context.id,
    userName: context.userName ?? context.user,
    userRole: context.userRole ?? context.role,
    role: context.role ?? context.userRole,
    roleId: context.roleId,
    database: context.database,
    grants: context.grants ?? null
  }
}

export function asPermissionContext(contextOrGrants = {}) {
  if (!contextOrGrants || typeof contextOrGrants !== 'object') {
    return { grants: null }
  }

  if (Object.keys(contextOrGrants).length === 0) {
    return { grants: null }
  }

  const hasExplicitGrants = Object.prototype.hasOwnProperty.call(contextOrGrants, 'grants')
  const hasRoleFields = ['userRole', 'role', 'roleId'].some((key) => (
    Object.prototype.hasOwnProperty.call(contextOrGrants, key)
  ))
  const hasSessionFields = ['token', 'xsrf', 'userId', 'id', 'userName', 'user', 'database'].some((key) => (
    Object.prototype.hasOwnProperty.call(contextOrGrants, key)
  ))

  if (hasExplicitGrants || hasRoleFields || hasSessionFields) {
    const compacted = compactContext(contextOrGrants)
    return {
      ...compacted,
      grants: hasExplicitGrants
        ? compacted.grants
        : hasRoleFields && !hasSessionFields
          ? contextOrGrants
          : compacted.grants
    }
  }

  return { grants: contextOrGrants }
}

export function normalizeGrantValue(value) {
  if (value && typeof value === 'object') {
    return normalizeGrantValue(value.grant ?? value.access ?? value.permission ?? value.value ?? value.val)
  }

  if (value === true) return ACCESS_LEVELS.WRITE
  if (value === false || value === null) return ACCESS_LEVELS.NONE
  if (value === undefined || value === '') return null

  if (typeof value === 'number') {
    if (value >= ACCESS_LEVELS.ADMIN) return ACCESS_LEVELS.ADMIN
    if (value >= ACCESS_LEVELS.WRITE) return ACCESS_LEVELS.WRITE
    if (value >= ACCESS_LEVELS.READ) return ACCESS_LEVELS.READ
    return ACCESS_LEVELS.NONE
  }

  const normalized = String(value).trim().toUpperCase()
  if (ADMIN_VALUES.has(normalized)) return ACCESS_LEVELS.ADMIN
  if (WRITE_VALUES.has(normalized)) return ACCESS_LEVELS.WRITE
  if (READ_VALUES.has(normalized)) return ACCESS_LEVELS.READ
  if (DENY_VALUES.has(normalized)) return ACCESS_LEVELS.NONE
  return null
}

export function normalizeRequiredAccess(access = 'READ') {
  if (typeof access === 'number') return access
  const normalized = String(access || 'READ').trim().toUpperCase()
  return ACCESS_LEVELS[normalized] ?? ACCESS_LEVELS.READ
}

export function getGrantValue(grants, key) {
  if (!grants || typeof grants !== 'object' || key === null || key === undefined) {
    return { found: false, value: undefined, level: null }
  }

  const candidates = [key, String(key)]
  const numberKey = Number(key)
  if (!Number.isNaN(numberKey)) candidates.push(numberKey)

  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(grants, candidate)) {
      const value = grants[candidate]
      return {
        found: true,
        value,
        level: normalizeGrantValue(value)
      }
    }
  }

  return { found: false, value: undefined, level: null }
}

export function isAdminContext(context = {}) {
  const ctx = asPermissionContext(context)
  const grants = ctx.grants || {}
  const role = toRole(ctx.userRole || ctx.role || grants.role)
  const roleId = ctx.roleId ?? grants.roleId

  return ADMIN_ROLES.has(role) || String(roleId || '') === '1' || normalizeGrantValue(grants.admin) >= ACCESS_LEVELS.WRITE
}

export function isReadOnlyContext(context = {}) {
  const ctx = asPermissionContext(context)
  const grants = ctx.grants || {}
  const role = toRole(ctx.userRole || ctx.role || grants.role)
  return READ_ROLES.has(role)
}

export function hasWriteRole(context = {}) {
  const ctx = asPermissionContext(context)
  const grants = ctx.grants || {}
  const role = toRole(ctx.userRole || ctx.role || grants.role)
  return isAdminContext(ctx) || WRITE_ROLES.has(role)
}

export function hasKnownPermissionState(context = {}) {
  const ctx = asPermissionContext(context)
  const grants = ctx.grants
  return Boolean(
    (grants && typeof grants === 'object' && Object.keys(grants).length > 0) ||
    ctx.userRole ||
    ctx.role ||
    ctx.roleId
  )
}

export function hasGrant(contextOrGrants = {}, keyOrPermission, minAccess = 'READ') {
  const ctx = asPermissionContext(contextOrGrants)
  const permission = keyOrPermission && typeof keyOrPermission === 'object'
    ? keyOrPermission
    : { key: keyOrPermission, min: minAccess }

  return canAccessResource(permission.key ?? permission.resource, permission.min ?? permission.access ?? minAccess, ctx)
}

export function canAccessResource(key, minAccess = 'READ', context = {}) {
  const ctx = asPermissionContext(context)
  const required = normalizeRequiredAccess(minAccess)

  if (isAdminContext(ctx)) return true

  const grant = getGrantValue(ctx.grants, key)
  if (grant.found) {
    const level = grant.level ?? ACCESS_LEVELS.NONE
    return level >= required
  }

  if (required <= ACCESS_LEVELS.READ) {
    return hasKnownPermissionState(ctx) && !isReadOnlyContext(ctx)
  }

  if (required <= ACCESS_LEVELS.WRITE) {
    return hasWriteRole(ctx) && !isReadOnlyContext(ctx)
  }

  return false
}

export function canReadType(typeId, context = {}) {
  return canAccessResource(typeId, 'READ', context)
}

export function canWriteType(typeId, context = {}) {
  return canAccessResource(typeId, 'WRITE', context)
}

export function canWriteStructure(context = {}) {
  return canWriteType(STRUCTURE_TYPE_ID, context)
}

export function canAdmin(context = {}) {
  return isAdminContext(context)
}

export function canEditTypes(context = {}) {
  const ctx = asPermissionContext(context)
  const grants = ctx.grants || {}

  if (typeof grants.canEdit === 'boolean') return grants.canEdit
  if (normalizeGrantValue(grants.canEdit) !== null) {
    return normalizeGrantValue(grants.canEdit) >= ACCESS_LEVELS.WRITE
  }

  return canWriteStructure(ctx)
}

function parseJson(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function readLocalStorageContext(database = '') {
  if (!canUseLocalStorage()) return {}

  const session = parseJson(localStorage.getItem('integram_session'), {})
  const databaseSession = database ? session.databases?.[database] : null
  const currentSession = session.databases?.[session.currentDatabase]
  const grants = parseJson(localStorage.getItem('integram_grants'), null)

  return mergePermissionContexts(
    {
      token: session.token,
      xsrf: session.xsrf,
      userId: session.userId,
      userName: session.userName,
      userRole: session.userRole,
      role: session.role,
      roleId: session.roleId,
      database: session.database,
      grants: session.grants
    },
    currentSession || {},
    databaseSession || {},
    grants ? { grants } : {},
    {
      userRole: localStorage.getItem('role'),
      roleId: localStorage.getItem('roleId'),
      userName: localStorage.getItem('user'),
      userId: localStorage.getItem('id'),
      database: database || localStorage.getItem('db')
    }
  )
}

function readWindowContext(database = '') {
  if (!canUseWindow()) return {}

  return {
    userId: window.uid || window.id,
    userName: window.user,
    userRole: window.role,
    role: window.role,
    roleId: window.roleId,
    database: database || window.db,
    grants: window.grants || null
  }
}

export function mergePermissionContexts(...contexts) {
  const merged = { grants: null }

  for (const source of contexts) {
    if (!source || typeof source !== 'object') continue
    const ctx = asPermissionContext(source)

    if (ctx.grants && typeof ctx.grants === 'object') {
      merged.grants = {
        ...(merged.grants || {}),
        ...ctx.grants
      }
    }

    for (const key of ['token', 'xsrf', 'userId', 'userName', 'userRole', 'role', 'roleId', 'database']) {
      if (ctx[key] !== undefined && ctx[key] !== null && ctx[key] !== '') {
        merged[key] = ctx[key]
      }
    }
  }

  return merged
}

export function readIntegramPermissionContext(database = '', apiClient = null) {
  const apiContext = typeof apiClient?.getAuthInfo === 'function' ? apiClient.getAuthInfo() : {}
  return mergePermissionContexts(
    readLocalStorageContext(database),
    readWindowContext(database),
    apiContext || {}
  )
}
