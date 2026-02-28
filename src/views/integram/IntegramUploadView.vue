<template>
  <div class="integram-upload">
    <div class="page-header">
      <h2><i class="pi pi-upload"></i> Загрузка файлов</h2>
    </div>

    <div class="upload-card">
      <div
        class="drop-zone"
        :class="{ 'drag-over': isDragOver }"
        @dragover.prevent="isDragOver = true"
        @dragleave="isDragOver = false"
        @drop.prevent="handleDrop"
        @click="$refs.fileInput.click()"
      >
        <i class="pi pi-cloud-upload"></i>
        <p>Перетащите файлы сюда или нажмите для выбора</p>
        <input ref="fileInput" type="file" multiple hidden @change="handleFileSelect" />
      </div>

      <div v-if="selectedFiles.length > 0" class="file-list">
        <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
          <div class="file-info">
            <i class="pi pi-file"></i>
            <span class="file-name">{{ file.name }}</span>
            <span class="file-size">{{ formatSize(file.size) }}</span>
          </div>
          <div class="file-status">
            <i v-if="file.status === 'uploading'" class="pi pi-spin pi-spinner"></i>
            <i v-else-if="file.status === 'done'" class="pi pi-check-circle" style="color: #16a34a"></i>
            <i v-else-if="file.status === 'error'" class="pi pi-times-circle" style="color: #dc2626"></i>
            <button v-else class="remove-btn" @click.stop="removeFile(index)">
              <i class="pi pi-times"></i>
            </button>
          </div>
        </div>
      </div>

      <div v-if="selectedFiles.length > 0" class="upload-actions">
        <div class="field">
          <label>Путь (необязательно)</label>
          <input v-model="uploadPath" class="form-input" placeholder="/" />
        </div>
        <button class="btn-primary" @click="uploadAll" :disabled="uploading">
          <i v-if="uploading" class="pi pi-spin pi-spinner"></i>
          <i v-else class="pi pi-upload"></i>
          Загрузить ({{ pendingCount }})
        </button>
      </div>
    </div>

    <div v-if="uploadMessage" :class="['alert', uploadSeverity]">
      {{ uploadMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import integramApiClient from '@/services/integramApiClient'

const isDragOver = ref(false)
const selectedFiles = ref([])
const uploadPath = ref('')
const uploading = ref(false)
const uploadMessage = ref('')
const uploadSeverity = ref('info')

const pendingCount = computed(() => selectedFiles.value.filter(f => !f.status).length)

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function handleDrop(event) {
  isDragOver.value = false
  const files = event.dataTransfer.files
  addFiles(files)
}

function handleFileSelect(event) {
  addFiles(event.target.files)
  event.target.value = ''
}

function addFiles(fileList) {
  for (const file of fileList) {
    selectedFiles.value.push({
      file,
      name: file.name,
      size: file.size,
      status: null
    })
  }
}

function removeFile(index) {
  selectedFiles.value.splice(index, 1)
}

async function uploadAll() {
  uploading.value = true
  uploadMessage.value = ''
  let successCount = 0
  let errorCount = 0

  for (const item of selectedFiles.value) {
    if (item.status === 'done') continue
    item.status = 'uploading'
    try {
      await integramApiClient.uploadFile(item.file, uploadPath.value)
      item.status = 'done'
      successCount++
    } catch (err) {
      item.status = 'error'
      errorCount++
    }
  }

  uploading.value = false
  if (errorCount === 0) {
    uploadMessage.value = `Загружено файлов: ${successCount}`
    uploadSeverity.value = 'success'
  } else {
    uploadMessage.value = `Загружено: ${successCount}, ошибок: ${errorCount}`
    uploadSeverity.value = 'error'
  }
}
</script>

<style scoped>
.integram-upload { max-width: 800px; margin: 0 auto; }
.page-header { margin-bottom: 1rem; }
.page-header h2 { display: flex; align-items: center; gap: 0.5rem; color: #1e293b; margin: 0; }

.upload-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.drop-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  padding: 2.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #94a3b8;
}
.drop-zone:hover { border-color: #1976d2; background: #f8fafc; }
.drop-zone.drag-over { border-color: #1976d2; background: #e3f2fd; }
.drop-zone i { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
.drop-zone p { margin: 0; font-size: 0.95rem; }

.file-list { margin-top: 1rem; }

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}
.file-item:last-child { border-bottom: none; }

.file-info { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0; }
.file-name { font-size: 0.875rem; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-size { font-size: 0.75rem; color: #94a3b8; flex-shrink: 0; }

.file-status { flex-shrink: 0; }

.remove-btn {
  width: 24px; height: 24px;
  border: none; background: transparent;
  border-radius: 4px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #94a3b8;
}
.remove-btn:hover { background: #fef0f0; color: #dc2626; }

.upload-actions {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

.upload-actions .field { flex: 1; }
.upload-actions .field label { display: block; font-size: 0.8rem; color: #64748b; margin-bottom: 0.25rem; }

.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  box-sizing: border-box;
}
.form-input:focus { outline: none; border-color: #1976d2; }

.alert { padding: 0.75rem; border-radius: 6px; font-size: 0.875rem; }
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
  white-space: nowrap;
}
.btn-primary:hover { background: #1565c0; }
.btn-primary:disabled { background: #90caf9; cursor: not-allowed; }
</style>
