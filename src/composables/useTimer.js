import { onUnmounted } from 'vue'

export function useTimer() {
  const timeouts = new Set()
  const intervals = new Set()

  const setTimeout = (callback, delay) => {
    const id = window.setTimeout(() => {
      callback()
      timeouts.delete(id)
    }, delay)
    timeouts.add(id)
    return id
  }

  const setInterval = (callback, delay) => {
    const id = window.setInterval(callback, delay)
    intervals.add(id)
    return id
  }

  const clearTimeout = (id) => {
    if (id !== undefined && id !== null) {
      window.clearTimeout(id)
      timeouts.delete(id)
    }
  }

  const clearInterval = (id) => {
    if (id !== undefined && id !== null) {
      window.clearInterval(id)
      intervals.delete(id)
    }
  }

  const clearAll = () => {
    timeouts.forEach(id => window.clearTimeout(id))
    intervals.forEach(id => window.clearInterval(id))
    timeouts.clear()
    intervals.clear()
  }

  onUnmounted(() => {
    clearAll()
  })

  return {
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    clearAll
  }
}
