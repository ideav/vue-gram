<template>
  <div class="integram-form">
    <div class="page-header">
      <h2><i class="pi pi-file"></i> Формы</h2>
    </div>

    <div class="form-input-card">
      <div class="field">
        <label>ID формы</label>
        <div class="input-row">
          <input
            v-model="formId"
            class="form-input"
            placeholder="Введите ID формы..."
            type="number"
            @keyup.enter="loadForm"
          />
          <button class="btn-primary" @click="loadForm" :disabled="loading || !formId">
            <i v-if="loading" class="pi pi-spin pi-spinner"></i>
            <i v-else class="pi pi-search"></i>
            Загрузить
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-box">
      <p>{{ error }}</p>
    </div>

    <div v-if="formData" class="form-card">
      <div class="form-card-header">
        <h3>{{ formData.name || formData.val || `Форма #${formId}` }}</h3>
      </div>

      <div class="form-fields">
        <div v-for="field in formFields" :key="field.id" class="form-field">
          <label>{{ field.alias || field.name || `Поле #${field.id}` }}</label>
          <input
            v-if="!field.type || [3, 8, 13, 14, 16, 17].includes(field.type)"
            v-model="fieldValues[field.id]"
            class="field-input"
            :type="field.type === 16 ? 'password' : 'text'"
          />
          <input
            v-else-if="[4, 9].includes(field.type)"
            v-model="fieldValues[field.id]"
            class="field-input"
            :type="field.type === 9 ? 'date' : 'datetime-local'"
          />
          <select v-else-if="field.type === 7" v-model="fieldValues[field.id]" class="field-input">
            <option value="">—</option>
            <option value="1">Да</option>
            <option value="0">Нет</option>
          </select>
          <textarea
            v-else-if="[11, 15].includes(field.type)"
            v-model="fieldValues[field.id]"
            class="field-textarea"
            rows="4"
          ></textarea>
          <input v-else v-model="fieldValues[field.id]" class="field-input" />
        </div>
      </div>

      <div v-if="formFields.length > 0" class="form-actions">
        <button class="btn-secondary" @click="resetForm">Сбросить</button>
        <button class="btn-primary" @click="submitForm" :disabled="submitting">
          <i v-if="submitting" class="pi pi-spin pi-spinner"></i>
          Отправить
        </button>
      </div>

      <div v-if="submitMessage" :class="['alert', submitSeverity]">
        {{ submitMessage }}
      </div>
    </div>

    <div v-if="!formData && !loading && !error && !formId" class="empty-state">
      <i class="pi pi-file"></i>
      <p>Введите ID формы для загрузки</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import integramApiClient from '@/services/integramApiClient'

const route = useRoute()

const formId = ref(route.params.formId || '')
const loading = ref(false)
const submitting = ref(false)
const error = ref(null)
const formData = ref(null)
const formFields = ref([])
const fieldValues = ref({})
const submitMessage = ref('')
const submitSeverity = ref('info')

async function loadForm() {
  if (!formId.value) return
  loading.value = true
  error.value = null
  formData.value = null
  formFields.value = []
  fieldValues.value = {}
  submitMessage.value = ''

  try {
    const response = await integramApiClient.getTypeMetadata(formId.value)
    formData.value = response?.type || response

    if (response?.reqs && Array.isArray(response.reqs)) {
      formFields.value = response.reqs
      for (const req of response.reqs) {
        fieldValues.value[req.id] = ''
      }
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function resetForm() {
  for (const key of Object.keys(fieldValues.value)) {
    fieldValues.value[key] = ''
  }
  submitMessage.value = ''
}

async function submitForm() {
  submitting.value = true
  submitMessage.value = ''
  try {
    const name = formData.value?.val || formData.value?.name || 'New'
    await integramApiClient.createObject(formId.value, name, fieldValues.value)
    submitMessage.value = 'Объект успешно создан'
    submitSeverity.value = 'success'
    resetForm()
  } catch (err) {
    submitMessage.value = err.message
    submitSeverity.value = 'error'
  } finally {
    submitting.value = false
  }
}

if (formId.value) loadForm()
</script>

<style scoped>
.integram-form { max-width: 800px; margin: 0 auto; }
.page-header { margin-bottom: 1rem; }
.page-header h2 { display: flex; align-items: center; gap: 0.5rem; color: #1e293b; margin: 0; }

.form-input-card, .form-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.field label, .form-field label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #555;
}

.input-row { display: flex; gap: 0.5rem; }

.form-input, .field-input {
  flex: 1;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.form-input:focus, .field-input:focus { outline: none; border-color: #1976d2; box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.15); }

.field-textarea {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}
.field-textarea:focus { outline: none; border-color: #1976d2; }

.form-card-header {
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}
.form-card-header h3 { margin: 0; color: #334155; }

.form-fields { display: flex; flex-direction: column; gap: 1rem; }
.form-field { margin-bottom: 0; }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

.error-box { padding: 1rem; background: #fef0f0; border-radius: 8px; color: #dc2626; margin-bottom: 1rem; }
.empty-state { text-align: center; padding: 3rem; color: #94a3b8; }
.empty-state i { font-size: 3rem; display: block; margin-bottom: 0.5rem; }

.alert { padding: 0.75rem; border-radius: 6px; font-size: 0.875rem; margin-top: 1rem; }
.alert.error { background: #fef0f0; color: #dc2626; }
.alert.success { background: #f0fef4; color: #16a34a; }

.btn-primary {
  padding: 0.5rem 1.25rem;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.btn-primary:hover { background: #1565c0; }
.btn-primary:disabled { background: #90caf9; cursor: not-allowed; }

.btn-secondary {
  padding: 0.5rem 1.25rem;
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
}
.btn-secondary:hover { background: #f8fafc; }
</style>
