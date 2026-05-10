import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IntegramMigration from '../IntegramMigration.vue'
import {
  migrationDirectoryHtml,
  migrationDryRunPackageFixture,
  migrationMetadataFixture,
  migrationQueriesFixture,
  migrationQueryColumnsFixture,
  migrationSettingsFixture,
  migrationTableMetadataFixture
} from '../__fixtures__/migration'
import {
  normalizeMigrationQueriesResponse,
  normalizeMigrationSettingsResponse,
  normalizeMigrationTablesResponse
} from '@/utils/integramMigration'

const mockConfirm = vi.hoisted(() => ({
  require: vi.fn()
}))

const mockToast = vi.hoisted(() => ({
  add: vi.fn()
}))

const mockApi = vi.hoisted(() => ({
  getAuthInfo: vi.fn(),
  getMigrationTables: vi.fn(),
  getMigrationQueries: vi.fn(),
  getMigrationSettings: vi.fn(),
  getDirAdmin: vi.fn(),
  saveMigrationSettings: vi.fn(),
  getMigrationQueryColumns: vi.fn(),
  getMigrationFileContent: vi.fn(),
  getMigrationTableMetadata: vi.fn(),
  getMigrationTableData: vi.fn(),
  getMigrationQueryPackage: vi.fn()
}))

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => mockConfirm
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => mockToast
}))

vi.mock('@/services/integramApiClient', () => ({
  default: mockApi
}))

const passiveStub = {
  template: '<div><slot /></div>'
}

const buttonStub = {
  props: ['label', 'disabled', 'loading'],
  emits: ['click'],
  template: '<button type="button" :disabled="disabled || loading" @click="$emit(\'click\', $event)"><slot />{{ label }}</button>'
}

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function mountComponent() {
  return mount(IntegramMigration, {
    props: { database: 'my' },
    global: {
      stubs: {
        Button: buttonStub,
        IntegramBreadcrumb: passiveStub,
        Message: passiveStub,
        ProgressBar: { template: '<div data-testid="progressbar"></div>' }
      }
    }
  })
}

async function mountLoaded() {
  const wrapper = mountComponent()
  await flushPromises()
  await flushPromises()
  return wrapper
}

describe('IntegramMigration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    mockApi.getAuthInfo.mockReturnValue({
      token: 'auth-token',
      xsrf: 'xsrf-token',
      userId: '1',
      userName: 'admin',
      userRole: 'admin',
      database: 'my',
      grants: { admin: 'WRITE', FILE: 'WRITE' },
      roleId: 1
    })
    mockApi.getMigrationTables.mockResolvedValue(normalizeMigrationTablesResponse(migrationMetadataFixture))
    mockApi.getMigrationQueries.mockResolvedValue(normalizeMigrationQueriesResponse(migrationQueriesFixture))
    mockApi.getMigrationSettings.mockResolvedValue(normalizeMigrationSettingsResponse(migrationSettingsFixture))
    mockApi.getDirAdmin.mockResolvedValue(migrationDirectoryHtml)
    mockApi.saveMigrationSettings.mockResolvedValue({ obj: { id: '9002' } })
    mockApi.getMigrationQueryColumns.mockResolvedValue(migrationQueryColumnsFixture)
    mockApi.getMigrationFileContent.mockResolvedValue('<a href="/my/report/501"></a><a href="/my/object/102"></a>')
    mockApi.getMigrationTableMetadata.mockResolvedValue(migrationTableMetadataFixture)
    mockApi.getMigrationTableData.mockResolvedValue([])
    mockApi.getMigrationQueryPackage.mockResolvedValue({ id: '501', name: 'Активные клиенты' })

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:migration'),
      revokeObjectURL: vi.fn()
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('loads migration lists, settings, logs, and file fixtures for admins', async () => {
    const wrapper = await mountLoaded()

    expect(wrapper.text()).toContain('Клиенты')
    expect(wrapper.text()).toContain('Активные клиенты')
    expect(wrapper.text()).toContain('dashboard.html')
    expect(wrapper.get('[data-testid="migration-status"]').text()).toBe('Готово')
    expect(wrapper.get('[data-testid="migration-log"]').text()).toContain('Загружены таблицы: 3')
  })

  it('hides migration actions for non-admin users before loading catalogs', async () => {
    mockApi.getAuthInfo.mockReturnValue({
      token: 'auth-token',
      userName: 'reader',
      userRole: 'reader',
      database: 'my',
      grants: {}
    })

    const wrapper = await mountLoaded()

    expect(wrapper.get('[data-testid="migration-permission"]').text()).toContain('Недостаточно прав')
    expect(mockApi.getMigrationTables).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="migration-export"]').exists()).toBe(false)
  })

  it('requires confirmation and exposes progress while export is running', async () => {
    const metadata = createDeferred()
    mockApi.getMigrationTableMetadata.mockReturnValueOnce(metadata.promise)
    const wrapper = await mountLoaded()

    await wrapper.get('[data-testid="migration-table-101"]').setValue(true)
    await wrapper.get('[data-testid="migration-export"]').trigger('click')

    expect(mockConfirm.require).toHaveBeenCalledTimes(1)
    const acceptPromise = mockConfirm.require.mock.calls[0][0].accept()
    await flushPromises()

    expect(wrapper.get('[data-testid="migration-progress"]').text()).toContain('Экспорт')

    metadata.resolve(migrationTableMetadataFixture)
    await acceptPromise
    await flushPromises()

    expect(wrapper.get('[data-testid="migration-output"]').element.value).toContain('"kind": "integram-migration"')
    expect(wrapper.get('[data-testid="migration-log"]').text()).toContain('JSON сформирован')
  })

  it('runs import dry-run from pasted package and records the result in logs', async () => {
    const wrapper = await mountLoaded()

    await wrapper.get('[data-testid="migration-import-input"]').setValue(JSON.stringify(migrationDryRunPackageFixture))
    await wrapper.get('[data-testid="migration-dry-run"]').trigger('click')

    expect(mockConfirm.require).toHaveBeenCalledTimes(1)
    await mockConfirm.require.mock.calls[0][0].accept()
    await flushPromises()

    expect(wrapper.get('[data-testid="migration-dry-run-summary"]').text()).toContain('Таблицы: 1')
    expect(wrapper.get('[data-testid="migration-log"]').text()).toContain('Dry-run завершен')
  })
})
