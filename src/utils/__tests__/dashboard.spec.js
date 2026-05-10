import { describe, expect, it } from 'vitest'

import {
  buildDashboardState,
  collectDashboardVizData,
  DASHBOARD_PANEL_SETTINGS_REQ_ID,
  extractDashboardPanelSettings,
  formatDashboardNumber,
  normalizeDashboardReport,
  normalizeNumberText,
  parseDashboardFormula,
  serializeDashboardPanelSettings
} from '../dashboard'
import {
  dashboardModelFixture,
  dashboardPeriodFixture,
  dashboardReportFixture,
  dashboardValuesFixture
} from '../__fixtures__/dashboard'

describe('dashboard utilities', () => {
  it('keeps legacy dashboard number formatting semantics', () => {
    expect(normalizeNumberText('1 234,50')).toBe('1234.50')
    expect(normalizeNumberText('-1.234,5')).toBe('-1234.5')
    expect(formatDashboardNumber('1234.50')).toBe('1 234.50')
    expect(formatDashboardNumber('not numeric')).toBe('not numeric')
  })

  it('parses legacy dashboard formula forms', () => {
    expect(parseDashboardFormula('[Revenue]')).toMatchObject({
      type: 'item',
      item: 'Revenue',
      references: ['Revenue']
    })
    expect(parseDashboardFormula('[Sales.Amount.Won]')).toMatchObject({
      type: 'report',
      report: 'Sales',
      field: 'Amount',
      group: 'Won'
    })
    expect(parseDashboardFormula('[1001] - [1002]')).toMatchObject({
      type: 'expression',
      references: ['1001', '1002']
    })
  })

  it('matches legacy dashboard table values for multiple periods', () => {
    const state = buildDashboardState({
      modelRows: dashboardModelFixture,
      periodData: dashboardPeriodFixture,
      sourceRows: dashboardValuesFixture,
      reports: {
        '77': normalizeDashboardReport(dashboardReportFixture)
      }
    })

    const panel = state.sheets[0].panels.find(item => item.id === 'fp1')
    expect(panel.headers.map(header => header.label)).toEqual(['Metric', 'January', 'February'])

    const revenue = panel.rows.find(row => row.id === '1001')
    const cost = panel.rows.find(row => row.id === '1002')
    const profit = panel.rows.find(row => row.id === '1003')
    const margin = panel.rows.find(row => row.id === '1004')

    expect(revenue.cells.map(cell => cell.value)).toEqual(['1000', '1300'])
    expect(cost.cells.map(cell => cell.value)).toEqual(['400', '500'])
    expect(profit.cells.map(cell => cell.value)).toEqual(['600', '800'])
    expect(margin.cells.map(cell => cell.value)).toEqual(['60', '61.53846153846154'])
  })

  it('normalizes report-backed dashboard panels and chart/pivot datasets', () => {
    const report = normalizeDashboardReport(dashboardReportFixture)
    const state = buildDashboardState({
      modelRows: dashboardModelFixture,
      periodData: dashboardPeriodFixture,
      sourceRows: dashboardValuesFixture,
      reports: { 77: report }
    })
    const panel = state.sheets[0].panels.find(item => item.id === 'fp2')

    expect(panel.report.rows).toHaveLength(3)
    expect(panel.filters.Stage.selected).toEqual(['Won'])

    const chart = collectDashboardVizData(panel, 'bar', {
      fieldMap: { labelField: 'Stage', valueField: 'Amount', seriesField: 'Owner' }
    })
    expect(chart.labels).toEqual(['Won'])
    expect(chart.datasets).toEqual([
      { label: 'Ann', data: [1000] },
      { label: 'Bob', data: [500] }
    ])

    const pivot = collectDashboardVizData(panel, 'pivot', {
      fieldMap: { pivotRows: 'Stage', pivotCols: 'Owner', pivotVals: 'Amount' }
    })
    expect(pivot.rows).toEqual(['Won'])
    expect(pivot.columns).toEqual(['Ann', 'Bob'])
    expect(pivot.matrix).toEqual([[1000, 500]])
  })

  it('reads and writes object-backed legacy panel settings', () => {
    const settings = [{ type: 'line', default: true }]
    const row = {
      panelSettings: '',
      reqs: {
        [DASHBOARD_PANEL_SETTINGS_REQ_ID]: { val: JSON.stringify(settings) }
      }
    }

    expect(extractDashboardPanelSettings(row)).toEqual(settings)
    expect(serializeDashboardPanelSettings(settings)).toBe(JSON.stringify(settings))
  })

  it('builds panel state from object-backed settings when report aliases are absent', () => {
    const modelRows = [
      {
        ...dashboardModelFixture[0],
        panelSettings: '',
        reqs: {
          [DASHBOARD_PANEL_SETTINGS_REQ_ID]: {
            val: JSON.stringify([{ type: 'line', default: true }])
          }
        }
      }
    ]

    const state = buildDashboardState({
      modelRows,
      periodData: dashboardPeriodFixture,
      sourceRows: dashboardValuesFixture
    })

    expect(state.sheets[0].panels[0].settings).toEqual([{ type: 'line', default: true }])
    expect(state.sheets[0].panels[0].activeViz).toBe('line')
  })
})
