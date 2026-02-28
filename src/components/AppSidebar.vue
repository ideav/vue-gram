<template>
  <aside class="app-sidebar">
    <div class="quick-links">
      <h3 class="sidebar-title">Быстрые ссылки</h3>
      <div class="link-list">
        <router-link to="/tasks" class="sidebar-link">
          <i class="pi pi-calendar"></i>
          Мои задачи
        </router-link>
        <router-link to="/kanban" class="sidebar-link">
          <i class="pi pi-chart-bar"></i>
          Воронка продаж
        </router-link>
        <router-link to="/sql-query" class="sidebar-link">
          <i class="pi pi-database"></i>
          Редактор запросов
        </router-link>
        <a href="#" class="sidebar-link">
          <i class="pi pi-plus-circle"></i>
          Новый лид
        </a>
        <a href="#" class="sidebar-link">
          <i class="pi pi-phone"></i>
          Запланировать звонок
        </a>
      </div>
    </div>

    <div class="sidebar-stats">
      <h3 class="sidebar-title">Статистика</h3>
      <div class="stat-item">
        <span class="stat-label">Активные задачи</span>
        <span class="stat-value">12</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Лиды в работе</span>
        <span class="stat-value">28</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Партнеры</span>
        <span class="stat-value">45</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
</script>

<style scoped>
.app-sidebar {
  width: 260px;
  background-color: white;
  border-right: 1px solid #e2e8f0;
  padding: 20px;
  overflow-y: auto;
  flex-shrink: 0;
}

.quick-links {
  margin-bottom: 30px;
}

.sidebar-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.link-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  color: #1e293b;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s ease;
  font-size: 0.95rem;
}

.sidebar-link:hover {
  background-color: #f1f5f9;
  color: #1976d2;
}

.sidebar-link i {
  font-size: 1.1rem;
  color: #64748b;
}

.sidebar-link:hover i {
  color: #1976d2;
}

.sidebar-stats {
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.stat-label {
  font-size: 0.9rem;
  color: #64748b;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1976d2;
}
</style>
