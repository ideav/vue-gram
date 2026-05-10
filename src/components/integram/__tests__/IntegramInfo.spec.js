import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import IntegramInfo from '../IntegramInfo.vue'
import { adminInfoPayload, regularInfoPayload } from '../__fixtures__/infoPayloads'

vi.mock('@/services/integramApiClient', () => ({
  default: {
    getAuthInfo: vi.fn(() => ({})),
    getDatabase: vi.fn(() => 'demo'),
    getServer: vi.fn(() => 'https://app.integram.io')
  }
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() })
}))

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: vi.fn() })
}))

const passiveStub = {
  template: '<div><slot /><slot name="title" /><slot name="content" /><slot name="footer" /></div>'
}

const buttonStub = {
  props: ['label'],
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\', $event)"><slot />{{ label }}</button>'
}

function mountInfo(payload) {
  return mount(IntegramInfo, {
    props: {
      database: 'demo',
      payload
    },
    global: {
      stubs: {
        Button: buttonStub,
        Card: passiveStub,
        Chip: passiveStub,
        Divider: passiveStub,
        IntegramBreadcrumb: passiveStub,
        Message: passiveStub,
        Tag: passiveStub
      }
    }
  })
}

describe('IntegramInfo', () => {
  beforeEach(() => {
    localStorage.clear()
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim()
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    })
  })

  it('renders admin diagnostics, debug details, intro actions, and forms payload', async () => {
    const wrapper = mountInfo(adminInfoPayload)

    const diagnostics = wrapper.find('[data-testid="info-section-diagnostics"]')
    expect(diagnostics.text()).toContain('Среда выполнения')
    expect(diagnostics.text()).toContain('База данных')
    expect(diagnostics.text()).toContain('demo')
    expect(diagnostics.text()).toContain('https://app.integram.io')
    expect(wrapper.find('[data-testid="info-admin-debug"]').text()).toContain('grants')

    await wrapper.find('[data-testid="info-tab-forms"]').trigger('click')
    expect(wrapper.find('[data-testid="info-report-list"]').text()).toContain('Мои отчеты')
    expect(wrapper.find('[data-testid="info-form-list"]').text()).toContain('Форма заявки')

    await wrapper.find('[data-testid="info-tab-intro"]').trigger('click')
    expect(wrapper.text()).toContain('Где я нахожусь?')
    await wrapper.find('[data-testid="info-action-hints"] .info-action-header').trigger('click')
    expect(wrapper.find('[data-testid="info-hints-reset"]').exists()).toBe(true)
  })

  it('hides admin-only intro and debug controls for regular users', () => {
    const wrapper = mountInfo(regularInfoPayload)

    expect(wrapper.find('[data-testid="info-section-diagnostics"]').text()).toContain('employee@example.com')
    expect(wrapper.find('[data-testid="info-tab-intro"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="info-admin-debug"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="info-debug-locked"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="info-hints-reset"]').exists()).toBe(false)
  })
})
