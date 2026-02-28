<template>
  <div class="deals-view">
    <div class="view-header">
      <h2>Сделки</h2>
      <Button label="Создать сделку" icon="pi pi-plus" />
    </div>

    <div class="table-container">
      <DataTable
        :value="deals"
        :paginator="true"
        :rows="20"
        :loading="loading"
        stripedRows
        showGridlines
        filterDisplay="row"
        v-model:filters="filters"
        :globalFilterFields="['leadName', 'partner', 'product', 'status']"
      >
        <template #header>
          <div class="table-header">
            <IconField iconPosition="left">
              <InputIcon>
                <i class="pi pi-search" />
              </InputIcon>
              <InputText v-model="filters['global'].value" placeholder="Поиск по сделкам" />
            </IconField>
          </div>
        </template>

        <Column field="id" header="ID" :sortable="true" style="width: 80px">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="ID" class="p-column-filter" />
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

        <Column field="partner" header="Партнер" :sortable="true">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Партнер" class="p-column-filter" />
          </template>
        </Column>

        <Column field="product" header="Продукт" :sortable="true">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Продукт" class="p-column-filter" />
          </template>
        </Column>

        <Column field="amount" header="Сумма" :sortable="true" style="width: 140px">
          <template #body="{ data }">
            <span class="amount">{{ formatCurrency(data.amount) }}</span>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Сумма" class="p-column-filter" />
          </template>
        </Column>

        <Column field="licenses" header="Лицензий" :sortable="true" style="width: 100px">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Лицензий" class="p-column-filter" />
          </template>
        </Column>

        <Column field="period" header="Период" :sortable="true" style="width: 130px">
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" @input="filterCallback()" placeholder="Период" class="p-column-filter" />
          </template>
        </Column>

        <Column field="status" header="Статус" :sortable="true" style="width: 150px">
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

        <Column header="Действия" style="width: 100px">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded @click="editDeal(data)" />
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

const deals = ref([])
const loading = ref(false)

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  id: { value: null, matchMode: FilterMatchMode.CONTAINS },
  leadName: { value: null, matchMode: FilterMatchMode.CONTAINS },
  partner: { value: null, matchMode: FilterMatchMode.CONTAINS },
  product: { value: null, matchMode: FilterMatchMode.CONTAINS },
  amount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  licenses: { value: null, matchMode: FilterMatchMode.CONTAINS },
  period: { value: null, matchMode: FilterMatchMode.CONTAINS },
  status: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

onMounted(async () => {
  loading.value = true
  deals.value = await api.getDeals()
  loading.value = false
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const getStatusSeverity = (status) => {
  switch (status) {
    case 'Оплачено':
      return 'success'
    case 'Закрыта':
      return 'success'
    case 'В работе':
      return 'info'
    case 'Согласование':
      return 'warn'
    case 'Триал':
      return 'secondary'
    default:
      return 'secondary'
  }
}

const editDeal = (deal) => {
  console.log('Edit deal:', deal)
}
</script>

<style scoped>
.deals-view {
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

.amount {
  font-weight: 600;
  color: #059669;
}

:deep(.p-column-filter) {
  width: 100%;
}
</style>
