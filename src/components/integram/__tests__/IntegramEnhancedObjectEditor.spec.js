import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import IntegramEnhancedObjectEditor from '../IntegramEnhancedObjectEditor.vue'
import integramService from '@/services/integramService'

const push = vi.fn()
const toastAdd = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push })
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAdd })
}))

vi.mock('@/services/integramApiClient', () => ({
  default: {
    getAuthInfo: vi.fn(() => ({
      token: 'auth-token',
      xsrf: 'xsrf-token',
      database: 'my'
    }))
  }
}))

vi.mock('@/services/integramService', () => ({
  default: {
    setSession: vi.fn(),
    setDatabase: vi.fn(),
    getEditObject: vi.fn(),
    getMetadata: vi.fn(),
    getReferenceOptions: vi.fn(),
    saveObject: vi.fn(),
    createObject: vi.fn(),
    deleteObject: vi.fn(),
    setRequisites: vi.fn()
  }
}))

const stubs = {
  Card: {
    template: '<section><slot name="title" /><slot name="content" /></section>'
  },
  ProgressSpinner: {
    template: '<div data-test="spinner" />'
  },
  Badge: {
    props: ['value'],
    template: '<span><slot />{{ value }}</span>'
  },
  Message: {
    template: '<div><slot /></div>'
  },
  Button: {
    props: ['label'],
    emits: ['click'],
    template: '<button type="button" @click="$emit(\'click\', $event)"><slot />{{ label }}</button>'
  },
  Tabs: {
    template: '<div><slot /></div>'
  },
  TabList: {
    template: '<div><slot /></div>'
  },
  Tab: {
    template: '<button><slot /></button>'
  },
  TabPanels: {
    template: '<div><slot /></div>'
  },
  TabPanel: {
    template: '<div><slot /></div>'
  },
  Divider: {
    template: '<hr />'
  },
  RouterLink: {
    template: '<a><slot /></a>'
  },
  ReferenceField: {
    template: '<div data-test="reference-field" />'
  },
  FileField: {
    template: '<div data-test="file-field" />'
  },
  DateField: {
    template: '<div data-test="date-field" />'
  },
  DateTimeField: {
    template: '<div data-test="datetime-field" />'
  },
  PasswordField: {
    template: '<div data-test="password-field" />'
  },
  Editor: {
    template: '<div data-test="html-editor" />'
  },
  Textarea: {
    template: '<textarea data-test="memo-field" />'
  },
  InputText: {
    template: '<input data-test="input-text" />'
  },
  InputNumber: {
    template: '<input data-test="input-number" />'
  },
  Checkbox: {
    template: '<input data-test="checkbox-field" type="checkbox" />'
  }
}

function mountEditor() {
  return mount(IntegramEnhancedObjectEditor, {
    props: {
      database: 'my',
      objectId: 285
    },
    global: {
      stubs,
      directives: {
        tooltip: vi.fn()
      }
    }
  })
}

describe('IntegramEnhancedObjectEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    integramService.getEditObject.mockResolvedValue({
      obj: {
        id: 285,
        typ: 77,
        val: 'Editable object',
        typ_name: 'Demo type',
        up: '1'
      },
      reqs: {
        2: '<p>HTML</p>',
        3: 'short text',
        4: '2026-05-09 12:30:00',
        6: 'secret',
        8: 'long text',
        9: '2026-05-09',
        10: { value: 'document.pdf', file: '/files/document.pdf' },
        11: 'X',
        12: 'memo text',
        13: 100,
        14: 12.5,
        18: { id: 501, val: 'Reference value' },
        90: ''
      },
      arr_type: {
        90: 901
      },
      arrCounts: {
        90: 3
      }
    })

    integramService.getMetadata.mockImplementation((typeId) => {
      if (String(typeId) === '77') {
        return Promise.resolve({
          reqs: [
            { id: 2, val: 'HTML body', type: '2', attrs: '' },
            { id: 3, val: 'Short text', type: '3', attrs: '' },
            { id: 4, val: 'Created at', type: '4', attrs: '' },
            { id: 6, val: 'Password', type: '6', attrs: '' },
            { id: 8, val: 'Chars', type: '8', attrs: '' },
            { id: 9, val: 'Due date', type: '9', attrs: '' },
            { id: 10, val: 'Attachment', type: '10', attrs: '' },
            { id: 11, val: 'Active', type: '11', attrs: '' },
            { id: 12, val: 'Memo', type: '12', attrs: '' },
            { id: 13, val: 'Integer number', type: '13', attrs: '' },
            { id: 14, val: 'Decimal number', type: '14', attrs: '' },
            { id: 18, val: 'Owner', type: '3', ref: 500, attrs: '' },
            { id: 90, val: 'Lines', type: '3', arr: 901, attrs: '' }
          ]
        })
      }

      return Promise.resolve({ val: 'Parent type' })
    })

    integramService.getReferenceOptions.mockResolvedValue({
      501: 'Reference value'
    })
  })

  it('renders each base editor according to Integram type ids and array metadata', async () => {
    const wrapper = mountEditor()

    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-test="html-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="datetime-field"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="date-field"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="file-field"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="checkbox-field"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="memo-field"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="password-field"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="input-number"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-test="input-text"]').length).toBeGreaterThanOrEqual(2)
    expect(wrapper.find('[data-test="reference-field"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Перейти к списку')
  })
})
