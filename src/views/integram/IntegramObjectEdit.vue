<template>
  <div class="integram-edit">
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <i class="pi pi-arrow-left"></i>
      </button>
      <h2>Редактирование объекта #{{ $route.params.objectId }}</h2>
    </div>

    <div v-if="loading" class="loading">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
    </div>

    <div v-else-if="error" class="error-box">
      <p>{{ error }}</p>
    </div>

    <div v-else class="edit-form">
      <div class="form-card">
        <div class="field">
          <label>Значение</label>
          <input v-model="objectValue" class="form-input" />
        </div>

        <div v-for="req in requisites" :key="req.id" class="field">
          <label>{{ req.alias || req.name || `Req #${req.id}` }}</label>
          <input v-model="reqValues[req.id]" class="form-input" />
        </div>

        <div class="form-actions">
          <button class="btn-secondary" @click="goBack">Отмена</button>
          <button class="btn-primary" @click="save" :disabled="saving">
            <i v-if="saving" class="pi pi-spin pi-spinner"></i>
            Сохранить
          </button>
        </div>
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
const saving = ref(false)
const error = ref(null)
const objectValue = ref('')
const objectTypeId = ref(null)
const requisites = ref([])
const reqValues = ref({})

function goBack() {
  router.back()
}

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const response = await integramApiClient.getObjectEditData(route.params.objectId)
    if (response) {
      objectValue.value = response.val || response.value || ''
      objectTypeId.value = response.base || response.typeId

      if (response.reqs) {
        if (Array.isArray(response.reqs)) {
          requisites.value = response.reqs
          for (const req of response.reqs) {
            reqValues.value[req.id] = req.val || req.value || ''
          }
        } else if (typeof response.reqs === 'object') {
          requisites.value = Object.entries(response.reqs).map(([id, info]) => ({
            id,
            alias: info.alias || info.name || `Req #${id}`,
            name: info.name
          }))
          for (const [id, info] of Object.entries(response.reqs)) {
            reqValues.value[id] = info.val || info.value || ''
          }
        }
      }
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await integramApiClient.saveObject(
      route.params.objectId,
      objectTypeId.value,
      objectValue.value,
      reqValues.value
    )
    router.back()
  } catch (err) {
    alert('Ошибка: ' + err.message)
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.integram-edit { max-width: 800px; margin: 0 auto; }
.page-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
.page-header h2 { margin: 0; color: #1e293b; font-size: 1.25rem; }
.back-btn { width: 36px; height: 36px; border: 1px solid #e2e8f0; background: white; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; }
.back-btn:hover { background: #f8fafc; color: #1976d2; }
.loading { text-align: center; padding: 3rem; color: #64748b; }
.error-box { text-align: center; padding: 2rem; background: #fef0f0; border-radius: 8px; color: #dc2626; }
.form-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; }
.field { margin-bottom: 1rem; }
.field label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: #555; }
.form-input { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.95rem; box-sizing: border-box; }
.form-input:focus { outline: none; border-color: #1976d2; box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.15); }
.form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }
.btn-primary { padding: 0.5rem 1.25rem; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 0.5rem; }
.btn-primary:hover { background: #1565c0; }
.btn-primary:disabled { background: #90caf9; cursor: not-allowed; }
.btn-secondary { padding: 0.5rem 1.25rem; background: white; color: #64748b; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; }
.btn-secondary:hover { background: #f8fafc; }
</style>
