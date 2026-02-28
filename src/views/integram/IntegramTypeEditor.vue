<template>
  <div class="integram-type-editor">
    <div class="page-header">
      <h2><i class="pi pi-sitemap"></i> Структура данных</h2>
    </div>

    <div v-if="loading" class="loading">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
    </div>

    <div v-else-if="error" class="error-box">
      <p>{{ error }}</p>
      <button @click="loadData" class="retry-btn">Повторить</button>
    </div>

    <div v-else>
      <!-- Type List -->
      <div class="types-panel">
        <div class="panel-header">
          <h3>Типы данных</h3>
          <button class="add-btn-sm" @click="createNewType">
            <i class="pi pi-plus"></i>
          </button>
        </div>

        <div
          v-for="type in types"
          :key="type.id"
          :class="['type-item', { selected: selectedType?.id === type.id }]"
          @click="selectType(type)"
        >
          <i class="pi pi-table"></i>
          <span>{{ type.val || type.name }}</span>
          <span class="type-id">#{{ type.id }}</span>
        </div>
      </div>

      <!-- Selected Type Details -->
      <div v-if="selectedType" class="type-details">
        <div class="details-header">
          <h3>{{ selectedType.val || selectedType.name }}</h3>
          <div class="details-actions">
            <button class="add-btn-sm" @click="addRequisite" title="Добавить поле">
              <i class="pi pi-plus"></i> Поле
            </button>
            <button class="icon-btn danger" @click="deleteSelectedType" title="Удалить тип">
              <i class="pi pi-trash"></i>
            </button>
          </div>
        </div>

        <div v-if="loadingReqs" class="loading-sm">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <div v-else class="reqs-list">
          <div v-for="req in typeReqs" :key="req.id" class="req-item">
            <div class="req-info">
              <strong>{{ req.alias || req.name || `Req #${req.id}` }}</strong>
              <span class="req-type">{{ getTypeName(req.type || req.t) }} (ID: {{ req.id }})</span>
            </div>
            <div class="req-actions">
              <button class="icon-btn" @click="moveUp(req.id)" title="Вверх"><i class="pi pi-arrow-up"></i></button>
              <button class="icon-btn danger" @click="deleteReq(req.id)" title="Удалить"><i class="pi pi-trash"></i></button>
            </div>
          </div>
          <div v-if="typeReqs.length === 0" class="empty-sm">Нет полей</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import integramApiClient from '@/services/integramApiClient'

const loading = ref(true)
const loadingReqs = ref(false)
const error = ref(null)
const types = ref([])
const selectedType = ref(null)
const typeReqs = ref([])

const typeNames = {
  3: 'SHORT', 8: 'CHARS', 2: 'LONG', 13: 'NUMBER', 14: 'SIGNED',
  4: 'DATETIME', 9: 'DATE', 7: 'BOOL', 10: 'FILE', 17: 'PATH',
  11: 'MEMO', 15: 'HTML', 16: 'PWD', 12: 'BUTTON'
}

function getTypeName(typeId) {
  return typeNames[typeId] || `Type ${typeId}`
}

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const response = await integramApiClient.getTypeEditorData()
    if (response?.type && Array.isArray(response.type)) {
      types.value = response.type
    } else if (Array.isArray(response)) {
      types.value = response
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function selectType(type) {
  selectedType.value = type
  loadingReqs.value = true
  try {
    const meta = await integramApiClient.getTypeMetadata(type.id)
    if (meta?.reqs && Array.isArray(meta.reqs)) {
      typeReqs.value = meta.reqs
    } else {
      typeReqs.value = []
    }
  } catch (err) {
    typeReqs.value = []
  } finally {
    loadingReqs.value = false
  }
}

async function createNewType() {
  const name = prompt('Название нового типа:')
  if (!name) return
  try {
    await integramApiClient.createType(name, 3)
    await loadData()
  } catch (err) {
    alert('Ошибка: ' + err.message)
  }
}

async function deleteSelectedType() {
  if (!selectedType.value) return
  if (!confirm(`Удалить тип "${selectedType.value.val}"?`)) return
  try {
    await integramApiClient.deleteType(selectedType.value.id)
    selectedType.value = null
    typeReqs.value = []
    await loadData()
  } catch (err) {
    alert('Ошибка: ' + err.message)
  }
}

async function addRequisite() {
  if (!selectedType.value) return
  const typeId = prompt('ID типа реквизита (3=SHORT, 8=CHARS, 13=NUMBER, 7=BOOL, 4=DATETIME):')
  if (!typeId) return
  try {
    const result = await integramApiClient.addRequisite(selectedType.value.id, parseInt(typeId))
    if (result?.id) {
      const alias = prompt('Название поля:')
      if (alias) {
        await integramApiClient.saveRequisiteAlias(result.id, alias)
      }
    }
    await selectType(selectedType.value)
  } catch (err) {
    alert('Ошибка: ' + err.message)
  }
}

async function moveUp(reqId) {
  try {
    await integramApiClient.moveRequisiteUp(reqId)
    if (selectedType.value) await selectType(selectedType.value)
  } catch (err) {
    alert('Ошибка: ' + err.message)
  }
}

async function deleteReq(reqId) {
  if (!confirm('Удалить поле?')) return
  try {
    await integramApiClient.deleteRequisite(reqId)
    if (selectedType.value) await selectType(selectedType.value)
  } catch (err) {
    alert('Ошибка: ' + err.message)
  }
}

onMounted(loadData)
</script>

<style scoped>
.integram-type-editor { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 1rem; }
.page-header { grid-column: 1 / -1; margin-bottom: 0.5rem; }
.page-header h2 { display: flex; align-items: center; gap: 0.5rem; color: #1e293b; margin: 0; }
.loading { text-align: center; padding: 3rem; color: #64748b; grid-column: 1 / -1; }
.error-box { text-align: center; padding: 2rem; background: #fef0f0; border-radius: 8px; color: #dc2626; grid-column: 1 / -1; }
.retry-btn { margin-top: 1rem; padding: 0.5rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; }

.types-panel, .type-details {
  background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem;
}

.panel-header, .details-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9;
}

.panel-header h3, .details-header h3 { margin: 0; font-size: 1rem; color: #334155; }

.add-btn-sm {
  padding: 4px 10px; background: #1976d2; color: white; border: none;
  border-radius: 6px; cursor: pointer; font-size: 0.8rem;
  display: flex; align-items: center; gap: 4px;
}
.add-btn-sm:hover { background: #1565c0; }

.details-actions { display: flex; gap: 0.5rem; }

.type-item {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer;
  font-size: 0.875rem; color: #334155; transition: all 0.15s;
}
.type-item:hover { background: #f1f5f9; }
.type-item.selected { background: #e3f2fd; color: #1976d2; font-weight: 500; }
.type-id { margin-left: auto; font-size: 0.75rem; color: #94a3b8; }

.loading-sm { text-align: center; padding: 1.5rem; color: #64748b; }
.empty-sm { text-align: center; padding: 1.5rem; color: #94a3b8; font-size: 0.875rem; }

.req-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.5rem 0.75rem; border-bottom: 1px solid #f8fafc;
}
.req-item:last-child { border-bottom: none; }
.req-info strong { display: block; color: #1e293b; font-size: 0.875rem; }
.req-type { font-size: 0.75rem; color: #94a3b8; }
.req-actions { display: flex; gap: 4px; }

.icon-btn {
  width: 28px; height: 28px; border: none; background: transparent;
  border-radius: 4px; cursor: pointer; display: flex; align-items: center;
  justify-content: center; color: #64748b;
}
.icon-btn:hover { background: #f1f5f9; color: #1976d2; }
.icon-btn.danger:hover { background: #fef0f0; color: #dc2626; }

@media (min-width: 768px) {
  .integram-type-editor { grid-template-columns: 300px 1fr; }
  .page-header { grid-column: 1 / -1; }
  .types-panel, .type-details { max-height: calc(100vh - 180px); overflow-y: auto; }
}
</style>
