<template>
  <div class="integram-quiz-container">
    <IntegramBreadcrumb :items="breadcrumbItems" />

    <Card>
      <template #title>
        <div class="flex align-items-center justify-content-between gap-3">
          <span>Опросы</span>
          <Button
            v-if="activeQuiz && !quizCompleted"
            type="button"
            icon="fi fi-rr-arrow-left"
            label="Назад"
            text
            @click="resetQuiz"
          />
        </div>
      </template>

      <template #content>
        <div v-if="loading" class="quiz-loading">
          Загрузка опроса...
        </div>

        <Message v-else-if="loadError" severity="error" :closable="false">
          {{ loadError }}
        </Message>

        <div v-else-if="!activeQuiz && !quizCompleted" class="quiz-picker">
          <label for="integram-quiz-select">Выберите опрос</label>
          <select
            id="integram-quiz-select"
            v-model="selectedQuizId"
            class="form-control"
            data-testid="quiz-select"
            @change="loadQuiz(selectedQuizId)"
          >
            <option value="">Выберите опрос</option>
            <option
              v-for="quiz in availableQuizzes"
              :key="quiz.id"
              :value="quiz.id"
            >
              {{ quiz.name }}
            </option>
          </select>

          <div v-if="availableQuizzes.length === 0" class="integram-empty-state">
            <i class="fi fi-rr-inbox empty-icon"></i>
            <p class="empty-title">Опросы не найдены</p>
          </div>
        </div>

        <div v-else-if="activeQuiz && !quizCompleted" class="quiz-runtime">
          <header class="quiz-header">
            <h2 data-testid="quiz-title">{{ activeQuiz.name }}</h2>
            <p v-if="activeQuiz.description" class="text-500">
              {{ activeQuiz.description }}
            </p>
          </header>

          <div v-if="activeQuiz.totalPages > 1" class="quiz-progress">
            <div class="flex justify-content-between align-items-center mb-2">
              <span>Страница {{ currentPage }} из {{ activeQuiz.totalPages }}</span>
              <span class="text-500">{{ progressValue }}%</span>
            </div>
            <ProgressBar :value="progressValue" />
          </div>

          <form class="quiz-form" @submit.prevent="submitQuiz">
            <div
              v-for="field in currentFields"
              v-show="isFieldVisible(field, quizValues)"
              :key="field.id"
              class="integram-field"
              :data-testid="`quiz-field-${field.id}`"
            >
              <label :for="fieldInputId(field)">
                {{ field.label }}
                <span v-if="field.required" class="required-mark">*</span>
              </label>

              <select
                v-if="isReferenceField(field)"
                :id="fieldInputId(field)"
                :value="getFieldValue(field)"
                :disabled="field.readOnly || submitting"
                class="form-control"
                :data-testid="`input-${field.id}`"
                @change="updateFieldValue(field, $event.target.value)"
              >
                <option value=""></option>
                <option
                  v-for="option in getFieldOptions(field)"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.name }}
                </option>
              </select>

              <input
                v-else-if="field.baseType === 'BOOLEAN'"
                :id="fieldInputId(field)"
                type="checkbox"
                :checked="Boolean(getFieldValue(field))"
                :disabled="field.readOnly || submitting"
                :data-testid="`input-${field.id}`"
                @change="updateFieldValue(field, $event.target.checked)"
              >

              <textarea
                v-else-if="field.baseType === 'MEMO' || field.baseType === 'HTML'"
                :id="fieldInputId(field)"
                :value="getFieldValue(field)"
                :readonly="field.readOnly"
                :disabled="submitting"
                rows="4"
                class="form-control"
                :data-testid="`input-${field.id}`"
                @input="updateFieldValue(field, $event.target.value)"
              ></textarea>

              <input
                v-else-if="field.baseType === 'DATE'"
                :id="fieldInputId(field)"
                type="date"
                :value="getFieldValue(field)"
                :readonly="field.readOnly"
                :disabled="submitting"
                class="form-control"
                :data-testid="`input-${field.id}`"
                @input="updateFieldValue(field, $event.target.value)"
              >

              <input
                v-else-if="field.baseType === 'DATETIME'"
                :id="fieldInputId(field)"
                type="datetime-local"
                :value="getFieldValue(field)"
                :readonly="field.readOnly"
                :disabled="submitting"
                class="form-control"
                :data-testid="`input-${field.id}`"
                @input="updateFieldValue(field, $event.target.value)"
              >

              <input
                v-else-if="field.baseType === 'NUMBER' || field.baseType === 'SIGNED'"
                :id="fieldInputId(field)"
                type="number"
                :value="getFieldValue(field)"
                :readonly="field.readOnly"
                :disabled="submitting"
                class="form-control"
                :data-testid="`input-${field.id}`"
                @input="updateFieldValue(field, $event.target.value)"
              >

              <input
                v-else-if="field.baseType === 'PWD'"
                :id="fieldInputId(field)"
                type="password"
                :value="getFieldValue(field)"
                :readonly="field.readOnly"
                :disabled="submitting"
                class="form-control"
                :data-testid="`input-${field.id}`"
                @input="updateFieldValue(field, $event.target.value)"
              >

              <input
                v-else-if="field.baseType === 'FILE'"
                :id="fieldInputId(field)"
                type="file"
                :disabled="field.readOnly || submitting"
                class="form-control"
                :data-testid="`input-${field.id}`"
                @change="updateFieldValue(field, $event.target.files?.[0] || '')"
              >

              <input
                v-else
                :id="fieldInputId(field)"
                type="text"
                :value="getFieldValue(field)"
                :readonly="field.readOnly"
                :disabled="submitting"
                class="form-control"
                :data-testid="`input-${field.id}`"
                @input="updateFieldValue(field, $event.target.value)"
              >

              <small
                v-if="validationErrors[field.id]"
                class="p-error"
                :data-testid="`error-${field.id}`"
              >
                {{ validationErrors[field.id] }}
              </small>
            </div>

            <div class="quiz-actions">
              <Button
                v-if="currentPage > 1"
                type="button"
                label="Назад"
                icon="fi fi-rr-arrow-left"
                outlined
                data-testid="quiz-prev"
                @click="previousPage"
              />
              <Button
                v-if="currentPage < activeQuiz.totalPages"
                type="button"
                label="Далее"
                icon="fi fi-rr-arrow-right"
                icon-pos="right"
                data-testid="quiz-next"
                @click="nextPage"
              />
              <Button
                v-else
                type="button"
                :label="activeQuiz.submitLabel"
                icon="fi fi-rr-check"
                severity="success"
                :loading="submitting"
                data-testid="quiz-submit"
                @click="submitQuiz"
              />
            </div>
          </form>
        </div>

        <div v-else class="quiz-completed" data-testid="quiz-completed">
          <i class="fi fi-rr-check-circle"></i>
          <h3>Опрос завершен</h3>
          <p>{{ completionMessage }}</p>
          <Button
            type="button"
            label="Пройти другой опрос"
            icon="fi fi-rr-refresh"
            @click="resetQuiz"
          />
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
  LEGACY_QUIZ_SETTINGS_TYPE_ID,
  QUIZ_REQS,
  buildSubmitPayload,
  getLegacyReqValue,
  getQuizConfigFromSettings,
  isFieldVisible,
  normalizeLegacyObjectCollection,
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
  quizId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['submitted'])

const toast = useToast()

const loading = ref(false)
const loadError = ref('')
const selectedQuizId = ref('')
const availableQuizzes = ref([])
const quizRecords = ref([])
const quizRecordReqs = ref({})
const activeQuiz = ref(null)
const quizValues = ref({})
const validationErrors = ref({})
const referenceOptions = ref({})
const currentPage = ref(1)
const submitting = ref(false)
const quizCompleted = ref(false)
const completionMessage = ref('')

const activeDatabase = computed(() => (
  props.database ||
  props.session?.database ||
  integramApiClient.getDatabase() ||
  'my'
))

const breadcrumbItems = computed(() => {
  const items = [
    {
      label: 'Опросы',
      icon: 'fi fi-rr-question',
      to: activeQuiz.value ? `/${activeDatabase.value}/quiz` : undefined
    }
  ]

  if (activeQuiz.value?.name) {
    items.push({
      label: activeQuiz.value.name,
      icon: 'fi fi-rr-question'
    })
  }

  return items
})

const currentFields = computed(() => {
  if (!activeQuiz.value) return []
  return activeQuiz.value.fields.filter(field => Number(field.page || 1) === currentPage.value)
})

const progressValue = computed(() => {
  if (!activeQuiz.value?.totalPages) return 0
  return Math.round((currentPage.value / activeQuiz.value.totalPages) * 100)
})

function setDatabase() {
  integramApiClient.setDatabase(activeDatabase.value)
}

function quizNameFromRecord(record, reqs) {
  return getLegacyReqValue(reqs, record.id, QUIZ_REQS.name) ||
    record.name ||
    record.val ||
    `Опрос ${record.id}`
}

function hydrateQuizList(response) {
  const collection = normalizeLegacyObjectCollection(response)
  quizRecordReqs.value = collection.reqs
  quizRecords.value = collection.objects
  availableQuizzes.value = collection.objects.map(record => ({
    id: String(record.id),
    name: quizNameFromRecord(record, collection.reqs)
  }))
}

async function loadQuizzes() {
  setDatabase()
  loading.value = true
  loadError.value = ''

  try {
    const response = await integramApiClient.getObjectList(LEGACY_QUIZ_SETTINGS_TYPE_ID, {
      F_271: 'QUIZ',
      LIMIT: 1000
    })
    hydrateQuizList(response)

    if (props.quizId) {
      await loadQuiz(props.quizId)
    }
  } catch (error) {
    loadError.value = error.message || 'Не удалось загрузить опросы'
  } finally {
    loading.value = false
  }
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

function isReferenceField(field) {
  return field.isReference || field.refTypeId || field.baseType === 'DDL'
}

function getReferenceTypeId(field) {
  return field.refTypeId || field.ref_type || field.refType || field.ref || null
}

async function loadReferenceOptions(fields) {
  await Promise.all(fields
    .filter(isReferenceField)
    .map(async (field) => {
      const refTypeId = getReferenceTypeId(field)
      if (!refTypeId) return

      try {
        const response = await integramApiClient.getObjectList(String(refTypeId), { LIMIT: 1000 })
        referenceOptions.value = {
          ...referenceOptions.value,
          [field.id]: optionListFromResponse(response)
        }
      } catch {
        referenceOptions.value = {
          ...referenceOptions.value,
          [field.id]: []
        }
      }
    }))
}

function initializeValues(fields) {
  quizValues.value = Object.fromEntries(fields.map(field => [
    field.id,
    field.defaultValue ?? (field.baseType === 'BOOLEAN' ? false : '')
  ]))
}

async function loadQuiz(id) {
  if (!id) return
  setDatabase()
  loading.value = true
  loadError.value = ''
  selectedQuizId.value = String(id)
  validationErrors.value = {}
  referenceOptions.value = {}
  completionMessage.value = ''
  quizCompleted.value = false

  try {
    let record = quizRecords.value.find(item => String(item.id) === String(id))
    let reqs = quizRecordReqs.value

    if (!record) {
      const response = await integramApiClient.getObjectList(LEGACY_QUIZ_SETTINGS_TYPE_ID, {
        F_269: `@${id}`,
        F_271: 'QUIZ',
        LIMIT: 1
      })
      const collection = normalizeLegacyObjectCollection(response)
      record = collection.objects[0]
      reqs = collection.reqs
    }

    const quiz = getQuizConfigFromSettings(record, reqs)
    if (!quiz) throw new Error('Настройки опроса не содержат схему')

    activeQuiz.value = {
      ...quiz,
      settingsId: String(record.id),
      name: quiz.name || quizNameFromRecord(record, reqs)
    }
    currentPage.value = 1
    initializeValues(activeQuiz.value.fields)
    await loadReferenceOptions(activeQuiz.value.fields)
  } catch (error) {
    activeQuiz.value = null
    loadError.value = error.message || 'Не удалось загрузить опрос'
  } finally {
    loading.value = false
  }
}

function resetQuiz() {
  activeQuiz.value = null
  selectedQuizId.value = ''
  quizValues.value = {}
  validationErrors.value = {}
  referenceOptions.value = {}
  currentPage.value = 1
  quizCompleted.value = false
  completionMessage.value = ''
}

function fieldInputId(field) {
  return `integram-quiz-${field.id}`
}

function getFieldValue(field) {
  return quizValues.value[field.id] ?? ''
}

function updateFieldValue(field, value) {
  quizValues.value = {
    ...quizValues.value,
    [field.id]: value
  }
}

function getFieldOptions(field) {
  return referenceOptions.value[field.id] || []
}

function setErrors(errors) {
  validationErrors.value = errors
}

function validateFields(fields) {
  const errors = validateRequiredFields(fields, quizValues.value)
  setErrors(errors)

  if (Object.keys(errors).length > 0) {
    toast.add({
      severity: 'warn',
      summary: 'Проверьте опрос',
      detail: 'Заполните обязательные поля',
      life: 3000
    })
    return false
  }

  return true
}

function nextPage() {
  if (!validateFields(currentFields.value)) return
  currentPage.value = Math.min(currentPage.value + 1, activeQuiz.value.totalPages)
  validationErrors.value = {}
}

function previousPage() {
  currentPage.value = Math.max(currentPage.value - 1, 1)
  validationErrors.value = {}
}

function formatSuccessMessage(result) {
  const objectId = result.objectId || result.id || result.obj || ''
  return activeQuiz.value.successMessage.replace(':id:', objectId)
}

async function submitQuiz() {
  if (!activeQuiz.value) return
  if (!validateFields(activeQuiz.value.fields)) return

  const payload = buildSubmitPayload(activeQuiz.value.fields, quizValues.value, {
    defaultObjectValue: activeQuiz.value.name
  })

  try {
    submitting.value = true
    const result = await integramApiClient.createObject(
      activeQuiz.value.typeId,
      payload.objectValue,
      payload.requisites,
      1
    )
    completionMessage.value = formatSuccessMessage(result)
    quizCompleted.value = true
    emit('submitted', {
      quiz: activeQuiz.value,
      payload,
      result
    })
    toast.add({
      severity: 'success',
      summary: 'Опрос завершен',
      detail: completionMessage.value,
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка отправки',
      detail: error.message || activeQuiz.value.failMessage,
      life: 5000
    })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadQuizzes()
})

watch(() => props.quizId, (id, oldId) => {
  if (id && String(id) !== String(oldId)) {
    loadQuiz(id)
  } else if (!id && oldId) {
    resetQuiz()
  }
})
</script>

<style scoped>
.quiz-loading,
.integram-empty-state,
.quiz-completed {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  justify-content: center;
  min-height: 12rem;
  text-align: center;
}

.quiz-picker,
.quiz-runtime,
.quiz-form {
  display: grid;
  gap: 1rem;
}

.quiz-header h2 {
  font-size: 1.35rem;
  line-height: 1.25;
  margin: 0;
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

.quiz-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.quiz-completed i {
  color: var(--green-600, #16a34a);
  font-size: 3rem;
}
</style>
