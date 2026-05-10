import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import {
  buildFormPanelFields,
  buildSubmitPayload,
  normalizeFormPanel,
  normalizeQuizConfig,
  validateRequiredFields
} from '../integramForms'
import {
  filledFormValues,
  formApiFixtures,
  quizSchemaFixture,
  validationErrorsFixture
} from '@/components/integram/__fixtures__/forms'

describe('integram form adapters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-10T09:30:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('normalizes legacy form panels and configured fields into runtime fields', () => {
    const panel = normalizeFormPanel(
      formApiFixtures.panels.object[0],
      formApiFixtures.panels.reqs
    )
    const fields = buildFormPanelFields({
      panel,
      configuredFields: formApiFixtures.fields.object,
      configuredReqs: formApiFixtures.fields.reqs,
      metadata: formApiFixtures.metadata
    })

    expect(panel).toMatchObject({
      id: '601',
      title: 'Заявка',
      typeId: '42',
      panelType: 'DataEntry',
      nextAction: '/thanks'
    })
    expect(fields.map(field => [field.id, field.name, field.baseType, field.required])).toEqual([
      ['42', 'Название заявки', 'SHORT', true],
      ['101', 'Email', 'SHORT', true],
      ['102', 'Согласие', 'BOOLEAN', true],
      ['103', 'Статус', 'SHORT', true],
      ['104', 'Документ', 'FILE', false]
    ])
    expect(fields[0].isObjectValue).toBe(true)
    expect(fields[3]).toMatchObject({
      isReference: true,
      refTypeId: '200'
    })
  })

  it('reports required validation errors from legacy metadata', () => {
    const panel = normalizeFormPanel(
      formApiFixtures.panels.object[0],
      formApiFixtures.panels.reqs
    )
    const fields = buildFormPanelFields({
      panel,
      configuredFields: formApiFixtures.fields.object,
      configuredReqs: formApiFixtures.fields.reqs,
      metadata: formApiFixtures.metadata
    })

    expect(validateRequiredFields(fields, {})).toEqual(validationErrorsFixture)
  })

  it('builds legacy _m_new object value and requisite payloads', () => {
    const panel = normalizeFormPanel(
      formApiFixtures.panels.object[0],
      formApiFixtures.panels.reqs
    )
    const fields = buildFormPanelFields({
      panel,
      configuredFields: formApiFixtures.fields.object,
      configuredReqs: formApiFixtures.fields.reqs,
      metadata: formApiFixtures.metadata
    })

    expect(buildSubmitPayload(fields, filledFormValues)).toEqual({
      objectValue: 'Lead #1',
      requisites: {
        101: 'lead@example.test',
        102: true,
        103: 301,
        104: ''
      }
    })
  })

  it('normalizes quiz settings into paged form fields and submit payload', () => {
    const quiz = normalizeQuizConfig(quizSchemaFixture, 801)

    expect(quiz).toMatchObject({
      id: 801,
      typeId: '77',
      name: 'Анкета участника',
      submitLabel: 'Отправить анкету',
      totalPages: 2
    })
    expect(quiz.fields.map(field => [field.id, field.page, field.baseType, field.required])).toEqual([
      ['77', 1, 'SHORT', true],
      ['201', 1, 'DATE', false],
      ['202', 2, 'DDL', true],
      ['203', 2, 'BOOLEAN', true]
    ])
    expect(quiz.fields[0].isObjectValue).toBe(true)
    expect(quiz.fields[1].defaultValue).toBe('2026-05-10')

    expect(buildSubmitPayload(quiz.fields, {
      77: 'Иван Петров',
      201: '2026-05-10',
      202: '301',
      203: true
    })).toEqual({
      objectValue: 'Иван Петров',
      requisites: {
        201: '2026-05-10',
        202: '301',
        203: true
      }
    })
  })
})
