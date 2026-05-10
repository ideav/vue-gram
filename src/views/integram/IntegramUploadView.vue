<template>
  <IntegramUpload :database="database" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import IntegramUpload from '@/components/integram/IntegramUpload.vue'

const route = useRoute()
const database = computed(() => String(route.params.database || 'my'))
</script>
