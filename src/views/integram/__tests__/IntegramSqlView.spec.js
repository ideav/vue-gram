import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import IntegramSqlView from '../IntegramSqlView.vue'
import integramService from '@/services/integramService'

const routerPush = vi.hoisted(() => vi.fn())
const routeState = vi.hoisted(() => ({
  params: {
    database: 'my',
    reportId: '900'
  }
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush
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
    createObject: vi.fn(),
    createReport: vi.fn(),
    deleteObject: vi.fn(),
    executeReport: vi.fn(),
    getEditObject: vi.fn(),
    getObjects: vi.fn(),
    moveObjectUp: vi.fn(),
    setRequisites: vi.fn()
  }
}))

const globalStubs = {
  Button: {
    props: ['disabled', 'label', 'loading'],
    emits: ['click'],
    template: '<button type="button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot>{{ label }}</slot></button>'
  },
  IntegramBreadcrumb: {
    template: '<nav />'
  },
  Message: {
    template: '<div><slot /></div>'
  },
  Panel: {
    props: ['header'],
    template: '<section><header v-if="$slots.header"><slot name="header" /></header><header v-else>{{ header }}</header><slot /></section>'
  },
  Tag: {
    props: ['value'],
    template: '<span>{{ value }}</span>'
  },
  Toast: {
    template: '<div />'
  }
}

const editData = {
  obj: { id: 900, val: 'Продажи' },
  reqs: {
    95: { value: '1' },
    134: { value: '25' }
  }
}

const columnsData = {
  object: [
    { id: 1001, val: 'Сумма', ref: 501 }
  ],
  reqs: {
    1001: {
      100: 'Сумма продаж',
      102: '100',
      109: '-1'
    }
  },
  rep_col_list: [
    { id: 42, table: 42, name: 'Заказы', type: '42' },
    { id: 501, table: 42, name: 'Заказы -> Сумма', type: 'NUMBER', format: 'NUMBER' }
  ]
}

const joinsData = {
  object: [
    { id: 7001, val: 42 }
  ],
  reqs: {
    7001: {
      265: 'orders',
      266: 'aorders.id=r501.t'
    }
  }
}

const previewData = {
  columns: [
    { id: 1001, name: 'Сумма продаж', totals: '300' }
  ],
  data: [
    ['100', '200']
  ]
}

describe('IntegramSqlView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.params = {
      database: 'my',
      reportId: '900'
    }

    integramService.getEditObject.mockResolvedValue(editData)
    integramService.getObjects.mockImplementation((typeId) => {
      if (typeId === 28) return Promise.resolve(columnsData)
      if (typeId === 44) return Promise.resolve(joinsData)
      if (typeId === 22) {
        return Promise.resolve({
          object: [{ id: 900, val: 'Продажи' }]
        })
      }
      return Promise.resolve({ object: [] })
    })
    integramService.executeReport.mockResolvedValue(previewData)
    integramService.setRequisites.mockResolvedValue({ ok: true })
  })

  it('loads a legacy SQL report and serializes column edits with requisite ids', async () => {
    const wrapper = mount(IntegramSqlView, {
      global: {
        stubs: globalStubs
      }
    })
    await flushPromises()

    expect(integramService.getEditObject).toHaveBeenCalledWith('900')
    expect(integramService.getObjects).toHaveBeenCalledWith(28, { F_U: '900', LIMIT: 1000 })
    expect(integramService.getObjects).toHaveBeenCalledWith(44, { F_U: '900', LIMIT: 1000 })
    expect(integramService.executeReport).toHaveBeenCalledWith('900', { LIMIT: 25 })
    expect(wrapper.get('[data-testid="sql-report-title"]').text()).toContain('Продажи')
    expect(wrapper.get('[data-testid="sql-preview"]').text()).toContain('LEFT JOIN orders ON aorders.id=r501.t')
    expect(wrapper.get('[data-testid="preview-table"]').text()).toContain('100')

    const aliasInput = wrapper.get('[data-testid="column-alias-1001"]')
    await aliasInput.setValue('Gross')
    await aliasInput.trigger('blur')
    await flushPromises()

    expect(integramService.setRequisites).toHaveBeenCalledWith('1001', {
      100: 'Gross'
    })
  })

  it('lists reports and routes selection to the SQL builder report URL', async () => {
    routeState.params = {
      database: 'my'
    }

    const wrapper = mount(IntegramSqlView, {
      global: {
        stubs: globalStubs
      }
    })
    await flushPromises()

    expect(integramService.getObjects).toHaveBeenCalledWith(22, { LIMIT: 1000 })

    await wrapper.get('[data-testid="report-row-900"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
      name: 'IntegramSql',
      params: {
        database: 'my',
        reportId: '900'
      }
    })
  })
})
