<template>
  <IntegramMigration :database="database" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import IntegramMigration from '@/components/integram/IntegramMigration.vue'

const route = useRoute()
const database = computed(() => String(route.params.database || 'my'))
</script>
