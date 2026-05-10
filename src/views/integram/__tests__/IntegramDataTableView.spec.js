import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import IntegramDataTableView from '../IntegramDataTableView.vue'
import integramApiClient from '@/services/integramApiClient'
import {
  missingPermissionContext,
  readOnlyPermissionContext,
  writePermissionContext
} from '@/utils/__fixtures__/permissions'

const mockRoute = vi.hoisted(() => ({
  params: {
    database: 'A2025',
    typeId: '42'
  },
  query: {}
}))

const mockRouter = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn()
}))

const mockToast = vi.hoisted(() => ({
  add: vi.fn()
}))

const mockConfirm = vi.hoisted(() => ({
  require: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => mockToast
}))

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => mockConfirm
}))

vi.mock('@/composables/useIntegramSession', () => ({
  useIntegramSession: () => ({
    isAuthenticated: ref(true),
    database: ref('A2025')
  })
}))

vi.mock('@/services/integramApiClient', () => ({
  default: {
    setDatabase: vi.fn(),
    getDatabase: vi.fn(() => 'A2025'),
    getServer: vi.fn(() => 'https://app.integram.io'),
    getObjectList: vi.fn(),
    getObjectCount: vi.fn(),
    getAuthInfo: vi.fn(),
    saveObject: vi.fn(),
    setObjectRequisites: vi.fn()
  }
}))

const passiveStub = {
  template: '<div><slot /><slot name="title" /><slot name="content" /><slot name="footer" /></div>'
}

const inputStub = {
  props: ['modelValue'],
  emits: ['update:modelValue', 'input'],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'input\', $event)" />'
}

function mountView() {
  return mount(IntegramDataTableView, {
    global: {
      directives: {
        tooltip: {}
      },
      stubs: {
        Badge: passiveStub,
        Button: {
          template: '<button type="button" @click="$emit(\'click\', $event)"><slot /></button>'
        },
        Calendar: inputStub,
        Card: passiveStub,
        Checkbox: inputStub,
        ConfirmDialog: passiveStub,
        DataTable: {
          props: ['disableEditing', 'disableTypeEditing'],
          template: '<div data-testid="data-table" :data-disable-editing="String(disableEditing)" :data-disable-type-editing="String(disableTypeEditing)" />'
        },
        Dialog: passiveStub,
        IconField: passiveStub,
        InputIcon: passiveStub,
        InputNumber: inputStub,
        InputText: inputStub,
        IntegramBreadcrumb: passiveStub,
        IntegramDataTableWrapper: passiveStub,
        Message: passiveStub,
        ProgressBar: passiveStub,
        ProgressSpinner: passiveStub,
        ReferenceField: inputStub,
        Select: inputStub,
        Textarea: inputStub,
        Teleport: passiveStub,
        Transition: passiveStub
      }
    }
  })
}

describe('IntegramDataTableView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('datatable_settings', JSON.stringify({
      autoLoadAll: false,
      autoLoadDirs: false,
      maxAutoLoadSize: 20000,
      backgroundChunkSize: 1000,
      backgroundDelay: 150,
      dateStyle: 'relative'
    }))

    mockRoute.params.database = 'A2025'
    mockRoute.params.typeId = '42'
    mockRoute.query = {}

    integramApiClient.getObjectList.mockResolvedValue({
      type: { id: 42, val: 'Clients' },
      req_order: ['100'],
      req_type: { 100: 'Status' },
      req_base: { 100: 'SHORT' },
      object: [{ id: 7, val: 'Acme' }],
      reqs: { 7: { 100: 'Open' } }
    })
    integramApiClient.getObjectCount.mockResolvedValue({ count: 1 })
    integramApiClient.getAuthInfo.mockReturnValue(writePermissionContext)
  })

  it('passes legacy URL table state to the initial object list request', async () => {
    mockRoute.query = {
      F_U: '101',
      F_I: '7',
      F_42: '%Acme%',
      F_100: 'Open',
      lnx: '1',
      order_val: '100',
      desc: '1'
    }

    mountView()
    await flushPromises()

    expect(integramApiClient.setDatabase).toHaveBeenCalledWith('A2025')
    expect(integramApiClient.getObjectList).toHaveBeenCalledWith('42', {
      pg: 1,
      LIMIT: 50,
      F_U: '101',
      F_I: '7',
      F_42: '%Acme%',
      F_100: 'Open',
      lnx: '1',
      order_val: '100',
      desc: '1'
    })
    expect(integramApiClient.getObjectCount).toHaveBeenCalledWith('42', {
      F_U: '101',
      F_I: '7',
      F_42: '%Acme%',
      F_100: 'Open',
      lnx: '1'
    })
  })

  it('disables table write actions for read-only permissions', async () => {
    integramApiClient.getAuthInfo.mockReturnValue(readOnlyPermissionContext)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('[data-testid="data-table"]').attributes('data-disable-editing')).toBe('true')
    expect(wrapper.get('[data-testid="data-table"]').attributes('data-disable-type-editing')).toBe('true')
  })

  it('does not expose table write actions when permission state is missing', async () => {
    integramApiClient.getAuthInfo.mockReturnValue(missingPermissionContext)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('[data-testid="data-table"]').attributes('data-disable-editing')).toBe('true')
    expect(wrapper.get('[data-testid="data-table"]').attributes('data-disable-type-editing')).toBe('true')
  })
})
