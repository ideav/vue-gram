import { describe, expect, it } from 'vitest'

import {
  COLUMN_REQS,
  JOIN_REQS,
  REPORT_REQS,
  decodeOrderValue,
  encodeOrderValue,
  generateReportSqlPreview,
  normalizeReportBuilderState,
  normalizeReportPreview,
  serializeColumnSettings,
  serializeNewReportColumn,
  serializeNewReportJoin,
  serializeReportSettings,
  serializeSingleColumnSetting
} from '../integramReportBuilder'

describe('integramReportBuilder', () => {
  it('normalizes legacy sql.html report settings, columns, joins, and preview data', () => {
    const state = normalizeReportBuilderState({
      editData: {
        obj: { id: 900, val: 'Продажи' },
        reqs: {
          [REPORT_REQS.interactive]: { value: '1' },
          [REPORT_REQS.limit]: { value: '25' }
        }
      },
      columnsData: {
        object: [
          { id: 1001, val: 'Сумма', ref: 501 },
          { id: 1002, val: 'Создано', ref: 502 }
        ],
        reqs: {
          1001: {
            [COLUMN_REQS.alias]: 'Сумма продаж',
            [COLUMN_REQS.filterFrom]: '100',
            [COLUMN_REQS.filterTo]: '500',
            [COLUMN_REQS.totals]: '67',
            [COLUMN_REQS.order]: '-2'
          },
          1002: {
            [COLUMN_REQS.format]: 'DATE',
            [COLUMN_REQS.hidden]: '1'
          }
        },
        rep_col_list: [
          { id: 42, table: 42, name: 'Заказы', type: '42' },
          { id: 501, table: 42, name: 'Заказы -> Сумма', type: 'NUMBER', format: 'NUMBER' },
          { id: 502, table: 42, name: 'Заказы -> Создано', type: 'DATE', format: 'DATE' }
        ]
      },
      joinsData: {
        object: [{ id: 7001, val: 42 }],
        reqs: {
          7001: {
            [JOIN_REQS.alias]: 'orders',
            [JOIN_REQS.condition]: 'aorders.id=r501.t'
          }
        }
      },
      previewData: {
        columns: [
          { id: 1001, name: 'Сумма продаж', format: 'NUMBER', totals: '600' },
          { id: 1002, name: 'Создано', format: 'DATE' }
        ],
        data: [
          ['100', '200'],
          ['2026-05-01', '2026-05-02']
        ]
      }
    })

    expect(state.report).toEqual({
      id: '900',
      name: 'Продажи',
      interactive: true,
      limit: '25'
    })
    expect(state.availableTables).toHaveLength(1)
    expect(state.availableColumnsByTable['42']).toHaveLength(2)
    expect(state.columns[0]).toMatchObject({
      id: '1001',
      sourceColumnId: '501',
      alias: 'Сумма продаж',
      filterFrom: '100',
      filterTo: '500',
      totals: '67',
      orderDirection: 'DESC',
      orderPriority: 2,
      hidden: false
    })
    expect(state.columns[1]).toMatchObject({
      id: '1002',
      sourceColumnId: '502',
      format: 'DATE',
      hidden: true
    })
    expect(state.joins[0]).toMatchObject({
      id: '7001',
      alias: 'orders',
      condition: 'aorders.id=r501.t'
    })
    expect(state.preview.rows).toEqual([
      { 'Сумма продаж': '100', 'Создано': '2026-05-01' },
      { 'Сумма продаж': '200', 'Создано': '2026-05-02' }
    ])
    expect(state.preview.totals).toEqual({ 'Сумма продаж': '600' })
  })

  it('serializes report and column settings using legacy requisite ids', () => {
    expect(serializeReportSettings({ interactive: true, limit: 50 })).toEqual({
      [REPORT_REQS.interactive]: '1',
      [REPORT_REQS.limit]: '50'
    })
    expect(serializeReportSettings({ interactive: false, limit: '' })).toEqual({
      [REPORT_REQS.interactive]: '',
      [REPORT_REQS.limit]: ''
    })

    expect(serializeColumnSettings({
      alias: 'Итого',
      filterFrom: '10',
      filterTo: '20',
      format: '84',
      function: '85',
      totals: '67',
      expression: 'val',
      havingFrom: '100',
      havingTo: '300',
      setExpression: 'RAND()',
      sourceAlias: 'orders',
      hidden: true,
      orderDirection: 'DESC',
      orderPriority: 3
    })).toEqual({
      [COLUMN_REQS.alias]: 'Итого',
      [COLUMN_REQS.filterFrom]: '10',
      [COLUMN_REQS.filterTo]: '20',
      [COLUMN_REQS.format]: '84',
      [COLUMN_REQS.function]: '85',
      [COLUMN_REQS.totals]: '67',
      [COLUMN_REQS.expression]: 'val',
      [COLUMN_REQS.havingFrom]: '100',
      [COLUMN_REQS.havingTo]: '300',
      [COLUMN_REQS.setExpression]: 'RAND()',
      [COLUMN_REQS.sourceAlias]: 'orders',
      [COLUMN_REQS.hidden]: '1',
      [COLUMN_REQS.order]: '-3'
    })

    expect(serializeSingleColumnSetting('orderPriority', 2, { orderDirection: 'ASC' })).toEqual({
      [COLUMN_REQS.order]: '2'
    })
    expect(serializeSingleColumnSetting('hidden', false)).toEqual({
      [COLUMN_REQS.hidden]: ''
    })
  })

  it('prepares create payloads for report columns and manual joins', () => {
    expect(serializeNewReportColumn(501, 'Сумма')).toEqual({
      typeId: 28,
      value: '501',
      requisites: {
        [COLUMN_REQS.alias]: 'Сумма'
      }
    })

    expect(serializeNewReportJoin(42, 'orders', 'aorders.id=r501.t')).toEqual({
      typeId: 44,
      value: '42',
      requisites: {
        [JOIN_REQS.alias]: 'orders',
        [JOIN_REQS.condition]: 'aorders.id=r501.t'
      }
    })
  })

  it('generates a SQL preview from legacy report settings', () => {
    const sql = generateReportSqlPreview({
      report: { limit: '25' },
      availableTables: [{ id: '42', name: 'Заказы' }],
      joins: [{ alias: 'clients', condition: 'aclients.id=r502.t' }],
      columns: [
        {
          id: '1001',
          sourceName: 'amount',
          alias: 'Сумма',
          filterFrom: '100',
          totals: '67',
          orderDirection: 'DESC',
          orderPriority: 1,
          hidden: false
        },
        {
          id: '1002',
          sourceName: 'created_at',
          alias: 'Дата',
          havingTo: '2026-05-10',
          hidden: false
        }
      ]
    })

    expect(sql).toContain('SELECT')
    expect(sql).toContain('SUM(amount) AS "Сумма"')
    expect(sql).toContain('FROM "Заказы"')
    expect(sql).toContain('LEFT JOIN clients ON aclients.id=r502.t')
    expect(sql).toContain('WHERE amount >= "100"')
    expect(sql).toContain('HAVING created_at <= "2026-05-10"')
    expect(sql).toContain('ORDER BY amount DESC')
    expect(sql).toContain('LIMIT 25')
  })

  it('decodes and encodes legacy order values', () => {
    expect(decodeOrderValue('-3')).toEqual({ orderDirection: 'DESC', orderPriority: 3 })
    expect(decodeOrderValue('2')).toEqual({ orderDirection: 'ASC', orderPriority: 2 })
    expect(decodeOrderValue('')).toEqual({ orderDirection: '', orderPriority: '' })

    expect(encodeOrderValue('DESC', 4)).toBe('-4')
    expect(encodeOrderValue('ASC', '1')).toBe('1')
    expect(encodeOrderValue('', 1)).toBe('')
  })

  it('normalizes array and column-oriented report preview responses', () => {
    expect(normalizeReportPreview([{ A: 1, B: 2 }])).toEqual({
      columns: [
        { field: 'A', header: 'A' },
        { field: 'B', header: 'B' }
      ],
      rows: [{ A: 1, B: 2 }],
      totals: null,
      error: null
    })

    expect(normalizeReportPreview({
      columns: [{ name: 'A' }, { name: 'B', totals: '9' }],
      data: [[1, 2], [3, 4]]
    })).toMatchObject({
      rows: [
        { A: 1, B: 3 },
        { A: 2, B: 4 }
      ],
      totals: { B: '9' }
    })

    expect(normalizeReportPreview({ error: 'Preview failed' })).toEqual({
      columns: [],
      rows: [],
      totals: null,
      error: 'Preview failed'
    })
  })
})
