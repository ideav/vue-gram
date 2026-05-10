import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import IntegramTypeEditor from '../IntegramTypeEditor.vue'
import integramApiClient from '@/services/integramApiClient'
import editTypesFixture from '@/services/__fixtures__/integramApi/edit-types.json'
import typeMetadataFixture from '@/services/__fixtures__/integramApi/type-metadata.json'

const mockToast = vi.hoisted(() => ({
  add: vi.fn()
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => mockToast
}))

vi.mock('@/services/integramApiClient', () => ({
  default: {
    setDatabase: vi.fn(),
    getTypeEditorData: vi.fn(),
    getTypeMetadata: vi.fn(),
    saveType: vi.fn(),
    createType: vi.fn(),
    addRequisite: vi.fn(),
    saveRequisiteAlias: vi.fn(),
    toggleRequisiteNull: vi.fn(),
    toggleRequisiteMulti: vi.fn(),
    deleteType: vi.fn(),
    deleteRequisite: vi.fn(),
    moveRequisiteUp: vi.fn(),
    createTypeReference: vi.fn(),
    saveRequisiteDefaultValue: vi.fn()
  }
}))

const passiveStub = {
  props: ['visible'],
  template: '<div v-if="visible !== false"><slot /><slot name="title" /><slot name="content" /><slot name="header" /><slot name="footer" /></div>'
}

const inputStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keyup.enter="$emit(\'keyup\', $event)" />'
}

const checkboxStub = {
  props: ['modelValue', 'binary'],
  emits: ['update:modelValue'],
  template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />'
}

function mountEditor() {
  return mount(IntegramTypeEditor, {
    props: {
      session: {
        sessionId: 'test-token',
        database: 'my',
        userRole: 'admin'
      }
    },
    global: {
      directives: {
        tooltip: {}
      },
      stubs: {
        Badge: passiveStub,
        Button: {
          props: ['label', 'disabled'],
          template: '<button type="button" :disabled="disabled" @click="$emit(\'click\', $event)"><span v-if="label">{{ label }}</span><slot /></button>'
        },
        Card: passiveStub,
        Checkbox: checkboxStub,
        Column: passiveStub,
        DataTable: passiveStub,
        Dialog: passiveStub,
        Divider: passiveStub,
        IconField: passiveStub,
        InputIcon: passiveStub,
        InputText: inputStub,
        IntegramSchemaLegacy: passiveStub,
        IntegramSchemaTree: {
          emits: ['edit-type', 'open-table'],
          template: '<button type="button" data-testid="tree-edit-contracts" @click="$emit(\'edit-type\', \'300\')">Edit Contracts</button>'
        },
        Message: passiveStub,
        Panel: passiveStub,
        ProgressSpinner: passiveStub,
        Select: inputStub,
        SelectButton: inputStub,
        Tag: passiveStub
      }
    }
  })
}

describe('IntegramTypeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    integramApiClient.getTypeEditorData.mockResolvedValue(editTypesFixture)
    integramApiClient.getTypeMetadata.mockResolvedValue(typeMetadataFixture)
    integramApiClient.saveType.mockResolvedValue({ obj: '300' })
  })

  it('opens an editor from schema tree selection and saves the legacy _d_save payload', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    wrapper.vm.viewMode = 'tree'
    await wrapper.vm.$nextTick()
    await wrapper.get('[data-testid="tree-edit-contracts"]').trigger('click')
    await wrapper.vm.$nextTick()

    const nameInputs = wrapper.findAll('input')
    const editNameInput = nameInputs.find(input => input.element.value === 'Contracts')
    expect(editNameInput).toBeTruthy()
    await editNameInput.setValue('Contracts Updated')

    await wrapper.get('[data-testid="save-edited-type"]').trigger('click')
    await flushPromises()

    expect(integramApiClient.saveType).toHaveBeenCalledWith('300', 'Contracts Updated', '3', false)
  })
})
