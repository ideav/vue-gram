<template>
  <IntegramDirAdmin :database="database" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import IntegramDirAdmin from '@/components/integram/IntegramDirAdmin.vue'

const route = useRoute()
const database = computed(() => String(route.params.database || 'my'))
</script>
