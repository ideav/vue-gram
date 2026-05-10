<template>
  <div class="file-field">
    <div v-if="displayFile" class="file-field-current mb-2">
      <a :href="fileHref" target="_blank" rel="noopener" class="text-primary">
        <i class="fi fi-rr-file"></i>
        <span>{{ fileName }}</span>
      </a>
      <Button
        v-if="!disabled"
        icon="fi fi-rr-trash"
        @click="confirmDeleteFile = true"
        size="small"
        text
        rounded
        severity="danger"
        aria-label="Удалить файл"
      />
    </div>

    <label class="file-field-picker" :class="{ 'is-disabled': disabled || uploading }">
      <input
        :id="id"
        ref="fileInput"
        type="file"
        :accept="acceptAttribute"
        :disabled="disabled || uploading"
        @change="onFileSelect"
      >
      <i class="fi fi-rr-upload"></i>
      <span>{{ displayFile ? 'Заменить файл' : 'Выбрать файл' }}</span>
    </label>

    <div v-if="uploading || uploadProgress > 0" class="mt-2">
      <div class="flex align-items-center justify-content-between mb-1 text-sm">
        <span>{{ uploading ? 'Загрузка' : 'Загружено' }}</span>
        <strong>{{ uploadProgress }}%</strong>
      </div>
      <ProgressBar :value="uploadProgress" />
    </div>

    <Message v-if="errorMessage" severity="error" :closable="false" class="mt-2">
      {{ errorMessage }}
    </Message>

    <Dialog
      v-model:visible="confirmDeleteFile"
      header="Подтверждение"
      :style="{ width: '350px' }"
      modal
    >
      <p>Удалить файл?</p>
      <template #footer>
        <Button label="Отмена" @click="confirmDeleteFile = false" text />
        <Button label="Удалить" @click="deleteFile" severity="danger" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import integramApiClient from '@/services/integramApiClient'

const props = defineProps({
  id: String,
  modelValue: [String, File],
  currentFile: String,
  objectId: [String, Number],
  reqId: [String, Number],
  database: String,
  disabled: Boolean,
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

const emit = defineEmits(['update:modelValue', 'delete', 'uploaded', 'upload-error'])

const toast = useToast()
const fileInput = ref(null)
const confirmDeleteFile = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const errorMessage = ref('')
const uploadedFile = ref(null)

const displayFile = computed(() => uploadedFile.value?.href || uploadedFile.value?.path || props.currentFile || (typeof props.modelValue === 'string' ? props.modelValue : ''))

const normalizedAcceptedFormats = computed(() => (
  props.acceptedFormats
    .map(format => String(format || '').trim().toLowerCase())
    .filter(Boolean)
))

const acceptAttribute = computed(() => normalizedAcceptedFormats.value.join(','))

const fileName = computed(() => {
  const value = String(displayFile.value || '')
  const clean = value.split('?')[0].split('#')[0]
  return clean.split('/').filter(Boolean).pop() || value
})

const fileHref = computed(() => {
  const value = String(displayFile.value || '')
  if (!value) return '#'
  if (/^https?:\/\//i.test(value)) return value
  const server = (integramApiClient.getServer?.() || window.location.origin || '').replace(/\/$/, '')
  return `${server}${value.startsWith('/') ? value : `/${value}`}`
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

function isAcceptedFile(file) {
  if (normalizedAcceptedFormats.value.length === 0 || normalizedAcceptedFormats.value.includes('*/*')) {
    return true
  }
  const name = file.name.toLowerCase()
  const type = (file.type || '').toLowerCase()
  return normalizedAcceptedFormats.value.some(format => {
    if (format.startsWith('.')) return name.endsWith(format)
    if (format.endsWith('/*')) return type.startsWith(format.slice(0, -1))
    return type === format
  })
}

function getValidationError(file) {
  if (!file) return ''
  if (file.size > props.maxFileSize) {
    return `Файл "${file.name}" превышает максимальный размер ${formatBytes(props.maxFileSize)}.`
  }
  if (!isAcceptedFile(file)) {
    return `Формат файла "${file.name}" не поддерживается.`
  }
  return ''
}

function handleUploadProgress(event) {
  if (!event?.total) return
  uploadProgress.value = Math.min(99, Math.round((event.loaded / event.total) * 100))
}

async function onFileSelect(event) {
  const file = event.target?.files?.[0]
  if (!file) return

  errorMessage.value = ''
  uploadProgress.value = 0
  uploadedFile.value = null

  const validationError = getValidationError(file)
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  if (!props.objectId || !props.reqId) {
    emit('update:modelValue', file)
    return
  }

  uploading.value = true
  try {
    if (props.database) integramApiClient.setDatabase(props.database)
    const result = await integramApiClient.uploadRequisiteFile(props.objectId, props.reqId, file, {
      onUploadProgress: handleUploadProgress
    })
    uploadProgress.value = 100
    uploadedFile.value = result
    emit('update:modelValue', result.path || result.href || result.url || result.filename || file.name)
    emit('uploaded', result)
    toast.add({
      severity: 'success',
      summary: 'Файл загружен',
      detail: result.filename || file.name,
      life: 3000
    })
  } catch (error) {
    const message = error?.message || 'Не удалось загрузить файл.'
    errorMessage.value = message
    emit('upload-error', error)
    toast.add({
      severity: 'error',
      summary: 'Ошибка загрузки файла',
      detail: message,
      life: 5000
    })
  } finally {
    uploading.value = false
  }
}

function deleteFile() {
  emit('delete')
  confirmDeleteFile.value = false
}
</script>

<style scoped>
.file-field-current {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-field-current a {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 100%;
  overflow-wrap: anywhere;
  text-decoration: none;
}

.file-field-current a:hover {
  text-decoration: underline;
}

.file-field-picker {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.5rem;
  padding: 0.55rem 0.85rem;
  border: 1px solid var(--primary-color);
  border-radius: 6px;
  color: var(--primary-color);
  cursor: pointer;
  font-weight: 600;
}

.file-field-picker.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.file-field-picker input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.file-field :deep(.p-progressbar) {
  height: 0.5rem;
}
</style>
