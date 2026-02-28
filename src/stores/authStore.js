/**
 * Authentication Store (Pinia)
 * Simplified single token system for Integram auth
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { setItemSafe, removeItemSafe } from '@/utils/localStorage'

export const useAuthStore = defineStore('auth', () => {
  const primaryToken = ref(null)
  const primaryUser = ref(null)
  const primaryUserId = ref(null)
  const primaryXsrf = ref(null)
  const primaryDatabase = ref('my')
  const primaryApiBase = ref(window.location.hostname)

  const isLoading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!primaryToken.value)

  function initFromLocalStorage() {
    primaryToken.value = localStorage.getItem('token')
    primaryUser.value = localStorage.getItem('user')
    primaryUserId.value = localStorage.getItem('id')
    primaryXsrf.value = localStorage.getItem('_xsrf')
    primaryDatabase.value = localStorage.getItem('db') || 'my'
    primaryApiBase.value = localStorage.getItem('apiBase') || window.location.hostname
  }

  async function authenticateToDatabase(login, password, apiBase, database) {
    const formData = new URLSearchParams()
    formData.append('login', login)
    formData.append('pwd', password)

    let baseURL
    if (apiBase === 'localhost') {
      baseURL = `http://localhost/${database}/`
    } else {
      baseURL = `https://${apiBase}/${database}`
    }

    const client = axios.create({
      baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    const response = await client.post('/auth', formData, {
      params: { JSON_KV: true }
    })

    let data = response.data
    if (Array.isArray(data) && data.length > 0) data = data[0]

    if (!data.token) {
      throw new Error(data.error || data.warning || 'Authentication failed')
    }

    return {
      token: data.token,
      _xsrf: data._xsrf,
      id: data.id,
      user: login
    }
  }

  async function login(loginName, password, apiBase = window.location.hostname, database = 'my') {
    isLoading.value = true
    error.value = null

    try {
      primaryDatabase.value = database
      primaryApiBase.value = apiBase
      setItemSafe('db', database)
      setItemSafe('apiBase', apiBase)

      const primaryAuth = await authenticateToDatabase(loginName, password, apiBase, database)

      primaryToken.value = primaryAuth.token
      primaryUser.value = primaryAuth.user
      primaryUserId.value = primaryAuth.id
      primaryXsrf.value = primaryAuth._xsrf

      setItemSafe('token', primaryAuth.token)
      setItemSafe('user', primaryAuth.user)
      setItemSafe('id', primaryAuth.id)
      setItemSafe('_xsrf', primaryAuth._xsrf)
      setItemSafe('session_timestamp', Date.now().toString())

      const sessionData = {
        database,
        token: primaryAuth.token,
        xsrfToken: primaryAuth._xsrf,
        userId: primaryAuth.id,
        userName: primaryAuth.user,
        authDatabase: database,
        timestamp: Date.now()
      }
      setItemSafe('integram_session', JSON.stringify(sessionData))

      return { success: true, user: primaryAuth.user }
    } catch (err) {
      error.value = err.message || 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function logout() {
    primaryToken.value = null
    primaryUser.value = null
    primaryUserId.value = null
    primaryXsrf.value = null

    removeItemSafe('token')
    removeItemSafe('user')
    removeItemSafe('id')
    removeItemSafe('_xsrf')
    removeItemSafe('integram_session')
    removeItemSafe('session_timestamp')
  }

  function getPrimaryAuth() {
    return {
      token: primaryToken.value,
      user: primaryUser.value,
      id: primaryUserId.value,
      xsrf: primaryXsrf.value,
      database: primaryDatabase.value,
      apiBase: primaryApiBase.value,
      isAuthenticated: isAuthenticated.value
    }
  }

  return {
    primaryToken,
    primaryUser,
    primaryUserId,
    primaryXsrf,
    primaryDatabase,
    primaryApiBase,
    isLoading,
    error,
    isAuthenticated,
    initFromLocalStorage,
    login,
    logout,
    getPrimaryAuth
  }
})
