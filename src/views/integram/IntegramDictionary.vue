<template>
  <div class="integram-dict">
    <div class="page-header">
      <h2><i class="pi pi-database"></i> Объекты</h2>
    </div>

    <div v-if="loading" class="loading">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Загрузка...</p>
    </div>

    <div v-else-if="error" class="error-box">
      <i class="pi pi-exclamation-triangle"></i>
      <p>{{ error }}</p>
      <button @click="loadData" class="retry-btn">Повторить</button>
    </div>

    <div v-else class="dict-grid">
      <div
        v-for="item in dictItems"
        :key="item.id"
        class="dict-card"
        @click="openType(item.id)"
      >
        <div class="dict-card-header">
          <i class="pi pi-table"></i>
          <span class="dict-name">{{ item.val || item.name }}</span>
        </div>
        <div class="dict-card-meta">
          <span class="dict-id">ID: {{ item.id }}</span>
          <span v-if="item.cnt !== undefined" class="dict-count">{{ item.cnt }} объектов</span>
        </div>
      </div>
    </div>

    <div v-if="!loading && !error && dictItems.length === 0" class="empty-state">
      <i class="pi pi-inbox"></i>
      <p>Нет объектов</p>
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
const dictItems = ref([])

function openType(typeId) {
  const db = route.params.database
  router.push(`/integram/${db}/object/${typeId}`)
}

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const response = await integramApiClient.getDictionary()
    if (response && response.type && Array.isArray(response.type)) {
      dictItems.value = response.type
    } else if (Array.isArray(response)) {
      dictItems.value = response
    } else {
      dictItems.value = []
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
.integram-dict { max-width: 1200px; margin: 0 auto; }

.page-header {
  margin-bottom: 1rem;
}

.page-header h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #1e293b;
  margin: 0;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #64748b;
}

.error-box {
  text-align: center;
  padding: 2rem;
  background: #fef0f0;
  border-radius: 8px;
  color: #dc2626;
}

.error-box i { font-size: 2rem; margin-bottom: 0.5rem; }

.retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.dict-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
}

.dict-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.dict-card:hover {
  border-color: #1976d2;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.dict-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.dict-card-header i { color: #1976d2; }
.dict-name { font-weight: 600; color: #1e293b; }

.dict-card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #94a3b8;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #94a3b8;
}

.empty-state i { font-size: 3rem; margin-bottom: 0.5rem; }
</style>
