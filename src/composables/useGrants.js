import { computed, ref } from 'vue'
import integramApiClient from '@/services/integramApiClient'
import {
  canAdmin as canAdminContext,
  canReadType as canReadTypeContext,
  canWriteStructure as canWriteStructureContext,
  canWriteType as canWriteTypeContext,
  hasGrant as hasContextGrant,
  mergePermissionContexts,
  normalizeGrantValue,
  readIntegramPermissionContext
} from '@/utils/integramPermissions'

const DEFAULT_GRANT_OPTIONS = Object.freeze([
  { label: 'Нет доступа', value: 'BARRED', severity: 'danger', icon: 'fi fi-rr-cross-small' },
  { label: 'Чтение', value: 'READ', severity: 'info', icon: 'fi fi-rr-eye' },
  { label: 'Запись', value: 'WRITE', severity: 'success', icon: 'fi fi-rr-pencil' }
])

export function useGrants(initialContext = null) {
  const permissionContext = ref(mergePermissionContexts(
    readIntegramPermissionContext('', integramApiClient),
    initialContext || {}
  ))
  const grants = ref(permissionContext.value.grants || {})
  const loading = ref(false)
  const error = ref(null)
  const grantOptions = ref([...DEFAULT_GRANT_OPTIONS])

  const context = computed(() => ({
    ...permissionContext.value,
    grants: grants.value || permissionContext.value.grants || {}
  }))

  function refresh(database = '') {
    permissionContext.value = mergePermissionContexts(
      permissionContext.value,
      readIntegramPermissionContext(database, integramApiClient)
    )
    grants.value = permissionContext.value.grants || {}
    return context.value
  }

  function hasGrant(permission, minAccess = 'READ') {
    return hasContextGrant(context.value, permission, minAccess)
  }

  function canReadType(typeId) {
    return canReadTypeContext(typeId, context.value)
  }

  function canWriteType(typeId) {
    return canWriteTypeContext(typeId, context.value)
  }

  function canWriteStructure() {
    return canWriteStructureContext(context.value)
  }

  function canAdmin() {
    return canAdminContext(context.value)
  }

  function loadGrantOptions() {
    loading.value = false
    error.value = null
    return Promise.resolve(grantOptions.value)
  }

  function formatGrantValue(value) {
    if (value === null || value === undefined || value === '') return '-'
    return String(value)
  }

  function getGrantSeverity(value) {
    const level = normalizeGrantValue(value)
    if (level === null) return 'secondary'
    if (level <= 0) return 'danger'
    if (level === 1) return 'info'
    return 'success'
  }

  function getGrantIcon(value) {
    const level = normalizeGrantValue(value)
    if (level === null || level <= 0) return 'fi fi-rr-cross-small'
    if (level === 1) return 'fi fi-rr-eye'
    return 'fi fi-rr-check'
  }

  function isSystemGrant(grantName) {
    return ['admin', 'role', 'roleId', 'canEdit', 'FILE'].includes(String(grantName))
  }

  function isRequisiteGrant(grantName) {
    return /^req[_:-]?\d+$/i.test(String(grantName))
  }

  function getGrantWarning(value) {
    const level = normalizeGrantValue(value)
    if (level === 0) return 'Доступ запрещен'
    return null
  }

  return {
    grants,
    context,
    loading,
    error,
    grantOptions,
    refresh,
    hasGrant,
    canReadType,
    canWriteType,
    canWriteStructure,
    canAdmin,
    loadGrantOptions,
    formatGrantValue,
    getGrantSeverity,
    getGrantIcon,
    isSystemGrant,
    isRequisiteGrant,
    getGrantWarning
  }
}

export default useGrants
