import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import IntegramForm from '../IntegramForm.vue'
import {
  formApiFixtures,
  validationErrorsFixture
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
    getObjectRecord: vi.fn(),
    getTypeMetadata: vi.fn(),
    getReferenceOptions: vi.fn(),
    createObject: vi.fn(),
    executeReport: vi.fn()
  }
}))

const stubs = {
  IntegramBreadcrumb: { template: '<nav data-testid="breadcrumbs" />' },
  Card: { template: '<section><slot name="title" /><slot name="content" /></section>' },
  Panel: {
    props: ['header'],
    template: '<section><h3>{{ header }}</h3><slot /></section>'
  },
  Message: { template: '<div><slot /></div>' },
  ProgressSpinner: { template: '<div />' },
  DataTable: { template: '<table><slot /></table>' },
  Column: { template: '<col>' },
  Button: {
    props: ['label', 'type', 'disabled', 'loading'],
    emits: ['click'],
    template: '<button :type="type || \'button\'" :disabled="disabled || loading" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>'
  }
}

function mockFormApi() {
  integramApiClient.getObjectList.mockImplementation((typeId) => {
    const responses = {
      137: formApiFixtures.forms,
      138: formApiFixtures.panels,
      144: formApiFixtures.fields,
      150: formApiFixtures.buttons
    }
    return Promise.resolve(responses[typeId] || responses[String(typeId)] || { object: [], reqs: {} })
  })
  integramApiClient.getObjectRecord.mockResolvedValue(formApiFixtures.formRecord)
  integramApiClient.getTypeMetadata.mockResolvedValue(formApiFixtures.metadata)
  integramApiClient.getReferenceOptions.mockResolvedValue(formApiFixtures.referenceOptions)
  integramApiClient.createObject.mockResolvedValue({ id: 9001, objectId: 9001 })
}

function mountForm(props = {}) {
  return mount(IntegramForm, {
    props: {
      database: 'my',
      formId: 501,
      session: { database: 'my' },
      ...props
    },
    global: {
      stubs
    }
  })
}

describe('IntegramForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFormApi()
  })

  it('loads a legacy form schema and renders configured fields', async () => {
    const wrapper = mountForm()
    await flushPromises()

    expect(integramApiClient.setDatabase).toHaveBeenCalledWith('my')
    expect(integramApiClient.getObjectList).toHaveBeenCalledWith(137, { LIMIT: 1000 })
    expect(integramApiClient.getObjectList).toHaveBeenCalledWith(138, { F_U: '501' })
    expect(integramApiClient.getObjectList).toHaveBeenCalledWith(144, { F_U: '601' })
    expect(integramApiClient.getObjectList).toHaveBeenCalledWith(150, { F_U: '601' })
    expect(integramApiClient.getTypeMetadata).toHaveBeenCalledWith('42')
    expect(integramApiClient.getReferenceOptions).toHaveBeenCalledWith('103', 0, null, '')

    expect(wrapper.get('[data-testid="form-title"]').text()).toContain('Регистрация клиента')
    expect(wrapper.get('[data-testid="field-601-42"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="field-601-101"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="field-601-102"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="field-601-103"]').text()).toContain('Новый')
  })

  it('validates required fields before submitting', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.get('[data-testid="submit-panel-601"]').trigger('click')
    await flushPromises()

    for (const message of Object.values(validationErrorsFixture)) {
      expect(wrapper.text()).toContain(message)
    }
    expect(integramApiClient.createObject).not.toHaveBeenCalled()
  })

  it('submits legacy object value and requisite payloads', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.get('[data-testid="input-601-42"]').setValue('Lead #1')
    await wrapper.get('[data-testid="input-601-101"]').setValue('lead@example.test')
    await wrapper.get('[data-testid="input-601-102"]').setValue(true)
    await wrapper.get('[data-testid="input-601-103"]').setValue('301')
    await wrapper.get('[data-testid="submit-panel-601"]').trigger('click')
    await flushPromises()

    expect(integramApiClient.createObject).toHaveBeenCalledWith('42', 'Lead #1', {
      101: 'lead@example.test',
      102: true,
      103: '301',
      104: ''
    }, 1)
    expect(wrapper.text()).toContain('Данные сохранены')
  })
})
