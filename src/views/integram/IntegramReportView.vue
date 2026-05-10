<template>
  <div class="integram-report-page">
    <!-- Toast for notifications -->
    <Toast />

    <!-- Context Menu for Report List -->
    <ContextMenu ref="reportListMenuRef" :model="reportListMenuItems" />

    <!-- Context Menu for Report Data Rows -->
    <ContextMenu ref="reportDataMenuRef" :model="reportDataMenuItems" />

    <!-- Breadcrumb Navigation -->
    <div class="mb-3">
      <IntegramBreadcrumb :items="breadcrumbItems" />
    </div>

    <!-- Report List View -->
    <Card v-if="!selectedReportId">
      <template #title>
        <div class="flex align-items-center justify-content-between">
          <span>Отчеты</span>
          <div class="flex gap-2 align-items-center ml-auto">
            <Button
              :icon="infiniteScrollEnabled ? 'fi fi-rr-arrows-alt-v' : 'fi fi-rr-list'"
              size="small"
              :outlined="!infiniteScrollEnabled"
              rounded
              @click="toggleInfiniteScroll"
              v-tooltip.bottom="infiniteScrollEnabled ? 'Infinite Scroll (вкл)' : 'Обычная пагинация'"
              :class="{ 'button-on': infiniteScrollEnabled }"
            />
            <Button
              icon="fi fi-rr-refresh"
              @click="loadReportList(1, pageSize, false)"
              :loading="loading"
              outlined
              rounded
              size="small"
              v-tooltip.bottom="'Обновить'"
            />
          </div>
        </div>
      </template>
      <template #content>
      <!-- Loading State -->
      <div v-if="loading && reports.length === 0" class="text-center p-5">
        <ProgressSpinner />
        <p class="mt-3">Загрузка списка отчетов...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && reports.length === 0" class="text-center p-5">
        <i class="fi fi-rr-file text-6xl text-400 mb-3"></i>
        <p class="text-xl text-500">Отчеты не найдены</p>
      </div>

      <!-- Reports DataTable with Server-Side Pagination -->
      <DataTable
        v-else
        :value="reports"
        :paginator="!infiniteScrollEnabled"
        :rows="pageSize"
        :totalRecords="totalRecords"
        :lazy="!infiniteScrollEnabled"
        :loading="loading"
        stripedRows
        showGridlines
        responsiveLayout="scroll"
        @row-click="onReportSelect"
        @row-contextmenu="onReportListContextMenu"
        @page="onPageChange"
        :rowsPerPageOptions="[10, 20, 50, 100]"
        class="cursor-pointer"
        contextMenu
      >
        <Column field="id" header="ID" sortable style="width: 100px"></Column>
        <Column field="name" header="Название" sortable></Column>
        <Column
          field="created_at"
          header="Создан"
          sortable
          style="width: 200px"
        >
          <template #body="{ data }">
            {{ formatDate(data.created_at) }}
          </template>
        </Column>
        <Column
          field="updated_at"
          header="Обновлен"
          sortable
          style="width: 200px"
        >
          <template #body="{ data }">
            {{ formatDate(data.updated_at) }}
          </template>
        </Column>
        <Column header="Действия" style="width: 150px">
          <template #body="{ data }">
            <Button
              label="Открыть"
              icon="fi fi-rr-eye"
              size="small"
              @click.stop="selectReport(data.id)"
              outlined
            />
          </template>
        </Column>

        <!-- Pagination Footer -->
        <template #footer>
          <div class="flex justify-content-between align-items-center">
            <div class="font-bold">
              Всего отчетов: {{ infiniteScrollEnabled ? reports.length : totalRecords }}
            </div>
            <div v-if="!infiniteScrollEnabled" class="text-sm text-500">
              Страница {{ currentPage }} из {{ totalPages }}
            </div>
            <div v-else class="text-sm text-500">
              <span v-if="hasMoreData">Прокрутите для загрузки...</span>
              <span v-else><i class="fi fi-rr-check-circle mr-1"></i>Все данные загружены</span>
            </div>
          </div>
        </template>
      </DataTable>

      <!-- Infinite Scroll: Loading More indicator -->
      <div v-if="infiniteScrollEnabled && loadingMore" class="mt-3 text-center py-3">
        <ProgressSpinner style="width: 30px; height: 30px" />
        <span class="ml-2 text-color-secondary">Загрузка...</span>
      </div>
      </template>
    </Card>

    <!-- Report Detail View -->
    <Card v-else>
      <template #title>
        <div class="flex align-items-center justify-content-between">
          <div class="flex align-items-center gap-2">
            <Button
              icon="fi fi-rr-arrow-left"
              @click="closeReport"
              outlined
              rounded
              size="small"
              v-tooltip.bottom="'Назад'"
            />
            <span>{{ reportData?.report_name || (selectedReportId ? `Отчет #${selectedReportId}` : 'Отчет') }}</span>
          </div>
        </div>
      </template>
      <template #content>

      <!-- Loading State -->
      <div v-if="executingReport && !reportData" class="text-center p-5">
        <ProgressSpinner />
        <p class="mt-3">Выполнение отчета...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="reportError" class="p-5">
        <Message severity="error" :closable="false">
          {{ reportError }}
        </Message>
      </div>

      <!-- Report Data Table -->
      <IntegramReportViewer
        v-else-if="reportData"
        :reportId="selectedReportId"
        :reportData="reportData.rows"
        :columns="reportData.columns"
        :totals="reportData.totals"
        :loading="executingReport"
        :title="reportData.report_name"
        :initialFilters="reportFilters"
        filterMode="server"
        @refresh="executeReport"
        @apply-filters="applyReportFilters"
        @clear-filters="clearReportFilters"
        @go-home="closeReport"
        @export="onReportExport"
      />

      <!-- Empty Result -->
      <div v-else class="text-center p-5">
        <i class="fi fi-rr-inbox text-6xl text-400 mb-3"></i>
        <p class="text-xl text-500">Нет данных для отображения</p>
      </div>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'

import integramService from '@/services/integramService'
import { logger } from '@/utils/logger'
import {
  deserializeReportFilters,
  normalizeReportParams,
  normalizeReportResponse,
  serializeReportFilters,
  withoutReportFilterParams
} from '@/utils/reportData'
import IntegramBreadcrumb from '@/components/integram/IntegramBreadcrumb.vue'
import IntegramReportViewer from '@/components/integram/IntegramReportViewer.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

// State
const loading = ref(false)
const executingReport = ref(false)
const reports = ref([])
const selectedReportId = ref(null)
const reportData = ref(null)
const reportError = ref(null)
const reportParams = ref({})
const reportFilters = ref({})

// Context menu refs and state
const reportListMenuRef = ref(null)
const reportDataMenuRef = ref(null)
const selectedContextReport = ref(null)
const selectedContextRow = ref(null)

// Pagination state (matching object pagination pattern)
const currentPage = ref(1) // 1-indexed page number for API
const pageSize = ref(20)
const totalRecords = ref(0)
const totalPages = ref(1)

// Infinite scroll state
const infiniteScrollEnabled = ref(false)
const loadingMore = ref(false)
const hasMoreData = ref(true)

// Computed - database from route params
const database = computed(() => route.params.database || 'my')

// Breadcrumb navigation
const breadcrumbItems = computed(() => {
  const items = [
    {
      label: 'Отчёты',
      to: selectedReportId.value ? `/${database.value}/report` : undefined
    }
  ]

  // Add current report name if viewing a report
  if (selectedReportId.value && reportData.value?.report_name) {
    items.push({
      label: reportData.value.report_name
    })
  }

  return items
})

// Context menu items for report list
const reportListMenuItems = computed(() => [
  {
    label: 'Открыть',
    icon: 'fi fi-rr-eye',
    command: () => {
      if (selectedContextReport.value) {
        selectReport(selectedContextReport.value.id)
      }
    }
  },
  {
    label: 'Редактировать',
    icon: 'fi fi-rr-pencil',
    command: () => {
      if (selectedContextReport.value) {
        router.push(`/${database.value}/object/${selectedContextReport.value.id}?edit=1`)
      }
    }
  },
  {
    separator: true
  },
  {
    label: 'Копировать ID',
    icon: 'fi fi-rr-copy',
    command: () => {
      if (selectedContextReport.value) {
        navigator.clipboard.writeText(String(selectedContextReport.value.id))
        toast.add({
          severity: 'success',
          summary: 'Скопировано',
          detail: `ID ${selectedContextReport.value.id} скопирован`,
          life: 2000
        })
      }
    }
  },
  {
    label: 'Копировать название',
    icon: 'fi fi-rr-copy',
    command: () => {
      if (selectedContextReport.value) {
        navigator.clipboard.writeText(selectedContextReport.value.name || '')
        toast.add({
          severity: 'success',
          summary: 'Скопировано',
          detail: 'Название скопировано',
          life: 2000
        })
      }
    }
  },
  {
    separator: true
  },
  {
    label: 'Удалить',
    icon: 'fi fi-rr-trash',
    class: 'text-red-500',
    command: () => {
      if (selectedContextReport.value) {
        confirmDeleteReport(selectedContextReport.value)
      }
    }
  }
])

// Context menu items for report data rows
const reportDataMenuItems = computed(() => [
  {
    label: 'Копировать строку',
    icon: 'fi fi-rr-copy',
    command: () => {
      if (selectedContextRow.value) {
        const rowText = Object.values(selectedContextRow.value).join('\t')
        navigator.clipboard.writeText(rowText)
        toast.add({
          severity: 'success',
          summary: 'Скопировано',
          detail: 'Строка скопирована в буфер',
          life: 2000
        })
      }
    }
  },
  {
    label: 'Копировать как JSON',
    icon: 'fi fi-rr-file',
    command: () => {
      if (selectedContextRow.value) {
        navigator.clipboard.writeText(JSON.stringify(selectedContextRow.value, null, 2))
        toast.add({
          severity: 'success',
          summary: 'Скопировано',
          detail: 'JSON скопирован в буфер',
          life: 2000
        })
      }
    }
  },
  {
    separator: true
  },
  {
    label: 'Экспорт в Excel',
    icon: 'fi fi-rr-download',
    command: () => {
      exportToExcel()
    }
  }
])

// Context menu handlers
function onReportListContextMenu(event) {
  selectedContextReport.value = event.data
  reportListMenuRef.value.show(event.originalEvent)
}

function onReportDataContextMenu(event) {
  selectedContextRow.value = event.data
  reportDataMenuRef.value.show(event.originalEvent)
}

// Delete confirmation
function confirmDeleteReport(report) {
  if (confirm(`Удалить отчет "${report.name}" (ID: ${report.id})?`)) {
    deleteReport(report.id)
  }
}

async function deleteReport(reportId) {
  try {
    await integramService.deleteObject(reportId)
    toast.add({
      severity: 'success',
      summary: 'Удалено',
      detail: `Отчет #${reportId} удален`,
      life: 3000
    })
    // Reload the list
    loadReportList(currentPage.value, pageSize.value, false)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось удалить отчет: ' + error.message,
      life: 5000
    })
  }
}

// Lifecycle
onMounted(async () => {
  // Check if reportId is in route params
  if (route.params.reportId && route.params.reportId !== 'undefined') {
    selectedReportId.value = route.params.reportId
    reportParams.value = normalizeReportParams(route.query)
    await executeReport(reportParams.value)
  } else {
    // If no reportId or reportId is 'undefined', show the list
    await loadReportList()
  }
})

onUnmounted(() => {
  // Clean up scroll listener
  window.removeEventListener('scroll', handleWindowScroll)
})

// Methods
async function loadReportList(page = 1, size = pageSize.value, append = false) {
  if (!append) {
    loading.value = true
  }
  reportError.value = null

  try {
    // Reports are type 22 objects in Integram
    // Use same pagination pattern as object view: pg (page number) and LIMIT (uppercase)
    const response = await integramService.getObjects(22, {
      pg: page,
      LIMIT: size,
    })

    if (response && response.object) {
      // Transform objects to report list format
      const newReports = response.object.map(obj => ({
        id: obj.id,
        name: obj.val || `Отчет #${obj.id}`,
        created_at: obj.created_at || null,
        updated_at: obj.updated_at || null,
      }))

      // Append or replace
      if (append && infiniteScrollEnabled.value) {
        if (newReports.length === 0) {
          hasMoreData.value = false
        } else {
          reports.value = [...reports.value, ...newReports]
          if (newReports.length < size) {
            hasMoreData.value = false
          }
        }
      } else {
        reports.value = newReports
        hasMoreData.value = newReports.length >= size
      }

      // Update current page from response if available
      if (response.current_page !== undefined) {
        currentPage.value = response.current_page
      } else {
        currentPage.value = page
      }

      // Update total records count
      if (response.total_objects !== undefined) {
        totalRecords.value = response.total_objects
      } else if (response.count !== undefined) {
        totalRecords.value = response.count
      } else if (response.total !== undefined) {
        totalRecords.value = response.total
      } else {
        // Fallback: estimate based on current data
        if (reports.value.length < size) {
          // Got less than requested, we're on the last page
          totalRecords.value = (page - 1) * size + reports.value.length
        } else {
          // Otherwise, there might be more
          totalRecords.value = reports.value.length * 2 // Conservative estimate
        }
      }

      // Calculate total pages
      if (response.total_pages !== undefined) {
        totalPages.value = response.total_pages
      } else if (size > 0 && totalRecords.value > 0) {
        totalPages.value = Math.ceil(totalRecords.value / size)
      } else if (reports.value.length >= size) {
        // If we got a full page, assume there's at least one more page
        totalPages.value = page + 1
      } else {
        totalPages.value = page
      }

      logger.info(
        `Loaded ${reports.value.length} reports from type 22 objects (page ${page}, LIMIT ${size}, total ${totalRecords.value})`,
      )
    } else {
      logger.warn('No reports found in type 22 objects')
      reports.value = []
      totalRecords.value = 0
      totalPages.value = 1
    }
  } catch (error) {
    logger.error('Failed to load reports:', error)
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось загрузить список отчетов: ' + error.message,
      life: 5000,
    })
    reports.value = []
    totalRecords.value = 0
    totalPages.value = 1
  } finally {
    loading.value = false
  }
}

/**
 * Handle page change event from DataTable
 * DataTable uses 0-indexed pages, but API uses 1-indexed pages
 */
function onPageChange(event) {
  const apiPage = event.page + 1 // Convert 0-indexed to 1-indexed
  pageSize.value = event.rows
  loadReportList(apiPage, event.rows, false)
}

/**
 * Toggle infinite scroll mode
 */
function toggleInfiniteScroll() {
  infiniteScrollEnabled.value = !infiniteScrollEnabled.value

  if (infiniteScrollEnabled.value) {
    // Reset and load fresh
    currentPage.value = 1
    hasMoreData.value = true
    loadReportList(1, pageSize.value, false)
    // Add window scroll listener
    window.addEventListener('scroll', handleWindowScroll)
  } else {
    // Remove listener and reload with pagination
    window.removeEventListener('scroll', handleWindowScroll)
    loadReportList(currentPage.value, pageSize.value, false)
  }
}

/**
 * Handle window scroll for infinite scroll
 */
function handleWindowScroll() {
  if (!infiniteScrollEnabled.value || loadingMore.value || !hasMoreData.value || selectedReportId.value) {
    return
  }

  const threshold = 200
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight

  if (documentHeight - scrollTop - windowHeight < threshold) {
    loadMoreReports()
  }
}

/**
 * Load more reports for infinite scroll
 */
async function loadMoreReports() {
  if (loadingMore.value || !hasMoreData.value) return

  loadingMore.value = true
  const nextPage = currentPage.value + 1

  try {
    await loadReportList(nextPage, pageSize.value, true)
    currentPage.value = nextPage
  } catch (err) {
    console.error('Failed to load more reports:', err)
  } finally {
    loadingMore.value = false
  }
}

async function executeReport(params = reportParams.value) {
  if (!selectedReportId.value) {
    toast.add({
      severity: 'warn',
      summary: 'Предупреждение',
      detail: 'ID отчета не указан',
      life: 3000,
    })
    return
  }

  executingReport.value = true
  reportError.value = null
  reportParams.value = normalizeReportParams(params)

  const startTime = performance.now()

  try {
    const response = await integramService.executeReport(selectedReportId.value, reportParams.value)

    const endTime = performance.now()
    const executionTimeMs = endTime - startTime

    if (response) {
      logger.info('Report response:', response)

      reportData.value = normalizeReportResponse(response, {
        reportId: selectedReportId.value,
        executionTimeMs
      })
      reportFilters.value = deserializeReportFilters(reportParams.value, reportData.value.columns)

      logger.info(
        `Report ${selectedReportId.value} executed successfully`,
        reportData.value,
      )

      toast.add({
        severity: 'success',
        summary: 'Успех',
        detail: `Отчет выполнен. Получено строк: ${reportData.value.rows.length}`,
        life: 3000,
      })
    } else {
      throw new Error('Пустой ответ от сервера')
    }
  } catch (error) {
    logger.error(`Failed to execute report ${selectedReportId.value}:`, error)
    reportError.value = error.message || 'Не удалось выполнить отчет'

    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: reportError.value,
      life: 5000,
    })
  } finally {
    executingReport.value = false
  }
}

function onReportSelect(event) {
  selectReport(event.data.id)
}

async function selectReport(reportId) {
  selectedReportId.value = reportId
  reportData.value = null
  reportError.value = null
  reportParams.value = {}
  reportFilters.value = {}

  // Update URL
  await router.push({
    name: 'IntegramReport',
    params: {
      database: database.value,
      reportId
    },
    query: {}
  })

  // Execute the report
  await executeReport(reportParams.value)
}

async function closeReport() {
  selectedReportId.value = null
  reportData.value = null
  reportError.value = null
  reportParams.value = {}
  reportFilters.value = {}

  // Update URL
  await router.push({
    name: 'IntegramReport',
    params: {
      database: database.value
    },
    query: {}
  })
}

function syncReportQuery(params) {
  if (!selectedReportId.value) return Promise.resolve()

  return router.replace({
    name: 'IntegramReport',
    params: {
      database: database.value,
      reportId: selectedReportId.value
    },
    query: normalizeReportParams(params)
  })
}

async function applyReportFilters(filters) {
  const serializedFilters = serializeReportFilters(filters, reportData.value?.columns || [])
  reportParams.value = {
    ...withoutReportFilterParams(reportParams.value),
    ...serializedFilters
  }

  await syncReportQuery(reportParams.value)
  await executeReport(reportParams.value)
}

async function clearReportFilters() {
  reportParams.value = withoutReportFilterParams(reportParams.value)
  reportFilters.value = {}

  await syncReportQuery(reportParams.value)
  await executeReport(reportParams.value)
}

function onReportExport(event) {
  logger.info('Report exported', event)
}

function exportToExcel() {
  if (
    !reportData.value ||
    !reportData.value.rows ||
    reportData.value.rows.length === 0
  ) {
    toast.add({
      severity: 'warn',
      summary: 'Предупреждение',
      detail: 'Нет данных для экспорта',
      life: 3000,
    })
    return
  }

  // Load XLSX library if not loaded
  const XLSX = window.XLSX
  if (!XLSX) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Библиотека XLSX не загружена',
      life: 3000,
    })
    return
  }

  try {
    // Prepare data for export
    const exportData = reportData.value.rows

    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')

    // Export
    const filename = `report_${selectedReportId.value}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, filename)

    toast.add({
      severity: 'success',
      summary: 'Экспорт',
      detail: 'Отчет экспортирован в Excel',
      life: 3000,
    })
  } catch (error) {
    logger.error('Failed to export to Excel:', error)
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось экспортировать отчет: ' + error.message,
      life: 5000,
    })
  }
}

function formatDate(dateString) {
  if (!dateString) return '-'

  try {
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}
</script>

<style scoped>
.integram-report-page {
  width: 100%;
  height: 100%;
  padding: 1rem;
}

.button-on {
  background-color: var(--surface-200) !important;
}

.report-list-container,
.report-detail-container {
  width: 100%;
}

.cursor-pointer {
  cursor: pointer;
}

:deep(.p-datatable-tbody > tr) {
  transition: background-color 0.2s;
}

:deep(.p-datatable-tbody > tr:hover) {
  background-color: var(--surface-hover) !important;
}
</style>
