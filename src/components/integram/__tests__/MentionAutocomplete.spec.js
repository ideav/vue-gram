import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import MentionAutocomplete from '../MentionAutocomplete.vue'

const loadUsers = vi.hoisted(() => vi.fn())
const insertMention = vi.hoisted(() => vi.fn())
const users = vi.hoisted(() => ({
  value: [
  { id: '42', name: 'Anna Smith', mention: '@my_42' }
  ]
}))

vi.mock('@/components/integram/DataTable/composables/useUserMentions', () => ({
  useUserMentions: () => ({
    users,
    loading: { value: false },
    loadUsers,
    filterUsers: (query) => users.value.filter(user => user.name.toLowerCase().includes(String(query).toLowerCase())),
    insertMention
  })
}))

const inputTextStub = {
  props: ['modelValue'],
  emits: ['update:modelValue', 'keydown', 'blur'],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown="$emit(\'keydown\', $event)" @blur="$emit(\'blur\', $event)" />'
}

describe('MentionAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertMention.mockReturnValue({
      text: 'hello @my_42 ',
      cursorPosition: 13
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('loads users after @ input and inserts the selected mention', async () => {
    const wrapper = mount(MentionAutocomplete, {
      props: {
        modelValue: 'hello @',
        database: 'my'
      },
      attachTo: document.body,
      global: {
        stubs: {
          InputText: inputTextStub
        }
      }
    })

    const input = wrapper.get('input')
    input.element.value = 'hello @a'
    input.element.setSelectionRange(8, 8)
    await input.trigger('input')
    await flushPromises()

    expect(loadUsers).toHaveBeenCalled()

    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(insertMention).toHaveBeenCalledWith('hello @', 8, {
      id: '42',
      name: 'Anna Smith',
      mention: '@my_42'
    })
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual(['hello @my_42 '])
  })
})
