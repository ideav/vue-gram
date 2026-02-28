<template>
  <div class="integram-landing">
    <!-- Hero -->
    <div class="hero-card">
      <div class="hero-header">
        <i class="pi pi-database"></i>
        <h2>{{ t('welcome') }} Integram</h2>
      </div>
      <p class="hero-subtitle">{{ t('subtitle') }}</p>
      <div class="hero-tags">
        <span v-if="database" class="tag info"><i class="pi pi-database"></i> {{ database }}</span>
        <span v-if="userName" class="tag success"><i class="pi pi-user"></i> {{ userName }}</span>
      </div>
    </div>

    <!-- Quick Access -->
    <div class="section-card">
      <h3>{{ t('quickAccess') }}</h3>
      <p class="section-desc">{{ t('quickAccessDesc') }}</p>
      <div class="quick-grid">
        <div
          v-for="item in quickAccessItems"
          :key="item.path"
          class="quick-item"
          @click="$router.push(item.path)"
        >
          <div class="quick-icon">
            <i :class="item.icon"></i>
          </div>
          <div class="quick-info">
            <strong>{{ item.name }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Features -->
    <div class="section-card">
      <h3>{{ t('features') }}</h3>
      <p class="section-desc">{{ t('featuresDesc') }}</p>
      <div class="features-grid">
        <div v-for="feature in features" :key="feature.title" class="feature-item">
          <div class="feature-icon">
            <i :class="feature.icon"></i>
          </div>
          <div>
            <strong>{{ feature.title }}</strong>
            <p>{{ feature.description }}</p>
          </div>
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
const locale = ref('ru')

const database = computed(() => route.params.database || integramApiClient.getDatabase() || '')
const userName = computed(() => integramApiClient.getAuthInfo().userName || '')

function t(key) {
  const tr = {
    ru: {
      welcome: 'Добро пожаловать в', subtitle: 'Универсальная система управления данными',
      quickAccess: 'Быстрый доступ', quickAccessDesc: 'Основные модули системы',
      features: 'Возможности', featuresDesc: 'Полный набор инструментов для работы с данными',
      tables: 'Таблицы', tablesDesc: 'Управление таблицами и просмотр данных',
      objects: 'Объекты', objectsDesc: 'Управление объектами базы данных',
      types: 'Структура', typesDesc: 'Настройка структуры данных (DDL)',
      sql: 'SQL', sqlDesc: 'Выполнение SQL запросов',
      reports: 'Запросы', reportsDesc: 'Создание и просмотр запросов',
      forms: 'Формы', formsDesc: 'Работа с формами',
      flexibleStructure: 'Гибкая структура', flexibleStructureDesc: 'Создавайте собственные типы данных и связи',
      powerfulSQL: 'Мощный SQL', powerfulSQLDesc: 'Полный доступ через SQL интерфейс',
      reportsAndForms: 'Запросы и формы', reportsAndFormsDesc: 'Настраиваемые формы и шаблоны запросов',
      fileManagement: 'Файлы', fileManagementDesc: 'Загрузка и работа с файлами',
      visualQueries: 'Визуальные запросы', visualQueriesDesc: 'Интерактивные таблицы с редактированием',
      security: 'Безопасность', securityDesc: 'Система прав доступа и ролей'
    },
    en: {
      welcome: 'Welcome to', subtitle: 'Universal Data Management System',
      quickAccess: 'Quick Access', quickAccessDesc: 'Main system modules',
      features: 'Features', featuresDesc: 'Complete toolkit for data management',
      tables: 'Tables', tablesDesc: 'Manage tables and view data',
      objects: 'Objects', objectsDesc: 'Manage database objects',
      types: 'Structure', typesDesc: 'Configure data structure (DDL)',
      sql: 'SQL', sqlDesc: 'Execute database queries',
      reports: 'Reports', reportsDesc: 'Create and view reports',
      forms: 'Forms', formsDesc: 'Work with forms',
      flexibleStructure: 'Flexible Structure', flexibleStructureDesc: 'Create your own data types and relationships',
      powerfulSQL: 'Powerful SQL', powerfulSQLDesc: 'Full database access through SQL interface',
      reportsAndForms: 'Reports & Forms', reportsAndFormsDesc: 'Customizable forms and reports',
      fileManagement: 'File Management', fileManagementDesc: 'Upload and work with files',
      visualQueries: 'Visual Queries', visualQueriesDesc: 'Interactive tables with editing',
      security: 'Security', securityDesc: 'Access rights and user roles'
    }
  }
  return tr[locale.value]?.[key] || key
}

const quickAccessItems = computed(() => [
  { name: t('objects'), description: t('objectsDesc'), icon: 'pi pi-database', path: `/integram/${database.value}/dict` },
  { name: t('tables'), description: t('tablesDesc'), icon: 'pi pi-table', path: `/integram/${database.value}/table` },
  { name: t('types'), description: t('typesDesc'), icon: 'pi pi-sitemap', path: `/integram/${database.value}/edit_types` },
  { name: t('sql'), description: t('sqlDesc'), icon: 'pi pi-code', path: `/integram/${database.value}/sql` },
  { name: t('reports'), description: t('reportsDesc'), icon: 'pi pi-chart-bar', path: `/integram/${database.value}/report` },
  { name: t('forms'), description: t('formsDesc'), icon: 'pi pi-file', path: `/integram/${database.value}/form` }
])

const features = computed(() => [
  { title: t('flexibleStructure'), description: t('flexibleStructureDesc'), icon: 'pi pi-sitemap' },
  { title: t('powerfulSQL'), description: t('powerfulSQLDesc'), icon: 'pi pi-database' },
  { title: t('reportsAndForms'), description: t('reportsAndFormsDesc'), icon: 'pi pi-file' },
  { title: t('fileManagement'), description: t('fileManagementDesc'), icon: 'pi pi-upload' },
  { title: t('visualQueries'), description: t('visualQueriesDesc'), icon: 'pi pi-eye' },
  { title: t('security'), description: t('securityDesc'), icon: 'pi pi-shield' }
])

onMounted(() => {
  const saved = localStorage.getItem('integram_locale')
  if (saved) locale.value = saved
})
</script>

<style scoped>
.integram-landing { max-width: 1200px; margin: 0 auto; }

.hero-card, .section-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.hero-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.hero-header i { font-size: 1.5rem; color: #1976d2; }
.hero-header h2 { margin: 0; color: #1e293b; }

.hero-subtitle { color: #64748b; margin-bottom: 1rem; }

.hero-tags { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.tag.info { background: #e0f2fe; color: #0369a1; }
.tag.success { background: #dcfce7; color: #15803d; }

.section-card h3 {
  margin: 0 0 0.25rem;
  color: #1e293b;
  font-size: 1.15rem;
}

.section-desc { color: #94a3b8; font-size: 0.875rem; margin-bottom: 1rem; }

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
}

.quick-item {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-item:hover {
  border-color: #1976d2;
  background: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.quick-icon {
  width: 40px;
  height: 40px;
  min-width: 40px;
  background: #1976d2;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-icon i { color: white; font-size: 1.1rem; }

.quick-info strong { display: block; color: #1e293b; margin-bottom: 0.25rem; font-size: 0.9rem; }
.quick-info p { margin: 0; color: #94a3b8; font-size: 0.8rem; line-height: 1.4; }

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.feature-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.5rem;
}

.feature-icon {
  width: 36px;
  height: 36px;
  min-width: 36px;
  background: #1976d2;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-icon i { color: white; font-size: 1rem; }
.feature-item strong { display: block; color: #1e293b; margin-bottom: 0.25rem; font-size: 0.875rem; }
.feature-item p { margin: 0; color: #94a3b8; font-size: 0.8rem; line-height: 1.4; }
</style>
