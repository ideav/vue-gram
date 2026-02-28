<template>
  <div class="integram-sql">
    <div class="page-header">
      <h2><i class="pi pi-code"></i> SQL Запросы</h2>
    </div>

    <div class="sql-editor-card">
      <div class="editor-area">
        <textarea
          v-model="sqlQuery"
          class="sql-textarea"
          placeholder="SELECT * FROM ..."
          rows="6"
          @keydown.ctrl.enter="executeQuery"
        ></textarea>
      </div>
      <div class="editor-toolbar">
        <button class="btn-primary" @click="executeQuery" :disabled="executing || !sqlQuery.trim()">
          <i v-if="executing" class="pi pi-spin pi-spinner"></i>
          <i v-else class="pi pi-play"></i>
          Выполнить
        </button>
        <button class="btn-secondary" @click="sqlQuery = ''" :disabled="!sqlQuery">
          <i class="pi pi-times"></i> Очистить
        </button>
        <span class="hint">Ctrl+Enter для выполнения</span>
      </div>
    </div>

    <div v-if="error" class="error-box">
      <p>{{ error }}</p>
    </div>

    <div v-if="resultData" class="results-card">
      <div class="results-header">
        <h3>Результат</h3>
        <span class="row-count" v-if="resultRows.length">{{ resultRows.length }} строк</span>
      </div>

      <div v-if="resultColumns.length > 0" class="results-table-wrapper">
        <table class="results-table">
          <thead>
            <tr>
              <th v-for="col in resultColumns" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in resultRows" :key="i">
              <td v-for="col in resultColumns" :key="col">{{ row[col] ?? '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="resultMessage" class="result-message">
        <i class="pi pi-check-circle"></i>
        <span>{{ resultMessage }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import integramApiClient from '@/services/integramApiClient'

const sqlQuery = ref('')
const executing = ref(false)
const error = ref(null)
const resultData = ref(null)
const resultColumns = ref([])
const resultRows = ref([])
const resultMessage = ref('')

async function executeQuery() {
  if (!sqlQuery.value.trim()) return
  executing.value = true
  error.value = null
  resultData.value = null
  resultColumns.value = []
  resultRows.value = []
  resultMessage.value = ''

  try {
    const response = await integramApiClient.post('sql', { q: sqlQuery.value })
    resultData.value = response

    if (response?.columns && Array.isArray(response.columns)) {
      resultColumns.value = response.columns
      resultRows.value = response.rows || response.data || []
    } else if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
      resultColumns.value = Object.keys(response.data[0])
      resultRows.value = response.data
    } else if (Array.isArray(response) && response.length > 0) {
      resultColumns.value = Object.keys(response[0])
      resultRows.value = response
    } else if (response?.msg) {
      resultMessage.value = response.msg
    } else if (response?.message) {
      resultMessage.value = response.message
    } else {
      resultMessage.value = 'Запрос выполнен'
    }
  } catch (err) {
    error.value = err.message
  } finally {
    executing.value = false
  }
}
</script>

<style scoped>
.integram-sql { max-width: 1400px; margin: 0 auto; }
.page-header { margin-bottom: 1rem; }
.page-header h2 { display: flex; align-items: center; gap: 0.5rem; color: #1e293b; margin: 0; }

.sql-editor-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.sql-textarea {
  width: 100%;
  padding: 1rem;
  border: none;
  font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.9rem;
  resize: vertical;
  outline: none;
  background: #fafbfc;
  color: #1e293b;
  line-height: 1.5;
  box-sizing: border-box;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid #f1f5f9;
  background: white;
}

.hint { margin-left: auto; font-size: 0.75rem; color: #94a3b8; }

.error-box {
  padding: 1rem;
  background: #fef0f0;
  border-radius: 8px;
  color: #dc2626;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.results-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.results-header h3 { margin: 0; font-size: 0.95rem; color: #334155; }
.row-count { font-size: 0.8rem; color: #94a3b8; }

.results-table-wrapper { overflow-x: auto; }

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.results-table th {
  padding: 0.625rem 0.75rem;
  background: #f8fafc;
  text-align: left;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  font-size: 0.75rem;
  border-bottom: 2px solid #e2e8f0;
  white-space: nowrap;
}

.results-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.results-table tr:hover td { background: #f8fafc; }

.result-message {
  padding: 1.5rem;
  text-align: center;
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.95rem;
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
}
.btn-primary:hover { background: #1565c0; }
.btn-primary:disabled { background: #90caf9; cursor: not-allowed; }

.btn-secondary {
  padding: 0.5rem 1rem;
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.btn-secondary:hover { background: #f8fafc; }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
