<template>
  <div class="partners-view">
    <div class="view-header">
      <h2>Партнеры</h2>
      <Button label="Добавить партнера" icon="pi pi-plus" />
    </div>

    <div class="table-container">
      <DataTable
        :value="partners"
        :paginator="true"
        :rows="20"
        :loading="loading"
        stripedRows
        showGridlines
        filterDisplay="row"
        v-model:filters="filters"
        :globalFilterFields="['name', 'type', 'manager', 'status']"
      >
        <template #header>
          <div class="table-header">
            <IconField iconPosition="left">
              <InputIcon>
                <i class="pi pi-search" />
              </InputIcon>
              <InputText v-model="filters['global'].value" placeholder="Поиск по партнерам" />
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

        <Column field="type" header="Тип" :sortable="true" style="width: 150px">
          <template #body="{ data }">
            <Tag :value="data.type" :severity="data.type === 'Дистрибьютор' ? 'success' : 'info'" />
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Тип" class="p-column-filter" />
          </template>
        </Column>

        <Column field="manager" header="Менеджер" :sortable="true">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Менеджер" class="p-column-filter" />
          </template>
        </Column>

        <Column field="status" header="Статус" :sortable="true" style="width: 120px">
          <template #body="{ data }">
            <Tag
              :value="data.status"
              :severity="getStatusSeverity(data.status)"
            />
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Статус" class="p-column-filter" />
          </template>
        </Column>

        <Column field="deals" header="Сделок" :sortable="true" style="width: 100px">
          <template #body="{ data }">
            <span class="deals-count">{{ data.deals }}</span>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Сделок" class="p-column-filter" />
          </template>
        </Column>

        <Column header="Действия" style="width: 100px">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded @click="editPartner(data)" />
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

const partners = ref([])
const loading = ref(false)

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  id: { value: null, matchMode: FilterMatchMode.CONTAINS },
  name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  type: { value: null, matchMode: FilterMatchMode.CONTAINS },
  manager: { value: null, matchMode: FilterMatchMode.CONTAINS },
  status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  deals: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

onMounted(async () => {
  loading.value = true
  partners.value = await api.getPartners()
  loading.value = false
})

const getStatusSeverity = (status) => {
  switch (status) {
    case 'Активный':
      return 'success'
    case 'Новый':
      return 'info'
    default:
      return 'secondary'
  }
}

const editPartner = (partner) => {
  console.log('Edit partner:', partner)
}
</script>

<style scoped>
.partners-view {
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

.deals-count {
  font-weight: 600;
  color: #1976d2;
}

:deep(.p-column-filter) {
  width: 100%;
}
</style>
