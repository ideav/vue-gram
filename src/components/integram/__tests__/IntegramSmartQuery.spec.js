import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import IntegramSmartQuery from '../IntegramSmartQuery.vue'
import integramService from '@/services/integramService'
import {
  smartQueryChatResponse,
  smartQueryEditObject,
  smartQueryReportResponse,
  smartQuerySuggestions
} from '../__fixtures__/smartQuery'

const routerPush = vi.hoisted(() => vi.fn())
const routerReplace = vi.hoisted(() => vi.fn())
const routeState = vi.hoisted(() => ({
  params: {
    database: 'my',
    reportId: '900'
  },
  query: {}
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace
  })
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn()
  })
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}))

vi.mock('@/services/integramService', () => ({
  default: {
    executeReport: vi.fn(),
    getEditObject: vi.fn(),
    getObjects: vi.fn(),
    sendAiChatMessage: vi.fn()
  }
}))

const reportViewerStub = {
  name: 'IntegramReportViewer',
  props: ['reportId', 'reportData', 'columns', 'totals', 'loading', 'title', 'initialFilters'],
  emits: ['apply-filters', 'refresh', 'clear-filters', 'go-home'],
  template: `
    <section data-testid="smartq-viewer">
      <h3>{{ title }}</h3>
      <div v-for="row in reportData" :key="row.Status">{{ row['Customer Name'] }} {{ row.Amount }} {{ row.Status }}</div>
      <button
        type="button"
        data-testid="apply-filter"
        @click="$emit('apply-filters', {
          'Customer Name': { from: 'Acme Corp', to: '' },
          Amount: { from: '100', to: '' }
        })"
      >
        apply
      </button>
    </section>
  `
}

const globalStubs = {
  Button: {
    props: ['disabled', 'label', 'loading', 'type'],
    emits: ['click'],
    template: '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\', $event)"><slot>{{ label }}</slot></button>'
  },
  Column: {
    template: '<div />'
  },
  DataTable: {
    props: ['value'],
    emits: ['row-click', 'page'],
    template: `
      <div data-testid="smartq-table">
        <button
          v-for="row in value"
          :key="row.id"
          type="button"
          :data-testid="'report-row-' + row.id"
          @click="$emit('row-click', { data: row })"
        >
          {{ row.name }}
        </button>
      </div>
    `
  },
  IconField: {
    template: '<div><slot /></div>'
  },
  InputIcon: {
    template: '<span />'
  },
  InputText: {
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue', 'focus', 'input'],
    template: '<input :placeholder="placeholder" :value="modelValue" @focus="$emit(\'focus\', $event)" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'input\', $event)" />'
  },
  IntegramBreadcrumb: {
    template: '<nav />'
  },
  IntegramReportViewer: reportViewerStub,
  MentionAutocomplete: {
    props: ['modelValue'],
    emits: ['update:modelValue', 'keydown'],
    template: '<input data-testid="chat-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown="$emit(\'keydown\', $event)" />'
  },
  Message: {
    template: '<div><slot /></div>'
  },
  ProgressSpinner: {
    template: '<span />'
  },
  Toast: {
    template: '<div />'
  }
}

function mountSmartQuery() {
  return mount(IntegramSmartQuery, {
    global: {
      stubs: globalStubs
    }
  })
}

describe('IntegramSmartQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    routeState.params = {
      database: 'my',
      reportId: '900'
    }
    routeState.query = {}

    integramService.getEditObject.mockResolvedValue(smartQueryEditObject)
    integramService.executeReport.mockResolvedValue(smartQueryReportResponse)
    integramService.getObjects.mockResolvedValue(smartQuerySuggestions)
    integramService.sendAiChatMessage.mockResolvedValue(smartQueryChatResponse)
  })

  it('loads SmartQ metadata and executes the report with the legacy limit', async () => {
    const wrapper = mountSmartQuery()
    await flushPromises()

    expect(integramService.getEditObject).toHaveBeenCalledWith('900')
    expect(integramService.executeReport).toHaveBeenCalledWith('900', { LIMIT: 25 })
    expect(wrapper.get('[data-testid="smartq-title"]').text()).toContain('Продажи по клиентам')
    expect(wrapper.get('[data-testid="smartq-report-viewer"]').text()).toContain('Acme Corp')
  })

  it('serializes report viewer filters using SmartQ wildcard rules', async () => {
    const wrapper = mountSmartQuery()
    await flushPromises()

    await wrapper.get('[data-testid="apply-filter"]').trigger('click')
    await flushPromises()

    expect(routerReplace).toHaveBeenCalledWith({
      name: 'IntegramSmartQuery',
      params: {
        database: 'my',
        reportId: '900'
      },
      query: {
        LIMIT: 25,
        FR_Customer_Name: '%Acme%Corp%',
        FR_Amount: '100'
      }
    })
    expect(integramService.executeReport).toHaveBeenLastCalledWith('900', {
      LIMIT: 25,
      FR_Customer_Name: '%Acme%Corp%',
      FR_Amount: '100'
    })
  })

  it('lists SmartQ suggestions and routes a selected report', async () => {
    routeState.params = {
      database: 'my'
    }

    const wrapper = mountSmartQuery()
    await flushPromises()

    expect(integramService.getObjects).toHaveBeenCalledWith(22, {
      LIMIT: 20,
      pg: 1
    })

    await wrapper.get('[data-testid="report-row-900"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
      name: 'IntegramSmartQuery',
      params: {
        database: 'my',
        reportId: '900'
      },
      query: {}
    })
  })

  it('sends chat messages and sanitizes assistant HTML', async () => {
    integramService.sendAiChatMessage.mockResolvedValue({
      html: '<strong>Summary</strong><img src=x onerror=alert(1)>'
    })

    const wrapper = mountSmartQuery()
    await flushPromises()

    await wrapper.get('[data-testid="smartq-chat-input"]').setValue('Show summary')
    await wrapper.get('form.smartq-chat-form').trigger('submit')
    await flushPromises()

    expect(integramService.sendAiChatMessage).toHaveBeenCalledWith(expect.objectContaining({
      database: 'my',
      message: 'Show summary',
      reportId: '900'
    }))
    expect(wrapper.html()).toContain('<strong>Summary</strong>')
    expect(wrapper.html()).not.toContain('onerror')
    expect(wrapper.html()).not.toContain('<img')
  })
})
