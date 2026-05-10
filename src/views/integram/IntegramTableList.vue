<template>
  <div class="tables-workspace" data-testid="tables-workspace">
    <IntegramBreadcrumb :items="breadcrumbItems" :database="database" />

    <div class="tables-header">
      <h1>Таблицы</h1>
      <div class="tables-actions">
        <IconField iconPosition="left" class="search-box">
          <InputIcon class="fi fi-rr-search" />
          <InputText
            id="tables-search"
            ref="searchInput"
            v-model="searchQuery"
            placeholder="Поиск таблиц..."
            autocomplete="off"
            class="search-input"
          />
        </IconField>
        <Button
          v-if="canWriteStructure"
          type="button"
          label="Новая таблица"
          icon="fi fi-rr-plus"
          size="small"
          @click="openNewTableDialog"
        />
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <ProgressSpinner />
      <p>Загрузка таблиц...</p>
    </div>

    <Message v-else-if="error" severity="error" :closable="false">
      {{ error }}
    </Message>

    <div v-else class="tables-container">
      <section
        v-for="folder in visibleFolders"
        :key="folder.name"
        class="folder"
        :class="{
          collapsed: !folder.open,
          'drag-over': dragOverFolder === folder.name,
          dragging: draggingFolderName === folder.name
        }"
        :data-folder-name="folder.name"
        :draggable="canWriteStructure && !folder.virtual"
        @dragstart="startFolderDrag($event, folder)"
        @dragend="finishFolderDrag"
        @dragover="handleFolderReorderOver($event, folder)"
        @drop="handleFolderReorderDrop($event, folder)"
      >
        <div class="folder-header">
          <button
            type="button"
            class="folder-toggle-button"
            :aria-expanded="folder.open"
            @click="toggleFolder(folder)"
          >
            <i :class="folder.open ? 'fi fi-rr-folder-open' : 'fi fi-rr-folder'"></i>
            <span class="folder-name">{{ folder.name }}</span>
            <Badge :value="folder.totalCount" severity="secondary" class="folder-count" />
          </button>

          <div v-if="canWriteStructure && !folder.virtual" class="folder-actions">
            <Button
              icon="fi fi-rr-pencil"
              text
              rounded
              size="small"
              :aria-label="`Переименовать папку ${folder.name}`"
              @click="openRenameFolderDialog(folder.name)"
            />
            <Button
              icon="fi fi-rr-trash"
              text
              rounded
              size="small"
              severity="danger"
              :aria-label="`Удалить папку ${folder.name}`"
              @click="confirmDeleteFolder(folder.name)"
            />
          </div>
        </div>

        <div
          v-show="folder.open"
          class="folder-content"
          @dragover="handleTableDragOver($event, folder)"
          @dragleave="handleTableDragLeave($event, folder)"
          @drop="dropTableIntoFolder($event, folder)"
        >
          <router-link
            v-for="table in folder.tables"
            :key="table.id"
            class="table-card"
            :to="`/${database}/table/${table.id}`"
            :data-testid="`table-card-${table.id}`"
            :data-table-id="table.id"
            :data-table-name="table.name.toLowerCase()"
            :draggable="canWriteStructure"
            @dragstart.stop="startTableDrag($event, table)"
            @dragend="finishTableDrag"
          >
            <i class="table-card-icon" :class="[getTypeIconClass(table.type), `type-${table.type}`]"></i>
            <span class="table-card-name">{{ table.name }}</span>
          </router-link>

          <div v-if="folder.tables.length === 0" class="folder-empty">
            {{ canWriteStructure ? 'Перетащите таблицы сюда' : 'Нет таблиц' }}
          </div>
        </div>
      </section>

      <button
        v-if="canWriteStructure"
        type="button"
        class="add-folder-btn"
        @click="openNewFolderDialog"
      >
        <i class="fi fi-rr-plus"></i>
        <span>Добавить папку</span>
      </button>
    </div>

    <Dialog
      v-model:visible="showNewTableDialog"
      header="Новая таблица"
      modal
      :style="{ width: '30rem' }"
      @hide="resetNewTableForm"
    >
      <form class="dialog-form" @submit.prevent="createNewTable">
        <div class="field">
          <label for="new-table-name">Название таблицы</label>
          <InputText
            id="new-table-name"
            v-model="newTableName"
            class="w-full"
            required
            autocomplete="off"
            placeholder="Введите название"
            @input="handleNewTableNameInput"
          />
        </div>

        <div class="field">
          <label for="new-table-type">Тип</label>
          <select
            id="new-table-type"
            v-model="newTableType"
            class="native-select"
            required
            @change="typeManuallyChanged = true"
          >
            <option
              v-for="baseType in TABLE_BASE_TYPES"
              :key="baseType.value"
              :value="baseType.value"
            >
              {{ baseType.label }}
            </option>
          </select>
        </div>

        <label class="checkbox-label" for="new-table-unique">
          <input
            id="new-table-unique"
            v-model="newTableUnique"
            type="checkbox"
            @change="handleUniqueManualChange"
          />
          <span>Уникальные значения</span>
        </label>

        <Message v-if="createTableError" severity="error" :closable="false">
          {{ createTableError }}
        </Message>
      </form>

      <template #footer>
        <Button label="Отмена" text @click="showNewTableDialog = false" />
        <Button
          label="Создать"
          icon="fi fi-rr-check"
          :loading="creatingTable"
          :disabled="!newTableName.trim()"
          @click="createNewTable"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showNewFolderDialog"
      header="Новая папка"
      modal
      :style="{ width: '26rem' }"
      @hide="newFolderName = ''"
    >
      <form class="dialog-form" @submit.prevent="createFolder">
        <div class="field">
          <label for="new-folder-name">Название папки</label>
          <InputText
            id="new-folder-name"
            v-model="newFolderName"
            class="w-full"
            required
            autocomplete="off"
            placeholder="Введите название"
          />
        </div>
      </form>

      <template #footer>
        <Button label="Отмена" text @click="showNewFolderDialog = false" />
        <Button
          label="Создать"
          icon="fi fi-rr-check"
          :disabled="!newFolderName.trim()"
          @click="createFolder"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showRenameFolderDialog"
      header="Переименовать папку"
      modal
      :style="{ width: '26rem' }"
    >
      <form class="dialog-form" @submit.prevent="renameFolder">
        <div class="field">
          <label for="rename-folder-name">Название папки</label>
          <InputText
            id="rename-folder-name"
            v-model="renameFolderName"
            class="w-full"
            required
            autocomplete="off"
          />
        </div>
      </form>

      <template #footer>
        <Button label="Отмена" text @click="showRenameFolderDialog = false" />
        <Button
          label="Сохранить"
          icon="fi fi-rr-check"
          :disabled="!renameFolderName.trim()"
          @click="renameFolder"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import IntegramBreadcrumb from '@/components/integram/IntegramBreadcrumb.vue'
import { useIntegramSession } from '@/composables/useIntegramSession'
import integramApiClient from '@/services/integramApiClient'
import {
  DEFAULT_TABLE_FOLDERS,
  TABLE_BASE_TYPES,
  cloneFolderConfig,
  detectTableBaseType,
  extractTableSettings,
  getAssignedTableIds,
  getTypeIconClass,
  hasStructureWriteGrant,
  normalizeFolderConfig,
  normalizeTableList,
  tableMatchesQuery
} from '@/utils/tableWorkspace'
import { readIntegramPermissionContext } from '@/utils/integramPermissions'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { isAuthenticated } = useIntegramSession()

const TABLE_CONFIG_STORAGE_KEY = 'integram-table-folders-config'
const TABLE_SETTINGS_ID_STORAGE_KEY = 'integram-table-folders-settings-id'

const loading = ref(false)
const error = ref(null)
const tables = ref([])
const folderConfig = ref(cloneFolderConfig())
const settingsId = ref(localStorage.getItem(TABLE_SETTINGS_ID_STORAGE_KEY))
const permissionContext = ref({})
const searchQuery = ref('')
const searchInput = ref(null)

const showNewTableDialog = ref(false)
const showNewFolderDialog = ref(false)
const showRenameFolderDialog = ref(false)
const newTableName = ref('')
const newTableType = ref('3')
const newTableUnique = ref(false)
const newFolderName = ref('')
const renameOriginalName = ref('')
const renameFolderName = ref('')
const createTableError = ref(null)
const creatingTable = ref(false)
const typeManuallyChanged = ref(false)
const uniqueManuallyChanged = ref(false)
const applyingDetection = ref(false)

const draggingTableId = ref(null)
const draggingFolderName = ref(null)
const dragOverFolder = ref(null)

const database = computed(() => String(route.params.database || integramApiClient.getDatabase() || 'my'))
const canWriteStructure = computed(() => hasStructureWriteGrant(permissionContext.value))
const breadcrumbItems = computed(() => [{ label: 'Таблицы', icon: 'fi fi-rr-table' }])

const visibleFolders = computed(() => {
  const assigned = getAssignedTableIds(folderConfig.value)
  const query = searchQuery.value
  const result = Object.entries(folderConfig.value).map(([name, folder]) => {
    const folderTables = (folder.tabs || [])
      .map(id => tables.value.find(table => table.id === String(id)))
      .filter(Boolean)

    return {
      name,
      virtual: false,
      open: query ? true : folder.open !== false,
      totalCount: folderTables.length,
      tables: folderTables.filter(table => tableMatchesQuery(table, query))
    }
  })

  const unassigned = tables.value.filter(table => !assigned.has(table.id))
  if (unassigned.length > 0) {
    result.push({
      name: 'Без папки',
      virtual: true,
      open: true,
      totalCount: unassigned.length,
      tables: unassigned.filter(table => tableMatchesQuery(table, query))
    })
  }

  return result
})

onMounted(async () => {
  if (!isAuthenticated.value) {
    router.push('/login?redirect=' + encodeURIComponent(route.fullPath))
    return
  }

  permissionContext.value = readPermissionContext()
  await loadWorkspace()
})

async function loadWorkspace() {
  loading.value = true
  error.value = null

  try {
    const [tablesResult, settingsResult] = await Promise.allSettled([
      loadTableTerms(),
      integramApiClient.getTableUiSettings()
    ])

    if (tablesResult.status === 'rejected') {
      throw tablesResult.reason
    }

    tables.value = tablesResult.value

    const localConfig = localStorage.getItem(TABLE_CONFIG_STORAGE_KEY)
    let nextConfig = localConfig ? normalizeFolderConfig(localConfig) : cloneFolderConfig(DEFAULT_TABLE_FOLDERS)

    if (settingsResult.status === 'fulfilled') {
      const extracted = extractTableSettings(settingsResult.value)
      if (extracted.config) {
        nextConfig = extracted.config
        if (extracted.settingsId) {
          settingsId.value = extracted.settingsId
          localStorage.setItem(TABLE_SETTINGS_ID_STORAGE_KEY, extracted.settingsId)
        }
      }
    }

    folderConfig.value = nextConfig
    localStorage.setItem(TABLE_CONFIG_STORAGE_KEY, JSON.stringify(nextConfig))
  } catch (err) {
    console.error('Error loading tables workspace:', err)
    error.value = err.message || 'Не удалось загрузить таблицы'
  } finally {
    loading.value = false
  }
}

async function loadTableTerms() {
  try {
    return normalizeTableList(await integramApiClient.getTerms())
  } catch (termsError) {
    console.warn('Failed to load terms, falling back to dict:', termsError)
    return normalizeTableList(await integramApiClient.getDictionary())
  }
}

function toggleFolder(folder) {
  if (folder.virtual || searchQuery.value) return
  folderConfig.value[folder.name].open = !folderConfig.value[folder.name].open
  saveFolderConfig({ silent: true })
}

function openNewTableDialog() {
  const searchValue = searchQuery.value.trim()
  if (searchValue) {
    newTableName.value = searchValue
    applyTypeDetection(searchValue)
  }
  showNewTableDialog.value = true
}

function resetNewTableForm() {
  newTableName.value = ''
  newTableType.value = '3'
  newTableUnique.value = false
  createTableError.value = null
  typeManuallyChanged.value = false
  uniqueManuallyChanged.value = false
}

function handleNewTableNameInput() {
  applyTypeDetection(newTableName.value)
}

function handleUniqueManualChange() {
  if (!applyingDetection.value) {
    uniqueManuallyChanged.value = true
  }
}

function applyTypeDetection(name) {
  const detected = detectTableBaseType(name)
  if (!detected) return

  applyingDetection.value = true
  if (!typeManuallyChanged.value) {
    newTableType.value = String(detected.type)
  }
  if (!uniqueManuallyChanged.value) {
    newTableUnique.value = detected.ref
  }
  applyingDetection.value = false
}

async function createNewTable() {
  if (!newTableName.value.trim() || creatingTable.value) return

  creatingTable.value = true
  createTableError.value = null

  try {
    const result = await integramApiClient.createType(
      newTableName.value.trim(),
      newTableType.value,
      newTableUnique.value
    )
    const newTableId = String(result.obj || result.id || '')

    if (newTableId) {
      const firstFolderName = Object.keys(folderConfig.value)[0]
      if (firstFolderName) {
        const tabs = folderConfig.value[firstFolderName].tabs || []
        folderConfig.value[firstFolderName].tabs = [newTableId, ...tabs.filter(id => id !== newTableId)]
        await saveFolderConfig({ silent: true })
      }
    }

    await loadWorkspace()
    showNewTableDialog.value = false
    toast.add({
      severity: 'success',
      summary: 'Таблица создана',
      detail: newTableName.value.trim(),
      life: 2500
    })
  } catch (err) {
    console.error('Error creating table:', err)
    createTableError.value = err.message || 'Ошибка при создании таблицы'
  } finally {
    creatingTable.value = false
  }
}

function openNewFolderDialog() {
  newFolderName.value = ''
  showNewFolderDialog.value = true
}

function createFolder() {
  const name = newFolderName.value.trim()
  if (!name) return
  if (folderConfig.value[name]) {
    toast.add({ severity: 'warn', summary: 'Папка уже существует', detail: name, life: 2500 })
    return
  }

  folderConfig.value = {
    [name]: { open: true, tabs: [] },
    ...folderConfig.value
  }
  showNewFolderDialog.value = false
  saveFolderConfig()
}

function openRenameFolderDialog(folderName) {
  renameOriginalName.value = folderName
  renameFolderName.value = folderName
  showRenameFolderDialog.value = true
}

function renameFolder() {
  const oldName = renameOriginalName.value
  const newName = renameFolderName.value.trim()
  if (!oldName || !newName || newName === oldName) {
    showRenameFolderDialog.value = false
    return
  }
  if (folderConfig.value[newName]) {
    toast.add({ severity: 'warn', summary: 'Папка уже существует', detail: newName, life: 2500 })
    return
  }

  const entries = Object.entries(folderConfig.value)
  const index = entries.findIndex(([name]) => name === oldName)
  if (index !== -1) {
    entries[index] = [newName, entries[index][1]]
    folderConfig.value = Object.fromEntries(entries)
    saveFolderConfig()
  }
  showRenameFolderDialog.value = false
}

function confirmDeleteFolder(folderName) {
  confirm.require({
    header: 'Удалить папку?',
    message: `Удалить папку "${folderName}"? Таблицы будут перемещены в "Без папки".`,
    acceptLabel: 'Удалить',
    rejectLabel: 'Отмена',
    acceptClass: 'p-button-danger',
    accept: () => {
      const nextConfig = cloneFolderConfig(folderConfig.value)
      delete nextConfig[folderName]
      folderConfig.value = nextConfig
      saveFolderConfig()
    }
  })
}

function startTableDrag(event, table) {
  if (!canWriteStructure.value) {
    event.preventDefault()
    return
  }
  draggingTableId.value = table.id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', table.id)
}

function finishTableDrag() {
  draggingTableId.value = null
  dragOverFolder.value = null
}

function handleTableDragOver(event, folder) {
  if (!canWriteStructure.value || !draggingTableId.value || folder.virtual) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverFolder.value = folder.name
}

function handleTableDragLeave(event, folder) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    if (dragOverFolder.value === folder.name) dragOverFolder.value = null
  }
}

function dropTableIntoFolder(event, folder) {
  if (!canWriteStructure.value || !draggingTableId.value || folder.virtual) return
  event.preventDefault()
  event.stopPropagation()
  moveTableToFolder(draggingTableId.value, folder.name)
  finishTableDrag()
}

function moveTableToFolder(tableId, targetFolder) {
  const id = String(tableId)
  const nextConfig = cloneFolderConfig(folderConfig.value)
  Object.values(nextConfig).forEach(folder => {
    folder.tabs = (folder.tabs || []).filter(tabId => String(tabId) !== id)
  })
  nextConfig[targetFolder].tabs = [...(nextConfig[targetFolder].tabs || []), id]
  folderConfig.value = nextConfig
  saveFolderConfig({ silent: true })
}

function startFolderDrag(event, folder) {
  if (!canWriteStructure.value || folder.virtual || event.target.closest('.table-card')) {
    event.preventDefault()
    return
  }
  draggingFolderName.value = folder.name
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('application/x-integram-folder', folder.name)
}

function finishFolderDrag() {
  draggingFolderName.value = null
}

function handleFolderReorderOver(event, folder) {
  if (!canWriteStructure.value || !draggingFolderName.value || folder.virtual || draggingFolderName.value === folder.name) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

function handleFolderReorderDrop(event, folder) {
  if (!canWriteStructure.value || !draggingFolderName.value || folder.virtual || draggingFolderName.value === folder.name) return
  event.preventDefault()
  reorderFolders(draggingFolderName.value, folder.name)
  finishFolderDrag()
}

function reorderFolders(sourceName, targetName) {
  const entries = Object.entries(folderConfig.value)
  const sourceIndex = entries.findIndex(([name]) => name === sourceName)
  const targetIndex = entries.findIndex(([name]) => name === targetName)
  if (sourceIndex === -1 || targetIndex === -1) return

  const [source] = entries.splice(sourceIndex, 1)
  entries.splice(targetIndex, 0, source)
  folderConfig.value = Object.fromEntries(entries)
  saveFolderConfig({ silent: true })
}

async function saveFolderConfig({ silent = false } = {}) {
  const normalizedConfig = cloneFolderConfig(folderConfig.value)
  localStorage.setItem(TABLE_CONFIG_STORAGE_KEY, JSON.stringify(normalizedConfig))

  try {
    const result = await integramApiClient.saveTableUiSettings(settingsId.value, normalizedConfig)
    const nextSettingsId = result.id || result.obj
    if (nextSettingsId) {
      settingsId.value = String(nextSettingsId)
      localStorage.setItem(TABLE_SETTINGS_ID_STORAGE_KEY, String(nextSettingsId))
    }
    if (!silent) {
      toast.add({ severity: 'success', summary: 'Сохранено', detail: 'Настройки таблиц обновлены', life: 2000 })
    }
  } catch (err) {
    console.error('Error saving table folder settings:', err)
    toast.add({ severity: 'warn', summary: 'Настройки не сохранены', detail: err.message, life: 3500 })
  }
}

function readPermissionContext() {
  return readIntegramPermissionContext(database.value, integramApiClient)
}
</script>

<style scoped>
.tables-workspace {
  max-width: 1040px;
}

.tables-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.tables-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.tables-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.search-box {
  width: min(20rem, 70vw);
}

.search-input {
  width: 100%;
}

.loading-state {
  display: grid;
  place-items: center;
  gap: 1rem;
  min-height: 16rem;
  color: var(--text-color-secondary);
}

.tables-container {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.folder {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.folder.drag-over {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 20%, transparent);
}

.folder.dragging {
  opacity: 0.7;
}

.folder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  background: var(--surface-50);
  border-bottom: 1px solid var(--surface-border);
}

.folder.collapsed .folder-header {
  border-bottom: 0;
}

.folder-toggle-button {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  border: 0;
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  text-align: left;
  font: inherit;
}

.folder-toggle-button:hover {
  background: var(--surface-hover);
}

.folder-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-count {
  margin-left: auto;
}

.folder-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding-right: 0.5rem;
}

.folder-content {
  min-height: 4rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  padding: 0.875rem;
}

.table-card {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 15rem;
  min-width: 8rem;
  min-height: 2.35rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-50);
  color: var(--text-color);
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.table-card:hover {
  background: var(--surface-hover);
  border-color: var(--primary-color);
  transform: translateY(-1px);
}

.table-card-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
  font-size: 0.875rem;
}

.table-card-icon.type-9,
.table-card-icon.type-4 {
  color: var(--green-600, #16a34a);
  background: color-mix(in srgb, #16a34a 12%, transparent);
}

.table-card-icon.type-13,
.table-card-icon.type-14 {
  color: var(--orange-600, #ea580c);
  background: color-mix(in srgb, #ea580c 12%, transparent);
}

.table-card-icon.type-5 {
  color: var(--red-600, #dc2626);
  background: color-mix(in srgb, #dc2626 12%, transparent);
}

.table-card-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}

.folder-empty {
  width: 100%;
  padding: 0.875rem;
  color: var(--text-color-secondary);
  text-align: center;
  font-size: 0.9rem;
}

.add-folder-btn {
  min-height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 2px dashed var(--surface-border);
  border-radius: 8px;
  background: var(--surface-card);
  color: var(--text-color-secondary);
  cursor: pointer;
  font: inherit;
}

.add-folder-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--surface-hover);
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.native-select {
  width: 100%;
  min-height: 2.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-card);
  color: var(--text-color);
  font: inherit;
}

.native-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 20%, transparent);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--primary-color);
}

@media (max-width: 768px) {
  .tables-header {
    align-items: stretch;
    gap: 0.75rem;
  }

  .tables-actions {
    width: 100%;
  }

  .search-box {
    width: 100%;
    flex: 1 1 14rem;
  }

  .folder-toggle-button {
    padding: 0.7rem 0.75rem;
  }

  .folder-content {
    padding: 0.625rem;
    gap: 0.5rem;
  }

  .table-card {
    flex: 1 1 calc(50% - 0.5rem);
    max-width: none;
  }
}

@media (max-width: 480px) {
  .table-card {
    flex-basis: 100%;
  }
}
</style>
