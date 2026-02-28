/**
 * Safe localStorage Wrapper
 * Prevents quota overflow and provides safe operations
 */

const MAX_LOCALSTORAGE_SIZE = 5 * 1024 * 1024
const WARN_THRESHOLD = 0.8
const MAX_SESSION_AGE = 7 * 24 * 60 * 60 * 1000

function getStringSize(str) {
  if (!str) return 0
  return new Blob([str]).size
}

export function getCurrentStorageSize() {
  let size = 0
  try {
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += getStringSize(localStorage[key])
        size += getStringSize(key)
      }
    }
  } catch (e) {
    console.warn('[localStorage] Error calculating storage size:', e)
  }
  return size
}

export function cleanupOldData() {
  let bytesFreed = 0
  try {
    const sessionTimestamp = localStorage.getItem('session_timestamp')
    if (sessionTimestamp) {
      const age = Date.now() - parseInt(sessionTimestamp)
      if (age > MAX_SESSION_AGE) {
        const sessionData = localStorage.getItem('integram_session')
        if (sessionData) {
          bytesFreed += getStringSize(sessionData)
          localStorage.removeItem('integram_session')
        }
        bytesFreed += getStringSize(sessionTimestamp)
        localStorage.removeItem('session_timestamp')
      }
    }
  } catch (e) {
    console.warn('[localStorage] Error during cleanup:', e)
  }
  return bytesFreed
}

export function setItemSafe(key, value) {
  try {
    const stringValue = typeof value === 'string' ? value : String(value)
    const currentSize = getCurrentStorageSize()
    const newItemSize = getStringSize(stringValue) + getStringSize(key)
    const projectedSize = currentSize + newItemSize

    if (projectedSize > MAX_LOCALSTORAGE_SIZE * WARN_THRESHOLD) {
      cleanupOldData()
    }

    localStorage.setItem(key, stringValue)
    return true
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      cleanupOldData()
      try {
        localStorage.setItem(key, typeof value === 'string' ? value : String(value))
        return true
      } catch (e2) {
        console.error('[localStorage] Failed to save even after cleanup:', e2)
        return false
      }
    }
    console.error('[localStorage] Error setting item:', e)
    return false
  }
}

export function getItemSafe(key) {
  try {
    return localStorage.getItem(key)
  } catch (e) {
    console.error('[localStorage] Error getting item:', e)
    return null
  }
}

export function removeItemSafe(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch (e) {
    console.error('[localStorage] Error removing item:', e)
    return false
  }
}
