<template>
  <div class="integram-dir-admin-page integram-touch-friendly">
    <IntegramBreadcrumb :items="breadcrumbItems" />

    <Message v-if="loadError" :severity="accessDenied ? 'error' : 'warn'" :closable="false" class="mb-3">
      {{ loadError }}
    </Message>

    <Message v-if="warning && !loadError" severity="info" :closable="false" class="mb-3">
      {{ warning }}
    </Message>

    <Panel header="Директория" class="mb-3">
      <div class="dir-admin-header">
        <div class="dir-admin-path">
          <Chip :label="currentLocation" icon="fi fi-rr-folder" />
          <Button
            v-if="currentPath"
            icon="fi fi-rr-arrow-left"
            label=".."
            outlined
            data-testid="dir-admin-up"
            aria-label="Перейти на уровень выше"
            @click="navigateUp"
          />
        </div>

        <Button
          :label="switchFolderLabel"
          icon="fi fi-rr-folder"
          outlined
          data-testid="dir-admin-switch-folder"
          :aria-label="`Перейти к директории ${anotherFolder}`"
          @click="navigateTo(anotherFolder)"
        />
      </div>

      <div v-if="breadcrumbs.length" class="dir-admin-breadcrumbs">
        <Button
          label="."
          text
          size="small"
          aria-label="Корень текущей директории"
          @click="navigateTo(currentFolder)"
        />
        <template v-for="crumb in breadcrumbs" :key="crumb.addPath">
          <span>/</span>
          <Button
            :label="crumb.name"
            text
            size="small"
            :aria-label="`Открыть ${crumb.name}`"
            @click="openPath(crumb.addPath)"
          />
        </template>
      </div>
    </Panel>

    <template v-if="!accessDenied">
      <Panel header="Файлы и каталоги" class="mb-3">
        <div class="dir-admin-list-toolbar">
          <span class="font-semibold">{{ itemCountLabel }}</span>
          <div v-if="canWrite" class="integram-actions">
            <Button
              label="Выбрать все"
              icon="fi fi-rr-checkbox"
              text
              data-testid="dir-admin-select-all"
              aria-label="Инвертировать выделение"
              @click="selectAll"
            />
            <Button
              label="Удалить выбранные"
              icon="fi fi-rr-trash"
              severity="danger"
              outlined
              data-testid="dir-admin-delete-selected"
              :disabled="selectedItems.length === 0"
              aria-label="Удалить выбранные"
              @click="confirmDeleteSelected"
            />
          </div>
        </div>

        <DataTable
          :value="combinedList"
          v-model:selection="selectedItems"
          dataKey="key"
          :loading="loading.list"
          stripedRows
          showGridlines
          responsiveLayout="scroll"
          class="dir-admin-table"
        >
          <Column v-if="canWrite" selectionMode="multiple" headerStyle="width: 3rem" />

          <Column field="type" header="Тип" style="width: 5rem">
            <template #body="{ data }">
              <i v-if="data.type === 'folder'" class="fi fi-rr-folder text-primary text-xl" aria-hidden="true"></i>
              <i v-else class="fi fi-rr-file text-secondary text-xl" aria-hidden="true"></i>
            </template>
          </Column>

          <Column field="name" header="Имя">
            <template #body="{ data }">
              <Button
                v-if="data.type === 'folder'"
                :label="data.name"
                link
                class="dir-admin-name-button"
                :data-testid="`dir-admin-folder-${data.name}`"
                :aria-label="`Открыть каталог ${data.name}`"
                @click="navigateToFolder(data)"
              />
              <Button
                v-else
                :label="data.name"
                link
                class="dir-admin-name-button"
                :data-testid="`dir-admin-file-${data.name}`"
                :aria-label="`Скачать файл ${data.name}`"
                @click="downloadFile(data)"
              />
            </template>
          </Column>

          <Column field="size" header="Размер" style="width: 8rem">
            <template #body="{ data }">
              {{ data.type === 'file' ? data.size : '' }}
            </template>
          </Column>

          <Column field="modified" header="Изменен" style="width: 12rem">
            <template #body="{ data }">
              {{ data.type === 'file' ? data.modified : '' }}
            </template>
          </Column>

          <Column header="Действия" style="width: 16rem">
            <template #body="{ data }">
              <div class="integram-actions dir-admin-row-actions">
                <Button
                  v-if="data.type === 'file'"
                  icon="fi fi-rr-download"
                  text
                  rounded
                  v-tooltip.top="'Скачать'"
                  :data-testid="`dir-admin-download-${data.name}`"
                  :aria-label="`Скачать ${data.name}`"
                  @click="downloadFile(data)"
                />
                <Button
                  v-if="data.type === 'file' && canWrite && isEditable(data.name)"
                  icon="fi fi-rr-pencil"
                  text
                  rounded
                  v-tooltip.top="'Редактировать'"
                  :data-testid="`dir-admin-edit-${data.name}`"
                  :aria-label="`Редактировать ${data.name}`"
                  @click="editFile(data)"
                />
                <Button
                  v-if="data.type === 'file'"
                  icon="fi fi-rr-copy"
                  text
                  rounded
                  v-tooltip.top="'Скопировать путь для шаблона'"
                  :data-testid="`dir-admin-copy-template-${data.name}`"
                  :aria-label="`Скопировать путь для шаблона ${data.name}`"
                  @click="copyPath(data.templatePath)"
                />
                <Button
                  v-if="data.type === 'file'"
                  icon="fi fi-rr-link"
                  text
                  rounded
                  v-tooltip.top="'Скопировать абсолютный путь'"
                  :data-testid="`dir-admin-copy-absolute-${data.name}`"
                  :aria-label="`Скопировать абсолютный путь ${data.name}`"
                  @click="copyPath(data.concretePath)"
                />
                <Button
                  v-if="canWrite"
                  icon="fi fi-rr-trash"
                  text
                  rounded
                  severity="danger"
                  v-tooltip.top="'Удалить'"
                  :data-testid="`dir-admin-delete-${data.name}`"
                  :aria-label="`Удалить ${data.name}`"
                  @click="confirmDelete(data)"
                />
              </div>
            </template>
          </Column>

          <template #empty>
            <div class="dir-admin-empty">Файлов: 0, каталогов: 0</div>
          </template>
        </DataTable>
      </Panel>

      <div v-if="canWrite" class="dir-admin-write-panels">
        <Panel header="Новый каталог" class="mb-3" data-testid="dir-admin-create-folder">
          <form class="dir-admin-inline-form" @submit.prevent="createFolder">
            <InputText
              v-model="newFolderName"
              placeholder="Новый каталог"
              aria-label="Новый каталог"
              class="flex-1"
            />
            <Button
              type="submit"
              label="Создать"
              icon="fi fi-rr-plus"
              :disabled="!newFolderName.trim()"
              :loading="loading.createFolder"
              aria-label="Создать каталог"
            />
          </form>
        </Panel>

        <Panel header="Новый файл" class="mb-3" data-testid="dir-admin-create-file">
          <form class="dir-admin-inline-form" @submit.prevent="createFile">
            <InputText
              v-model="newFileName"
              placeholder="Новый файл"
              aria-label="Новый файл"
              class="flex-1"
            />
            <Button
              type="submit"
              label="Создать"
              icon="fi fi-rr-file-plus"
              :disabled="!newFileName.trim()"
              :loading="loading.createFile"
              aria-label="Создать файл"
            />
          </form>
        </Panel>

        <Panel header="Загрузить файл" class="mb-3" data-testid="dir-admin-upload">
          <div class="dir-admin-upload-options">
            <label class="dir-admin-checkbox">
              <input v-model="rewriteUpload" type="checkbox">
              <span>Перезаписать</span>
            </label>
          </div>
          <FileUpload
            name="userfile"
            :multiple="false"
            :customUpload="true"
            :auto="false"
            chooseLabel="Выбрать файл"
            uploadLabel="Загрузить"
            cancelLabel="Отмена"
            :disabled="loading.upload"
            @uploader="handleFileUpload"
          >
            <template #empty>
              <p class="m-0">Выберите файл для загрузки</p>
            </template>
          </FileUpload>
        </Panel>
      </div>
    </template>

    <Dialog
      v-model:visible="deleteDialog.visible"
      header="Подтверждение удаления"
      :modal="true"
      :style="{ width: '450px' }"
    >
      <div class="flex align-items-center gap-3">
        <i class="fi fi-rr-triangle-warning text-4xl text-warning" aria-hidden="true"></i>
        <span v-if="deleteDialog.items.length === 1">
          Удалить <strong>{{ deleteDialog.items[0].name }}</strong>?
        </span>
        <span v-else>
          Удалить <strong>{{ deleteDialog.items.length }}</strong> элементов?
        </span>
      </div>
      <template #footer>
        <div class="integram-actions justify-content-end w-full">
          <Button
            label="Отмена"
            icon="fi fi-rr-cross-small"
            text
            aria-label="Отменить удаление"
            @click="deleteDialog.visible = false"
          />
          <Button
            label="Удалить"
            icon="fi fi-rr-trash"
            severity="danger"
            :loading="loading.delete"
            aria-label="Подтвердить удаление"
            @click="executeDelete"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import IntegramBreadcrumb from './IntegramBreadcrumb.vue'
import integramApiClient from '@/services/integramApiClient'
import {
  DIR_ADMIN_GRANTS,
  normalizeAddPath,
  normalizeDirAdminFolder,
  parseDirAdminHtml,
  resolveDirAdminGrant
} from '@/utils/integramDirAdmin'

const props = defineProps({
  database: {
    type: String,
    default: ''
  },
  session: {
    type: Object,
    default: null
  }
})

const toast = useToast()

const currentFolder = ref('templates')
const currentPath = ref('')
const folders = ref([])
const files = ref([])
const selectedItems = ref([])
const newFolderName = ref('')
const newFileName = ref('')
const rewriteUpload = ref(false)
const warning = ref('')
const loadError = ref('')
const backendAccessDenied = ref(false)
const resolvedGrant = ref(DIR_ADMIN_GRANTS.BARRED)
const counts = ref({ files: 0, folders: 0 })
const breadcrumbs = ref([])

const loading = reactive({
  list: false,
  createFolder: false,
  createFile: false,
  upload: false,
  delete: false
})

const deleteDialog = reactive({
  visible: false,
  items: []
})

const activeDatabase = computed(() => {
  return props.database || props.session?.database || integramApiClient.getDatabase() || 'my'
})

const accessDenied = computed(() => {
  return backendAccessDenied.value || resolvedGrant.value === DIR_ADMIN_GRANTS.BARRED
})

const canWrite = computed(() => {
  return !accessDenied.value && resolvedGrant.value === DIR_ADMIN_GRANTS.WRITE
})

const combinedList = computed(() => [...folders.value, ...files.value])
const anotherFolder = computed(() => currentFolder.value === 'templates' ? 'download' : 'templates')
const switchFolderLabel = computed(() => anotherFolder.value)
const currentLocation = computed(() => `${currentFolder.value}${currentPath.value || '/'}`)
const itemCountLabel = computed(() => {
  const filesCount = counts.value.files || files.value.length
  const foldersCount = counts.value.folders || folders.value.length
  return `Файлов: ${filesCount}, каталогов: ${foldersCount}`
})

const breadcrumbItems = computed(() => [
  {
    label: 'Файлы',
    icon: 'fi fi-rr-folder'
  }
])

function refreshGrant() {
  resolvedGrant.value = resolveDirAdminGrant(integramApiClient.getAuthInfo(), activeDatabase.value)
  if (resolvedGrant.value === DIR_ADMIN_GRANTS.BARRED) {
    backendAccessDenied.value = true
    loadError.value = 'Недостаточно прав для доступа к этому рабочему месту'
  }
}

function ensureDatabase() {
  if (activeDatabase.value) integramApiClient.setDatabase(activeDatabase.value)
}

function applyParsedDirectory(parsed) {
  backendAccessDenied.value = parsed.accessDenied
  loadError.value = parsed.error || ''
  warning.value = parsed.warning || ''
  currentFolder.value = normalizeDirAdminFolder(parsed.folder)
  currentPath.value = normalizeAddPath(parsed.addPath)
  folders.value = parsed.folders
  files.value = parsed.files
  counts.value = parsed.counts
  breadcrumbs.value = parsed.breadcrumbs
  selectedItems.value = []
}

function getErrorDetail(error) {
  return error?.details || error?.response?.data?.details || error?.response?.data?.error || error?.message || 'Не удалось выполнить операцию'
}

async function loadDirectoryContents() {
  ensureDatabase()
  refreshGrant()
  if (resolvedGrant.value === DIR_ADMIN_GRANTS.BARRED) {
    folders.value = []
    files.value = []
    return
  }

  loading.list = true
  try {
    const html = await integramApiClient.getDirAdmin({
      folder: currentFolder.value,
      addPath: currentPath.value
    })
    const parsed = parseDirAdminHtml(html, {
      database: activeDatabase.value,
      fallbackFolder: currentFolder.value,
      fallbackPath: currentPath.value
    })
    applyParsedDirectory(parsed)
  } catch (error) {
    loadError.value = getErrorDetail(error)
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: loadError.value,
      life: 5000
    })
  } finally {
    loading.list = false
  }
}

function navigateTo(folder) {
  currentFolder.value = normalizeDirAdminFolder(folder)
  currentPath.value = ''
  loadDirectoryContents()
}

function openPath(addPath) {
  currentPath.value = normalizeAddPath(addPath)
  loadDirectoryContents()
}

function navigateToFolder(folder) {
  openPath(folder.openAddPath || `${currentPath.value}/${folder.name}`)
}

function navigateUp() {
  const parts = currentPath.value.split('/').filter(Boolean)
  parts.pop()
  currentPath.value = parts.length ? `/${parts.join('/')}` : ''
  loadDirectoryContents()
}

async function createFolder() {
  const name = newFolderName.value.trim()
  if (!name) return

  loading.createFolder = true
  try {
    await integramApiClient.createDirAdminFolder({
      folder: currentFolder.value,
      addPath: currentPath.value,
      name
    })
    toast.add({ severity: 'success', summary: 'Создано', detail: name, life: 3000 })
    newFolderName.value = ''
    await loadDirectoryContents()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Ошибка', detail: getErrorDetail(error), life: 5000 })
  } finally {
    loading.createFolder = false
  }
}

async function createFile() {
  const name = newFileName.value.trim()
  if (!name) return

  loading.createFile = true
  try {
    await integramApiClient.createDirAdminFile({
      folder: currentFolder.value,
      addPath: currentPath.value,
      name
    })
    toast.add({ severity: 'success', summary: 'Создано', detail: name, life: 3000 })
    newFileName.value = ''
    await loadDirectoryContents()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Ошибка', detail: getErrorDetail(error), life: 5000 })
  } finally {
    loading.createFile = false
  }
}

async function handleFileUpload(event) {
  const uploadFiles = event?.files || []
  if (!uploadFiles.length) return

  loading.upload = true
  try {
    for (const file of uploadFiles) {
      await integramApiClient.uploadDirAdminFile({
        file,
        folder: currentFolder.value,
        addPath: currentPath.value,
        rewrite: rewriteUpload.value
      })
    }
    toast.add({ severity: 'success', summary: 'Загружено', detail: String(uploadFiles.length), life: 3000 })
    await loadDirectoryContents()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Ошибка загрузки', detail: getErrorDetail(error), life: 5000 })
  } finally {
    loading.upload = false
  }
}

function selectAll() {
  selectedItems.value = [...combinedList.value]
}

function confirmDelete(item) {
  deleteDialog.items = [item]
  deleteDialog.visible = true
}

function confirmDeleteSelected() {
  deleteDialog.items = [...selectedItems.value]
  deleteDialog.visible = true
}

async function executeDelete() {
  if (!deleteDialog.items.length) return

  loading.delete = true
  try {
    await integramApiClient.deleteDirAdminItems({
      folder: currentFolder.value,
      addPath: currentPath.value,
      items: deleteDialog.items.map(item => item.name)
    })
    toast.add({
      severity: 'success',
      summary: 'Удалено',
      detail: String(deleteDialog.items.length),
      life: 3000
    })
    deleteDialog.visible = false
    deleteDialog.items = []
    selectedItems.value = []
    await loadDirectoryContents()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Ошибка', detail: getErrorDetail(error), life: 5000 })
  } finally {
    loading.delete = false
  }
}

function downloadFile(file) {
  window.open(file.downloadUrl, '_blank')
}

function editFile(file) {
  window.open(file.editorUrl, '_blank')
}

function copyPath(path) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(path).then(() => {
      toast.add({ severity: 'success', summary: 'Скопировано', detail: path, life: 2000 })
    })
    return
  }

  const input = document.createElement('input')
  input.value = path
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
  toast.add({ severity: 'success', summary: 'Скопировано', detail: path, life: 2000 })
}

function isEditable(filename) {
  return ['.html', '.css', '.js', '.json', '.xml', '.txt', '.md']
    .some(extension => filename.toLowerCase().endsWith(extension))
}

watch(activeDatabase, () => {
  loadDirectoryContents()
})

onMounted(() => {
  loadDirectoryContents()
})

defineExpose({
  accessDenied,
  breadcrumbs,
  canWrite,
  combinedList,
  currentFolder,
  currentPath,
  editFile,
  files,
  folders,
  loadDirectoryContents,
  loadError
})
</script>

<style scoped>
.integram-dir-admin-page {
  width: 100%;
}

.dir-admin-header,
.dir-admin-list-toolbar,
.dir-admin-inline-form {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.dir-admin-path,
.dir-admin-breadcrumbs,
.dir-admin-row-actions,
.dir-admin-upload-options {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.dir-admin-row-actions {
  flex-wrap: nowrap;
}

.dir-admin-write-panels {
  max-width: 48rem;
}

.dir-admin-name-button {
  padding-left: 0;
  padding-right: 0;
  font-weight: 600;
}

.dir-admin-table :deep(.p-datatable-tbody > tr > td) {
  vertical-align: middle;
}

.dir-admin-empty {
  padding: 1rem;
  text-align: center;
  color: var(--text-color-secondary);
}

.dir-admin-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

@media (max-width: 640px) {
  .dir-admin-header,
  .dir-admin-list-toolbar,
  .dir-admin-inline-form {
    align-items: stretch;
    flex-direction: column;
  }

  .dir-admin-inline-form > * {
    width: 100%;
  }
}
</style>
