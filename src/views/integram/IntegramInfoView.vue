<template>
  <IntegramInfo :database="database" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import IntegramInfo from '@/components/integram/IntegramInfo.vue'

const route = useRoute()
const database = computed(() => String(route.params.database || 'my'))
</script>
