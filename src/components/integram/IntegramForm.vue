<template>
  <div class="integram-form-page integram-touch-friendly">
    <IntegramBreadcrumb :items="breadcrumbItems" />

    <Card>
      <template #title>
        <div class="flex align-items-center justify-content-between gap-3">
          <span>Формы</span>
          <Button
            v-if="selectedForm"
            type="button"
            icon="fi fi-rr-arrow-left"
            label="Назад"
            text
            @click="resetForm"
          />
        </div>
      </template>

      <template #content>
        <div v-if="loading" class="form-loading">
          <ProgressSpinner aria-label="Загрузка формы" />
        </div>

        <Message v-else-if="loadError" severity="error" :closable="false">
          {{ loadError }}
        </Message>

        <div v-else-if="!selectedForm" data-testid="form-list" class="form-picker">
          <label for="integram-form-select">Выберите форму</label>
          <select
            id="integram-form-select"
            v-model="selectedFormId"
            data-testid="form-select"
            class="form-control"
            @change="loadForm(selectedFormId)"
          >
            <option value="">Выберите форму</option>
            <option
              v-for="form in availableForms"
              :key="form.id"
              :value="form.id"
            >
              {{ form.name }}
            </option>
          </select>

          <div v-if="availableForms.length === 0" class="integram-empty-state">
            <i class="fi fi-rr-inbox empty-icon"></i>
            <p class="empty-title">Формы не найдены</p>
          </div>
        </div>

        <div v-else data-testid="form-runtime" class="form-runtime">
          <header class="form-header">
            <h2 data-testid="form-title">{{ selectedForm.name }}</h2>
            <p v-if="selectedForm.description" class="text-500">
              {{ selectedForm.description }}
            </p>
          </header>

          <section
            v-for="panel in selectedForm.panels"
            :key="panel.id"
            class="form-panel"
            data-testid="form-panel"
          >
            <Panel :header="panel.title">
              <div
                v-if="panel.panelType === 'Report'"
                class="panel-report"
                :style="panelStyle(panel)"
              >
                <DataTable
                  v-if="panel.report?.rows?.length"
                  :value="panel.report.rows"
                  responsive-layout="scroll"
                >
                  <Column
                    v-for="column in panel.report.columns"
                    :key="column.name"
                    :field="column.name"
                    :header="column.name"
                  />
                </DataTable>
                <Message v-else severity="info" :closable="false">
                  Нет данных для отображения
                </Message>
              </div>

              <form
                v-else
                class="panel-form"
                :style="panelStyle(panel)"
                @submit.prevent="submitPanel(panel)"
              >
                <div
                  v-for="field in panel.fields"
                  v-show="isFieldVisible(field, panelValues[panel.id] || {})"
                  :key="field.configId || field.id"
                  class="integram-field"
                  :data-testid="`field-${panel.id}-${field.id}`"
                >
                  <label :for="fieldInputId(panel, field)">
                    {{ field.name }}
                    <span v-if="field.required" class="required-mark">*</span>
                  </label>

                  <select
                    v-if="isReferenceField(field)"
                    :id="fieldInputId(panel, field)"
                    :value="getFieldValue(panel, field)"
                    :disabled="field.readOnly || submittingPanelId === panel.id"
                    class="form-control"
                    :data-testid="`input-${panel.id}-${field.id}`"
                    @change="updateFieldValue(panel, field, $event.target.value)"
                  >
                    <option value=""></option>
                    <option
                      v-for="option in getFieldOptions(panel.id, field.id)"
                      :key="option.id"
                      :value="option.id"
                    >
                      {{ option.name }}
                    </option>
                  </select>

                  <input
                    v-else-if="field.baseType === 'BOOLEAN'"
                    :id="fieldInputId(panel, field)"
                    type="checkbox"
                    :checked="Boolean(getFieldValue(panel, field))"
                    :disabled="field.readOnly || submittingPanelId === panel.id"
                    :data-testid="`input-${panel.id}-${field.id}`"
                    @change="updateFieldValue(panel, field, $event.target.checked)"
                  >

                  <textarea
                    v-else-if="field.baseType === 'MEMO' || field.baseType === 'HTML'"
                    :id="fieldInputId(panel, field)"
                    :value="getFieldValue(panel, field)"
                    :readonly="field.readOnly"
                    :disabled="submittingPanelId === panel.id"
                    rows="4"
                    class="form-control"
                    :data-testid="`input-${panel.id}-${field.id}`"
                    @input="updateFieldValue(panel, field, $event.target.value)"
                  ></textarea>

                  <input
                    v-else-if="field.baseType === 'DATE'"
                    :id="fieldInputId(panel, field)"
                    type="date"
                    :value="getFieldValue(panel, field)"
                    :readonly="field.readOnly"
                    :disabled="submittingPanelId === panel.id"
                    class="form-control"
                    :data-testid="`input-${panel.id}-${field.id}`"
                    @input="updateFieldValue(panel, field, $event.target.value)"
                  >

                  <input
                    v-else-if="field.baseType === 'DATETIME'"
                    :id="fieldInputId(panel, field)"
                    type="datetime-local"
                    :value="getFieldValue(panel, field)"
                    :readonly="field.readOnly"
                    :disabled="submittingPanelId === panel.id"
                    class="form-control"
                    :data-testid="`input-${panel.id}-${field.id}`"
                    @input="updateFieldValue(panel, field, $event.target.value)"
                  >

                  <input
                    v-else-if="field.baseType === 'NUMBER' || field.baseType === 'SIGNED'"
                    :id="fieldInputId(panel, field)"
                    type="number"
                    :value="getFieldValue(panel, field)"
                    :readonly="field.readOnly"
                    :disabled="submittingPanelId === panel.id"
                    class="form-control"
                    :data-testid="`input-${panel.id}-${field.id}`"
                    @input="updateFieldValue(panel, field, $event.target.value)"
                  >

                  <input
                    v-else-if="field.baseType === 'PWD'"
                    :id="fieldInputId(panel, field)"
                    type="password"
                    :value="getFieldValue(panel, field)"
                    :readonly="field.readOnly"
                    :disabled="submittingPanelId === panel.id"
                    class="form-control"
                    :data-testid="`input-${panel.id}-${field.id}`"
                    @input="updateFieldValue(panel, field, $event.target.value)"
                  >

                  <input
                    v-else-if="field.baseType === 'FILE'"
                    :id="fieldInputId(panel, field)"
                    type="file"
                    :disabled="field.readOnly || submittingPanelId === panel.id"
                    class="form-control"
                    :data-testid="`input-${panel.id}-${field.id}`"
                    @change="updateFieldValue(panel, field, $event.target.files?.[0] || '')"
                  >

                  <input
                    v-else
                    :id="fieldInputId(panel, field)"
                    type="text"
                    :value="getFieldValue(panel, field)"
                    :readonly="field.readOnly"
                    :disabled="submittingPanelId === panel.id"
                    class="form-control"
                    :data-testid="`input-${panel.id}-${field.id}`"
                    @input="updateFieldValue(panel, field, $event.target.value)"
                  >

                  <small
                    v-if="validationErrors[panel.id]?.[field.id]"
                    class="p-error"
                    :data-testid="`error-${panel.id}-${field.id}`"
                  >
                    {{ validationErrors[panel.id][field.id] }}
                  </small>
                </div>

                <div v-if="panel.buttons.length" class="panel-actions secondary-actions">
                  <a
                    v-for="button in panel.buttons"
                    :key="button.id"
                    :href="button.action"
                    :class="button.className"
                  >
                    {{ button.label }}
                  </a>
                </div>

                <div class="panel-actions">
                  <Button
                    type="button"
                    icon="fi fi-rr-check"
                    label="Отправить"
                    :loading="submittingPanelId === panel.id"
                    :data-testid="`submit-panel-${panel.id}`"
                    @click="submitPanel(panel)"
                  />
                </div>

                <Message
                  v-if="submitMessages[panel.id]"
                  severity="success"
                  :closable="false"
                  :data-testid="`success-${panel.id}`"
                >
                  {{ submitMessages[panel.id] }}
                </Message>
              </form>
            </Panel>
          </section>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'

import IntegramBreadcrumb from './IntegramBreadcrumb.vue'
import integramApiClient from '@/services/integramApiClient'
import {
  FORM_BUTTON_REQS,
  LEGACY_FORM_BUTTON_TYPE_ID,
  LEGACY_FORM_FIELD_TYPE_ID,
  LEGACY_FORM_PANEL_TYPE_ID,
  LEGACY_FORM_TYPE_ID,
  buildFormPanelFields,
  buildSubmitPayload,
  getLegacyReqValue,
  isFieldVisible,
  isNumericId,
  normalizeFormPanel,
  normalizeLegacyObjectCollection,
  parseLegacyFilter,
  validateRequiredFields
} from '@/utils/integramForms'

const props = defineProps({
  session: {
    type: Object,
    default: null
  },
  database: {
    type: String,
    default: ''
  },
  formId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['navigate', 'submitted'])

const toast = useToast()

const loading = ref(false)
const loadError = ref('')
const selectedFormId = ref('')
const selectedForm = ref(null)
const availableForms = ref([])
const panelValues = ref({})
const validationErrors = ref({})
const referenceOptions = ref({})
const submitMessages = ref({})
const submittingPanelId = ref(null)

const activeDatabase = computed(() => (
  props.database ||
  props.session?.database ||
  integramApiClient.getDatabase() ||
  'my'
))

const breadcrumbItems = computed(() => {
  const items = [
    {
      label: 'Формы',
      icon: 'fi fi-rr-file',
      to: selectedForm.value ? `/${activeDatabase.value}/form` : undefined
    }
  ]

  if (selectedForm.value?.name) {
    items.push({
      label: selectedForm.value.name,
      icon: 'fi fi-rr-file'
    })
  }

  return items
})

function formFromObject(object) {
  return {
    ...object,
    id: String(object.id),
    name: object.name || object.val || `Форма ${object.id}`,
    description: object.description || ''
  }
}

function setDatabase() {
  integramApiClient.setDatabase(activeDatabase.value)
}

function getFieldOptions(scopeId, fieldId) {
  return referenceOptions.value[`${scopeId}:${fieldId}`] || []
}

function isReferenceField(field) {
  return field.isReference || field.refTypeId || field.baseType === 'DDL'
}

function optionListFromResponse(response = {}) {
  if (!response || typeof response !== 'object') return []
  if (Array.isArray(response.object) || Array.isArray(response.objects) || response['&main.a.&uni_obj.&uni_obj_all']) {
    return normalizeLegacyObjectCollection(response).objects.map(object => ({
      id: String(object.id),
      name: object.name || object.val || String(object.id)
    }))
  }

  return Object.entries(response)
    .filter(([id]) => !['more', 'selected', 'r'].includes(id))
    .map(([id, name]) => ({
      id: String(id),
      name: typeof name === 'object' && name !== null ? name.name || name.val || String(id) : String(name)
    }))
}

function setFieldOptions(scopeId, fieldId, options) {
  referenceOptions.value = {
    ...referenceOptions.value,
    [`${scopeId}:${fieldId}`]: options
  }
}

async function loadReferenceOptions(panel, fields) {
  await Promise.all(fields
    .filter(isReferenceField)
    .map(async (field) => {
      try {
        const options = await integramApiClient.getReferenceOptions(
          field.id,
          0,
          field.restrict || null,
          ''
        )
        setFieldOptions(panel.id, field.id, optionListFromResponse(options))
      } catch {
        setFieldOptions(panel.id, field.id, [])
      }
    }))
}

function defaultValueForField(field) {
  if (field.defaultValue !== undefined && field.defaultValue !== null) return field.defaultValue
  if (field.baseType === 'BOOLEAN') return false
  return ''
}

function initializePanelValues(panel) {
  panelValues.value = {
    ...panelValues.value,
    [panel.id]: Object.fromEntries(panel.fields.map(field => [
      field.id,
      defaultValueForField(field)
    ]))
  }
}

function normalizeButtons(buttonResponse = {}) {
  const collection = normalizeLegacyObjectCollection(buttonResponse)
  return collection.objects.map(button => ({
    id: String(button.id),
    label: button.name || button.val || 'Действие',
    action: getLegacyReqValue(collection.reqs, button.id, FORM_BUTTON_REQS.action) || '#',
    className: getLegacyReqValue(collection.reqs, button.id, FORM_BUTTON_REQS.className) || ''
  }))
}

async function buildRuntimePanel(panelObject, panelReqs) {
  const panel = normalizeFormPanel(panelObject, panelReqs)
  const [fieldResponse, buttonResponse, metadata] = await Promise.all([
    integramApiClient.getObjectList(LEGACY_FORM_FIELD_TYPE_ID, { F_U: panel.id }).catch(() => ({ object: [], reqs: {} })),
    integramApiClient.getObjectList(LEGACY_FORM_BUTTON_TYPE_ID, { F_U: panel.id }).catch(() => ({ object: [], reqs: {} })),
    isNumericId(panel.typeId)
      ? integramApiClient.getTypeMetadata(panel.typeId).catch(() => ({}))
      : Promise.resolve({})
  ])

  const fieldCollection = normalizeLegacyObjectCollection(fieldResponse)
  panel.fields = buildFormPanelFields({
    panel,
    configuredFields: fieldCollection.objects,
    configuredReqs: fieldCollection.reqs,
    metadata
  })
  panel.buttons = normalizeButtons(buttonResponse)

  if (panel.reportId) {
    try {
      panel.report = await integramApiClient.executeReport(panel.reportId, parseLegacyFilter(panel.filter))
    } catch {
      panel.report = { columns: [], rows: [] }
    }
  }

  initializePanelValues(panel)
  await loadReferenceOptions(panel, panel.fields)

  return panel
}

async function loadForms() {
  setDatabase()
  loading.value = true
  loadError.value = ''

  try {
    const response = await integramApiClient.getObjectList(LEGACY_FORM_TYPE_ID, { LIMIT: 1000 })
    availableForms.value = normalizeLegacyObjectCollection(response).objects.map(formFromObject)

    if (props.formId) {
      await loadForm(props.formId)
    }
  } catch (error) {
    loadError.value = error.message || 'Не удалось загрузить формы'
  } finally {
    loading.value = false
  }
}

async function loadForm(id) {
  if (!id) return

  setDatabase()
  loading.value = true
  loadError.value = ''
  selectedFormId.value = String(id)
  validationErrors.value = {}
  submitMessages.value = {}
  panelValues.value = {}
  referenceOptions.value = {}

  try {
    let form = availableForms.value.find(item => String(item.id) === String(id))

    try {
      const record = await integramApiClient.getObjectRecord(id)
      if (record?.obj) form = formFromObject(record.obj)
    } catch {
      // The list response already contains enough metadata for the runtime.
    }

    if (!form) form = { id: String(id), name: `Форма ${id}`, description: '' }

    const panelsResponse = await integramApiClient.getObjectList(LEGACY_FORM_PANEL_TYPE_ID, { F_U: String(id) })
    const panelCollection = normalizeLegacyObjectCollection(panelsResponse)
    const panels = await Promise.all(panelCollection.objects.map(panelObject => (
      buildRuntimePanel(panelObject, panelCollection.reqs)
    )))

    selectedForm.value = {
      ...form,
      panels
    }
  } catch (error) {
    selectedForm.value = null
    loadError.value = error.message || 'Не удалось загрузить форму'
  } finally {
    loading.value = false
  }
}

function resetForm() {
  selectedForm.value = null
  selectedFormId.value = ''
  validationErrors.value = {}
  submitMessages.value = {}
  panelValues.value = {}
  emit('navigate', 'form')
}

function fieldInputId(panel, field) {
  return `integram-form-${panel.id}-${field.id}`
}

function getFieldValue(panel, field) {
  return panelValues.value[panel.id]?.[field.id] ?? ''
}

function updateFieldValue(panel, field, value) {
  panelValues.value = {
    ...panelValues.value,
    [panel.id]: {
      ...(panelValues.value[panel.id] || {}),
      [field.id]: value
    }
  }
}

function panelStyle(panel) {
  return {
    color: panel.color,
    backgroundColor: panel.backgroundColor,
    overflow: panel.overflowMode || undefined
  }
}

function setPanelErrors(panelId, errors) {
  validationErrors.value = {
    ...validationErrors.value,
    [panelId]: errors
  }
}

function setSubmitMessage(panelId, message) {
  submitMessages.value = {
    ...submitMessages.value,
    [panelId]: message
  }
}

async function submitPanel(panel) {
  const values = panelValues.value[panel.id] || {}
  const errors = validateRequiredFields(panel.fields, values)
  setPanelErrors(panel.id, errors)
  setSubmitMessage(panel.id, '')

  if (Object.keys(errors).length > 0) {
    toast.add({
      severity: 'warn',
      summary: 'Проверьте форму',
      detail: 'Заполните обязательные поля',
      life: 3000
    })
    return
  }

  const payload = buildSubmitPayload(panel.fields, values, {
    defaultObjectValue: selectedForm.value?.name || panel.title
  })

  try {
    submittingPanelId.value = panel.id
    const result = await integramApiClient.createObject(
      panel.typeId,
      payload.objectValue,
      payload.requisites,
      1
    )
    const objectId = result.objectId || result.id || result.obj || ''
    const message = objectId ? `Данные сохранены: ${objectId}` : 'Данные сохранены'
    setSubmitMessage(panel.id, message)
    toast.add({
      severity: 'success',
      summary: 'Данные сохранены',
      detail: message,
      life: 3000
    })
    emit('submitted', {
      panel,
      payload,
      result
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка отправки',
      detail: error.message || 'Не удалось сохранить данные',
      life: 5000
    })
  } finally {
    submittingPanelId.value = null
  }
}

onMounted(() => {
  loadForms()
})

watch(() => props.formId, (id, oldId) => {
  if (id && String(id) !== String(oldId)) {
    loadForm(id)
  } else if (!id && oldId) {
    resetForm()
  }
})
</script>

<style scoped>
.form-loading,
.integram-empty-state {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  justify-content: center;
  min-height: 12rem;
  text-align: center;
}

.form-picker,
.form-runtime,
.panel-form {
  display: grid;
  gap: 1rem;
}

.form-header h2 {
  font-size: 1.35rem;
  line-height: 1.25;
  margin: 0;
}

.form-panel {
  min-width: 0;
}

.panel-form {
  border-radius: 6px;
  padding: 1rem;
}

.integram-field {
  display: grid;
  gap: 0.35rem;
}

.form-control {
  border: 1px solid var(--surface-border, #d1d5db);
  border-radius: 6px;
  font: inherit;
  min-height: 2.5rem;
  padding: 0.5rem 0.65rem;
  width: 100%;
}

input[type="checkbox"].form-control,
.integram-field input[type="checkbox"] {
  min-height: auto;
  width: auto;
}

.required-mark,
.p-error {
  color: var(--red-600, #dc2626);
}

.panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.secondary-actions a {
  align-items: center;
  display: inline-flex;
  min-height: 2.25rem;
}
</style>
