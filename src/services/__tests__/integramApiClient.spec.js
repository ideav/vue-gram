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
})
