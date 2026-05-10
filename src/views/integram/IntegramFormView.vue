<template>
  <IntegramForm
    :database="database"
    :form-id="formId"
    :session="session"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import IntegramForm from '@/components/integram/IntegramForm.vue'
import integramApiClient from '@/services/integramApiClient'

const route = useRoute()

const database = computed(() => route.params.database || integramApiClient.getDatabase() || 'my')
const formId = computed(() => route.params.formId || null)
const session = computed(() => ({
  database: database.value,
  ...integramApiClient.getAuthInfo()
}))
</script>
