<template>
  <div class="tasks-view">
    <div class="view-header">
      <h2>Задачи</h2>
      <Button label="Создать задачу" icon="pi pi-plus" />
    </div>

    <div class="table-container">
      <DataTable
        :value="tasks"
        :paginator="true"
        :rows="20"
        :loading="loading"
        stripedRows
        showGridlines
        filterDisplay="row"
        v-model:filters="filters"
        :globalFilterFields="['name', 'leadName', 'executor', 'type']"
      >
        <template #header>
          <div class="table-header">
            <IconField iconPosition="left">
              <InputIcon>
                <i class="pi pi-search" />
              </InputIcon>
              <InputText v-model="filters['global'].value" placeholder="Поиск по задачам" />
            </IconField>
          </div>
        </template>

        <Column field="id" header="ID" :sortable="true" style="width: 80px">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="ID" class="p-column-filter" />
          </template>
        </Column>

        <Column field="name" header="Название" :sortable="true">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Название" class="p-column-filter" />
          </template>
        </Column>

        <Column field="type" header="Тип" :sortable="true" style="width: 200px">
          <template #body="{ data }">
            <Tag :value="data.type" severity="info" />
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Тип" class="p-column-filter" />
          </template>
        </Column>

        <Column field="leadName" header="Лид" :sortable="true">
          <template #body="{ data }">
            <router-link :to="`/kanban`" class="lead-link">
              {{ data.leadName }}
            </router-link>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Лид" class="p-column-filter" />
          </template>
        </Column>

        <Column field="executor" header="Исполнитель" :sortable="true">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Исполнитель" class="p-column-filter" />
          </template>
        </Column>

        <Column field="deadline" header="Срок" :sortable="true" style="width: 120px">
          <template #body="{ data }">
            <span :class="{ 'deadline-urgent': isUrgent(data.deadline) }">
              {{ formatDate(data.deadline) }}
            </span>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Срок" class="p-column-filter" />
          </template>
        </Column>

        <Column field="priority" header="Приоритет" :sortable="true" style="width: 130px">
          <template #body="{ data }">
            <Tag
              :value="data.priority"
              :severity="getPrioritySeverity(data.priority)"
            />
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Приоритет" class="p-column-filter" />
          </template>
        </Column>

        <Column header="Действия" style="width: 100px">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded @click="editTask(data)" />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { api } from '../services/mockData.js'

const tasks = ref([])
const loading = ref(false)

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  id: { value: null, matchMode: FilterMatchMode.CONTAINS },
  name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  type: { value: null, matchMode: FilterMatchMode.CONTAINS },
  leadName: { value: null, matchMode: FilterMatchMode.CONTAINS },
  executor: { value: null, matchMode: FilterMatchMode.CONTAINS },
  deadline: { value: null, matchMode: FilterMatchMode.CONTAINS },
  priority: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

onMounted(async () => {
  loading.value = true
  tasks.value = await api.getTasks()
  loading.value = false
})

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const isUrgent = (dateStr) => {
  const deadline = new Date(dateStr)
  const today = new Date()
  const diffTime = deadline - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 3
}

const getPrioritySeverity = (priority) => {
  switch (priority) {
    case 'Высокий':
      return 'danger'
    case 'Средний':
      return 'warn'
    default:
      return 'secondary'
  }
}

const editTask = (task) => {
  console.log('Edit task:', task)
}
</script>

<style scoped>
.tasks-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.view-header h2 {
  margin: 0;
  font-size: 1.75rem;
  color: #1e293b;
}

.table-container {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  background-color: #f8fafc;
}

.lead-link {
  color: #1976d2;
  text-decoration: none;
  font-weight: 500;
}

.lead-link:hover {
  text-decoration: underline;
}

.deadline-urgent {
  color: #dc2626;
  font-weight: 600;
}

:deep(.p-column-filter) {
  width: 100%;
}
</style>
