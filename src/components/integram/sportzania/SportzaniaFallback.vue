<template>
  <section class="sportzania-fallback" data-testid="sportzania-procvac-fallback">
    <div class="fallback-icon">
      <i class="fi fi-rr-briefcase"></i>
    </div>
    <div>
      <h1>ProcVac</h1>
      <p>{{ message }}</p>
      <a
        href="https://github.com/ideav/vue-gram/issues/32"
        target="_blank"
        rel="noopener"
        class="fallback-link"
      >
        <i class="fi fi-rr-arrow-up-right-from-square"></i>
        <span>Задача переноса ProcVac</span>
      </a>
    </div>
  </section>
</template>

<script setup>
defineProps({
  database: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: 'Это рабочее место остается на legacy-реализации до переноса js/procvac.js и css/procvac.css.'
  }
})
</script>

<style scoped>
.sportzania-fallback {
  min-height: 22rem;
  display: grid;
  grid-template-columns: auto minmax(0, 34rem);
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  color: var(--text-primary);
}

.fallback-icon {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-size: 1.5rem;
}

h1 {
  margin: 0 0 0.35rem;
  font-size: 1.45rem;
  letter-spacing: 0;
}

p {
  margin: 0 0 1rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.fallback-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: #2563eb;
  font-weight: 700;
  text-decoration: none;
}

.fallback-link:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .sportzania-fallback {
    grid-template-columns: 1fr;
    align-content: center;
  }
}
</style>
