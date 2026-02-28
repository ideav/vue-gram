<template>
  <div class="integram-table">
    <DataTable
      :value="localData"
      :paginator="paginator"
      :rows="rows"
      :loading="loading"
      stripedRows
      showGridlines
      :filterDisplay="filterDisplay"
      v-model:filters="localFilters"
      :globalFilterFields="globalFilterFields"
      :sortField="sortField"
      :sortOrder="sortOrder"
      @row-click="onRowClick"
      @cell-edit-complete="onCellEditComplete"
      editMode="cell"
      :class="{ 'editable-table': editable }"
    >
      <template #header v-if="showHeader">
        <div class="table-header">
          <div class="table-title">
            <h3 v-if="title">{{ title }}</h3>
          </div>
          <div class="table-actions">
            <IconField iconPosition="left" v-if="showSearch">
              <InputIcon>
                <i class="pi pi-search" />
              </InputIcon>
              <InputText
                v-model="localFilters['global'].value"
                placeholder="Поиск..."
              />
            </IconField>
            <Button
              v-if="showAddButton"
              label="Добавить"
              icon="pi pi-plus"
              @click="onAdd"
              size="small"
            />
          </div>
        </div>
      </template>

      <Column
        v-for="column in columns"
        :key="column.field"
        :field="column.field"
        :header="column.header"
        :sortable="column.sortable !== false"
        :style="column.style"
        :class="column.class"
      >
        <template #body="slotProps" v-if="column.type">
          <!-- Text/String -->
          <span v-if="column.type === 'text' || column.type === 'string'">
            {{ slotProps.data[column.field] }}
          </span>

          <!-- Number -->
          <span v-else-if="column.type === 'number'" class="number-cell">
            {{ formatNumber(slotProps.data[column.field]) }}
          </span>

          <!-- Currency -->
          <span v-else-if="column.type === 'currency'" class="currency-cell">
            {{ formatCurrency(slotProps.data[column.field]) }}
          </span>

          <!-- Date -->
          <span v-else-if="column.type === 'date'">
            {{ formatDate(slotProps.data[column.field]) }}
          </span>

          <!-- DateTime -->
          <span v-else-if="column.type === 'datetime'">
            {{ formatDateTime(slotProps.data[column.field]) }}
          </span>

          <!-- Boolean/Checkbox -->
          <Checkbox
            v-else-if="column.type === 'boolean'"
            :modelValue="slotProps.data[column.field]"
            :binary="true"
            :disabled="!editable"
            @update:modelValue="updateCell(slotProps.data, column.field, $event)"
          />

          <!-- Status/Tag -->
          <Tag
            v-else-if="column.type === 'status'"
            :value="slotProps.data[column.field]"
            :severity="getStatusSeverity(slotProps.data[column.field], column.statusMap)"
          />

          <!-- Link -->
          <a
            v-else-if="column.type === 'link'"
            :href="slotProps.data[column.field]"
            target="_blank"
            class="link-cell"
          >
            {{ slotProps.data[column.field] }}
          </a>

          <!-- Custom slot -->
          <slot
            v-else-if="column.type === 'custom'"
            :name="'column-' + column.field"
            :data="slotProps.data"
          >
            {{ slotProps.data[column.field] }}
          </slot>

          <!-- Default -->
          <span v-else>
            {{ slotProps.data[column.field] }}
          </span>
        </template>

        <!-- Editable cells -->
        <template #editor="{ data, field }" v-if="editable && column.editable !== false">
          <InputText
            v-if="!column.type || column.type === 'text' || column.type === 'string'"
            v-model="data[field]"
            autofocus
          />
          <InputNumber
            v-else-if="column.type === 'number' || column.type === 'currency'"
            v-model="data[field]"
            autofocus
          />
          <Calendar
            v-else-if="column.type === 'date'"
            v-model="data[field]"
            dateFormat="dd.mm.yy"
            autofocus
          />
          <Calendar
            v-else-if="column.type === 'datetime'"
            v-model="data[field]"
            dateFormat="dd.mm.yy"
            :showTime="true"
            autofocus
          />
        </template>

        <!-- Column filter -->
        <template #filter="{ filterModel, filterCallback }" v-if="filterDisplay === 'row'">
          <InputText
            v-model="filterModel.value"
            @input="filterCallback()"
            :placeholder="column.header"
            class="p-column-filter"
          />
        </template>
      </Column>

      <!-- Actions column -->
      <Column v-if="showActions" header="Действия" :style="{ width: actionsWidth }">
        <template #body="slotProps">
          <div class="action-buttons">
            <Button
              v-if="showEditButton"
              icon="pi pi-pencil"
              text
              rounded
              @click="onEdit(slotProps.data)"
              title="Редактировать"
            />
            <Button
              v-if="showDeleteButton"
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              @click="onDelete(slotProps.data)"
              title="Удалить"
            />
            <slot name="actions" :data="slotProps.data"></slot>
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-inbox empty-icon"></i>
          <p>{{ emptyMessage || 'Нет данных' }}</p>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Calendar from 'primevue/calendar'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'

const props = defineProps({
  // Data
  data: {
    type: Array,
    default: () => []
  },
  columns: {
    type: Array,
    required: true
  },

  // Table options
  title: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  editable: {
    type: Boolean,
    default: false
  },

  // Pagination
  paginator: {
    type: Boolean,
    default: true
  },
  rows: {
    type: Number,
    default: 20
  },

  // Filtering
  filterDisplay: {
    type: String,
    default: 'row' // 'row' or 'menu'
  },
  showSearch: {
    type: Boolean,
    default: true
  },

  // Sorting
  sortField: {
    type: String,
    default: null
  },
  sortOrder: {
    type: Number,
    default: 1
  },

  // Header/Footer
  showHeader: {
    type: Boolean,
    default: true
  },

  // Actions
  showActions: {
    type: Boolean,
    default: false
  },
  showAddButton: {
    type: Boolean,
    default: false
  },
  showEditButton: {
    type: Boolean,
    default: true
  },
  showDeleteButton: {
    type: Boolean,
    default: true
  },
  actionsWidth: {
    type: String,
    default: '100px'
  },

  // Empty state
  emptyMessage: {
    type: String,
    default: 'Нет данных'
  }
})

const emit = defineEmits([
  'row-click',
  'cell-edit',
  'add',
  'edit',
  'delete',
  'update:data'
])

// Local data for two-way binding
const localData = computed({
  get: () => props.data,
  set: (value) => emit('update:data', value)
})

// Global filter fields from columns
const globalFilterFields = computed(() => {
  return props.columns.map(col => col.field)
})

// Initialize filters
const initFilters = () => {
  const filters = {
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
  }

  props.columns.forEach(col => {
    filters[col.field] = { value: null, matchMode: FilterMatchMode.CONTAINS }
  })

  return filters
}

const localFilters = ref(initFilters())

// Reset filters when columns change
watch(() => props.columns, () => {
  localFilters.value = initFilters()
}, { deep: true })

// Event handlers
const onRowClick = (event) => {
  emit('row-click', event)
}

const onCellEditComplete = (event) => {
  const { data, newValue, field } = event
  data[field] = newValue
  emit('cell-edit', { data, field, value: newValue })
}

const updateCell = (data, field, value) => {
  data[field] = value
  emit('cell-edit', { data, field, value })
}

const onAdd = () => {
  emit('add')
}

const onEdit = (data) => {
  emit('edit', data)
}

const onDelete = (data) => {
  emit('delete', data)
}

// Formatters
const formatNumber = (value) => {
  if (value == null) return ''
  return new Intl.NumberFormat('ru-RU').format(value)
}

const formatCurrency = (value) => {
  if (value == null) return ''
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(value)
}

const formatDate = (value) => {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('ru-RU').format(date)
}

const formatDateTime = (value) => {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getStatusSeverity = (status, statusMap) => {
  if (statusMap && statusMap[status]) {
    return statusMap[status]
  }

  // Default status mapping
  const defaultMap = {
    'active': 'success',
    'inactive': 'secondary',
    'pending': 'warn',
    'completed': 'success',
    'cancelled': 'danger',
    'draft': 'info'
  }

  const normalizedStatus = String(status).toLowerCase()
  return defaultMap[normalizedStatus] || 'secondary'
}
</script>

<style scoped>
.integram-table {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f8fafc;
  gap: 1rem;
}

.table-title h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #1e293b;
  font-weight: 600;
}

.table-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
  justify-content: center;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
}

.empty-icon {
  font-size: 3rem;
  color: #cbd5e1;
  margin-bottom: 1rem;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
}

.number-cell,
.currency-cell {
  font-weight: 600;
  color: #059669;
}

.link-cell {
  color: #1976d2;
  text-decoration: none;
}

.link-cell:hover {
  text-decoration: underline;
}

:deep(.p-column-filter) {
  width: 100%;
}

:deep(.editable-table .p-datatable-tbody > tr > td) {
  cursor: pointer;
}

:deep(.editable-table .p-datatable-tbody > tr > td:hover) {
  background-color: #f1f5f9;
}
</style>
