<template>
  <div class="sportzania-view">
    <IntegramBreadcrumb :items="breadcrumbItems" :database="database" />

    <header class="sportzania-shell-head">
      <nav class="sportzania-tabs" aria-label="Sportzania">
        <router-link
          v-for="item in workspaceList"
          :key="item.key"
          :to="`/${database}/sportzania/${item.route}`"
          class="sportzania-tab"
          :class="{ active: workspaceKey === item.key }"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </header>

    <component
      :is="activeComponent"
      :database="database"
      :message="activeWorkspace.fallback"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import IntegramBreadcrumb from '@/components/integram/IntegramBreadcrumb.vue'
import SportzaniaFallback from '@/components/integram/sportzania/SportzaniaFallback.vue'
import SportzaniaRating from '@/components/integram/sportzania/SportzaniaRating.vue'
import SportzaniaStruct from '@/components/integram/sportzania/SportzaniaStruct.vue'
import SportzaniaTaskDashboard from '@/components/integram/sportzania/SportzaniaTaskDashboard.vue'
import { SPORTZANIA_WORKSPACES } from '@/utils/sportzaniaWorkspaces'

const route = useRoute()

const componentByWorkspace = {
  taskdash: SportzaniaTaskDashboard,
  rating: SportzaniaRating,
  struct: SportzaniaStruct,
  procvac: SportzaniaFallback
}

const database = computed(() => String(route.params.database || ''))
const workspaceKey = computed(() => {
  const key = String(route.params.workspace || 'taskdash')
  return SPORTZANIA_WORKSPACES[key] ? key : 'taskdash'
})
const workspaceList = computed(() => Object.values(SPORTZANIA_WORKSPACES))
const activeWorkspace = computed(() => SPORTZANIA_WORKSPACES[workspaceKey.value])
const activeComponent = computed(() => componentByWorkspace[workspaceKey.value] || SportzaniaTaskDashboard)
const breadcrumbItems = computed(() => [
  { label: 'Sportzania', to: `/${database.value}/sportzania/taskdash`, icon: 'fi fi-rr-briefcase' },
  { label: activeWorkspace.value.label, icon: activeWorkspace.value.icon }
])
</script>

<style scoped>
.sportzania-view {
  min-height: 100%;
  padding: 1rem;
  background: var(--bg-primary, #f8fafc);
}

.sportzania-shell-head {
  margin-bottom: 0.75rem;
}

.sportzania-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  padding: 0;
}

.sportzania-tab {
  min-height: 2.1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid var(--border-color, #d6dee8);
  border-radius: 7px;
  padding: 0.4rem 0.65rem;
  background: var(--card-bg, #fff);
  color: var(--text-primary, #111827);
  font-size: 0.88rem;
  font-weight: 700;
  text-decoration: none;
}

.sportzania-tab:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.sportzania-tab.active {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

@media (max-width: 640px) {
  .sportzania-view {
    padding: 0.75rem;
  }

  .sportzania-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .sportzania-tab {
    justify-content: center;
  }
}
</style>
