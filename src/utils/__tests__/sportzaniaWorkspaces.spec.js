import { describe, expect, it } from 'vitest'
import {
  SPORTZANIA_LEGACY_TEMPLATES,
  TASKDASH_INCOMPLETE_STATUS_OPTION,
  aggregateRatingPerformers,
  buildRatingReportParams,
  buildRatingSummary,
  buildSportzaniaOrgChart,
  buildTaskdashReportParams,
  buildTaskdashSummary,
  createRatingDefaultFilters,
  createTaskdashDefaultFilters,
  normalizeSportzaniaReportResponse,
  taskdashBuildMonthlySeries,
} from '../sportzaniaWorkspaces'
import {
  ratingReportFixture,
  structRowsFixture,
  taskdashReportFixture,
} from '../__fixtures__/sportzania'

describe('Sportzania workspace helpers', () => {
  it('inventories every legacy template with a Vue route or explicit fallback', () => {
    expect(SPORTZANIA_LEGACY_TEMPLATES.map(item => item.template)).toEqual([
      'templates/sportzania/main.html',
      'templates/sportzania/procvac.html',
      'templates/sportzania/rating.html',
      'templates/sportzania/struct.html',
      'templates/sportzania/taskdash.html',
    ])

    expect(SPORTZANIA_LEGACY_TEMPLATES.every(item => item.vueRoute || item.fallback)).toBe(true)
  })

  it('normalizes task dashboard JSON_KV column matrices and preserves report filter contracts', () => {
    const { columns, rows } = normalizeSportzaniaReportResponse(taskdashReportFixture)
    expect(rows[0]).toMatchObject({
      Месяц: '2026-01-15',
      Департамент: 'Операции',
      Завершена: '5',
      'Статус задачи': '8925: Завершена',
    })

    const filters = createTaskdashDefaultFilters(2026, columns)
    const monthColumn = columns.find(column => column.name === 'Месяц')
    const departmentColumn = columns.find(column => column.name === 'Департамент')
    const statusColumn = columns.find(column => column.name === 'Статус задачи')
    filters[departmentColumn.id] = { value: 'Операции' }
    filters[statusColumn.id] = { value: TASKDASH_INCOMPLETE_STATUS_OPTION.value }

    expect(buildTaskdashReportParams(columns, filters)).toEqual({
      _jsonFormat: 'JSON_KV',
      [`FR_${monthColumn.name}`]: '01.01.2026',
      [`TO_${monthColumn.name}`]: '31.12.2026',
      [`FR_${departmentColumn.name}`]: '%Операции%',
      FR_СтатусID: '!8925',
    })
  })

  it('builds task dashboard KPI and monthly series from legacy rows', () => {
    const { columns, rows } = normalizeSportzaniaReportResponse(taskdashReportFixture)

    expect(buildTaskdashSummary(rows, columns)).toEqual({
      completed: 12,
      active: 8,
      overdue: 3,
      delayed: 3,
      total: 26,
      completionRate: 46,
    })

    expect(taskdashBuildMonthlySeries(rows, columns).map(item => ({
      key: item.key,
      completed: item.completed,
      active: item.active,
      overdue: item.overdue,
      delayed: item.delayed,
      total: item.total,
    }))).toEqual([
      { key: '2026-01', completed: 8, active: 7, overdue: 1, delayed: 3, total: 19 },
      { key: '2026-02', completed: 4, active: 1, overdue: 2, delayed: 0, total: 7 },
    ])
  })

  it('aggregates Sportzania rating performers with task-weighted scores', () => {
    const { columns, rows } = normalizeSportzaniaReportResponse(ratingReportFixture)
    const filters = createRatingDefaultFilters(2026, columns)
    const periodColumn = columns.find(column => column.name === 'Срок')
    const departmentColumn = columns.find(column => column.name === 'Департамент')
    filters[departmentColumn.id] = { value: 'Операции' }

    expect(buildRatingReportParams(columns, filters)).toEqual({
      _jsonFormat: 'JSON_KV',
      [`FR_${periodColumn.name}`]: '01.01.2026',
      [`TO_${periodColumn.name}`]: '31.12.2026',
      [`FR_${departmentColumn.name}`]: '%Операции%',
    })

    const performers = aggregateRatingPerformers(rows, columns)
    expect(performers.map(item => ({
      name: item.name,
      department: item.department,
      tasks: item.tasks,
      score: Math.round(item.score * 10) / 10,
    }))).toEqual([
      { name: 'Анна Орлова', department: 'Операции', tasks: 15, score: 81.7 },
      { name: 'Борис Петров', department: 'Продажи', tasks: 8, score: 65 },
    ])

    expect(buildRatingSummary(performers)).toMatchObject({
      performers: 2,
      tasks: 23,
    })
  })

  it('builds the company structure tree from report 8027 rows', () => {
    const chart = buildSportzaniaOrgChart(structRowsFixture)

    expect(chart.rootId).toBe('1')
    expect(chart.departments['1'].heads.map(item => item.name)).toEqual(['Ирина Лидер'])
    expect(chart.departments['2'].heads.map(item => item.name)).toEqual(['Павел Операционный'])
    expect(chart.departments['2'].employees.map(item => item.name)).toEqual(['Мария Координатор'])
    expect(chart.children['1']).toEqual(['2', '3'])
    expect(chart.departments['3'].employees).toEqual([])
  })
})
