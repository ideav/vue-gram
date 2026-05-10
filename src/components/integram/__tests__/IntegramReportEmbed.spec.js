import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import IntegramReportEmbed from '../IntegramReportEmbed.vue'
import { reportRowsResponse } from '../__fixtures__/reports'
import integramService from '@/services/integramService'

const mockToast = vi.hoisted(() => ({
  add: vi.fn()
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => mockToast
}))

vi.mock('@/services/integramService', () => ({
  default: {
    isAuthenticated: vi.fn(() => true),
    loadSession: vi.fn(),
    executeReport: vi.fn()
  }
}))

const viewerStub = {
  name: 'IntegramReportViewer',
  props: ['reportId', 'reportData', 'columns', 'totals', 'loading', 'showTotals', 'title', 'initialFilters'],
  emits: ['apply-filters', 'refresh', 'clear-filters'],
  template: '<div data-test="report-viewer">{{ title }}</div>'
}

function mountEmbed(props = {}) {
  return mount(IntegramReportEmbed, {
    props: {
      reportId: 42,
      ...props
    },
    global: {
      stubs: {
        IntegramReportViewer: viewerStub,
        Message: { template: '<div><slot /></div>' },
        ProgressSpinner: { template: '<div />' }
      }
    }
  })
}

describe('IntegramReportEmbed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    integramService.executeReport.mockResolvedValue(reportRowsResponse)
  })

  it('passes initial report params through to executeReport', async () => {
    mountEmbed({
      params: {
        LIMIT: '0,20',
        FR_Status: 'Open'
      }
    })

    await flushPromises()

    expect(integramService.executeReport).toHaveBeenCalledWith(42, {
      LIMIT: '0,20',
      FR_Status: 'Open'
    })
  })

  it('serializes viewer filters and reloads the report', async () => {
    const wrapper = mountEmbed({
      params: {
        LIMIT: '0,20'
      }
    })

    await flushPromises()
    const viewer = wrapper.findComponent(viewerStub)

    viewer.vm.$emit('apply-filters', {
      'Created At': { from: '2026-05-01', to: '2026-05-31' },
      Amount: { from: '100', to: '' }
    })
    await flushPromises()

    expect(integramService.executeReport).toHaveBeenLastCalledWith(42, {
      LIMIT: '0,20',
      FR_Created_At: '2026-05-01',
      TO_Created_At: '2026-05-31',
      FR_Amount: '100'
    })
  })
})
