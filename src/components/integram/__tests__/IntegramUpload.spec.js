import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import IntegramUpload from '../IntegramUpload.vue'
import integramApiClient from '@/services/integramApiClient'

const push = vi.fn()
const toastAdd = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { database: 'my' } }),
  useRouter: () => ({ push })
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAdd })
}))

vi.mock('@/composables/useIntegramSession', () => ({
  useIntegramSession: () => ({
    isAuthenticated: { value: true }
  })
}))

vi.mock('@/services/integramApiClient', () => ({
  default: {
    setDatabase: vi.fn(),
    getDatabase: vi.fn(() => 'my'),
    getServer: vi.fn(() => 'https://app.integram.io'),
    uploadFile: vi.fn()
  }
}))

const stubs = {
  IntegramBreadcrumb: {
    template: '<nav data-test="breadcrumb" />'
  },
  Card: {
    template: '<section><slot name="title" /><slot name="content" /></section>'
  },
  Button: {
    props: ['label', 'disabled'],
    emits: ['click'],
    template: '<button type="button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot />{{ label }}</button>'
  },
  Message: {
    props: ['severity'],
    template: '<div :data-severity="severity"><slot /></div>'
  },
  ProgressBar: {
    props: ['value'],
    template: '<div data-test="progress">{{ value }}</div>'
  }
}

function mountUpload(props = {}) {
  return mount(IntegramUpload, {
    props,
    global: {
      stubs
    }
  })
}

async function selectFile(wrapper, file) {
  const input = wrapper.find('[data-testid="upload-input"]')
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [file]
  })
  await input.trigger('change')
}

describe('IntegramUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders selected file metadata before upload', async () => {
    const wrapper = mountUpload()
    const file = new File(['hello world'], 'demo.txt', { type: 'text/plain' })

    await selectFile(wrapper, file)

    expect(wrapper.find('[data-testid="upload-selected"]').text()).toContain('demo.txt')
    expect(wrapper.find('[data-testid="upload-submit"]').attributes('disabled')).toBeUndefined()
  })

  it('shows progress and renders the uploaded file link', async () => {
    const wrapper = mountUpload()
    const file = new File(['hello world'], 'demo.txt', { type: 'text/plain' })
    integramApiClient.uploadFile.mockImplementation(async (_file, _path, options) => {
      options.onUploadProgress({ loaded: 5, total: 10 })
      return {
        ok: true,
        filename: 'demo.txt',
        path: 'uploads/2026/demo.txt',
        href: 'uploads/2026/demo.txt',
        size: 11,
        mimeType: 'text/plain'
      }
    })

    await selectFile(wrapper, file)
    await wrapper.find('[data-testid="upload-submit"]').trigger('click')
    await flushPromises()

    expect(integramApiClient.uploadFile).toHaveBeenCalledWith(
      file,
      '',
      expect.objectContaining({ onUploadProgress: expect.any(Function) })
    )
    expect(wrapper.find('[data-testid="upload-progress"]').text()).toContain('100')
    const link = wrapper.find('[data-testid="upload-result-link"]')
    expect(link.text()).toContain('demo.txt')
    expect(link.attributes('href')).toBe('https://app.integram.io/uploads/2026/demo.txt')
  })

  it('makes oversized files explicit and recoverable before posting', async () => {
    const wrapper = mountUpload({ maxFileSize: 5 })
    const file = new File(['too large'], 'large.txt', { type: 'text/plain' })

    await selectFile(wrapper, file)
    await wrapper.find('[data-testid="upload-submit"]').trigger('click')

    expect(wrapper.find('[data-testid="upload-error"]').text()).toContain('превышает')
    expect(integramApiClient.uploadFile).not.toHaveBeenCalled()
  })

  it('keeps a failed upload available for retry', async () => {
    const wrapper = mountUpload()
    const file = new File(['hello world'], 'demo.txt', { type: 'text/plain' })
    integramApiClient.uploadFile.mockRejectedValue(new Error('Нет места на диске'))

    await selectFile(wrapper, file)
    await wrapper.find('[data-testid="upload-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="upload-error"]').text()).toContain('Нет места на диске')
    expect(wrapper.find('[data-testid="upload-submit"]').attributes('disabled')).toBeUndefined()
  })
})
