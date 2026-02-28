<template>
  <div class="integram-tables">
    <div class="page-header">
      <h2><i class="pi pi-table"></i> Таблицы</h2>
      <button class="add-btn" @click="createType">
        <i class="pi pi-plus"></i> Создать таблицу
      </button>
    </div>

    <div v-if="loading" class="loading">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
    </div>

    <div v-else-if="error" class="error-box">
      <p>{{ error }}</p>
      <button @click="loadData" class="retry-btn">Повторить</button>
    </div>

    <div v-else class="table-list">
      <div
        v-for="item in tableItems"
        :key="item.id"
        class="table-card"
        @click="openTable(item.id)"
      >
        <div class="table-card-icon">
          <i class="pi pi-table"></i>
        </div>
        <div class="table-card-info">
          <strong>{{ item.val || item.name }}</strong>
          <span class="table-meta">ID: {{ item.id }}</span>
        </div>
        <div class="table-card-actions">
          <button class="icon-btn" @click.stop="openTable(item.id)" title="Открыть">
            <i class="pi pi-external-link"></i>
          </button>
        </div>
      </div>
    </div>

    <div v-if="!loading && !error && tableItems.length === 0" class="empty-state">
      <i class="pi pi-inbox"></i>
      <p>Нет таблиц</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import integramApiClient from '@/services/integramApiClient'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const error = ref(null)
const tableItems = ref([])

function openTable(typeId) {
  router.push(`/integram/${route.params.database}/table/${typeId}`)
}

async function createType() {
  const name = prompt('Название новой таблицы:')
  if (!name) return
  try {
    const result = await integramApiClient.createType(name, 3)
    if (result?.id) {
      await loadData()
    }
  } catch (err) {
    alert('Ошибка: ' + err.message)
  }
}

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const response = await integramApiClient.getTypeEditorData()
    if (response?.type && Array.isArray(response.type)) {
      tableItems.value = response.type
    } else if (Array.isArray(response)) {
      tableItems.value = response
    } else {
      tableItems.value = []
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.integram-tables { max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.page-header h2 { display: flex; align-items: center; gap: 0.5rem; color: #1e293b; margin: 0; }
.add-btn { padding: 0.5rem 1rem; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-weight: 500; }
.add-btn:hover { background: #1565c0; }
.loading { text-align: center; padding: 3rem; color: #64748b; }
.error-box { text-align: center; padding: 2rem; background: #fef0f0; border-radius: 8px; color: #dc2626; }
.retry-btn { margin-top: 1rem; padding: 0.5rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; }
.empty-state { text-align: center; padding: 3rem; color: #94a3b8; }
.empty-state i { font-size: 3rem; display: block; margin-bottom: 0.5rem; }

.table-list { display: flex; flex-direction: column; gap: 0.5rem; }

.table-card {
  display: flex; align-items: center; gap: 1rem;
  background: white; border: 1px solid #e2e8f0; border-radius: 8px;
  padding: 0.875rem 1rem; cursor: pointer; transition: all 0.2s;
}

.table-card:hover { border-color: #1976d2; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }

.table-card-icon {
  width: 40px; height: 40px; min-width: 40px;
  background: #e3f2fd; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: #1976d2; font-size: 1.1rem;
}

.table-card-info { flex: 1; }
.table-card-info strong { display: block; color: #1e293b; font-size: 0.95rem; }
.table-meta { font-size: 0.8rem; color: #94a3b8; }

.table-card-actions { flex-shrink: 0; }

.icon-btn {
  width: 32px; height: 32px; border: none; background: transparent;
  border-radius: 6px; cursor: pointer; display: flex; align-items: center;
  justify-content: center; color: #64748b;
}
.icon-btn:hover { background: #f1f5f9; color: #1976d2; }
</style>
