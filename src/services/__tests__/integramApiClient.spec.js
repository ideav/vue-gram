import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import {
  formatRequisiteValue,
  IntegramApiError,
  IntegramApiClient,
  normalizeApiError,
  normalizeMetadataResponse,
  normalizeObjectListResponse,
  normalizeObjectRecordResponse,
  normalizeReferenceOptionsResponse,
  normalizeReportResponse,
  normalizeTermsResponse
} from '../integramApiClient'
import metadataFixture from '../__fixtures__/integramApi/metadata.json'
import termsFixture from '../__fixtures__/integramApi/terms.json'
import objectListFixture from '../__fixtures__/integramApi/object-json-data.json'
import objectRecordFixture from '../__fixtures__/integramApi/object-json-obj.json'
import reportFixture from '../__fixtures__/integramApi/report-json.json'
import referenceOptionsFixture from '../__fixtures__/integramApi/reference-options.json'
import mNewErrorFixture from '../__fixtures__/integramApi/m-new-error.json'
import mSetErrorFixture from '../__fixtures__/integramApi/m-set-error.json'
import { INTEGRAM_API_CONTRACTS } from '../integramApiContracts'
import { integramApiFixtures } from '../__fixtures__/integramApi'
import { dirAdminDirectoryHtml } from '../../components/integram/__fixtures__/dirAdminFixtures'

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
    expect(config.params).toEqual({ JSON: '' })
  })

  it('posts multiselect removals through _m_del using the multiselect row id', async () => {
    axios.post.mockResolvedValue({ data: { ok: true } })

    await client.removeMultiselectItem(9001)

    expect(axios.post).toHaveBeenCalledTimes(1)
    const [url, body] = axios.post.mock.calls[0]

    expect(url).toBe('https://app.integram.io/api/my/_m_del/9001')
    expect(body.get('_xsrf')).toBe('xsrf-token')
  })

  it('passes legacy table filters to object count requests', async () => {
    axios.get.mockResolvedValue({ data: { count: '2' } })

    const result = await client.getObjectCount(42, {
      F_U: '101',
      F_42: '%Acme%',
      lnx: 0
    })

    expect(result).toEqual({ typeId: 42, count: 2 })
    expect(axios.get).toHaveBeenCalledTimes(1)

    const [url, config] = axios.get.mock.calls[0]
    expect(url).toBe('https://app.integram.io/api/my/object/42')
    expect(config.params).toEqual({
      JSON_DATA: '',
      _count: '',
      F_U: '101',
      F_42: '%Acme%',
      lnx: 0
    })
  })

  it('posts form-style requisite keys through _m_set without double-prefixing', async () => {
    axios.post.mockResolvedValue({ data: { ok: true } })

    await client.setObjectRequisites(285, {
      t100: 'updated text',
      b101: '1',
      102: true
    })

    const [url, body] = axios.post.mock.calls[0]

    expect(url).toBe('https://app.integram.io/api/my/_m_set/285')
    expect(body.get('t100')).toBe('updated text')
    expect(body.get('b101')).toBe('1')
    expect(body.get('t102')).toBe('X')
    expect(body.get('b102')).toBe('1')
    expect(body.get('tt100')).toBeNull()
    expect(axios.post.mock.calls[0][2].params).toEqual({ JSON: '' })
  })

  it('creates objects with normalized form-style requisite keys and parent id', async () => {
    axios.post.mockResolvedValue({ data: { id: 901 } })

    await client.createObject(77, 'Copy source', {
      t100: 'text value',
      101: false
    }, 285)

    const [url, body] = axios.post.mock.calls[0]

    expect(url).toBe('https://app.integram.io/api/my/_m_new/77')
    expect(body.get('t77')).toBe('Copy source')
    expect(body.get('up')).toBe('285')
    expect(body.get('t100')).toBe('text value')
    expect(body.get('t101')).toBe('')
    expect(body.get('b101')).toBe('1')
    expect(body.get('tt100')).toBeNull()
    expect(axios.post.mock.calls[0][2].params).toEqual({ JSON: '' })
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

  it('normalizes metadata and terms fixtures into stable arrays and maps', () => {
    const metadata = normalizeMetadataResponse(metadataFixture)
    const terms = normalizeTermsResponse(termsFixture)
    const arrayTerms = normalizeTermsResponse([
      { id: 18, type: 3, name: 'User' },
      { id: 422, type: 9, name: 'Payment Date' }
    ])
    const dictionaryTerms = normalizeTermsResponse({
      18: 'User',
      42: { name: 'Role' }
    })

    expect(metadata.types).toHaveLength(2)
    expect(metadata.requisites[0]).toEqual(expect.objectContaining({
      id: 101,
      name: 'Status',
      typeId: 100,
      base: 3
    }))
    expect(terms.termById['3']).toBe('SHORT')
    expect(terms.baseTypes[1]).toEqual({ id: 9, name: 'Date' })
    expect(arrayTerms.terms).toHaveLength(2)
    expect(arrayTerms.termById['422']).toBe('Payment Date')
    expect(dictionaryTerms.termById).toEqual({
      18: 'User',
      42: 'Role'
    })
  })

  it('normalizes raw array terms without turning array indexes into payload keys', () => {
    const terms = normalizeTermsResponse([
      { id: 18, type: 3, name: 'User' },
      { id: 42, type: 3, name: 'Role' }
    ])

    expect(terms.terms).toHaveLength(2)
    expect(terms.termById).toEqual({ 18: 'User', 42: 'Role' })
    expect(terms).not.toHaveProperty('0')
  })

  it('normalizes raw dictionary terms from the legacy /terms endpoint', () => {
    const terms = normalizeTermsResponse({ 18: 'User', 42: 'Role' })

    expect(terms.termById).toEqual({ 18: 'User', 42: 'Role' })
    expect(terms.baseTypes).toEqual([])
  })

  it('normalizes array-shaped legacy terms responses', () => {
    const terms = normalizeTermsResponse([
      { id: 18, type: 3, name: 'User' },
      { id: 42, type: 3, val: 'Role' }
    ])

    expect(terms.terms).toHaveLength(2)
    expect(terms.termById).toEqual({
      18: 'User',
      42: 'Role'
    })
  })

  it('normalizes dictionary-shaped legacy terms responses', () => {
    const terms = normalizeTermsResponse({
      18: 'User',
      42: 'Role'
    })

    expect(terms.terms).toEqual({
      18: 'User',
      42: 'Role'
    })
    expect(terms.termById).toEqual({
      18: 'User',
      42: 'Role'
    })
  })

  it('normalizes object JSON_DATA and JSON_OBJ fixtures without dropping legacy fields', () => {
    const list = normalizeObjectListResponse(objectListFixture)
    const record = normalizeObjectRecordResponse(objectRecordFixture)

    expect(list.object).toHaveLength(1)
    expect(list.objects[0].id).toBe(5001)
    expect(list.objectRequisites['5001']['101']).toBe('Open')
    expect(list.reqOrder).toEqual(['101', '102'])
    expect(record.obj.id).toBe(5001)
    expect(record.requisites['102']).toBe('2026-05-09')
    expect(record.reqTypes['101']).toBe('Status')
  })

  it('normalizes report and reference fixtures for UI adapters', () => {
    const report = normalizeReportResponse(reportFixture)
    const rowMatrixReport = normalizeReportResponse({
      columns: reportFixture.columns,
      data: [
        ['5001', 'Prepare contract', 'Open']
      ]
    })
    const refs = normalizeReferenceOptionsResponse(referenceOptionsFixture)

    expect(report.columns.map(column => column.name)).toEqual(['Task ID', 'Task', 'Status'])
    expect(report.rows).toEqual([
      {
        'Task ID': '5001',
        Task: 'Prepare contract',
        Status: 'Open'
      }
    ])
    expect(rowMatrixReport.rows).toEqual(report.rows)
    expect(refs).toEqual({
      3001: 'Open',
      3002: 'Closed'
    })
  })

  it('uses the legacy JSON contract flags for issue 14 API methods', async () => {
    axios.get
      .mockResolvedValueOnce({ data: metadataFixture })
      .mockResolvedValueOnce({ data: termsFixture })
      .mockResolvedValueOnce({ data: objectListFixture })
      .mockResolvedValueOnce({ data: objectRecordFixture })
      .mockResolvedValueOnce({ data: reportFixture })
      .mockResolvedValueOnce({ data: referenceOptionsFixture })

    await client.getMetadata()
    await client.getTerms()
    await client.getObjectList(100, { LIMIT: 20 })
    await client.getObjectRecord(5001)
    await client.executeReport(77, { LIMIT: 1 })
    await client.getReferenceOptions(101, 5001, null, 'ope')

    expect(axios.get.mock.calls[0][0]).toBe('https://app.integram.io/api/my/metadata')
    expect(axios.get.mock.calls[0][1].params).toEqual({ JSON: '' })
    expect(axios.get.mock.calls[1][0]).toBe('https://app.integram.io/api/my/terms')
    expect(axios.get.mock.calls[1][1].params).toEqual({ JSON: '' })
    expect(axios.get.mock.calls[2][0]).toBe('https://app.integram.io/api/my/object/100')
    expect(axios.get.mock.calls[2][1].params).toEqual({ JSON_DATA: '', LIMIT: 20 })
    expect(axios.get.mock.calls[3][0]).toBe('https://app.integram.io/api/my/object/5001')
    expect(axios.get.mock.calls[3][1].params).toEqual({ JSON_OBJ: '' })
    expect(axios.get.mock.calls[4][0]).toBe('https://app.integram.io/api/my/report/77')
    expect(axios.get.mock.calls[4][1].params).toEqual({ JSON: '', LIMIT: 1 })
    expect(axios.get.mock.calls[5][0]).toBe('https://app.integram.io/api/my/_ref_reqs/101')
    expect(axios.get.mock.calls[5][1].params).toEqual({
      JSON: '',
      id: 5001,
      type: 'query',
      q: 'ope'
    })
  })

  it('keeps edit object data on the legacy edit_obj compatibility endpoint', async () => {
    axios.get.mockResolvedValue({ data: { obj: { id: 5001 }, reqs: [] } })

    await client.getObjectEditData(5001)

    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(axios.get.mock.calls[0][0]).toBe('https://app.integram.io/api/my/edit_obj/5001')
    expect(axios.get.mock.calls[0][1].params).toEqual({ JSON_KV: '' })
  })

  it('loads dir_admin through the legacy HTML endpoint without JSON flags', async () => {
    axios.get.mockResolvedValue({ data: dirAdminDirectoryHtml })

    const html = await client.getDirAdmin({ folder: 'download', addPath: '/assets' })

    expect(html).toBe(dirAdminDirectoryHtml)
    expect(axios.get).toHaveBeenCalledTimes(1)

    const [url, config] = axios.get.mock.calls[0]
    expect(url).toBe('https://app.integram.io/api/my/dir_admin')
    expect(config.params).toEqual({
      download: '1',
      add_path: '/assets'
    })
    expect(config.responseType).toBe('text')
    expect(config.params.JSON_KV).toBeUndefined()
  })

  it('posts dir_admin deletes using the legacy form fields and repeated del[] values', async () => {
    axios.post.mockResolvedValue({ data: '' })

    await client.deleteDirAdminItems({
      folder: 'templates',
      addPath: '/emails',
      items: ['layout.html', 'partials']
    })

    expect(axios.post).toHaveBeenCalledTimes(1)
    const [url, body, config] = axios.post.mock.calls[0]

    expect(url).toBe('https://app.integram.io/api/my/dir_admin')
    expect(body).toBeInstanceOf(URLSearchParams)
    expect(body.get('_xsrf')).toBe('xsrf-token')
    expect(body.get('templates')).toBe('1')
    expect(body.get('add_path')).toBe('/emails')
    expect(body.get('delete')).toBe('Удалить выбранные')
    expect(body.getAll('del[]')).toEqual(['layout.html', 'partials'])
    expect(config.params).toEqual({
      templates: '1',
      add_path: '/emails'
    })
    expect(config.responseType).toBe('text')
  })

  it('normalizes _m_new and _m_set backend errors into one UI error shape', async () => {
    const createError = normalizeApiError({
      response: {
        status: 422,
        data: mNewErrorFixture
      }
    })
    const setError = normalizeApiError({
      response: {
        status: 409,
        data: mSetErrorFixture
      }
    })

    expect(createError).toEqual(expect.objectContaining({
      name: 'IntegramApiError',
      status: 422,
      code: 'REQUIRED_REQUISITE',
      type: 'validation',
      message: 'Required requisite Status is missing'
    }))
    expect(createError.details).toEqual({ requisiteId: 101 })
    expect(setError).toEqual(expect.objectContaining({
      name: 'IntegramApiError',
      status: 409,
      code: 'OBJECT_LOCKED',
      type: 'conflict',
      message: 'Object 5001 is locked by another user'
    }))
    expect(setError.details).toEqual({ objectId: 5001 })
  })

  it('throws normalized mutation errors when the backend returns failed JSON', async () => {
    axios.post
      .mockResolvedValueOnce({ data: mNewErrorFixture })
      .mockResolvedValueOnce({ data: mSetErrorFixture })

    const expectMutationError = async (action, expected) => {
      let thrown = null
      try {
        await action()
      } catch (error) {
        thrown = error
      }
      expect(thrown).toBeInstanceOf(IntegramApiError)
      expect(thrown).toMatchObject(expected)
    }

    await expectMutationError(() => client.createObject(100, 'Missing status'), {
      code: 'REQUIRED_REQUISITE',
      type: 'business',
      message: 'Required requisite Status is missing'
    })
    await expectMutationError(() => client.setObjectRequisites(5001, { 101: 'Closed' }), {
      code: 'OBJECT_LOCKED',
      type: 'business',
      message: 'Object 5001 is locked by another user'
    })
  })

  it('keeps every issue 14 API contract backed by a fixture', () => {
    expect(INTEGRAM_API_CONTRACTS.map(contract => contract.method)).toEqual([
      'getMetadata',
      'getTerms',
      'getObjectList',
      'getObjectRecord',
      'executeReport',
      'getReferenceOptions',
      'createObject',
      'setObjectRequisites'
    ])

    for (const contract of INTEGRAM_API_CONTRACTS) {
      expect(integramApiFixtures[contract.responseFixture], contract.method).toBeTruthy()
      if (contract.errorFixture) {
        expect(integramApiFixtures[contract.errorFixture], contract.method).toBeTruthy()
      }
    }
  })
})
