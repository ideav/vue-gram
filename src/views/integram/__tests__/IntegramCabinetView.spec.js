import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import IntegramCabinetView from '../IntegramCabinetView.vue'
import cabinetService from '@/services/integramCabinetService'
import { normalizeCabinetSnapshotResponse } from '@/services/integramCabinetService'
import { cabinetProfileRowsFixture } from '../__fixtures__/cabinet'

const routeState = vi.hoisted(() => ({
  params: {
    database: 'my'
  },
  hash: ''
}))

const toastAdd = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    replace: vi.fn()
  })
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: toastAdd
  })
}))

vi.mock('@/services/integramCabinetService', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: {
      getCabinetSnapshot: vi.fn(),
      getBalanceHistory: vi.fn(),
      getCommunityInvites: vi.fn(),
      saveCabinetProfile: vi.fn(),
      saveUsername: vi.fn(),
      saveDatabaseSettings: vi.fn(),
      createDatabase: vi.fn(),
      restoreDatabaseAdmin: vi.fn()
    }
  }
})

const stubs = {
  ProgressSpinner: {
    template: '<div data-test="spinner" />'
  }
}

function mountCabinet() {
  return mount(IntegramCabinetView, {
    global: {
      stubs
    }
  })
}

describe('IntegramCabinetView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.hash = ''
    cabinetService.getCabinetSnapshot.mockResolvedValue(normalizeCabinetSnapshotResponse(cabinetProfileRowsFixture))
    cabinetService.getBalanceHistory.mockResolvedValue([])
    cabinetService.getCommunityInvites.mockResolvedValue([])
    cabinetService.saveCabinetProfile.mockResolvedValue({ ok: true })
    cabinetService.saveUsername.mockResolvedValue({ name: 'alice-hub' })
    cabinetService.saveDatabaseSettings.mockResolvedValue({ ok: true })
    cabinetService.createDatabase.mockResolvedValue({ ok: true })
  })

  it('loads cabinet profile data and saves the legacy profile payload fields', async () => {
    const wrapper = mountCabinet()
    await flushPromises()

    await wrapper.get('[data-testid="cabinet-tab-profile"]').trigger('click')

    await wrapper.get('[data-testid="profile-name"]').setValue('Alice Updated')
    await wrapper.get('[data-testid="profile-phone"]').setValue('+7 999 111-22-33')
    await wrapper.get('[data-testid="profile-notes"]').setValue('Updated notes')
    await wrapper.get('[data-testid="profile-public"]').setValue(false)
    await wrapper.get('[data-testid="save-profile"]').trigger('click')
    await flushPromises()

    expect(cabinetService.saveCabinetProfile).toHaveBeenCalledWith('194856', {
      name: 'Alice Updated',
      phone: '+7 999 111-22-33',
      notes: 'Updated notes',
      isPublic: false,
      photo: null
    })
  })

  it('validates account names before enabling public profile or calling the save endpoint', async () => {
    const rowsWithoutUsername = cabinetProfileRowsFixture.map(row => ({ ...row, UserName: '', IsPublic: '' }))
    cabinetService.getCabinetSnapshot.mockResolvedValue(normalizeCabinetSnapshotResponse(rowsWithoutUsername))

    const wrapper = mountCabinet()
    await flushPromises()
    await wrapper.get('[data-testid="cabinet-tab-profile"]').trigger('click')

    await wrapper.get('[data-testid="profile-username"]').setValue('bad name')
    await wrapper.get('[data-testid="save-username"]').trigger('click')
    await flushPromises()

    expect(cabinetService.saveUsername).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Неверный формат аккаунта')

    await wrapper.get('[data-testid="profile-public"]').setValue(true)
    expect(wrapper.text()).toContain('Сначала сохраните Аккаунт')

    await wrapper.get('[data-testid="profile-username"]').setValue('alice-hub')
    await wrapper.get('[data-testid="save-username"]').trigger('click')
    await flushPromises()

    expect(cabinetService.saveUsername).toHaveBeenCalledWith('alice-hub')
  })

  it('saves database settings with the legacy requisite ids', async () => {
    const wrapper = mountCabinet()
    await flushPromises()

    await wrapper.get('[data-testid="database-description-7001"]').setValue('Updated description')
    await wrapper.get('[data-testid="database-public-name-7001"]').setValue('Alpha Public')
    await wrapper.get('[data-testid="database-register-7001"]').setValue(false)
    await wrapper.get('[data-testid="database-ttl-7001"]').setValue('45')
    await wrapper.get('[data-testid="save-database-7001"]').trigger('click')
    await flushPromises()

    expect(cabinetService.saveDatabaseSettings).toHaveBeenCalledWith('7001', {
      description: 'Updated description',
      publicName: 'Alpha Public',
      registrationOpen: false,
      tokenLifetime: '45'
    })
  })

  it('keeps free-plan database creation disabled when the legacy limit is reached', async () => {
    const limitedRows = [
      ...cabinetProfileRowsFixture,
      { ...cabinetProfileRowsFixture[0], DBID: '7003', DB: 'gamma' }
    ]
    cabinetService.getCabinetSnapshot.mockResolvedValue(normalizeCabinetSnapshotResponse(limitedRows))

    const wrapper = mountCabinet()
    await flushPromises()

    expect(wrapper.get('[data-testid="create-database-toggle"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('На бесплатном тарифном плане можно создать не более трех баз данных')
  })
})
