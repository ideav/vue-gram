<template>
  <div class="kanban-view">
    <div class="kanban-header">
      <h2>Воронка продаж</h2>
      <div class="kanban-filters">
        <Button label="Менеджер" icon="pi pi-user" outlined size="small" />
        <Button label="Продукт" icon="pi pi-box" outlined size="small" />
        <Button label="Партнер" icon="pi pi-filter" outlined size="small" />
      </div>
    </div>

    <div class="kanban-board" ref="kanbanBoard">
      <div
        v-for="status in statuses"
        :key="status.id"
        class="kanban-column"
      >
        <div
          class="kanban-column-header"
          :style="{ background: `linear-gradient(135deg, ${status.color} 0%, ${lightenColor(status.color)} 100%)` }"
        >
          <span>{{ status.name }}</span>
          <span class="kanban-column-count">{{ getLeadsByStatus(status.id).length }}</span>
        </div>

        <div
          class="kanban-column-body"
          @drop="onDrop($event, status.id)"
          @dragover.prevent
          @dragenter.prevent
        >
          <div
            v-for="lead in getLeadsByStatus(status.id)"
            :key="lead.id"
            class="kanban-card"
            draggable="true"
            @dragstart="onDragStart($event, lead)"
          >
            <div class="card-header">
              <h4>{{ lead.name }}</h4>
              <i class="pi pi-ellipsis-v"></i>
            </div>

            <div class="card-info">
              <div class="info-row">
                <i class="pi pi-user"></i>
                <span>{{ lead.manager }}</span>
              </div>
              <div class="info-row">
                <i class="pi pi-phone"></i>
                <span>{{ lead.phone }}</span>
              </div>
              <div class="info-row">
                <i class="pi pi-box"></i>
                <span>{{ lead.product }}</span>
              </div>
            </div>

            <div class="card-badges">
              <span v-if="lead.tasks > 0" class="badge badge-tasks" @click.stop="showTasks(lead)">
                <i class="pi pi-calendar"></i>
                {{ lead.tasks }}
              </span>
              <span v-if="lead.deals > 0" class="badge badge-deals">
                <i class="pi pi-dollar"></i>
                {{ lead.deals }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import { api } from '../services/mockData.js'

const statuses = ref([])
const leads = ref([])

onMounted(async () => {
  statuses.value = await api.getStatuses()
  leads.value = await api.getLeads()
})

const getLeadsByStatus = (statusId) => {
  return leads.value.filter(lead => lead.statusId === statusId)
}

const lightenColor = (color) => {
  // Simple color lightening
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  const lighten = (c) => Math.min(255, Math.floor(c + (255 - c) * 0.15))

  return `#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`
}

let draggedLead = null

const onDragStart = (event, lead) => {
  draggedLead = lead
  event.dataTransfer.effectAllowed = 'move'
}

const onDrop = async (event, newStatusId) => {
  if (draggedLead && draggedLead.statusId !== newStatusId) {
    await api.updateLeadStatus(draggedLead.id, newStatusId)
    leads.value = await api.getLeads()
  }
  draggedLead = null
}

const showTasks = (lead) => {
  // TODO: Show tasks modal
  console.log('Show tasks for lead:', lead.name)
}
</script>

<style scoped>
.kanban-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.kanban-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.kanban-header h2 {
  margin: 0;
  font-size: 1.75rem;
  color: #1e293b;
}

.kanban-filters {
  display: flex;
  gap: 10px;
}

.kanban-board {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 10px;
  flex: 1;
  align-items: flex-start;
}

.kanban-column {
  min-width: 300px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
}

.kanban-column-header {
  padding: 12px 16px;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.kanban-column-count {
  background-color: rgba(255, 255, 255, 0.3);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
}

.kanban-column-body {
  padding: 12px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kanban-card {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  cursor: move;
  transition: all 0.2s ease;
}

.kanban-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 10px;
}

.card-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #1e293b;
  font-weight: 600;
}

.card-header i {
  color: #94a3b8;
  cursor: pointer;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #64748b;
}

.info-row i {
  color: #94a3b8;
  font-size: 0.8rem;
}

.card-badges {
  display: flex;
  gap: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.badge-tasks {
  background-color: #dbeafe;
  color: #1e40af;
}

.badge-tasks:hover {
  background-color: #bfdbfe;
}

.badge-deals {
  background-color: #d1fae5;
  color: #065f46;
}
</style>
