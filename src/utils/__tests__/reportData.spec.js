import { describe, expect, it } from 'vitest'
import {
  backendErrorResponse,
  emptyReportResponse,
  permissionErrorResponse,
  reportRowsResponse
} from '@/components/integram/__fixtures__/reports'
import {
  deserializeReportFilters,
  normalizeReportResponse,
  serializeReportFilters
} from '../reportData'

describe('reportData utilities', () => {
  it('normalizes legacy JSON report rows with column metadata and totals', () => {
    const report = normalizeReportResponse(reportRowsResponse, {
      reportId: 42
    })

    expect(report.report_name).toBe('Sales report')
    expect(report.columns).toEqual([
      expect.objectContaining({ id: 1001, field: 'Created At', header: 'Created At', format: 'DATE' }),
      expect.objectContaining({ id: 1002, field: 'Amount', header: 'Amount', format: 'NUMBER' }),
      expect.objectContaining({ id: 1003, field: 'Status', header: 'Status', format: 'SHORT' })
    ])
    expect(report.rows).toEqual([
      { 'Created At': '2026-05-01', Amount: '100', Status: 'Open' },
      { 'Created At': '2026-05-02', Amount: '200', Status: 'Closed' }
    ])
    expect(report.totals).toEqual({ Amount: '300' })
    expect(report.total_rows).toBe(2)
  })

  it('keeps columns for an empty report', () => {
    const report = normalizeReportResponse(emptyReportResponse, {
      reportId: 77
    })

    expect(report.report_name).toBe('Empty report')
    expect(report.columns.map(column => column.field)).toEqual(['Name', 'Total'])
    expect(report.rows).toEqual([])
    expect(report.total_rows).toBe(0)
  })

  it('turns backend error payloads into thrown errors', () => {
    expect(() => normalizeReportResponse(permissionErrorResponse)).toThrow('Доступ запрещен')
    expect(() => normalizeReportResponse(backendErrorResponse)).toThrow('Ошибка сервера')
  })

  it('serializes report filters using legacy FR_/TO_ parameter names', () => {
    const report = normalizeReportResponse(reportRowsResponse)
    const params = serializeReportFilters({
      'Created At': { from: '2026-05-01', to: '2026-05-31' },
      Amount: { from: '100', to: '' },
      Status: { from: '', to: 'Open' }
    }, report.columns)

    expect(params).toEqual({
      FR_Created_At: '2026-05-01',
      TO_Created_At: '2026-05-31',
      FR_Amount: '100',
      TO_Status: 'Open'
    })
  })

  it('deserializes legacy FR_/TO_ params back into filter state', () => {
    const report = normalizeReportResponse(reportRowsResponse)
    const filters = deserializeReportFilters({
      FR_Created_At: '2026-05-01',
      TO_Created_At: '2026-05-31',
      FR_Amount: '100'
    }, report.columns)

    expect(filters).toEqual({
      'Created At': { from: '2026-05-01', to: '2026-05-31' },
      Amount: { from: '100', to: '' }
    })
  })
})
