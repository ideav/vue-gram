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

  it('normalizes metadata and terms fixtures into stable arrays and maps', () => {
    const metadata = normalizeMetadataResponse(metadataFixture)
    const terms = normalizeTermsResponse(termsFixture)

    expect(metadata.types).toHaveLength(2)
    expect(metadata.requisites[0]).toEqual(expect.objectContaining({
      id: 101,
      name: 'Status',
      typeId: 100,
      base: 3
    }))
    expect(terms.termById['3']).toBe('SHORT')
    expect(terms.baseTypes[1]).toEqual({ id: 9, name: 'Date' })
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
    const refs = normalizeReferenceOptionsResponse(referenceOptionsFixture)

    expect(report.columns.map(column => column.name)).toEqual(['Task ID', 'Task', 'Status'])
    expect(report.rows).toEqual([
      {
        'Task ID': '5001',
        Task: 'Prepare contract',
        Status: 'Open'
      }
    ])
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
