<template>
  <header class="app-header">
    <div class="header-left">
      <h1 class="app-title">
        <i class="pi pi-building"></i>
        Ideav CRM
      </h1>
    </div>
    <nav class="header-nav">
      <router-link to="/tasks" class="nav-link" active-class="active">
        <i class="pi pi-list"></i>
        Задачи
      </router-link>
      <router-link to="/kanban" class="nav-link" active-class="active">
        <i class="pi pi-th-large"></i>
        Канбан
      </router-link>
      <router-link to="/partners" class="nav-link" active-class="active">
        <i class="pi pi-users"></i>
        Партнеры
      </router-link>
      <router-link to="/deals" class="nav-link" active-class="active">
        <i class="pi pi-dollar"></i>
        Сделки
      </router-link>
    </nav>
    <div class="header-right">
      <button class="user-menu-btn">
        <i class="pi pi-user"></i>
        <span>Профиль</span>
      </button>
    </div>
  </header>
</template>

<script setup>
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%);
  color: white;
  padding: 0 24px;
  height: 64px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.app-title i {
  font-size: 1.75rem;
}

.header-nav {
  display: flex;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-weight: 500;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-link.active {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.nav-link i {
  font-size: 1.1rem;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-menu-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95rem;
}

.user-menu-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}
</style>
