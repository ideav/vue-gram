import { describe, expect, it } from 'vitest'
import {
  applyProcVacEventCounts,
  buildProcVacColumns,
  buildProcVacSaveRequest,
  calculateWeeksInWork,
  filterProcVacRows,
  filterRowsByArchiveMonth,
  getArchiveMonthOptions,
  getSectionHireTypeSummary,
  groupProcVacRows,
  highlightProcVacTextParts,
  normalizeProcVacReferenceOptions,
  normalizeProcVacRow,
  updateProcVacLocalRow,
} from '../procvac'
import {
  procVacEventRowsFixture,
  procVacMetadataFixture,
  procVacMetadataWithoutEventCountFixture,
  procVacReferenceOptionsFixture,
  procVacRowsFixture,
} from '../__fixtures__/procvac'

describe('ProcVac parity helpers', () => {
  it('maps legacy metadata to the fixed ProcVac column set', () => {
    const columns = buildProcVacColumns(procVacMetadataFixture)

    expect(columns.map(column => column.label)).toEqual([
      'Вакансия актуальная',
      'Статус',
      'Отдел',
      'План',
      'Факт',
      'Заявка',
      'Ответственный',
      'Старт работы',
      'Дедлайн',
      'Выход',
      'Штат/Лагерь/ОШ',
      'Недель в работе',
      'События',
      'Комментарии',
    ])
    expect(columns.find(column => column.key === 'status').source.id).toBe('8140')
    expect(columns.find(column => column.key === 'events').source.id).toBe('8214')
    expect(columns.find(column => column.key === 'events').editable).toBe(false)
    expect(columns.find(column => column.key === 'weeksInWork').editable).toBe(false)
  })

  it('normalizes rows, derives sections, searches text, and preserves archive month behavior', () => {
    const now = new Date('2026-04-27T12:00:00Z')
    const columns = buildProcVacColumns(procVacMetadataFixture)
    const rows = procVacRowsFixture.map(row => normalizeProcVacRow(row, columns, now))

    expect(rows[0].values.weeksInWork).toBe('2')
    expect(rows[0].values.department).toBe('ДД')
    expect(rows[2].values.request).toBe('https://docs.google.com/doc')
    expect(calculateWeeksInWork('2030-01-01', now)).toBe('0')

    const sections = groupProcVacRows(rows, now)
    expect(sections.active.map(row => row.id)).toEqual([8162])
    expect(sections.closedThisMonth.map(row => row.id)).toEqual([8172, 8200])
    expect(sections.archive.map(row => row.id)).toEqual([9000])

    expect(filterProcVacRows(rows, 'педагог').map(row => row.id)).toEqual([8200])
    expect(highlightProcVacTextParts('Педагог ТМХ', 'педагог')).toEqual([
      { text: 'Педагог', match: true },
      { text: ' ТМХ', match: false },
    ])

    expect(getArchiveMonthOptions(sections.archive)).toEqual([
      { key: '2026-02', label: 'фев 2026' },
    ])
    expect(filterRowsByArchiveMonth(sections.archive, '2026-02').map(row => row.id)).toEqual([9000])
  })

  it('keeps active hire-type summaries in the legacy order', () => {
    const metadata = {
      ...procVacMetadataFixture,
      reqs: procVacMetadataFixture.reqs.filter(req => req.id !== '8214'),
    }
    const columns = buildProcVacColumns(metadata)
    const rows = [
      { i: 1, r: ['Координатор', '8158:В работе', '2870:Департамент', '1', '', '', '2616:darias', '05.03.2026', '31.03.2026', '', '7940:Штат', ''] },
      { i: 2, r: ['Вожатый', '8169:Не начато', '2870:Департамент', '1', '', '', '2616:darias', '07.03.2026', '31.03.2026', '', '7938:Лагерь', ''] },
      { i: 3, r: ['Методист', '8158:В работе', '2870:Департамент', '1', '', '', '2616:darias', '08.03.2026', '31.03.2026', '', '7940:Штат', ''] },
      { i: 4, r: ['ОШ', '8158:В работе', '2870:Департамент', '1', '', '', '2616:darias', '09.03.2026', '31.03.2026', '', '7939:ОШ', ''] },
    ].map(row => normalizeProcVacRow(row, columns, new Date('2026-03-15T12:00:00Z')))

    expect(getSectionHireTypeSummary(rows)).toEqual([
      { key: 'штат', label: 'Штат', count: 2 },
      { key: 'лагерь', label: 'Лагерь', count: 1 },
      { key: 'ош', label: 'ОШ', count: 1 },
    ])
  })

  it('falls back to subordinate event rows and builds legacy _m_set requests', () => {
    const columns = buildProcVacColumns(procVacMetadataWithoutEventCountFixture)
    const rows = procVacRowsFixture.map(row => normalizeProcVacRow(row, columns, new Date('2026-04-27T12:00:00Z')))
    const counted = applyProcVacEventCounts(rows, procVacEventRowsFixture)

    expect(counted.find(row => row.id === 8162).values.events).toBe('2')
    expect(counted.find(row => row.id === 9000).values.events).toBe('1')

    const statusColumn = columns.find(column => column.key === 'status')
    expect(buildProcVacSaveRequest({
      rowId: 8162,
      column: statusColumn,
      value: '8169',
      xsrf: 'test-xsrf',
    })).toEqual({
      endpoint: '_m_set/8162',
      jsonMode: 'JSON',
      body: {
        _xsrf: 'test-xsrf',
        t8140: '8169',
      },
    })

    const updated = updateProcVacLocalRow(counted[0], statusColumn, '8169', 'Не начато', new Date('2026-04-27T12:00:00Z'))
    expect(updated.rawValues.status).toBe('8169:Не начато')
    expect(updated.values.status).toBe('Не начато')
  })

  it('normalizes legacy reference option payload shapes', () => {
    expect(normalizeProcVacReferenceOptions(procVacReferenceOptionsFixture)).toEqual([
      { id: '8158', text: 'В работе' },
      { id: '8169', text: 'Не начато' },
      { id: '8173', text: 'Вышел' },
    ])
    expect(normalizeProcVacReferenceOptions({ 8158: 'В работе' })).toEqual([
      { id: '8158', text: 'В работе' },
    ])
  })
})
