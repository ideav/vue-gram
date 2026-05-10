<template>
  <IntegramSqlView :session="session" />
</template>

<script setup>
import IntegramSqlView from '@/views/integram/IntegramSqlView.vue'

defineProps({
  session: {
    type: Object,
    required: false
  }
})
</script>
