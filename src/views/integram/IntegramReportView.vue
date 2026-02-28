<template>
  <div class="integram-report">
    <div class="page-header">
      <h2><i class="pi pi-chart-bar"></i> Запросы (Reports)</h2>
    </div>

    <div class="report-input-card">
      <div class="field">
        <label>ID запроса</label>
        <div class="input-row">
          <input
            v-model="reportId"
            class="form-input"
            placeholder="Введите ID запроса..."
            type="number"
            @keyup.enter="loadReport"
          />
          <button class="btn-primary" @click="loadReport" :disabled="loading || !reportId">
            <i v-if="loading" class="pi pi-spin pi-spinner"></i>
            <i v-else class="pi pi-search"></i>
            Загрузить
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-box">
      <p>{{ error }}</p>
    </div>

    <div v-if="reportData" class="report-result-card">
      <div class="report-header">
        <h3>{{ reportName || `Запрос #${reportId}` }}</h3>
        <span class="row-count" v-if="reportRows.length">{{ reportRows.length }} строк</span>
      </div>

      <div v-if="reportColumns.length > 0" class="report-table-wrapper">
        <table class="report-table">
          <thead>
            <tr>
              <th v-for="col in reportColumns" :key="col.id || col">{{ col.alias || col.name || col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in reportRows" :key="i">
              <td v-for="col in reportColumns" :key="col.id || col">{{ getCellValue(row, col) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-result">
        <i class="pi pi-info-circle"></i>
        <p>Нет данных</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import integramApiClient from '@/services/integramApiClient'

const route = useRoute()

const reportId = ref(route.params.reportId || '')
const loading = ref(false)
const error = ref(null)
const reportData = ref(null)
const reportName = ref('')
const reportColumns = ref([])
const reportRows = ref([])

function getCellValue(row, col) {
  const key = col.id || col.alias || col.name || col
  if (row[key] !== undefined) return row[key]
  if (typeof row === 'object') {
    const vals = Object.values(row)
    const idx = reportColumns.indexOf(col)
    return vals[idx] ?? ''
  }
  return ''
}

async function loadReport() {
  if (!reportId.value) return
  loading.value = true
  error.value = null
  reportData.value = null
  reportColumns.value = []
  reportRows.value = []
  reportName.value = ''

  try {
    const response = await integramApiClient.executeReport(reportId.value)
    reportData.value = response

    if (response?.name) reportName.value = response.name
    if (response?.val) reportName.value = response.val

    if (response?.columns && Array.isArray(response.columns)) {
      reportColumns.value = response.columns
    } else if (response?.reqs && Array.isArray(response.reqs)) {
      reportColumns.value = response.reqs
    }

    if (response?.data && Array.isArray(response.data)) {
      reportRows.value = response.data
    } else if (response?.rows && Array.isArray(response.rows)) {
      reportRows.value = response.rows
    } else if (response?.object && Array.isArray(response.object)) {
      reportRows.value = response.object
      if (reportColumns.value.length === 0 && reportRows.value.length > 0) {
        reportColumns.value = Object.keys(reportRows.value[0])
      }
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

if (reportId.value) loadReport()
</script>

<style scoped>
.integram-report { max-width: 1400px; margin: 0 auto; }
.page-header { margin-bottom: 1rem; }
.page-header h2 { display: flex; align-items: center; gap: 0.5rem; color: #1e293b; margin: 0; }

.report-input-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}

.field label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: #555; }

.input-row { display: flex; gap: 0.5rem; }

.form-input {
  flex: 1;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
}
.form-input:focus { outline: none; border-color: #1976d2; }

.error-box {
  padding: 1rem;
  background: #fef0f0;
  border-radius: 8px;
  color: #dc2626;
  margin-bottom: 1rem;
}

.report-result-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.report-header h3 { margin: 0; font-size: 0.95rem; color: #334155; }
.row-count { font-size: 0.8rem; color: #94a3b8; }

.report-table-wrapper { overflow-x: auto; }

.report-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }

.report-table th {
  padding: 0.625rem 0.75rem;
  background: #f8fafc;
  text-align: left;
  font-weight: 600;
  color: #64748b;
  border-bottom: 2px solid #e2e8f0;
  white-space: nowrap;
}

.report-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-table tr:hover td { background: #f8fafc; }

.empty-result {
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
}

.btn-primary {
  padding: 0.5rem 1rem;
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
