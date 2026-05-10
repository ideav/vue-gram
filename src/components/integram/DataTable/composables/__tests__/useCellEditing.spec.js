import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useCellEditing } from '../useCellEditing'

function createCellEditingHarness() {
  const emit = vi.fn()
  const markCellAsChanged = vi.fn()

  const api = useCellEditing(
    { disableEditing: false },
    ref([
      {
        id: 1,
        cells: {
          name: { value: 'Old value', type: 3 }
        }
      }
    ]),
    ref([{ id: 'name', value: 'Name', type: 3 }]),
    ref({ start: null, end: null, isSelecting: false }),
    emit,
    vi.fn(),
    vi.fn(),
    markCellAsChanged,
    ref([]),
    vi.fn()
  )

  return { api, emit, markCellAsChanged }
}

describe('useCellEditing', () => {
  it('provides rollback callbacks for failed inline cell saves', () => {
    const { api, emit, markCellAsChanged } = createCellEditingHarness()

    api.editingValue.value = 'New value'
    api.saveCellEdit('name', 1)

    expect(api.localCellOverrides.value.get('1:name')).toBe('New value')
    expect(markCellAsChanged).toHaveBeenCalledWith('name', 1)
    expect(emit).toHaveBeenCalledWith('cell-update', expect.objectContaining({
      rowId: 1,
      headerId: 'name',
      value: 'New value',
      previousValue: 'Old value',
      onSaveSuccess: expect.any(Function),
      onSaveError: expect.any(Function)
    }))

    const payload = emit.mock.calls[0][1]
    payload.onSaveError()

    expect(api.localCellOverrides.value.has('1:name')).toBe(false)
  })
})
