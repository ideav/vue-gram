import { ref } from 'vue'

export function useGrants() {
  const grants = ref({})
  const loading = ref(false)

  function hasGrant(permission) {
    return true
  }

  function formatGrantValue(value) {
    if (value === null || value === undefined || value === '') return '-'
    return String(value)
  }

  function getGrantSeverity(value) {
    if (!value || value === '0' || value === 'false') return 'danger'
    if (value === '1' || value === 'true') return 'success'
    return 'info'
  }

  function getGrantIcon(value) {
    if (!value || value === '0' || value === 'false') return 'pi pi-times'
    if (value === '1' || value === 'true') return 'pi pi-check'
    return 'pi pi-info-circle'
  }

  function isSystemGrant(grantName) {
    return false
  }

  function getGrantWarning(value) {
    return null
  }

  return {
    grants,
    loading,
    hasGrant,
    formatGrantValue,
    getGrantSeverity,
    getGrantIcon,
    isSystemGrant,
    getGrantWarning
  }
}

export default useGrants
