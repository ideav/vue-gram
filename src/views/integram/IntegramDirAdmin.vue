<template>
  <div class="integram-dir">
    <div class="page-header">
      <h2><i class="pi pi-folder"></i> Файловый менеджер</h2>
    </div>

    <div class="dir-card">
      <div class="dir-toolbar">
        <div class="breadcrumb">
          <button class="crumb" @click="navigateTo('')">
            <i class="pi pi-home"></i>
          </button>
          <template v-for="(part, i) in pathParts" :key="i">
            <i class="pi pi-angle-right crumb-sep"></i>
            <button class="crumb" @click="navigateTo(pathParts.slice(0, i + 1).join('/'))">
              {{ part }}
            </button>
          </template>
        </div>
        <div class="dir-actions">
          <button class="btn-sm" @click="loadData" title="Обновить">
            <i class="pi pi-refresh"></i>
          </button>
          <button class="btn-sm" @click="createBackup" :disabled="backingUp" title="Создать бэкап">
            <i :class="backingUp ? 'pi pi-spin pi-spinner' : 'pi pi-download'"></i>
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading">
        <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem"></i>
      </div>

      <div v-else-if="error" class="error-box">
        <p>{{ error }}</p>
      </div>

      <div v-else class="file-list">
        <div
          v-for="item in items"
          :key="item.name"
          class="file-item"
          @click="item.dir ? navigateTo(currentPath ? `${currentPath}/${item.name}` : item.name) : null"
        >
          <i :class="item.dir ? 'pi pi-folder' : getFileIcon(item.name)" class="file-icon"></i>
          <div class="file-info">
            <span class="file-name">{{ item.name }}</span>
            <span class="file-meta">
              <template v-if="!item.dir">{{ formatSize(item.size) }}</template>
              <template v-if="item.modified"> · {{ item.modified }}</template>
            </span>
          </div>
        </div>

        <div v-if="items.length === 0" class="empty-dir">
          <i class="pi pi-folder-open"></i>
          <p>Папка пуста</p>
        </div>
      </div>
    </div>

    <div v-if="backupMessage" :class="['alert', backupSeverity]">
      {{ backupMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import integramApiClient from '@/services/integramApiClient'

const loading = ref(true)
const error = ref(null)
const currentPath = ref('')
const items = ref([])
const backingUp = ref(false)
const backupMessage = ref('')
const backupSeverity = ref('info')

const pathParts = computed(() => {
  return currentPath.value ? currentPath.value.split('/').filter(Boolean) : []
})

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  const icons = {
    pdf: 'pi pi-file-pdf', doc: 'pi pi-file-word', docx: 'pi pi-file-word',
    xls: 'pi pi-file-excel', xlsx: 'pi pi-file-excel',
    jpg: 'pi pi-image', jpeg: 'pi pi-image', png: 'pi pi-image', gif: 'pi pi-image',
    zip: 'pi pi-box', rar: 'pi pi-box', gz: 'pi pi-box',
    txt: 'pi pi-file', csv: 'pi pi-file', json: 'pi pi-file'
  }
  return icons[ext] || 'pi pi-file'
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function navigateTo(path) {
  currentPath.value = path
  await loadData()
}

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const response = await integramApiClient.getDirAdmin(currentPath.value)
    if (response?.files && Array.isArray(response.files)) {
      items.value = response.files.sort((a, b) => {
        if (a.dir && !b.dir) return -1
        if (!a.dir && b.dir) return 1
        return (a.name || '').localeCompare(b.name || '')
      })
    } else if (Array.isArray(response)) {
      items.value = response
    } else {
      items.value = []
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function createBackup() {
  backingUp.value = true
  backupMessage.value = ''
  try {
    await integramApiClient.createBackup()
    backupMessage.value = 'Бэкап создан успешно'
    backupSeverity.value = 'success'
  } catch (err) {
    backupMessage.value = err.message
    backupSeverity.value = 'error'
  } finally {
    backingUp.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.integram-dir { max-width: 1000px; margin: 0 auto; }
.page-header { margin-bottom: 1rem; }
.page-header h2 { display: flex; align-items: center; gap: 0.5rem; color: #1e293b; margin: 0; }

.dir-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.dir-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
}

.breadcrumb { display: flex; align-items: center; gap: 2px; }

.crumb {
  padding: 4px 8px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #1976d2;
}
.crumb:hover { background: #e3f2fd; }
.crumb-sep { font-size: 0.8rem; color: #94a3b8; }

.dir-actions { display: flex; gap: 4px; }

.btn-sm {
  width: 32px; height: 32px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}
.btn-sm:hover { background: #f1f5f9; color: #1976d2; }
.btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }

.loading { text-align: center; padding: 2rem; color: #64748b; }
.error-box { padding: 1rem; color: #dc2626; text-align: center; }

.file-list { padding: 0.25rem 0; }

.file-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  cursor: pointer;
  transition: background 0.15s;
}
.file-item:hover { background: #f8fafc; }

.file-icon { font-size: 1.1rem; color: #64748b; min-width: 24px; text-align: center; }
.file-item .pi-folder { color: #f59e0b; }

.file-info { flex: 1; min-width: 0; }
.file-name { display: block; font-size: 0.875rem; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-meta { font-size: 0.75rem; color: #94a3b8; }

.empty-dir { text-align: center; padding: 2rem; color: #94a3b8; }
.empty-dir i { font-size: 2rem; display: block; margin-bottom: 0.5rem; }

.alert { padding: 0.75rem; border-radius: 6px; font-size: 0.875rem; margin-top: 1rem; }
.alert.error { background: #fef0f0; color: #dc2626; }
.alert.success { background: #f0fef4; color: #16a34a; }
</style>
