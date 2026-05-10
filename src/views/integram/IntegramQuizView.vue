<template>
  <IntegramQuiz
    :database="database"
    :quiz-id="quizId"
    :session="session"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import IntegramQuiz from '@/components/integram/IntegramQuiz.vue'
import integramApiClient from '@/services/integramApiClient'

const route = useRoute()

const database = computed(() => route.params.database || integramApiClient.getDatabase() || 'my')
const quizId = computed(() => route.params.quizId || null)
const session = computed(() => ({
  database: database.value,
  ...integramApiClient.getAuthInfo()
}))
</script>
