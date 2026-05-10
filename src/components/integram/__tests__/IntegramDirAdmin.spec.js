import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import IntegramDirAdmin from '../IntegramDirAdmin.vue'
import integramApiClient from '@/services/integramApiClient'
import {
  dirAdminDirectoryHtml,
  dirAdminPermissionDeniedHtml
} from '../__fixtures__/dirAdminFixtures'

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
    getAuthInfo: vi.fn(),
    getDirAdmin: vi.fn(),
    createDirAdminFolder: vi.fn(),
    createDirAdminFile: vi.fn(),
    uploadDirAdminFile: vi.fn(),
    deleteDirAdminItems: vi.fn()
  }
}))

const passiveStub = {
  template: '<div><slot /><slot name="title" /><slot name="content" /><slot name="footer" /><slot name="empty" /></div>'
}

const buttonStub = {
  props: ['label', 'disabled', 'ariaLabel'],
  emits: ['click'],
  template: '<button type="button" :aria-label="ariaLabel || label" :disabled="disabled" @click="$emit(\'click\', $event)"><slot />{{ label }}</button>'
}

const inputStub = {
  props: ['modelValue', 'placeholder', 'ariaLabel'],
  emits: ['update:modelValue'],
  template: '<input :aria-label="ariaLabel || placeholder" :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
}

function mountDirAdmin() {
  return mount(IntegramDirAdmin, {
    props: {
      database: 'my'
    },
    global: {
      directives: {
        tooltip: {}
      },
      stubs: {
        Button: buttonStub,
        Checkbox: inputStub,
        Chip: passiveStub,
        Column: passiveStub,
        DataTable: passiveStub,
        Dialog: passiveStub,
        Divider: passiveStub,
        FileUpload: passiveStub,
        InputText: inputStub,
        IntegramBreadcrumb: passiveStub,
        Message: passiveStub,
        Panel: passiveStub,
        Teleport: passiveStub,
        Transition: passiveStub
      }
    }
  })
}

describe('IntegramDirAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    integramApiClient.getAuthInfo.mockReturnValue({
      token: 'auth-token',
      xsrf: 'xsrf-token',
      userName: 'admin',
      userRole: 'admin',
      grants: { FILE: 'WRITE' }
    })
    integramApiClient.getDirAdmin.mockResolvedValue(dirAdminDirectoryHtml)
  })

  it('loads the legacy directory list through the dir_admin endpoint', async () => {
    const wrapper = mountDirAdmin()
    await flushPromises()

    expect(integramApiClient.setDatabase).toHaveBeenCalledWith('my')
    expect(integramApiClient.getDirAdmin).toHaveBeenCalledWith({
      folder: 'templates',
      addPath: ''
    })
    expect(wrapper.vm.files.map(file => file.name)).toEqual(['layout.html', 'styles.css'])
    expect(wrapper.vm.folders.map(folder => folder.name)).toEqual(['partials'])
  })

  it('hides write actions for read-only FILE grants while keeping file actions available', async () => {
    integramApiClient.getAuthInfo.mockReturnValue({
      userName: 'analyst',
      grants: { FILE: 'READ' }
    })

    const wrapper = mountDirAdmin()
    await flushPromises()

    expect(wrapper.vm.canWrite).toBe(false)
    expect(wrapper.find('[data-testid="dir-admin-create-folder"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dir-admin-create-file"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dir-admin-upload"]').exists()).toBe(false)
    expect(wrapper.vm.files[0].downloadUrl).toContain('gf=layout.html')
  })

  it('shows permission errors returned by the legacy backend', async () => {
    integramApiClient.getDirAdmin.mockResolvedValue(dirAdminPermissionDeniedHtml)

    const wrapper = mountDirAdmin()
    await flushPromises()

    expect(wrapper.vm.accessDenied).toBe(true)
    expect(wrapper.vm.loadError).toContain('Недостаточно прав')
    expect(wrapper.vm.files).toEqual([])
    expect(wrapper.vm.folders).toEqual([])
  })

  it('opens the legacy ACE edit URL for editable files', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const wrapper = mountDirAdmin()
    await flushPromises()

    wrapper.vm.editFile(wrapper.vm.files[0])

    expect(open).toHaveBeenCalledWith(
      '/ace/editor.html?src=/my/dir_admin/&templates=1&add_path=%2Femails&gf=layout.html',
      '_blank'
    )
    open.mockRestore()
  })
})
