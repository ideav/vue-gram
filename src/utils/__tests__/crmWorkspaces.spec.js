import { describe, expect, it } from 'vitest'
import {
  buildCardsColumnsFromMetadata,
  buildKanbanStatusUpdateRequest,
  computeFunnelEntries,
  detectCardFields,
  detectFunnelStages,
  filterKanbanCards,
  groupKanbanCardsByStatus,
  normalizeKanbanObjectCards,
  normalizeKanbanReport,
  parseCardsJsonObjRows,
} from '../crmWorkspaces'
import {
  cardsMetadataFixture,
  cardsRowsFixture,
  funnelRowsFixture,
  kanbanObjectMetadataFixture,
  kanbanObjectRowsFixture,
  kanbanReportFixture,
  kanbanStagesFixture,
} from '../__fixtures__/crmWorkspaces'

describe('crm workspace helpers', () => {
  it('normalizes report cards, groups by status, and filters manager/product/partner facets', () => {
    const { cards, statusFieldId, activityFieldId } = normalizeKanbanReport(kanbanReportFixture)

    expect(statusFieldId).toBe('350')
    expect(activityFieldId).toBe('357')
    expect(cards).toHaveLength(3)

    const filtered = filterKanbanCards(cards, {
      search: 'платформа',
      manager: 'Анна',
      product: 'CRM',
      partner: 'Ideav',
    })
    expect(filtered.map(card => card._cardId)).toEqual(['101'])

    const groups = groupKanbanCardsByStatus(cards, kanbanStagesFixture)
    expect(groups.map(group => [group.statusName, group.cards.length, group.totalAmount])).toEqual([
      ['Лид', 1, 3000000],
      ['Скрининг', 1, 1200000],
      ['КП', 1, 500000],
      ['Оплата', 0, 0],
    ])

    expect(normalizeKanbanReport({ '&rep.9100': kanbanReportFixture }).statusFieldId).toBe('350')
  })

  it('parses object JSON_OBJ kanban rows without shifting requisites over the main object value', () => {
    const { cards, statuses, statusFieldId, activityFieldId } = normalizeKanbanObjectCards(
      kanbanObjectRowsFixture,
      kanbanObjectMetadataFixture
    )

    expect(statusFieldId).toBe('115')
    expect(activityFieldId).toBe('121')
    expect(cards[0]).toMatchObject({
      _cardId: '447',
      'Лид': 'sportzania',
      'СтатусID': '145',
      'Статус': 'admin',
      'Дата': '26.02.2026',
      Activity: '1775992679.926',
    })
    expect(statuses).toEqual([{ 'Статус': 'admin', 'СтатусID': '145', 'Цвет': null }])
  })

  it('builds the legacy _m_set payload used by kanban drag-and-drop status updates', () => {
    expect(
      buildKanbanStatusUpdateRequest({
        cardId: 101,
        newStatusId: 324,
        statusFieldId: 350,
        activityFieldId: 357,
        xsrf: 'test-xsrf',
        now: new Date('2026-02-21T12:00:00Z'),
      })
    ).toEqual({
      endpoint: '_m_set/101',
      jsonMode: 'JSON',
      body: {
        t350: '324',
        t357: '1771675200',
        _xsrf: 'test-xsrf',
      },
    })
  })

  it('detects funnel stages, filters out date fields, and preserves trailing zero stages', () => {
    const { stages, dateField } = detectFunnelStages(funnelRowsFixture)
    expect(dateField).toBe('Дата')
    expect(stages).toEqual([
      'Первый контакт',
      'Анкета',
      'Интервью',
      'Оффер',
      'Оффер принят',
      'Старт обучения',
    ])

    const entries = computeFunnelEntries(funnelRowsFixture.slice(1), stages)
    expect(entries.map(entry => ({
      stage: entry.stage,
      count: entry.count,
      conversion: entry.conversion,
    }))).toEqual([
      { stage: 'Первый контакт', count: 5, conversion: null },
      { stage: 'Анкета', count: 3, conversion: 60 },
      { stage: 'Интервью', count: 2, conversion: 67 },
      { stage: 'Оффер', count: 1, conversion: 50 },
      { stage: 'Оффер принят', count: 0, conversion: 0 },
      { stage: 'Старт обучения', count: 0, conversion: null },
    ])
  })

  it('builds cards columns from metadata, parses JSON_OBJ rows, and detects card fields', () => {
    const columns = buildCardsColumnsFromMetadata(cardsMetadataFixture)
    const rows = parseCardsJsonObjRows(cardsRowsFixture)
    const fieldMap = detectCardFields(columns)

    expect(rows[0]).toEqual([
      'ru2',
      'admin',
      'drynny@mail.ru',
      '89955060167',
      '26.02.2026',
      'Мефистоклюс',
      'Администратор системы, ноукодер',
      '12.03.2026 12:54:54',
    ])
    expect(fieldMap.title.colIdx).toBe(0)
    expect(fieldMap.status.colIdx).toBe(1)
    expect(fieldMap.email.colIdx).toBe(2)
    expect(fieldMap.phone.colIdx).toBe(3)
    expect(fieldMap.date.colIdx).toBe(4)
    expect(fieldMap.description.colIdx).toBe(5)
  })
})
