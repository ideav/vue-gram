<template>
  <Breadcrumb :model="breadcrumbItems" :home="homeItem" class="integram-breadcrumb">
    <template #item="{ item }">
      <router-link v-if="item.route" :to="item.route" class="breadcrumb-link">
        <span :class="item.icon" v-if="item.icon"></span>
        <span class="ml-2">{{ item.label }}</span>
      </router-link>
      <span v-else>
        <span :class="item.icon" v-if="item.icon"></span>
        <span class="ml-2">{{ item.label }}</span>
      </span>
    </template>
  </Breadcrumb>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Breadcrumb from 'primevue/breadcrumb'
import integramApiClient from '@/services/integramApiClient'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  database: {
    type: String,
    default: ''
  }
})

const route = useRoute()

const homeItem = computed(() => {
  const databaseName = props.database || route.params.database || integramApiClient.getDatabase()
  return {
    icon: 'pi pi-database',
    route: databaseName ? `/integram/${databaseName}/` : '/integram',
    label: databaseName || 'База'
  }
})

const breadcrumbItems = computed(() => {
  const result = []
  props.items.forEach((item, index) => {
    const isLast = index === props.items.length - 1
    result.push({
      label: item.label,
      route: isLast ? undefined : item.to,
      icon: item.icon
    })
  })
  return result
})
</script>

<style scoped>
.integram-breadcrumb {
  margin: 0 0 1rem 0;
  background: var(--p-surface-card, var(--surface-card));
  border: 1px solid var(--p-surface-border, var(--surface-border));
  border-radius: var(--p-card-border-radius);
  padding: 0.75rem 1rem;
}

.breadcrumb-link {
  text-decoration: none;
  color: var(--primary-color);
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
}

.breadcrumb-link:hover {
  color: var(--primary-color-emphasis);
  text-decoration: underline;
}
</style>
