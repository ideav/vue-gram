<template>
  <div class="integram-migration-page integram-touch-friendly" data-testid="migration-workspace">
    <IntegramBreadcrumb :items="breadcrumbItems" />

    <Message v-if="permissionDenied" severity="error" :closable="false" class="mb-3" data-testid="migration-permission">
      Недостаточно прав для доступа к рабочему месту миграции.
    </Message>

    <template v-else>
      <header class="migration-header">
        <div>
          <h1>Миграция</h1>
          <p>JSON-пакет сущностей, запросов, рабочих мест и файлов</p>
        </div>

        <div class="migration-actions">
          <Button
            label="Анализ запросов"
            icon="fi fi-rr-sitemap"
            outlined
            data-testid="migration-scan-queries"
            :disabled="busy || selectedQueries.length === 0"
            @click="scanSelectedQueries"
          />
          <Button
            label="Найти связи"
            icon="fi fi-rr-search"
            outlined
            data-testid="migration-scan-files"
            :disabled="busy || selectedFiles.length === 0"
            @click="scanSelectedFiles"
          />
          <Button
            label="Сохранить"
            icon="fi fi-rr-disk"
            outlined
            data-testid="migration-save"
            :disabled="busy"
            @click="confirmSaveSettings"
          />
          <Button
            label="Экспорт"
            icon="fi fi-rr-download"
            data-testid="migration-export"
            :disabled="busy || !hasSelection"
            @click="confirmExportPackage"
          />
        </div>
      </header>

      <Message v-if="loadError" severity="error" :closable="false" class="mb-3" data-testid="migration-error">
        {{ loadError }}
      </Message>

      <div v-if="busy" class="migration-progress" data-testid="migration-progress">
        <ProgressBar mode="indeterminate" />
        <span>{{ busyText }}</span>
      </div>

      <section class="migration-settings">
        <label>
          <span>Настройка</span>
          <select v-model="currentSettingId" data-testid="migration-settings-select" :disabled="busy" @change="applySetting(currentSettingId)">
            <option value="">Новая настройка</option>
            <option v-for="setting in settings" :key="setting.id" :value="setting.id">
              {{ setting.name }}
            </option>
          </select>
        </label>

        <label class="migration-name-field">
          <span>Название</span>
          <input
            v-model="settingsName"
            type="text"
            data-testid="migration-settings-name"
            placeholder="Новая миграция"
            :disabled="busy"
          >
        </label>

        <Button
          icon="fi fi-rr-plus"
          text
          rounded
          aria-label="Новая настройка"
          data-testid="migration-new-settings"
          :disabled="busy"
          @click="newSettings"
        />

        <div class="migration-status" data-testid="migration-status">{{ statusText }}</div>
      </section>

      <main class="migration-grid">
        <section class="migration-panel">
          <div class="migration-panel-title">
            <i class="fi fi-rr-database"></i>
            <h2>Таблицы</h2>
            <span>{{ selectedTables.length }} / {{ tables.length }}</span>
          </div>
          <div class="migration-search">
            <i class="fi fi-rr-search"></i>
            <input v-model="tableSearch" type="search" placeholder="Поиск" data-testid="migration-table-search">
          </div>
          <div class="migration-list" data-testid="migration-table-list">
            <label v-for="table in filteredTables" :key="table.id" class="migration-row">
              <input
                type="checkbox"
                :checked="isTableSelected(table.id)"
                :data-testid="`migration-table-${table.id}`"
                @change="toggleTable(table, $event.target.checked)"
              >
              <span class="migration-row-main">
                <span class="migration-row-name">{{ table.name }}</span>
                <span class="migration-row-meta">#{{ table.id }}</span>
              </span>
            </label>
            <div v-if="filteredTables.length === 0" class="migration-empty">Нет таблиц</div>
          </div>
          <div class="migration-selected-block">
            <div class="migration-selected-title">Отобрано</div>
            <div v-if="selectedTables.length === 0" class="migration-empty">Таблицы не выбраны</div>
            <div v-for="table in selectedTables" :key="table.id" class="migration-selected-item">
              <div class="migration-selected-head">
                <span>{{ table.name }} <span class="migration-row-meta">#{{ table.id }}</span></span>
                <button type="button" class="migration-mini-button" :aria-label="`Убрать таблицу ${table.name}`" @click="toggleTable(table, false)">
                  <i class="fi fi-rr-cross-small"></i>
                </button>
              </div>
              <label class="migration-checkline">
                <input type="checkbox" :checked="table.exportData" @change="updateSelectedTable(table.id, { exportData: $event.target.checked })">
                Данные
              </label>
              <input
                class="migration-filter-input"
                :value="table.filter"
                placeholder="F_Поле=значение"
                @input="updateSelectedTable(table.id, { filter: $event.target.value })"
              >
            </div>
          </div>
        </section>

        <section class="migration-panel">
          <div class="migration-panel-title">
            <i class="fi fi-rr-table"></i>
            <h2>Запросы</h2>
            <span>{{ selectedQueries.length }} / {{ queries.length }}</span>
          </div>
          <div class="migration-search">
            <i class="fi fi-rr-search"></i>
            <input v-model="querySearch" type="search" placeholder="Поиск" data-testid="migration-query-search">
          </div>
          <div class="migration-list" data-testid="migration-query-list">
            <label v-for="query in filteredQueries" :key="query.id" class="migration-row">
              <input
                type="checkbox"
                :checked="isQuerySelected(query.id)"
                :data-testid="`migration-query-${query.id}`"
                @change="toggleQuery(query, $event.target.checked)"
              >
              <span class="migration-row-main">
                <span class="migration-row-name">{{ query.name }}</span>
                <span class="migration-row-meta">#{{ query.id }}</span>
              </span>
            </label>
            <div v-if="filteredQueries.length === 0" class="migration-empty">Нет запросов</div>
          </div>
        </section>

        <section class="migration-panel">
          <div class="migration-panel-title">
            <i class="fi fi-rr-folder-open"></i>
            <h2>Файлы</h2>
            <span>{{ selectedFiles.length }} / {{ catalogFiles.length }}</span>
          </div>
          <div class="migration-file-toolbar">
            <button
              type="button"
              class="migration-chip"
              :class="{ active: fileBrowser.root === 'templates' }"
              data-testid="migration-root-templates"
              @click="openFileDir('templates', '')"
            >
              templates
            </button>
            <button
              type="button"
              class="migration-chip"
              :class="{ active: fileBrowser.root === 'download' }"
              data-testid="migration-root-download"
              @click="openFileDir('download', '')"
            >
              download
            </button>
            <button type="button" class="migration-mini-button" aria-label="На уровень выше" @click="openParentDir">
              <i class="fi fi-rr-arrow-up"></i>
            </button>
          </div>
          <div class="migration-path" data-testid="migration-file-path">{{ fileLocation }}</div>
          <div class="migration-search">
            <i class="fi fi-rr-search"></i>
            <input v-model="fileSearch" type="search" placeholder="Поиск" data-testid="migration-file-search">
          </div>
          <div class="migration-list" data-testid="migration-file-list">
            <button
              v-for="folder in filteredFolders"
              :key="folder.openAddPath"
              type="button"
              class="migration-row migration-row-button"
              :data-testid="`migration-folder-${folder.name}`"
              @click="openFileDir(fileBrowser.root, folder.openAddPath)"
            >
              <i class="fi fi-rr-folder"></i>
              <span class="migration-row-main">
                <span class="migration-row-name">{{ folder.name }}</span>
                <span class="migration-row-meta">{{ folder.openAddPath }}</span>
              </span>
            </button>

            <label v-for="file in filteredFiles" :key="file.key" class="migration-row">
              <input
                type="checkbox"
                :checked="isFileSelected(file.key)"
                :data-testid="`migration-file-${file.name}`"
                @change="toggleFile(file, $event.target.checked)"
              >
              <span class="migration-row-main">
                <span class="migration-row-name">{{ file.name }}</span>
                <span class="migration-row-meta">{{ file.path }}</span>
              </span>
            </label>
            <div v-if="filteredFolders.length === 0 && filteredFiles.length === 0" class="migration-empty">Файлы не найдены</div>
          </div>
          <div class="migration-selected-block">
            <div class="migration-selected-title">Отобрано</div>
            <div v-if="selectedFiles.length === 0" class="migration-empty">Файлы не выбраны</div>
            <div v-for="file in selectedFiles" :key="file.key" class="migration-pill">
              <span>{{ file.root }}/{{ file.path }}</span>
              <button type="button" class="migration-mini-button" :aria-label="`Убрать файл ${file.name}`" @click="toggleFile(file, false)">
                <i class="fi fi-rr-cross-small"></i>
              </button>
            </div>
          </div>
        </section>
      </main>

      <section class="migration-panel migration-import-panel">
        <div class="migration-panel-title">
          <i class="fi fi-rr-upload"></i>
          <h2>Импорт</h2>
          <span>dry-run</span>
        </div>
        <textarea
          v-model="importText"
          spellcheck="false"
          data-testid="migration-import-input"
          placeholder="{ ... JSON-пакет миграции ... }"
        ></textarea>
        <div class="migration-import-actions">
          <Button
            label="Проверить пакет"
            icon="fi fi-rr-play"
            outlined
            data-testid="migration-dry-run"
            :disabled="busy || !importText.trim()"
            @click="confirmDryRunImport"
          />
          <div v-if="dryRunResult" class="migration-dry-run-summary" data-testid="migration-dry-run-summary">
            Таблицы: {{ dryRunResult.counts.tables }},
            запросы: {{ dryRunResult.counts.queries }},
            файлы: {{ dryRunResult.counts.files }}.
            Уже есть: таблиц {{ dryRunResult.counts.existingTables }}, запросов {{ dryRunResult.counts.existingQueries }}.
          </div>
        </div>
        <ul v-if="dryRunResult?.warnings.length" class="migration-warnings">
          <li v-for="warning in dryRunResult.warnings" :key="warning">{{ warning }}</li>
        </ul>
      </section>

      <section class="migration-panel migration-output-panel">
        <div class="migration-panel-title">
          <i class="fi fi-rr-code-simple"></i>
          <h2>Пакет</h2>
          <span>{{ packageSizeLabel }}</span>
        </div>
        <textarea :value="outputText" spellcheck="false" readonly data-testid="migration-output"></textarea>
      </section>

      <section class="migration-panel migration-log-panel">
        <div class="migration-panel-title">
          <i class="fi fi-rr-memo-pad"></i>
          <h2>Журнал</h2>
          <span>{{ logs.length }}</span>
        </div>
        <div class="migration-log-list" data-testid="migration-log">
          <div v-if="logs.length === 0" class="migration-empty">Нет записей</div>
          <div v-for="entry in logs" :key="entry.id" class="migration-log-row" :class="`level-${entry.level}`">
            <span>{{ formatLogTime(entry.at) }}</span>
            <strong>{{ entry.level }}</strong>
            <span>{{ entry.message }}</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import IntegramBreadcrumb from './IntegramBreadcrumb.vue'
import integramApiClient from '@/services/integramApiClient'
import { useGrants } from '@/composables/useGrants'
import { parseDirAdminHtml } from '@/utils/integramDirAdmin'
import {
  buildMigrationDryRunResult,
  cloneMigrationFile,
  cloneMigrationQuery,
  cloneMigrationTable,
  makeMigrationFileItem,
  normalizeMigrationPath,
  normalizeMigrationSearch,
  parseMigrationDependencyRefs,
  serializeMigrationConfig
} from '@/utils/integramMigration'

const props = defineProps({
  database: {
    type: String,
    default: 'my'
  }
})

const confirmation = useConfirm()
const toast = useToast()
const grants = useGrants()

const tables = ref([])
const queries = ref([])
const settings = ref([])
const catalogFiles = ref([])
const fileBrowser = ref({
  root: 'templates',
  path: '',
  folders: [],
  files: []
})

const selectedTables = ref([])
const selectedQueries = ref([])
const selectedFiles = ref([])
const currentSettingId = ref('')
const settingsName = ref('')
const tableSearch = ref('')
const querySearch = ref('')
const fileSearch = ref('')
const outputText = ref('')
const importText = ref('')
const dryRunResult = ref(null)
const loadError = ref('')
const statusText = ref('')
const busy = ref(false)
const busyText = ref('')
const logs = ref([])

const permissionDenied = computed(() => !grants.canAdmin())
const hasSelection = computed(() => (
  selectedTables.value.length > 0 ||
  selectedQueries.value.length > 0 ||
  selectedFiles.value.length > 0
))

const breadcrumbItems = computed(() => [
  { label: props.database, to: `/${props.database}` },
  { label: 'Миграция' }
])

const filteredTables = computed(() => filterBySearch(tables.value, tableSearch.value))
const filteredQueries = computed(() => filterBySearch(queries.value, querySearch.value))
const filteredFolders = computed(() => filterBySearch(fileBrowser.value.folders, fileSearch.value, 'openAddPath'))
const filteredFiles = computed(() => filterBySearch(fileBrowser.value.files, fileSearch.value, 'path'))
const fileLocation = computed(() => `${fileBrowser.value.root}/${fileBrowser.value.path ? `${fileBrowser.value.path}/` : ''}`)
const packageSizeLabel = computed(() => outputText.value ? `${Math.max(1, Math.round(outputText.value.length / 1024))} КБ` : '')

function filterBySearch(items, search, extraKey = 'id') {
  const normalized = normalizeMigrationSearch(search)
  if (!normalized) return items
  return items.filter(item => normalizeMigrationSearch(`${item.name} ${item[extraKey] || ''}`).includes(normalized))
}

function addLog(level, message) {
  logs.value = [
    ...logs.value,
    {
      id: `${Date.now()}-${logs.value.length}`,
      level,
      message,
      at: new Date().toISOString()
    }
  ].slice(-80)
}

function notify(level, message) {
  addLog(level, message)
  toast.add({
    severity: level === 'error' ? 'error' : level === 'success' ? 'success' : 'info',
    summary: level === 'error' ? 'Ошибка' : 'Миграция',
    detail: message,
    life: 3500
  })
}

async function withBusy(text, task) {
  busy.value = true
  busyText.value = text
  statusText.value = text
  try {
    return await task()
  } catch (error) {
    notify('error', error.message || text)
    return null
  } finally {
    busy.value = false
    busyText.value = ''
  }
}

function requestConfirmation({ header, message, acceptLabel = 'Продолжить', accept }) {
  confirmation.require({
    header,
    message,
    acceptLabel,
    rejectLabel: 'Отмена',
    accept
  })
}

async function loadInitialData() {
  await withBusy('Загрузка данных...', async () => {
    try {
      const [tableRows, queryRows, settingRows] = await Promise.all([
        integramApiClient.getMigrationTables(),
        integramApiClient.getMigrationQueries(),
        integramApiClient.getMigrationSettings()
      ])
      tables.value = tableRows
      queries.value = queryRows
      settings.value = settingRows
      addLog('info', `Загружены таблицы: ${tableRows.length}, запросы: ${queryRows.length}, настройки: ${settingRows.length}`)
      await openFileDir('templates', '')
      statusText.value = 'Готово'
    } catch (error) {
      loadError.value = error.message || 'Не удалось загрузить данные рабочего места'
      notify('error', loadError.value)
    }
  })
}

async function loadSettingsOnly() {
  settings.value = await integramApiClient.getMigrationSettings()
}

function mergeCatalogFiles(files) {
  const map = new Map(catalogFiles.value.map(file => [file.key, file]))
  for (const file of files) map.set(file.key, file)
  catalogFiles.value = Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path, 'ru'))
}

async function openFileDir(root = 'templates', path = '') {
  const targetRoot = root || 'templates'
  const targetPath = normalizeMigrationPath(path)
  await withBusy('Открытие файлов...', async () => {
    try {
      const html = await integramApiClient.getDirAdmin({ folder: targetRoot, addPath: targetPath })
      const parsed = parseDirAdminHtml(html, {
        database: props.database,
        fallbackFolder: targetRoot,
        fallbackPath: targetPath
      })

      const files = parsed.files.map(file => makeMigrationFileItem({
        root: parsed.folder,
        dir: parsed.addPath,
        name: file.name
      }))

      fileBrowser.value = {
        root: parsed.folder,
        path: normalizeMigrationPath(parsed.addPath),
        folders: parsed.folders,
        files
      }
      mergeCatalogFiles(files)
      addLog('info', `Открыта папка ${parsed.folder}/${normalizeMigrationPath(parsed.addPath)}`)
    } catch (error) {
      notify('error', error.message || 'Не удалось открыть папку файлов')
      fileBrowser.value = {
        root: targetRoot,
        path: targetPath,
        folders: [],
        files: []
      }
    }
  })
}

function openParentDir() {
  const currentPath = fileBrowser.value.path
  if (!currentPath) return
  const parts = currentPath.split('/')
  parts.pop()
  openFileDir(fileBrowser.value.root, parts.join('/'))
}

function isTableSelected(id) {
  return selectedTables.value.some(table => table.id === id)
}

function isQuerySelected(id) {
  return selectedQueries.value.some(query => query.id === id)
}

function isFileSelected(key) {
  return selectedFiles.value.some(file => file.key === key)
}

function toggleTable(table, checked) {
  if (checked) {
    if (!isTableSelected(table.id)) selectedTables.value = [...selectedTables.value, cloneMigrationTable(table)]
  } else {
    selectedTables.value = selectedTables.value.filter(item => item.id !== table.id)
  }
}

function toggleQuery(query, checked) {
  if (checked) {
    if (!isQuerySelected(query.id)) selectedQueries.value = [...selectedQueries.value, cloneMigrationQuery(query)]
  } else {
    selectedQueries.value = selectedQueries.value.filter(item => item.id !== query.id)
  }
}

function toggleFile(file, checked) {
  const normalized = cloneMigrationFile(file)
  if (checked) {
    if (!isFileSelected(normalized.key)) selectedFiles.value = [...selectedFiles.value, normalized]
  } else {
    selectedFiles.value = selectedFiles.value.filter(item => item.key !== normalized.key)
  }
}

function updateSelectedTable(id, patch) {
  selectedTables.value = selectedTables.value.map(table => (
    table.id === id ? { ...table, ...patch } : table
  ))
}

function newSettings() {
  currentSettingId.value = ''
  settingsName.value = ''
  selectedTables.value = []
  selectedQueries.value = []
  selectedFiles.value = []
  outputText.value = ''
  dryRunResult.value = null
  statusText.value = 'Новая настройка'
  addLog('info', 'Создана новая настройка')
}

function applySetting(id) {
  if (!id) {
    newSettings()
    return
  }

  const setting = settings.value.find(item => item.id === id)
  if (!setting?.config) {
    notify('error', 'Настройка не содержит корректный JSON')
    return
  }

  const config = setting.config
  settingsName.value = config.name || setting.name
  selectedTables.value = config.tables.map(table => {
    const known = tables.value.find(item => item.id === table.id)
    return cloneMigrationTable({ ...table, name: table.name || known?.name || table.id })
  })
  selectedQueries.value = config.queries.map(query => {
    const known = queries.value.find(item => item.id === query.id)
    return cloneMigrationQuery({ ...query, name: query.name || known?.name || query.id })
  })
  selectedFiles.value = config.files.map(file => {
    const known = catalogFiles.value.find(item => item.key === file.key || (item.root === file.root && item.path === file.path))
    return cloneMigrationFile(known || file)
  })
  outputText.value = ''
  dryRunResult.value = null
  statusText.value = 'Настройка загружена'
  addLog('info', `Загружена настройка ${settingsName.value}`)
}

function currentConfig() {
  return serializeMigrationConfig({
    name: settingsName.value.trim(),
    tables: selectedTables.value,
    queries: selectedQueries.value,
    files: selectedFiles.value
  })
}

function confirmSaveSettings() {
  requestConfirmation({
    header: 'Сохранить настройку?',
    message: 'Текущий состав таблиц, запросов и файлов будет сохранен в объект настроек миграции.',
    acceptLabel: 'Сохранить',
    accept: saveSettings
  })
}

async function saveSettings() {
  const config = currentConfig()
  if (!config.name) {
    notify('error', 'Укажите название настройки')
    return
  }

  await withBusy('Сохранение настройки...', async () => {
    const matched = settings.value.find(item => item.id === currentSettingId.value || item.name === config.name)
    const response = await integramApiClient.saveMigrationSettings(config, matched?.id || currentSettingId.value || null)
    const createdId = response?.obj?.id || response?.obj || response?.id || matched?.id || currentSettingId.value
    currentSettingId.value = createdId ? String(createdId) : ''
    await loadSettingsOnly()
    notify('success', 'Настройка сохранена')
    statusText.value = 'Сохранено'
  })
}

function addTablesFromRefs(refs) {
  let added = 0
  for (const table of refs) {
    if (isTableSelected(table.id)) continue
    const known = tables.value.find(item => item.id === table.id)
    selectedTables.value = [
      ...selectedTables.value,
      cloneMigrationTable({
        id: table.id,
        name: table.name || known?.name || table.id,
        exportData: false,
        filter: ''
      })
    ]
    added += 1
  }
  return added
}

function addQueriesFromRefs(refs) {
  let added = 0
  for (const query of refs) {
    if (isQuerySelected(query.id)) continue
    const known = queries.value.find(item => item.id === query.id)
    selectedQueries.value = [
      ...selectedQueries.value,
      cloneMigrationQuery({
        id: query.id,
        name: query.name || known?.name || query.id
      })
    ]
    added += 1
  }
  return added
}

async function scanSelectedQueries() {
  await withBusy('Анализ запросов...', async () => {
    let addedTables = 0
    for (const query of selectedQueries.value) {
      const columns = await integramApiClient.getMigrationQueryColumns(query.id)
      const refs = Array.isArray(columns)
        ? columns.map(column => {
          const raw = String(column.r?.[0] || '')
          const colon = raw.indexOf(':')
          return colon > 0 ? { id: raw.slice(0, colon).trim(), name: raw.slice(colon + 1).trim() } : null
        }).filter(Boolean)
        : []
      addedTables += addTablesFromRefs(refs)
    }
    notify('success', `Добавлено таблиц из запросов: ${addedTables}`)
    statusText.value = 'Анализ запросов завершен'
  })
}

async function scanSelectedFiles() {
  await withBusy('Проверка связей...', async () => {
    let addedTables = 0
    let addedQueries = 0
    for (const file of selectedFiles.value) {
      const content = await integramApiClient.getMigrationFileContent(file)
      const refs = parseMigrationDependencyRefs(content, {
        tables: tables.value,
        queries: queries.value
      })
      addedTables += addTablesFromRefs(refs.tables)
      addedQueries += addQueriesFromRefs(refs.queries)
    }
    notify('success', `Добавлено: таблиц ${addedTables}, запросов ${addedQueries}`)
    statusText.value = 'Связи проверены'
  })
}

function confirmExportPackage() {
  requestConfirmation({
    header: 'Сформировать экспорт?',
    message: 'Будут загружены метаданные, выбранные данные таблиц, запросы и содержимое файлов.',
    acceptLabel: 'Экспорт',
    accept: exportPackage
  })
}

async function exportPackage() {
  const config = currentConfig()
  if (!config.tables.length && !config.queries.length && !config.files.length) {
    notify('error', 'Выберите таблицы, запросы или файлы')
    return
  }

  await withBusy('Экспорт...', async () => {
    const pack = {
      version: 1,
      kind: 'integram-migration',
      createdAt: new Date().toISOString(),
      source: {
        db: props.database,
        location: window.location.origin
      },
      config,
      tables: [],
      queries: [],
      files: []
    }

    for (const table of config.tables) {
      const entry = {
        id: table.id,
        name: table.name,
        metadata: await integramApiClient.getMigrationTableMetadata(table.id),
        exportData: Boolean(table.exportData),
        filter: table.filter || ''
      }
      if (table.exportData) entry.data = await integramApiClient.getMigrationTableData(table)
      pack.tables.push(entry)
    }

    for (const query of config.queries) {
      pack.queries.push(await integramApiClient.getMigrationQueryPackage(query))
    }

    for (const file of selectedFiles.value) {
      const content = await integramApiClient.getMigrationFileContent(file)
      pack.files.push({
        root: file.root,
        path: file.path,
        name: file.name,
        text: file.text,
        content,
        dependencies: parseMigrationDependencyRefs(content, {
          tables: tables.value,
          queries: queries.value
        })
      })
    }

    outputText.value = JSON.stringify(pack, null, 2)
    downloadJson(pack, `${config.name || 'migration'}.json`)
    notify('success', 'JSON сформирован')
    statusText.value = 'Экспорт готов'
  })
}

function confirmDryRunImport() {
  requestConfirmation({
    header: 'Проверить пакет?',
    message: 'Dry-run проверит структуру JSON и покажет план без изменения backend-данных.',
    acceptLabel: 'Проверить',
    accept: runDryRunImport
  })
}

async function runDryRunImport() {
  await withBusy('Dry-run...', async () => {
    try {
      dryRunResult.value = buildMigrationDryRunResult(importText.value, {
        tables: tables.value,
        queries: queries.value
      })
      const counts = dryRunResult.value.counts
      notify('success', `Dry-run завершен: таблиц ${counts.tables}, запросов ${counts.queries}, файлов ${counts.files}`)
      statusText.value = 'Dry-run завершен'
    } catch (error) {
      dryRunResult.value = null
      notify('error', error.message || 'Некорректный JSON-пакет')
    }
  })
}

function downloadJson(data, filename) {
  const text = JSON.stringify(data, null, 2)
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.replace(/[\\/:*?"<>|]+/g, '_')
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function formatLogTime(value) {
  return new Date(value).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(async () => {
  grants.refresh(props.database)
  if (permissionDenied.value) {
    addLog('error', 'Доступ к рабочему месту миграции запрещен')
    return
  }
  await loadInitialData()
})
</script>

<style scoped>
.integram-migration-page {
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-height: calc(100vh - 4rem);
  padding: 1rem;
}

.migration-header {
  align-items: flex-start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.migration-header h1 {
  font-size: 1.55rem;
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.2;
  margin: 0;
}

.migration-header p {
  color: var(--text-secondary);
  font-size: 0.88rem;
  margin: 0.25rem 0 0;
}

.migration-actions,
.migration-import-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

.migration-progress {
  align-items: center;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: minmax(10rem, 1fr) auto;
}

.migration-progress span,
.migration-status {
  color: var(--text-secondary);
  font-size: 0.83rem;
}

.migration-settings,
.migration-panel {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  box-sizing: border-box;
}

.migration-settings {
  align-items: flex-end;
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
}

.migration-settings label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 12rem;
}

.migration-name-field {
  flex: 1 1 auto;
}

.migration-settings span,
.migration-selected-title {
  color: var(--text-secondary);
  font-size: 0.76rem;
  font-weight: 600;
  text-transform: uppercase;
}

.migration-settings input,
.migration-settings select,
.migration-search input,
.migration-filter-input,
.migration-output-panel textarea,
.migration-import-panel textarea {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  box-sizing: border-box;
  color: var(--text-primary);
  font: inherit;
  min-height: 2.2rem;
  outline: none;
  padding: 0.42rem 0.55rem;
}

.migration-settings input:focus,
.migration-settings select:focus,
.migration-search input:focus,
.migration-filter-input:focus,
.migration-output-panel textarea:focus,
.migration-import-panel textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 20%, transparent);
}

.migration-status {
  min-width: 7rem;
  padding-bottom: 0.55rem;
  text-align: right;
}

.migration-grid {
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(3, minmax(18rem, 1fr));
  min-height: 32rem;
}

.migration-panel {
  display: flex;
  flex-direction: column;
  min-height: 20rem;
  min-width: 0;
  overflow: hidden;
}

.migration-panel-title {
  align-items: center;
  border-bottom: 1px solid var(--surface-border);
  display: flex;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0 0.75rem;
}

.migration-panel-title h2 {
  flex: 1 1 auto;
  font-size: 0.98rem;
  font-weight: 650;
  letter-spacing: 0;
  margin: 0;
}

.migration-panel-title span {
  color: var(--text-secondary);
  font-size: 0.8rem;
  white-space: nowrap;
}

.migration-search,
.migration-file-toolbar {
  align-items: center;
  display: flex;
  gap: 0.45rem;
  padding: 0.65rem 0.75rem;
}

.migration-search input {
  flex: 1 1 auto;
  min-width: 0;
}

.migration-search i,
.migration-panel-title i {
  color: var(--text-secondary);
}

.migration-list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.25rem;
  min-height: 12rem;
  overflow: auto;
  padding: 0 0.5rem 0.65rem;
}

.migration-row {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: var(--text-primary);
  display: flex;
  gap: 0.55rem;
  min-height: 2.35rem;
  padding: 0.38rem 0.5rem;
  text-align: left;
  width: 100%;
}

.migration-row:hover {
  background: var(--surface-hover);
}

.migration-row input[type="checkbox"] {
  flex: 0 0 auto;
  height: 1rem;
  width: 1rem;
}

.migration-row-button {
  cursor: pointer;
  font: inherit;
}

.migration-row-main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}

.migration-row-name,
.migration-row-meta,
.migration-pill span,
.migration-log-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.migration-row-meta {
  color: var(--text-secondary);
  font-size: 0.76rem;
}

.migration-selected-block {
  border-top: 1px solid var(--surface-border);
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 0.45rem;
  max-height: 17rem;
  overflow: auto;
  padding: 0.65rem 0.75rem;
}

.migration-selected-item {
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.5rem;
}

.migration-selected-head,
.migration-pill {
  align-items: center;
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
}

.migration-checkline {
  align-items: center;
  display: flex;
  gap: 0.4rem;
  font-size: 0.85rem;
}

.migration-mini-button {
  align-items: center;
  background: transparent;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  height: 2rem;
  justify-content: center;
  min-width: 2rem;
}

.migration-mini-button:hover,
.migration-chip:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.migration-chip {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  min-height: 2rem;
  padding: 0 0.7rem;
}

.migration-chip.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--primary-color-text);
}

.migration-path {
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.82rem;
  padding: 0 0.75rem 0.35rem;
}

.migration-pill {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 999px;
  min-height: 2rem;
  padding: 0.25rem 0.35rem 0.25rem 0.65rem;
}

.migration-import-panel textarea,
.migration-output-panel textarea {
  border: 0;
  border-radius: 0;
  flex: 1 1 auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  min-height: 12rem;
  resize: vertical;
  width: 100%;
}

.migration-import-actions {
  border-top: 1px solid var(--surface-border);
  justify-content: flex-start;
  padding: 0.75rem;
}

.migration-dry-run-summary {
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.migration-warnings {
  color: var(--orange-700, #b45309);
  margin: 0;
  padding: 0 1rem 0.75rem 2rem;
}

.migration-log-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 15rem;
  overflow: auto;
  padding: 0.75rem;
}

.migration-log-row {
  align-items: center;
  border-left: 3px solid var(--surface-border);
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 4.5rem 4.5rem minmax(0, 1fr);
  min-height: 1.9rem;
  padding-left: 0.5rem;
}

.migration-log-row strong {
  font-size: 0.75rem;
  text-transform: uppercase;
}

.migration-log-row.level-success {
  border-color: var(--green-500, #16a34a);
}

.migration-log-row.level-error {
  border-color: var(--red-500, #dc2626);
}

.migration-log-row.level-info {
  border-color: var(--primary-color);
}

.migration-empty {
  color: var(--text-secondary);
  font-size: 0.86rem;
  padding: 0.55rem;
}

@media (max-width: 1200px) {
  .migration-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .integram-migration-page {
    padding: 0.75rem;
  }

  .migration-header,
  .migration-settings,
  .migration-progress {
    align-items: stretch;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .migration-actions {
    justify-content: flex-start;
  }

  .migration-settings label,
  .migration-status {
    min-width: 0;
    text-align: left;
  }
}
</style>
