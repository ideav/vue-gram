import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import FileField from '../FileField.vue'
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
    getServer: vi.fn(() => 'https://app.integram.io'),
    uploadRequisiteFile: vi.fn()
  }
}))

const stubs = {
  Button: {
    template: '<button type="button" @click="$emit(\'click\', $event)"><slot /></button>'
  },
  Dialog: {
    template: '<div><slot /><slot name="footer" /></div>'
  },
  Message: {
    template: '<div data-test="message"><slot /></div>'
  },
  ProgressBar: {
    props: ['value'],
    template: '<div data-test="progress">{{ value }}</div>'
  }
}

function mountField(props = {}) {
  return mount(FileField, {
    props,
    global: {
      stubs
    }
  })
}

async function selectFile(wrapper, file) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [file]
  })
  await input.trigger('change')
}

describe('FileField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads object FILE requisites through _m_set and emits stable metadata', async () => {
    const file = new File(['hello'], 'contract.pdf', { type: 'application/pdf' })
    integramApiClient.uploadRequisiteFile.mockResolvedValue({
      filename: 'contract.pdf',
      path: 'uploads/2026/contract.pdf',
      href: 'uploads/2026/contract.pdf',
      size: 5,
      mimeType: 'application/pdf'
    })

    const wrapper = mountField({
      id: 'req_100',
      objectId: 285,
      reqId: 100,
      database: 'my'
    })

    await selectFile(wrapper, file)
    await flushPromises()

    expect(integramApiClient.setDatabase).toHaveBeenCalledWith('my')
    expect(integramApiClient.uploadRequisiteFile).toHaveBeenCalledWith(
      285,
      100,
      file,
      expect.objectContaining({ onUploadProgress: expect.any(Function) })
    )
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['uploads/2026/contract.pdf'])
    expect(wrapper.emitted('uploaded')[0][0]).toEqual(expect.objectContaining({
      filename: 'contract.pdf'
    }))
  })

  it('preserves raw File emission when object metadata is not available', async () => {
    const file = new File(['hello'], 'draft.txt', { type: 'text/plain' })
    const wrapper = mountField()

    await selectFile(wrapper, file)

    expect(integramApiClient.uploadRequisiteFile).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([file])
  })

  it('blocks oversized files before posting', async () => {
    const file = new File(['too large'], 'large.txt', { type: 'text/plain' })
    const wrapper = mountField({
      objectId: 285,
      reqId: 100,
      maxFileSize: 5
    })

    await selectFile(wrapper, file)

    expect(wrapper.find('[data-test="message"]').text()).toContain('превышает')
    expect(integramApiClient.uploadRequisiteFile).not.toHaveBeenCalled()
  })
})
