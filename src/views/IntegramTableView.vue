<template>
  <div class="integram-table-view">
    <div class="view-header">
      <h2>Integram Table Component</h2>
      <p class="view-description">
        Imported and adapted table component from dronedoc2025 repository
      </p>
    </div>

    <!-- Example 1: Basic Table -->
    <div class="example-section">
      <h3>Пример 1: Базовая таблица</h3>
      <IntegramTable
        :data="sampleData"
        :columns="basicColumns"
        title="Список клиентов"
        :showActions="true"
        :showAddButton="true"
        @add="handleAdd"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>

    <!-- Example 2: Editable Table with Different Types -->
    <div class="example-section">
      <h3>Пример 2: Редактируемая таблица с разными типами данных</h3>
      <IntegramTable
        :data="typedData"
        :columns="typedColumns"
        title="Таблица с типами данных"
        :editable="true"
        :showActions="true"
        @cell-edit="handleCellEdit"
      />
    </div>

    <!-- Example 3: Status Table -->
    <div class="example-section">
      <h3>Пример 3: Таблица со статусами</h3>
      <IntegramTable
        :data="statusData"
        :columns="statusColumns"
        title="Заявки"
        :showSearch="true"
        :showActions="true"
      />
    </div>

    <!-- Example 4: Custom Actions -->
    <div class="example-section">
      <h3>Пример 4: Пользовательские действия</h3>
      <IntegramTable
        :data="customActionsData"
        :columns="customColumns"
        title="Проекты"
        :showActions="true"
        :showEditButton="false"
        :showDeleteButton="false"
      >
        <template #actions="{ data }">
          <Button
            icon="pi pi-eye"
            text
            rounded
            @click="viewDetails(data)"
            title="Просмотр"
          />
          <Button
            icon="pi pi-copy"
            text
            rounded
            @click="duplicateItem(data)"
            title="Дублировать"
          />
          <Button
            icon="pi pi-send"
            text
            rounded
            @click="sendItem(data)"
            title="Отправить"
          />
        </template>
      </IntegramTable>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import IntegramTable from '../components/IntegramTable.vue'
import Button from 'primevue/button'

// Example 1: Basic data
const sampleData = ref([
  { id: 1, name: 'Иван Петров', email: 'ivan@example.com', phone: '+7 (999) 123-45-67', company: 'ООО "Альфа"' },
  { id: 2, name: 'Мария Сидорова', email: 'maria@example.com', phone: '+7 (999) 234-56-78', company: 'ООО "Бета"' },
  { id: 3, name: 'Алексей Смирнов', email: 'alexey@example.com', phone: '+7 (999) 345-67-89', company: 'ИП Смирнов' },
  { id: 4, name: 'Елена Кузнецова', email: 'elena@example.com', phone: '+7 (999) 456-78-90', company: 'ООО "Гамма"' },
  { id: 5, name: 'Дмитрий Попов', email: 'dmitry@example.com', phone: '+7 (999) 567-89-01', company: 'ООО "Дельта"' }
])

const basicColumns = [
  { field: 'id', header: 'ID', type: 'number', style: { width: '80px' }, sortable: true },
  { field: 'name', header: 'Имя', type: 'text', sortable: true },
  { field: 'email', header: 'Email', type: 'text', sortable: true },
  { field: 'phone', header: 'Телефон', type: 'text', sortable: true },
  { field: 'company', header: 'Компания', type: 'text', sortable: true }
]

// Example 2: Typed data
const typedData = ref([
  {
    id: 1,
    product: 'Ноутбук ASUS',
    price: 85000,
    quantity: 5,
    inStock: true,
    deliveryDate: new Date('2024-03-15'),
    lastUpdate: new Date('2024-03-10T14:30:00')
  },
  {
    id: 2,
    product: 'Монитор Samsung',
    price: 25000,
    quantity: 12,
    inStock: true,
    deliveryDate: new Date('2024-03-12'),
    lastUpdate: new Date('2024-03-09T10:15:00')
  },
  {
    id: 3,
    product: 'Клавиатура Logitech',
    price: 3500,
    quantity: 0,
    inStock: false,
    deliveryDate: new Date('2024-03-20'),
    lastUpdate: new Date('2024-03-08T16:45:00')
  }
])

const typedColumns = [
  { field: 'id', header: 'ID', type: 'number', style: { width: '80px' } },
  { field: 'product', header: 'Товар', type: 'text' },
  { field: 'price', header: 'Цена', type: 'currency' },
  { field: 'quantity', header: 'Количество', type: 'number' },
  { field: 'inStock', header: 'В наличии', type: 'boolean' },
  { field: 'deliveryDate', header: 'Дата поставки', type: 'date' },
  { field: 'lastUpdate', header: 'Последнее обновление', type: 'datetime' }
]

// Example 3: Status data
const statusData = ref([
  { id: 1, title: 'Заявка на консультацию', client: 'Иван Петров', status: 'pending', created: new Date('2024-03-01') },
  { id: 2, title: 'Техническая поддержка', client: 'Мария Сидорова', status: 'active', created: new Date('2024-03-05') },
  { id: 3, title: 'Запрос КП', client: 'Алексей Смирнов', status: 'completed', created: new Date('2024-02-28') },
  { id: 4, title: 'Возврат товара', client: 'Елена Кузнецова', status: 'cancelled', created: new Date('2024-03-03') },
  { id: 5, title: 'Заявка на демо', client: 'Дмитрий Попов', status: 'active', created: new Date('2024-03-07') }
])

const statusColumns = [
  { field: 'id', header: 'ID', type: 'number', style: { width: '80px' } },
  { field: 'title', header: 'Название', type: 'text' },
  { field: 'client', header: 'Клиент', type: 'text' },
  {
    field: 'status',
    header: 'Статус',
    type: 'status',
    statusMap: {
      'pending': 'warn',
      'active': 'info',
      'completed': 'success',
      'cancelled': 'danger'
    }
  },
  { field: 'created', header: 'Создано', type: 'date' }
]

// Example 4: Custom actions data
const customActionsData = ref([
  { id: 1, project: 'Redesign сайта', manager: 'Иван Петров', progress: 75, budget: 500000 },
  { id: 2, project: 'Мобильное приложение', manager: 'Мария Сидорова', progress: 45, budget: 1200000 },
  { id: 3, project: 'CRM интеграция', manager: 'Алексей Смирнов', progress: 90, budget: 350000 }
])

const customColumns = [
  { field: 'id', header: 'ID', type: 'number', style: { width: '80px' } },
  { field: 'project', header: 'Проект', type: 'text' },
  { field: 'manager', header: 'Менеджер', type: 'text' },
  { field: 'progress', header: 'Прогресс (%)', type: 'number' },
  { field: 'budget', header: 'Бюджет', type: 'currency' }
]

// Event handlers
const handleAdd = () => {
  console.log('Add new item')
  // Add logic here
}

const handleEdit = (data) => {
  console.log('Edit item:', data)
  // Edit logic here
}

const handleDelete = (data) => {
  console.log('Delete item:', data)
  // Delete logic here
}

const handleCellEdit = ({ data, field, value }) => {
  console.log('Cell edited:', { data, field, value })
  // Save logic here
}

const viewDetails = (data) => {
  console.log('View details:', data)
}

const duplicateItem = (data) => {
  console.log('Duplicate item:', data)
}

const sendItem = (data) => {
  console.log('Send item:', data)
}
</script>

<style scoped>
.integram-table-view {
  height: 100%;
}

.view-header {
  margin-bottom: 30px;
}

.view-header h2 {
  margin: 0 0 8px 0;
  font-size: 2rem;
  color: #1e293b;
}

.view-description {
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
}

.example-section {
  margin-bottom: 40px;
}

.example-section h3 {
  margin: 0 0 16px 0;
  font-size: 1.25rem;
  color: #334155;
  font-weight: 600;
}
</style>
