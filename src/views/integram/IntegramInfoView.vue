<template>
  <div class="integram-info">
    <div class="page-header">
      <h2><i class="pi pi-info-circle"></i> Информация</h2>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-header">
          <i class="pi pi-server"></i>
          <h3>Сервер</h3>
        </div>
        <div class="info-row">
          <span class="info-label">URL</span>
          <span class="info-value">{{ serverUrl }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">База данных</span>
          <span class="info-value">{{ database }}</span>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <i class="pi pi-user"></i>
          <h3>Пользователь</h3>
        </div>
        <div class="info-row">
          <span class="info-label">Имя</span>
          <span class="info-value">{{ userName }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ID</span>
          <span class="info-value">{{ userId }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Роль</span>
          <span class="info-value">{{ userRole }}</span>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <i class="pi pi-database"></i>
          <h3>Сессия</h3>
        </div>
        <div class="info-row">
          <span class="info-label">Статус</span>
          <span :class="['info-value', isAuth ? 'text-success' : 'text-danger']">
            {{ isAuth ? 'Авторизован' : 'Не авторизован' }}
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">Баз данных</span>
          <span class="info-value">{{ databaseCount }}</span>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <i class="pi pi-cog"></i>
          <h3>Действия</h3>
        </div>
        <div class="info-actions">
          <button class="action-btn" @click="validateSession" :disabled="validating">
            <i :class="validating ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"></i>
            Проверить сессию
          </button>
          <button class="action-btn" @click="createBackup" :disabled="backingUp">
            <i :class="backingUp ? 'pi pi-spin pi-spinner' : 'pi pi-download'"></i>
            Создать бэкап
          </button>
        </div>
        <div v-if="actionMessage" :class="['alert', actionSeverity]">
          {{ actionMessage }}
        </div>
      </div>
    </div>

    <div v-if="stats" class="stats-card">
      <div class="info-card-header">
        <i class="pi pi-chart-bar"></i>
        <h3>Статистика базы</h3>
      </div>
      <div class="stats-grid">
        <div v-for="(value, key) in stats" :key="key" class="stat-item">
          <span class="stat-value">{{ value }}</span>
          <span class="stat-label">{{ key }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import integramApiClient from '@/services/integramApiClient'

const route = useRoute()
const validating = ref(false)
const backingUp = ref(false)
const actionMessage = ref('')
const actionSeverity = ref('info')
const stats = ref(null)

const serverUrl = computed(() => integramApiClient.getServer())
const database = computed(() => route.params.database || integramApiClient.getDatabase() || 'N/A')
const userName = computed(() => integramApiClient.getAuthInfo().userName || 'N/A')
const userId = computed(() => integramApiClient.getAuthInfo().userId || 'N/A')
const userRole = computed(() => integramApiClient.getAuthInfo().userRole || 'N/A')
const isAuth = computed(() => integramApiClient.isAuthenticated())
const databaseCount = computed(() => Object.keys(integramApiClient.databases).length)

async function validateSession() {
  validating.value = true
  actionMessage.value = ''
  try {
    const valid = await integramApiClient.validateSession()
    actionMessage.value = valid ? 'Сессия активна' : 'Сессия недействительна'
    actionSeverity.value = valid ? 'success' : 'error'
  } catch (err) {
    actionMessage.value = err.message
    actionSeverity.value = 'error'
  } finally {
    validating.value = false
  }
}

async function createBackup() {
  backingUp.value = true
  actionMessage.value = ''
  try {
    await integramApiClient.createBackup()
    actionMessage.value = 'Бэкап создан'
    actionSeverity.value = 'success'
  } catch (err) {
    actionMessage.value = err.message
    actionSeverity.value = 'error'
  } finally {
    backingUp.value = false
  }
}

onMounted(async () => {
  try {
    const dict = await integramApiClient.getDictionary()
    if (dict?.type) {
      stats.value = { 'Типов данных': dict.type.length }
    }
  } catch {
    // ignore
  }
})
</script>

<style scoped>
.integram-info { max-width: 1000px; margin: 0 auto; }
.page-header { margin-bottom: 1rem; }
.page-header h2 { display: flex; align-items: center; gap: 0.5rem; color: #1e293b; margin: 0; }

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.info-card, .stats-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
}

.info-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}
.info-card-header i { color: #1976d2; font-size: 1.1rem; }
.info-card-header h3 { margin: 0; font-size: 0.95rem; color: #334155; }

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.375rem 0;
  font-size: 0.875rem;
}

.info-label { color: #64748b; }
.info-value { color: #1e293b; font-weight: 500; word-break: break-all; }
.text-success { color: #16a34a; }
.text-danger { color: #dc2626; }

.info-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-btn {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #334155;
  transition: all 0.2s;
}
.action-btn:hover { background: #f8fafc; border-color: #1976d2; color: #1976d2; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.alert { padding: 0.5rem; border-radius: 6px; font-size: 0.8rem; margin-top: 0.5rem; }
.alert.error { background: #fef0f0; color: #dc2626; }
.alert.success { background: #f0fef4; color: #16a34a; }

.stats-grid {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.stat-item { text-align: center; }
.stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: #1976d2; }
.stat-label { font-size: 0.8rem; color: #64748b; }
</style>
