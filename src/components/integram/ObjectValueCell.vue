<template>
  <span v-if="cell.kind === 'multi-reference'" class="object-value-cell object-value-cell-multi">
    <template v-for="item in cell.items" :key="item.id || item.text">
      <router-link
        v-if="item.href"
        :to="item.href"
        class="object-value-link object-value-chip"
      >
        {{ item.text }}
      </router-link>
      <span v-else class="object-value-chip">
        {{ item.text }}
      </span>
    </template>
  </span>

  <router-link
    v-else-if="cell.href"
    :to="cell.href"
    class="object-value-link"
  >
    {{ cell.text }}
  </router-link>

  <span v-else class="object-value-cell">
    {{ cell.text }}
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { buildRequisiteCell } from './objectListCompat';

const props = defineProps({
  database: {
    type: String,
    required: true
  },
  objectId: {
    type: [String, Number],
    required: true
  },
  requisite: {
    type: Object,
    required: true
  },
  rawValue: {
    type: [String, Number, Boolean, Array, Object],
    default: ''
  },
  referenceValue: {
    type: [String, Number, Array, Object],
    default: ''
  }
});

const cell = computed(() => buildRequisiteCell(props));
</script>

<style scoped>
.object-value-cell {
  display: inline-flex;
  align-items: center;
  min-height: 1.25rem;
}

.object-value-cell-multi {
  gap: 0.25rem;
  flex-wrap: wrap;
}

.object-value-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.object-value-link:hover {
  text-decoration: underline;
}

.object-value-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: var(--surface-100);
  color: var(--text-color);
  padding: 0.125rem 0.5rem;
  line-height: 1.25;
}

.object-value-link.object-value-chip {
  color: var(--primary-color);
}
</style>
