import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import IntegramQuiz from '../IntegramQuiz.vue'
import {
  quizApiFixtures,
  quizResultFixture
} from '../__fixtures__/forms'
import integramApiClient from '@/services/integramApiClient'

const mockToast = vi.hoisted(() => ({
  add: vi.fn()
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => mockToast
}))

vi.mock('@/services/integramApiClient', () => ({
  default: {
    setDatabase: vi.fn(),
    getDatabase: vi.fn(() => 'my'),
    getObjectList: vi.fn(),
    createObject: vi.fn()
  }
}))

const stubs = {
  IntegramBreadcrumb: { template: '<nav data-testid="breadcrumbs" />' },
  Card: { template: '<section><slot name="title" /><slot name="content" /></section>' },
  Message: { template: '<div><slot /></div>' },
  ProgressBar: { props: ['value'], template: '<div data-testid="progress">{{ value }}</div>' },
  Button: {
    props: ['label', 'type', 'disabled', 'loading'],
    emits: ['click'],
    template: '<button :type="type || \'button\'" :disabled="disabled || loading" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>'
  }
}

function mockQuizApi() {
  integramApiClient.getObjectList.mockImplementation((typeId) => {
    if (String(typeId) === '269') return Promise.resolve(quizApiFixtures.list)
    if (String(typeId) === '200') return Promise.resolve(quizApiFixtures.referenceOptions)
    return Promise.resolve({ object: [], reqs: {} })
  })
  integramApiClient.createObject.mockResolvedValue(quizResultFixture.result)
}

function mountQuiz(props = {}) {
  return mount(IntegramQuiz, {
    props: {
      database: 'my',
      quizId: 801,
      session: { database: 'my' },
      ...props
    },
    global: {
      stubs
    }
  })
}

describe('IntegramQuiz', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-10T10:00:00Z'))
    vi.clearAllMocks()
    mockQuizApi()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads a legacy quiz schema and renders the first page', async () => {
    const wrapper = mountQuiz()
    await flushPromises()

    expect(integramApiClient.setDatabase).toHaveBeenCalledWith('my')
    expect(integramApiClient.getObjectList).toHaveBeenCalledWith(269, {
      F_271: 'QUIZ',
      LIMIT: 1000
    })
    expect(wrapper.get('[data-testid="quiz-title"]').text()).toContain('Анкета участника')
    expect(wrapper.get('[data-testid="input-77"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="input-201"]').element.value).toBe('2026-05-10')
    expect(wrapper.text()).not.toContain('Статус')
  })

  it('validates current-page required fields before navigating', async () => {
    const wrapper = mountQuiz()
    await flushPromises()

    await wrapper.get('[data-testid="quiz-next"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Заполните поле ФИО')
    expect(integramApiClient.createObject).not.toHaveBeenCalled()
  })

  it('submits quiz answers as an Integram object payload', async () => {
    const wrapper = mountQuiz()
    await flushPromises()

    await wrapper.get('[data-testid="input-77"]').setValue('Иван Петров')
    await wrapper.get('[data-testid="quiz-next"]').trigger('click')
    await flushPromises()

    expect(integramApiClient.getObjectList).toHaveBeenCalledWith('200', { LIMIT: 1000 })
    await wrapper.get('[data-testid="input-202"]').setValue('301')
    await wrapper.get('[data-testid="input-203"]').setValue(true)
    await wrapper.get('[data-testid="quiz-submit"]').trigger('click')
    await flushPromises()

    expect(integramApiClient.createObject).toHaveBeenCalledWith('77', 'Иван Петров', {
      201: '2026-05-10',
      202: '301',
      203: true
    }, 1)
    expect(wrapper.text()).toContain('Анкета 9001 сохранена')
  })
})
