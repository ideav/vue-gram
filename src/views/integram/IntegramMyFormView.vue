<template>
  <IntegramFormBuilder
    :session="session"
    @view-table="openTable"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IntegramFormBuilder from '@/components/integram/IntegramFormBuilder.vue'
import integramApiClient from '@/services/integramApiClient'

const route = useRoute()
const router = useRouter()

const database = computed(() => route.params.database || integramApiClient.getDatabase() || 'my')
const session = computed(() => ({
  database: database.value,
  ...integramApiClient.getAuthInfo()
}))

function openTable(typeId) {
  if (!typeId) return
  router.push(`/${database.value}/table/${typeId}`)
}
</script>
