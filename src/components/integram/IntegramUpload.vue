<template>
  <div class="integram-upload-page integram-touch-friendly">
    <IntegramBreadcrumb :items="breadcrumbItems" />

    <Card>
      <template #title>
        <div class="flex align-items-center justify-content-between gap-3">
          <span>Загрузка файлов</span>
          <Tag v-if="uploadResult" severity="success" value="Готово" />
        </div>
      </template>

      <template #content>
        <div class="upload-workspace">
          <section class="upload-panel">
            <label
              class="upload-dropzone"
              :class="{ 'is-disabled': uploading, 'has-error': Boolean(errorMessage) }"
            >
              <input
                ref="fileInput"
                data-testid="upload-input"
                class="upload-input"
                type="file"
                :accept="acceptAttribute"
                :disabled="uploading"
                @change="onFileChange"
              >
              <i class="fi fi-rr-upload upload-dropzone-icon"></i>
              <span class="upload-dropzone-title">{{ selectedFile ? selectedFile.name : 'Выберите файл' }}</span>
              <span class="upload-dropzone-meta">
                До {{ formattedMaxSize }}. {{ acceptedFormatText }}
              </span>
            </label>

            <Message
              v-if="errorMessage"
              data-testid="upload-error"
              severity="error"
              :closable="false"
              class="mt-3"
            >
              {{ errorMessage }}
            </Message>

            <Message
              v-else-if="selectedFile && !uploadResult"
              data-testid="upload-selected"
              severity="info"
              :closable="false"
              class="mt-3"
            >
              {{ selectedFile.name }} · {{ formatBytes(selectedFile.size) }}{{ selectedFile.type ? ` · ${selectedFile.type}` : '' }}
            </Message>

            <div v-if="uploading || uploadProgress > 0" data-testid="upload-progress" class="upload-progress mt-3">
              <div class="flex align-items-center justify-content-between mb-2">
                <span>{{ uploading ? 'Загрузка' : 'Загружено' }}</span>
                <strong>{{ uploadProgress }}%</strong>
              </div>
              <ProgressBar :value="uploadProgress" />
            </div>

            <div class="integram-actions mt-3">
              <Button
                data-testid="upload-submit"
                :label="uploadResult ? 'Загрузить еще раз' : (errorMessage ? 'Повторить' : 'Загрузить')"
                icon="fi fi-rr-upload"
                :loading="uploading"
                :disabled="!canUpload"
                @click="uploadSelectedFile"
              />
              <Button
                v-if="selectedFile || uploadResult || errorMessage"
                data-testid="upload-clear"
                label="Очистить"
                icon="fi fi-rr-cross-small"
                text
                :disabled="uploading"
                @click="clearSelection"
              />
            </div>
          </section>

          <section class="upload-result-panel">
            <h3>Результат</h3>

            <div v-if="uploadResult" data-testid="upload-result" class="upload-result">
              <a
                data-testid="upload-result-link"
                class="upload-result-link"
                :href="resultHref"
                target="_blank"
                rel="noopener"
              >
                <i class="fi fi-rr-file"></i>
                <span>{{ uploadResult.filename || uploadResult.name || resultHref }}</span>
              </a>
              <dl class="upload-metadata">
                <template v-if="uploadResult.path">
                  <dt>Путь</dt>
                  <dd>{{ uploadResult.path }}</dd>
                </template>
                <template v-if="uploadResult.size">
                  <dt>Размер</dt>
                  <dd>{{ formatBytes(uploadResult.size) }}</dd>
                </template>
                <template v-if="uploadResult.mimeType">
                  <dt>Тип</dt>
                  <dd>{{ uploadResult.mimeType }}</dd>
                </template>
              </dl>
            </div>

            <div v-else class="upload-empty">
              <i class="fi fi-rr-file-add"></i>
              <span>После загрузки здесь появится ссылка на файл.</span>
            </div>
          </section>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import IntegramBreadcrumb from './IntegramBreadcrumb.vue'
import { useIntegramSession } from '@/composables/useIntegramSession'
import integramApiClient from '@/services/integramApiClient'

const props = defineProps({
  database: {
    type: String,
    default: ''
  },
  maxFileSize: {
    type: Number,
    default: 50 * 1024 * 1024
  },
  acceptedFormats: {
    type: Array,
    default: () => [
      '.csv',
      '.doc',
      '.docx',
      '.gif',
      '.jpeg',
      '.jpg',
      '.json',
      '.pdf',
      '.png',
      '.txt',
      '.webp',
      '.xls',
      '.xlsx',
      '.xml',
      '.zip'
    ]
  }
})

const emit = defineEmits(['uploaded', 'upload-error'])

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { isAuthenticated } = useIntegramSession()

const fileInput = ref(null)
const selectedFile = ref(null)
const uploadResult = ref(null)
const uploadProgress = ref(0)
const uploading = ref(false)
const errorMessage = ref('')

const breadcrumbItems = computed(() => [
  {
    label: 'Загрузка',
    icon: 'fi fi-rr-upload',
    to: undefined
  }
])

const databaseName = computed(() => (
  props.database ||
  String(route.params.database || '') ||
  integramApiClient.getDatabase() ||
  'my'
))

const normalizedAcceptedFormats = computed(() => (
  props.acceptedFormats
    .map(format => String(format || '').trim().toLowerCase())
    .filter(Boolean)
))

const acceptAttribute = computed(() => normalizedAcceptedFormats.value.join(','))

const acceptedFormatText = computed(() => {
  if (normalizedAcceptedFormats.value.includes('*/*')) return 'Допускаются любые файлы'
  return `Форматы: ${normalizedAcceptedFormats.value.join(', ')}`
})

const formattedMaxSize = computed(() => formatBytes(props.maxFileSize))

const canUpload = computed(() => {
  return Boolean(selectedFile.value) &&
    !uploading.value &&
    !hasValidationError(selectedFile.value)
})

const resultHref = computed(() => {
  const rawHref = uploadResult.value?.href ||
    uploadResult.value?.url ||
    uploadResult.value?.path ||
    ''

  if (!rawHref) return '#'
  if (/^https?:\/\//i.test(rawHref)) return rawHref

  const server = (integramApiClient.getServer?.() || window.location.origin || '').replace(/\/$/, '')
  const path = rawHref.startsWith('/') ? rawHref : `/${rawHref}`
  return `${server}${path}`
})

function formatBytes(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return '0 Б'

  const units = ['Б', 'КБ', 'МБ', 'ГБ']
  let size = value
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  const rounded = size >= 10 || unitIndex === 0 ? Math.round(size) : Math.round(size * 10) / 10
  return `${rounded} ${units[unitIndex]}`
}

function hasValidationError(file) {
  return Boolean(getFileValidationError(file))
}

function getFileValidationError(file) {
  if (!file) return ''

  if (file.size > props.maxFileSize) {
    return `Файл "${file.name}" превышает максимальный размер ${formattedMaxSize.value}. Выберите файл меньшего размера.`
  }

  if (!isAcceptedFile(file)) {
    return `Формат файла "${file.name}" не поддерживается. ${acceptedFormatText.value}.`
  }

  return ''
}

function isAcceptedFile(file) {
  if (normalizedAcceptedFormats.value.length === 0 || normalizedAcceptedFormats.value.includes('*/*')) {
    return true
  }

  const fileName = file.name.toLowerCase()
  const mimeType = (file.type || '').toLowerCase()

  return normalizedAcceptedFormats.value.some(format => {
    if (format.startsWith('.')) return fileName.endsWith(format)
    if (format.endsWith('/*')) return mimeType.startsWith(format.slice(0, -1))
    return mimeType === format
  })
}

function onFileChange(event) {
  const file = event.target?.files?.[0]
  selectFile(file)
}

function selectFile(file) {
  uploadResult.value = null
  uploadProgress.value = 0
  errorMessage.value = ''
  selectedFile.value = file || null

  const validationError = getFileValidationError(file)
  if (validationError) {
    errorMessage.value = validationError
  }
}

function handleUploadProgress(event) {
  if (!event?.total) return
  uploadProgress.value = Math.min(99, Math.round((event.loaded / event.total) * 100))
}

async function uploadSelectedFile() {
  if (!selectedFile.value || uploading.value) return

  const validationError = getFileValidationError(selectedFile.value)
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  uploading.value = true
  errorMessage.value = ''
  uploadResult.value = null
  uploadProgress.value = 0

  try {
    integramApiClient.setDatabase(databaseName.value)
    const result = await integramApiClient.uploadFile(selectedFile.value, '', {
      onUploadProgress: handleUploadProgress
    })
    uploadProgress.value = 100
    uploadResult.value = result
    toast.add({
      severity: 'success',
      summary: 'Файл загружен',
      detail: result.filename || selectedFile.value.name,
      life: 3000
    })
    emit('uploaded', result)
  } catch (error) {
    const message = error?.message || 'Не удалось загрузить файл. Попробуйте еще раз.'
    errorMessage.value = message
    toast.add({
      severity: 'error',
      summary: 'Ошибка загрузки',
      detail: message,
      life: 5000
    })
    emit('upload-error', error)
  } finally {
    uploading.value = false
  }
}

function clearSelection() {
  selectedFile.value = null
  uploadResult.value = null
  uploadProgress.value = 0
  errorMessage.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

onMounted(() => {
  if (!isAuthenticated.value) {
    router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
    return
  }

  integramApiClient.setDatabase(databaseName.value)
})

defineExpose({
  formatBytes,
  selectFile,
  uploadSelectedFile,
  uploadProgress,
  uploadResult,
  errorMessage
})
</script>

<style scoped>
.upload-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 1.25rem;
  align-items: start;
}

.upload-panel,
.upload-result-panel {
  min-width: 0;
}

.upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 210px;
  padding: 1.5rem;
  border: 2px dashed var(--surface-border);
  border-radius: 8px;
  background: var(--surface-50);
  color: var(--text-color);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.2s, background 0.2s;
}

.upload-dropzone:hover {
  border-color: var(--primary-color);
  background: var(--surface-100);
}

.upload-dropzone.has-error {
  border-color: var(--red-400, #f87171);
}

.upload-dropzone.is-disabled {
  cursor: progress;
  opacity: 0.75;
}

.upload-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.upload-dropzone-icon {
  font-size: 2.5rem;
  color: var(--primary-color);
  margin-bottom: 0.75rem;
}

.upload-dropzone-title {
  font-weight: 700;
  overflow-wrap: anywhere;
}

.upload-dropzone-meta {
  margin-top: 0.35rem;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}

.upload-progress :deep(.p-progressbar) {
  height: 0.6rem;
}

.upload-result-panel {
  padding: 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-card);
}

.upload-result-panel h3 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.upload-result {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.upload-result-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: fit-content;
  max-width: 100%;
  color: var(--primary-color);
  font-weight: 700;
  text-decoration: none;
}

.upload-result-link span {
  overflow-wrap: anywhere;
}

.upload-result-link:hover {
  text-decoration: underline;
}

.upload-metadata {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 0.5rem 0.75rem;
  margin: 0;
  font-size: 0.9rem;
}

.upload-metadata dt {
  color: var(--text-color-secondary);
}

.upload-metadata dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.upload-empty {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 140px;
  color: var(--text-color-secondary);
}

.upload-empty i {
  font-size: 1.75rem;
}

@media (max-width: 768px) {
  .upload-workspace {
    grid-template-columns: 1fr;
  }
}
</style>
