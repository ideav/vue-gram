<template>
  <div class="integram-datatable">
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="$router.push(`/integram/${$route.params.database}/table`)">
          <i class="pi pi-arrow-left"></i>
        </button>
        <h2><i class="pi pi-table"></i> {{ typeName || `Таблица #${$route.params.typeId}` }}</h2>
      </div>
      <div class="header-actions">
        <button class="add-btn" @click="createObject">
          <i class="pi pi-plus"></i> Добавить
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
    </div>

    <div v-else-if="error" class="error-box">
      <p>{{ error }}</p>
      <button @click="loadData" class="retry-btn">Повторить</button>
    </div>

    <div v-else>
      <div v-if="columns.length > 0" class="data-table">
        <div class="table-header-row">
          <div class="table-cell id-cell">ID</div>
          <div class="table-cell val-cell">Значение</div>
          <div v-for="col in columns" :key="col.id" class="table-cell">{{ col.alias || col.name }}</div>
          <div class="table-cell actions-cell">Действия</div>
        </div>

        <div
          v-for="obj in objects"
          :key="obj.id"
          class="table-row"
          @click="editObject(obj.id)"
        >
          <div class="table-cell id-cell">{{ obj.id }}</div>
          <div class="table-cell val-cell">{{ obj.val }}</div>
          <div v-for="col in columns" :key="col.id" class="table-cell">
            {{ getReqValue(obj, col.id) }}
          </div>
          <div class="table-cell actions-cell">
            <button class="icon-btn" @click.stop="editObject(obj.id)" title="Редактировать">
              <i class="pi pi-pencil"></i>
            </button>
            <button class="icon-btn danger" @click.stop="deleteObj(obj.id)" title="Удалить">
              <i class="pi pi-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <div v-if="objects.length === 0" class="empty-state">
        <i class="pi pi-inbox"></i>
        <p>Нет записей</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import integramApiClient from '@/services/integramApiClient'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref(null)
const objects = ref([])
const columns = ref([])
const typeName = ref('')

function getReqValue(obj, reqId) {
  if (!obj.reqs) return ''
  const req = obj.reqs[reqId]
  if (!req) return ''
  if (typeof req === 'object') return req.val || req.value || ''
  return req
}

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const typeId = route.params.typeId

    try {
      const meta = await integramApiClient.getTypeMetadata(typeId)
      if (meta?.type) typeName.value = meta.type.val || meta.type.name || ''
      if (meta?.reqs && Array.isArray(meta.reqs)) {
        columns.value = meta.reqs.filter(r => r.alias || r.name)
      }
    } catch (e) {
      // Ignore metadata errors
    }

    const response = await integramApiClient.getObjectList(typeId)
    if (response?.object && Array.isArray(response.object)) {
      objects.value = response.object
      if (columns.value.length === 0 && response.reqs) {
        const reqs = response.reqs
        if (typeof reqs === 'object') {
          columns.value = Object.entries(reqs).map(([id, info]) => ({
            id,
            alias: info.alias || info.name || `Req ${id}`,
            name: info.name
          }))
        }
      }
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function editObject(objectId) {
  router.push(`/integram/${route.params.database}/edit_obj/${objectId}`)
}

async function createObject() {
  try {
    const name = prompt('Название новой записи:')
    if (!name) return
    const result = await integramApiClient.createObject(route.params.typeId, name)
    if (result?.id) {
      await loadData()
    }
  } catch (err) {
    alert('Ошибка: ' + err.message)
  }
}

async function deleteObj(objectId) {
  if (!confirm('Удалить запись?')) return
  try {
    await integramApiClient.deleteObject(objectId)
    await loadData()
  } catch (err) {
    alert('Ошибка: ' + err.message)
  }
}

onMounted(loadData)
</script>

<style scoped>
.integram-datatable { max-width: 1400px; margin: 0 auto; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.header-left { display: flex; align-items: center; gap: 0.75rem; }

.back-btn {
  width: 36px; height: 36px;
  border: 1px solid #e2e8f0; background: white;
  border-radius: 8px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #64748b;
}
.back-btn:hover { background: #f8fafc; color: #1976d2; }

.page-header h2 {
  display: flex; align-items: center; gap: 0.5rem;
  color: #1e293b; margin: 0; font-size: 1.25rem;
}

.add-btn {
  padding: 0.5rem 1rem;
  background: #1976d2; color: white;
  border: none; border-radius: 6px; cursor: pointer;
  display: flex; align-items: center; gap: 0.5rem;
  font-weight: 500;
}
.add-btn:hover { background: #1565c0; }

.loading { text-align: center; padding: 3rem; color: #64748b; }
.error-box { text-align: center; padding: 2rem; background: #fef0f0; border-radius: 8px; color: #dc2626; }
.retry-btn { margin-top: 1rem; padding: 0.5rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; }
.empty-state { text-align: center; padding: 3rem; color: #94a3b8; }
.empty-state i { font-size: 3rem; display: block; margin-bottom: 0.5rem; }

.data-table {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: auto;
}

.table-header-row {
  display: flex;
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  font-weight: 600;
  font-size: 0.8rem;
  color: #64748b;
  text-transform: uppercase;
}

.table-row {
  display: flex;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.15s;
}
.table-row:hover { background: #f8fafc; }

.table-cell {
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  min-width: 120px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.id-cell { max-width: 80px; min-width: 80px; flex: 0; }
.val-cell { min-width: 200px; font-weight: 500; color: #1e293b; }
.actions-cell { max-width: 100px; min-width: 100px; flex: 0; display: flex; gap: 4px; align-items: center; }

.icon-btn {
  width: 28px; height: 28px;
  border: none; background: transparent;
  border-radius: 4px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #64748b;
}
.icon-btn:hover { background: #e2e8f0; color: #1976d2; }
.icon-btn.danger:hover { background: #fef0f0; color: #dc2626; }
</style>
