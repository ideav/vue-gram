<template>
  <div class="integram-report-embed">
    <!-- Loading State -->
    <div v-if="loading && !reportData" class="text-center p-5">
      <ProgressSpinner />
      <p class="mt-3">Загрузка отчета...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-3">
      <Message severity="error" :closable="false">
        {{ error }}
      </Message>
    </div>

    <!-- Report Viewer -->
    <IntegramReportViewer
      v-else-if="reportData"
      :reportId="reportId || reportName"
      :reportData="reportData.rows"
      :columns="reportColumns"
      :totals="reportTotals"
      :loading="loading"
      :showTotals="showTotals"
      :title="reportTitle"
      :initialFilters="activeFilters"
      filterMode="server"
      @refresh="loadReport"
      @apply-filters="onApplyFilters"
      @clear-filters="onClearFilters"
      @go-home="$emit('go-home')"
      @export="$emit('export', $event)"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
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
import IntegramReportViewer from './IntegramReportViewer.vue'

const props = defineProps({
  // Report identifier - can be either reportId (number) or reportName (string)
  reportId: {
    type: [String, Number],
    default: null
  },
  reportName: {
    type: String,
    default: null
  },
  // Report display title (optional, will use report name from data if not provided)
  title: {
    type: String,
    default: null
  },
  // Show totals row
  showTotals: {
    type: Boolean,
    default: true
  },
  // Auto-refresh interval in milliseconds (0 = no auto-refresh)
  autoRefresh: {
    type: Number,
    default: 0
  },
  // Database name (for multi-database support)
  database: {
    type: String,
    default: null
  },
  // Query/body parameters accepted by the legacy report endpoint.
  params: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['loaded', 'error', 'refresh', 'go-home', 'export', 'apply-filters', 'clear-filters'])

const toast = useToast()

// State
const loading = ref(false)
const error = ref(null)
const reportData = ref(null)
const autoRefreshTimer = ref(null)
const activeParams = ref(normalizeReportParams(props.params))
const activeFilters = ref({})

// Computed
const reportTitle = computed(() => {
  if (props.title) {
    return props.title
  }
  if (reportData.value?.report_name) {
    return reportData.value.report_name
  }
  return props.reportName || `Отчет #${props.reportId}`
})

const reportColumns = computed(() => {
  return reportData.value?.columns || []
})

const reportTotals = computed(() => {
  // If report data includes totals, return them
  // Otherwise return null (no totals)
  if (reportData.value?.totals) {
    return reportData.value.totals
  }
  return null
})

// Methods
async function loadReport(params = activeParams.value) {
  if (!props.reportId && !props.reportName) {
    error.value = 'Не указан ID или имя отчета'
    emit('error', error.value)
    return
  }

  loading.value = true
  error.value = null
  activeParams.value = normalizeReportParams(params)

  // Issue #5112: Ensure integramService is authenticated before calling executeReport
  if (!integramService.isAuthenticated()) {
    logger.info('IntegramReportEmbed: restoring integramService session')

    // Issue #5112: Use integramService.loadSession() which properly handles v2 format
    // This method already knows how to parse both old and new session formats
    integramService.loadSession()

    if (integramService.isAuthenticated()) {
      logger.info('IntegramReportEmbed: restored integramService session from localStorage')
    } else {
      logger.warn('IntegramReportEmbed: no valid session in localStorage')
      error.value = 'Требуется авторизация. Пожалуйста, войдите в систему.'
      loading.value = false
      emit('error', error.value)
      return
    }
  } else {
    logger.info('IntegramReportEmbed: integramService already authenticated')
  }

  const startTime = performance.now()

  try {
    // Determine which identifier to use
    const identifier = props.reportId || props.reportName

    // Execute report via Integram API using legacy-compatible JSON response.
    const response = await integramService.executeReport(identifier, activeParams.value)

    const endTime = performance.now()
    const executionTimeMs = endTime - startTime

    if (response) {
      logger.info('Report response:', response)
      reportData.value = normalizeReportResponse(response, {
        reportId: identifier,
        reportName: props.reportName,
        title: props.title,
        executionTimeMs
      })
      activeFilters.value = deserializeReportFilters(activeParams.value, reportData.value.columns)

      logger.info(`Report loaded successfully`, reportData.value)

      emit('loaded', reportData.value)
    } else {
      throw new Error('Пустой ответ от сервера')
    }
  } catch (err) {
    logger.error('Failed to load report:', err)
    error.value = err.message || 'Не удалось загрузить отчет'
    emit('error', error.value)

    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: error.value,
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

async function onApplyFilters(filters) {
  logger.info('Apply filters:', filters)
  emit('apply-filters', filters)

  const filterParams = serializeReportFilters(filters, reportData.value?.columns || [])
  activeParams.value = {
    ...withoutReportFilterParams(activeParams.value),
    ...filterParams
  }

  await loadReport(activeParams.value)
}

async function onClearFilters() {
  activeParams.value = withoutReportFilterParams(activeParams.value)
  activeFilters.value = {}
  emit('clear-filters')
  await loadReport(activeParams.value)
}

function setupAutoRefresh() {
  // Clear existing timer
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }

  // Setup new timer if autoRefresh > 0
  if (props.autoRefresh > 0) {
    autoRefreshTimer.value = setInterval(() => {
      logger.info(`Auto-refreshing report (interval: ${props.autoRefresh}ms)`)
      loadReport()
    }, props.autoRefresh)
  }
}

// Lifecycle
onMounted(() => {
  activeParams.value = normalizeReportParams(props.params)
  loadReport(activeParams.value)
  setupAutoRefresh()
})

// Watch for prop changes
watch(() => [props.reportId, props.reportName], () => {
  activeParams.value = normalizeReportParams(props.params)
  loadReport(activeParams.value)
})

watch(() => props.params, () => {
  activeParams.value = normalizeReportParams(props.params)
  loadReport(activeParams.value)
}, {
  deep: true
})

watch(() => props.autoRefresh, () => {
  setupAutoRefresh()
})

onBeforeUnmount(() => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
  }
})
</script>

<style scoped>
.integram-report-embed {
  width: 100%;
  min-height: 200px;
}
</style>
