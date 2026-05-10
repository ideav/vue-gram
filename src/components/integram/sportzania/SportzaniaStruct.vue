<template>
  <section class="sportzania-struct" data-testid="sportzania-struct">
    <header class="workspace-head">
      <div>
        <h1>Структура компании</h1>
        <p v-if="status">{{ status }}</p>
      </div>
      <button type="button" class="icon-button" aria-label="Обновить" title="Обновить" @click="loadChart">
        <i class="fi fi-rr-refresh" :class="{ spinning: loading }"></i>
      </button>
    </header>

    <div v-if="loading" class="state-block">
      <ProgressSpinner />
      <span>Загрузка...</span>
    </div>

    <Message v-else-if="error" severity="error" :closable="false">
      {{ error }}
    </Message>

    <div v-else-if="!chart.rootId" class="state-block">
      Нет данных для отображения.
    </div>

    <div v-else class="struct-chart">
      <SportzaniaOrgNode :chart="chart" :node-id="chart.rootId" />
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import integramService from '@/services/integramService'
import {
  STRUCT_REPORT_ID,
  buildSportzaniaOrgChart,
  formatClock,
  normalizeSportzaniaReportResponse
} from '@/utils/sportzaniaWorkspaces'
import SportzaniaOrgNode from './SportzaniaOrgNode.vue'

const props = defineProps({
  database: {
    type: String,
    required: true
  }
})

const rows = ref([])
const loading = ref(false)
const error = ref('')
const status = ref('')

const chart = computed(() => buildSportzaniaOrgChart(rows.value))

async function loadChart() {
  loading.value = true
  error.value = ''

  try {
    const payload = await integramService.executeReport(STRUCT_REPORT_ID, { _jsonFormat: 'JSON_KV' })
    const normalized = normalizeSportzaniaReportResponse(payload)
    rows.value = normalized.rows
    status.value = `Обновлено: ${formatClock(new Date())}`
  } catch (err) {
    rows.value = []
    error.value = err?.message || 'Ошибка загрузки данных'
    status.value = ''
  } finally {
    loading.value = false
  }
}

onMounted(loadChart)
watch(() => props.database, loadChart)
</script>

<style scoped>
.sportzania-struct {
  min-height: 100%;
  padding: 16px;
  background: var(--bg-primary, #f8fafc);
  color: var(--text-primary, #111827);
  overflow: auto;
}

.workspace-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 16px;
}

h1 {
  margin: 0;
  font-size: 1.45rem;
  line-height: 1.2;
  letter-spacing: 0;
}

p {
  margin: 0.35rem 0 0;
  color: var(--text-secondary, #64748b);
  font-size: 0.86rem;
}

.icon-button {
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--border-color, #d6dee8);
  border-radius: 7px;
  background: var(--card-bg, #fff);
  color: var(--text-primary, #111827);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.icon-button:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.state-block {
  min-height: 14rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--text-secondary, #64748b);
}

.struct-chart {
  min-width: max-content;
  display: flex;
  justify-content: center;
  padding: 1rem 0 2rem;
}

.spinning {
  animation: sportzania-spin 0.8s linear infinite;
}

@keyframes sportzania-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
