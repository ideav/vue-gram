import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { formatRequisiteValue, IntegramApiClient } from '../integramApiClient'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

describe('IntegramApiClient', () => {
  let client

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.cookie = 'idb_my=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
    document.cookie = 'my=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'

    client = new IntegramApiClient()
    client.setServer('https://app.integram.io')
    client.setCredentials('my', 'auth-token', 'xsrf-token')
    client.currentDatabase = 'my'
  })

  it('normalizes date-like requisite values before saving', () => {
    expect(formatRequisiteValue('2026-05-09')).toBe('2026-05-09 00:00:00')
    expect(formatRequisiteValue('09.05.2026 12:30')).toBe('2026-05-09 12:30:00')
    expect(formatRequisiteValue('plain text')).toBe('plain text')
  })

  it('posts multiselect additions through _m_set using the requisite field key', async () => {
    axios.post.mockResolvedValue({ data: { id: 9001 } })

    await client.addMultiselectItem(285, 100, 42)

    expect(axios.post).toHaveBeenCalledTimes(1)
    const [url, body, config] = axios.post.mock.calls[0]

    expect(url).toBe('https://app.integram.io/api/my/_m_set/285')
    expect(body).toBeInstanceOf(URLSearchParams)
    expect(body.get('_xsrf')).toBe('xsrf-token')
    expect(body.get('t100')).toBe('42')
    expect(config.headers['X-Authorization']).toBe('auth-token')
    expect(config.params).toEqual({ JSON_KV: '' })
  })

  it('posts multiselect removals through _m_del using the multiselect row id', async () => {
    axios.post.mockResolvedValue({ data: { ok: true } })

    await client.removeMultiselectItem(9001)

    expect(axios.post).toHaveBeenCalledTimes(1)
    const [url, body] = axios.post.mock.calls[0]

    expect(url).toBe('https://app.integram.io/api/my/_m_del/9001')
    expect(body.get('_xsrf')).toBe('xsrf-token')
  })

  it('restores legacy localStorage sessions for the saved database', () => {
    localStorage.setItem('token', 'legacy-token')
    localStorage.setItem('_xsrf', 'legacy-xsrf')
    localStorage.setItem('user', 'alice')
    localStorage.setItem('id', '42')
    localStorage.setItem('db', 'a2025')

    const restoredClient = new IntegramApiClient()

    expect(restoredClient.isAuthenticated()).toBe(true)
    expect(restoredClient.getDatabase()).toBe('a2025')
    expect(restoredClient.getAuthInfo()).toMatchObject({
      token: 'legacy-token',
      xsrf: 'legacy-xsrf',
      userId: '42',
      userName: 'alice',
      database: 'a2025'
    })
  })

  it('refreshes an existing session through the legacy xsrf endpoint with same-origin credentials', async () => {
    client.setServer(window.location.origin)
    axios.get.mockResolvedValue({
      data: {
        _xsrf: 'fresh-xsrf',
        token: 'fresh-token',
        id: '42',
        user: 'alice',
        role: 'admin'
      }
    })

    await expect(client.validateSession()).resolves.toBe(true)

    const [url, config] = axios.get.mock.calls[0]
    expect(url).toBe(`${window.location.origin}/my/xsrf`)
    expect(config.params).toEqual({ JSON: '' })
    expect(config.withCredentials).toBe(true)
    expect(client.getAuthInfo()).toMatchObject({
      token: 'fresh-token',
      xsrf: 'fresh-xsrf',
      userId: '42',
      userName: 'alice',
      userRole: 'admin'
    })
  })

  it('surfaces backend auth errors instead of replacing them with a generic message', async () => {
    axios.post.mockRejectedValue({
      response: {
        status: 401,
        data: {
          error: 'Неверный логин или пароль alice @ my',
          hint: 'Логин и пароль следует отправлять POST-параметрами.'
        }
      }
    })

    await expect(client.authenticate('my', 'alice', 'bad-password'))
      .rejects.toThrow('Неверный логин или пароль alice @ my')
  })

  it('clears Vue and legacy auth storage on logout', () => {
    localStorage.setItem('integram_session', '{"token":"auth-token"}')
    localStorage.setItem('token', 'auth-token')
    localStorage.setItem('_xsrf', 'xsrf-token')
    localStorage.setItem('user', 'alice')
    localStorage.setItem('id', '42')
    localStorage.setItem('db', 'my')
    localStorage.setItem('session_timestamp', '1')
    document.cookie = 'idb_my=auth-token; path=/'
    document.cookie = 'my=auth-token; path=/'

    client.logout()

    expect(localStorage.getItem('integram_session')).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('_xsrf')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(localStorage.getItem('id')).toBeNull()
    expect(localStorage.getItem('db')).toBeNull()
    expect(localStorage.getItem('session_timestamp')).toBeNull()
    expect(document.cookie).not.toContain('idb_my=')
    expect(document.cookie).not.toContain('my=')
  })
})
