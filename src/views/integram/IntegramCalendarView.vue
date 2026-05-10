<template>
  <div class="integram-calendar-page">
    <header class="calendar-page-header">
      <div>
        <h1>Календарь</h1>
        <div class="calendar-page-meta">
          {{ loadedTaskCountLabel }}
        </div>
      </div>

      <RouterLink
        v-if="canEditTasks"
        class="calendar-primary-action"
        :to="taskTableHref"
        title="Создать задачу"
      >
        <i class="fi fi-rr-plus"></i>
        <span>Задача</span>
      </RouterLink>
    </header>

    <section class="calendar-controls" aria-label="Фильтры календаря">
      <label class="calendar-control">
        <span>Исполнитель</span>
        <select v-model="filters.executorId" class="calendar-select" @change="loadTasks">
          <option value="%">Все исполнители</option>
          <option
            v-for="executor in executorOptions"
            :key="executor.value"
            :value="executor.value"
          >
            {{ executor.label }}
          </option>
        </select>
      </label>

      <label class="calendar-control">
        <span>Тип</span>
        <select v-model="filters.taskTypeId" class="calendar-select" @change="loadTasks">
          <option value="">Все</option>
          <option
            v-for="taskType in taskTypeOptions"
            :key="taskType.value"
            :value="taskType.value"
          >
            {{ taskType.label }}
          </option>
        </select>
      </label>

      <label class="calendar-control">
        <span>Статус</span>
        <select v-model="filters.statusId" class="calendar-select" @change="loadTasks">
          <option value="">Все</option>
          <option
            v-for="status in statusOptions"
            :key="status.value"
            :value="status.value"
          >
            {{ status.label }}
          </option>
        </select>
      </label>

      <label class="calendar-checkbox-label">
        <input
          v-model="filters.importantOnly"
          type="checkbox"
          @change="loadTasks"
        >
        <span>Только важные</span>
      </label>

      <button class="calendar-button" type="button" @click="loadTasks">
        <i class="pi pi-refresh"></i>
        <span>Обновить</span>
      </button>

      <button
        v-if="overdueTasks.length > 0"
        class="overdue-section"
        :class="{ expanded: overdueExpanded }"
        type="button"
        @click="overdueExpanded = !overdueExpanded"
      >
        <span>
          <i class="pi pi-exclamation-triangle"></i>
          Просрочено {{ overdueTasks.length }}
        </span>
        <i class="pi pi-chevron-down overdue-toggle-icon"></i>
      </button>
    </section>

    <div
      v-if="overdueExpanded"
      class="overdue-backdrop"
      @click="overdueExpanded = false"
    ></div>

    <section
      v-if="overdueExpanded"
      class="overdue-panel"
      aria-label="Просроченные задачи"
    >
      <RouterLink
        v-for="task in overdueTasks"
        :key="task.id"
        class="overdue-task-item"
        :to="getTaskEditRoute(task.id)"
      >
        <i :class="getTaskIconClass(task)"></i>
        <span class="overdue-task-title">{{ task.title }}</span>
        <span class="overdue-task-executor">{{ task.executor }}</span>
        <span class="overdue-task-date">{{ task.deadlineLabel }}</span>
      </RouterLink>
    </section>

    <main class="calendar-wrapper" :aria-busy="loading ? 'true' : 'false'">
      <div class="calendar-toolbar">
        <div class="calendar-toolbar-group">
          <button
            class="calendar-toolbar-button"
            type="button"
            aria-label="Предыдущий период"
            title="Предыдущий период"
            @click="shiftPeriod(-1)"
          >
            <i class="pi pi-chevron-left"></i>
          </button>
          <button
            class="calendar-toolbar-button"
            type="button"
            @click="goToday"
          >
            Сегодня
          </button>
          <button
            class="calendar-toolbar-button"
            type="button"
            aria-label="Следующий период"
            title="Следующий период"
            @click="shiftPeriod(1)"
          >
            <i class="pi pi-chevron-right"></i>
          </button>

          <div class="calendar-search">
            <i class="pi pi-search"></i>
            <input
              v-model="searchQuery"
              type="search"
              class="calendar-search-input"
              placeholder="Поиск по задачам..."
            >
          </div>
        </div>

        <h2 class="calendar-title" data-testid="calendar-title">{{ periodTitle }}</h2>

        <div class="calendar-view-switcher" role="group" aria-label="Вид календаря">
          <button
            v-for="mode in viewModes"
            :key="mode.value"
            class="calendar-view-button"
            :class="{ active: currentView === mode.value }"
            type="button"
            @click="setView(mode.value)"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>

      <div v-if="errorMessage" class="calendar-error" role="alert">
        {{ errorMessage }}
      </div>

      <div v-else-if="loading" class="calendar-loading">
        <ProgressSpinner />
        <span>Загрузка задач...</span>
      </div>

      <template v-else>
        <div v-if="currentView === 'month'" class="calendar-month-grid">
          <div
            v-for="weekday in weekdays"
            :key="weekday"
            class="calendar-weekday"
          >
            {{ weekday }}
          </div>

          <div
            v-for="day in periodDays"
            :key="formatDayKey(day)"
            class="calendar-day-cell"
            :class="getDayClasses(day)"
            @dragover.prevent="handleDragOver"
            @drop="handleTaskDrop($event, day)"
          >
            <div class="calendar-day-number">{{ day.getDate() }}</div>
            <div class="calendar-event-list">
              <RouterLink
                v-for="event in getEventsForDay(day)"
                :key="event.id"
                class="calendar-event"
                :class="event.classNames"
                :style="{ '--event-color': event.color }"
                :to="getTaskEditRoute(event.id)"
                :data-testid="`calendar-event-link-${event.id}`"
                :draggable="canEditTasks"
                @dragstart="handleTaskDragStart($event, event.task)"
              >
                <i :class="event.iconClass"></i>
                <span class="calendar-event-time">{{ getTaskTimeLabel(event.task) }}</span>
                <span class="calendar-event-title">{{ event.title }}</span>
              </RouterLink>
            </div>
          </div>
        </div>

        <div v-else class="calendar-agenda-grid" :class="`calendar-agenda-${currentView}`">
          <div
            v-for="day in periodDays"
            :key="formatDayKey(day)"
            class="calendar-agenda-day"
            :class="getDayClasses(day)"
            @dragover.prevent="handleDragOver"
            @drop="handleTaskDrop($event, day)"
          >
            <div class="calendar-agenda-header">
              <span class="calendar-agenda-weekday">{{ getWeekdayLabel(day) }}</span>
              <span class="calendar-agenda-date">{{ formatDisplayDate(day) }}</span>
            </div>

            <div class="calendar-agenda-events">
              <RouterLink
                v-for="event in getEventsForDay(day)"
                :key="event.id"
                class="calendar-agenda-event"
                :class="event.classNames"
                :style="{ '--event-color': event.color }"
                :to="getTaskEditRoute(event.id)"
                :data-testid="`calendar-event-link-${event.id}`"
                :draggable="canEditTasks"
                @dragstart="handleTaskDragStart($event, event.task)"
              >
                <span class="calendar-agenda-time">{{ getTaskTimeLabel(event.task) }}</span>
                <i :class="event.iconClass"></i>
                <span class="calendar-agenda-title">{{ event.title }}</span>
                <span class="calendar-agenda-meta">{{ event.task.executor }}</span>
              </RouterLink>

              <div v-if="getEventsForDay(day).length === 0" class="calendar-empty-day">
                Нет задач
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import integramApiClient from '@/services/integramApiClient';
import integramService from '@/services/integramService';
import {
  CALENDAR_DEADLINE_REQUISITE_ID,
  CALENDAR_EXECUTOR_REPORT_ID,
  CALENDAR_STATUS_REPORT_ID,
  CALENDAR_TASK_REPORT_ID,
  CALENDAR_TASK_TYPE_ID,
  CALENDAR_TASK_TYPE_ICONS,
  CALENDAR_TASK_TYPE_REPORT_ID,
  CALENDAR_VIEW_MODES,
  CALENDAR_WEEKDAYS,
  buildCalendarReportParams,
  buildCalendarTaskEvent,
  enumerateCalendarDays,
  formatCalendarApiDate,
  formatCalendarApiDateTime,
  formatCalendarDayKey,
  getCalendarDateRange,
  getCalendarOptionLabel,
  getCalendarOptionValue,
  getCalendarPeriodTitle,
  isCalendarTaskActionAllowed,
  normalizeCalendarOption,
  normalizeCalendarTask,
  shiftCalendarDate,
  taskMatchesCalendarSearch
} from '@/utils/calendarUtils';

const route = useRoute();
const toast = useToast();

const database = computed(() => String(route.params.database || 'my'));
const currentView = ref(resolveViewMode(route.query.view));
const currentDate = ref(resolveInitialDate(route.query.date));
const filters = reactive({
  executorId: '',
  taskTypeId: '',
  statusId: '',
  importantOnly: false
});
const executorOptions = ref([]);
const taskTypeOptions = ref([]);
const statusOptions = ref([]);
const tasks = ref([]);
const loading = ref(false);
const filtersLoading = ref(false);
const errorMessage = ref('');
const searchQuery = ref('');
const overdueExpanded = ref(false);
const draggedTaskId = ref('');
const autoRefreshId = ref(null);

const viewModes = Object.values(CALENDAR_VIEW_MODES);
const weekdays = CALENDAR_WEEKDAYS;

const range = computed(() => getCalendarDateRange(currentView.value, currentDate.value));
const periodDays = computed(() => enumerateCalendarDays(range.value.start, range.value.end));
const periodTitle = computed(() => getCalendarPeriodTitle(currentView.value, currentDate.value));
const loadedTaskCountLabel = computed(() => {
  if (filtersLoading.value) return 'Загрузка фильтров...';
  const count = tasks.value.length;
  const suffix = count === 1 ? 'задача' : count > 1 && count < 5 ? 'задачи' : 'задач';
  return `${count} ${suffix}`;
});
const taskTableHref = computed(() => `/${database.value}/edit_obj/${CALENDAR_TASK_TYPE_ID}`);
const canEditTasks = computed(() => isCalendarTaskActionAllowed(integramApiClient.getAuthInfo()));

const visibleTasks = computed(() => {
  const query = searchQuery.value.trim();
  return query
    ? tasks.value.filter(task => taskMatchesCalendarSearch(task, query))
    : tasks.value;
});

const overdueTasks = computed(() => {
  return tasks.value
    .filter(task => task.isOverdue)
    .sort((left, right) => (left.deadline?.getTime() || 0) - (right.deadline?.getTime() || 0));
});

const eventsByDay = computed(() => {
  const grouped = new Map();
  for (const task of visibleTasks.value) {
    if (!task.deadline) continue;
    const key = formatCalendarDayKey(task.deadline);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(buildCalendarTaskEvent(task, searchQuery.value));
  }

  for (const events of grouped.values()) {
    events.sort((left, right) => {
      const leftTime = left.task.deadline?.getTime() || 0;
      const rightTime = right.task.deadline?.getTime() || 0;
      return leftTime - rightTime || left.title.localeCompare(right.title, 'ru');
    });
  }

  return grouped;
});

function resolveViewMode(value) {
  const mode = String(value || '').toLowerCase();
  return CALENDAR_VIEW_MODES[mode] ? mode : 'month';
}

function resolveInitialDate(value) {
  if (!value) return new Date();
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return new Date();
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function extractRows(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.rows)) return response.rows;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.object)) return response.object;
  return [];
}

function normalizeOptions(rows, idKeys, labelKeys) {
  return rows
    .map(row => normalizeCalendarOption(row, idKeys, labelKeys))
    .filter(Boolean);
}

async function loadFilterOptions() {
  filtersLoading.value = true;

  try {
    const [executorsResponse, taskTypesResponse, statusesResponse] = await Promise.all([
      integramService.executeReport(CALENDAR_EXECUTOR_REPORT_ID, { _jsonFormat: 'JSON_KV' }),
      integramService.executeReport(CALENDAR_TASK_TYPE_REPORT_ID, { _jsonFormat: 'JSON_KV' }),
      integramService.executeReport(CALENDAR_STATUS_REPORT_ID, { _jsonFormat: 'JSON_KV' })
    ]);

    executorOptions.value = normalizeOptions(extractRows(executorsResponse), ['k', 'id', 'ПользовательID'], ['v', 'name', 'Пользователь']);
    taskTypeOptions.value = normalizeOptions(extractRows(taskTypesResponse), ['k', 'id', 'Тип задачиID'], ['v', 'name', 'Тип задачи']);
    statusOptions.value = normalizeOptions(extractRows(statusesResponse), ['k', 'id', 'Статус задачиID'], ['v', 'name', 'Статус задачи']);

    const userId = String(integramApiClient.getAuthInfo()?.userId || '');
    const hasCurrentUser = userId && executorOptions.value.some(option => option.value === userId);
    filters.executorId = hasCurrentUser ? userId : '%';
  } catch (error) {
    console.error('Error loading calendar filter options:', error);
    filters.executorId = '%';
  } finally {
    filtersLoading.value = false;
  }
}

async function loadTasks() {
  loading.value = true;
  errorMessage.value = '';

  try {
    integramService.setDatabase(database.value);
    const params = buildCalendarReportParams(range.value, filters);
    const response = await integramService.executeReport(CALENDAR_TASK_REPORT_ID, params);
    tasks.value = extractRows(response).map(row => normalizeCalendarTask(row));
  } catch (error) {
    console.error('Error loading calendar tasks:', error);
    errorMessage.value = `Ошибка загрузки задач: ${error.message}`;
  } finally {
    loading.value = false;
  }
}

function setView(mode) {
  if (currentView.value === mode) return;
  currentView.value = mode;
  loadTasks();
}

function shiftPeriod(direction) {
  currentDate.value = shiftCalendarDate(currentView.value, currentDate.value, direction);
  loadTasks();
}

function goToday() {
  currentDate.value = new Date();
  loadTasks();
}

function getTaskEditRoute(taskId) {
  return {
    name: 'IntegramObjectEdit',
    params: {
      database: database.value,
      objectId: String(taskId)
    }
  };
}

function formatDayKey(day) {
  return formatCalendarDayKey(day);
}

function formatDisplayDate(day) {
  return formatCalendarApiDate(day);
}

function getWeekdayLabel(day) {
  return day.toLocaleDateString('ru-RU', { weekday: 'short' });
}

function getTaskTimeLabel(task) {
  if (!task.deadline) return '';
  return `${String(task.deadline.getHours()).padStart(2, '0')}:${String(task.deadline.getMinutes()).padStart(2, '0')}`;
}

function getTaskIconClass(task) {
  return CALENDAR_TASK_TYPE_ICONS[task.taskType] || CALENDAR_TASK_TYPE_ICONS['Другое'];
}

function getEventsForDay(day) {
  return eventsByDay.value.get(formatDayKey(day)) || [];
}

function getDayClasses(day) {
  const key = formatDayKey(day);
  const todayKey = formatDayKey(new Date());
  const currentMonth = range.value.currentStart.getMonth();

  return {
    today: key === todayKey,
    outside: currentView.value === 'month' && day.getMonth() !== currentMonth,
    weekend: day.getDay() === 0 || day.getDay() === 6
  };
}

function handleDragOver(event) {
  if (!canEditTasks.value) return;
  event.dataTransfer.dropEffect = 'move';
}

function handleTaskDragStart(event, task) {
  if (!canEditTasks.value) {
    event.preventDefault();
    return;
  }
  draggedTaskId.value = task.id;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', task.id);
}

async function handleTaskDrop(event, day) {
  if (!canEditTasks.value) return;
  const taskId = event.dataTransfer.getData('text/plain') || draggedTaskId.value;
  const task = tasks.value.find(item => item.id === taskId);
  draggedTaskId.value = '';
  if (!task || !task.deadline) return;

  const newDeadline = new Date(day);
  newDeadline.setHours(task.deadline.getHours(), task.deadline.getMinutes(), task.deadline.getSeconds(), 0);
  const formattedDate = formatCalendarApiDateTime(newDeadline);

  try {
    await integramService.setRequisites(task.id, {
      [CALENDAR_DEADLINE_REQUISITE_ID]: formattedDate
    });

    tasks.value = tasks.value.map(item => {
      if (item.id !== task.id) return item;
      return normalizeCalendarTask({
        ...item.raw,
        'Срок': formattedDate
      });
    });

    toast.add({
      severity: 'success',
      summary: 'Срок задачи обновлен',
      life: 2000
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка обновления задачи',
      detail: error.message,
      life: 5000
    });
  }
}

onMounted(async () => {
  integramService.setDatabase(database.value);
  await loadFilterOptions();
  await loadTasks();
  autoRefreshId.value = window.setInterval(loadTasks, 60000);
});

onBeforeUnmount(() => {
  if (autoRefreshId.value) window.clearInterval(autoRefreshId.value);
});
</script>

<style scoped>
.integram-calendar-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: calc(100vh - 84px);
  padding: 1rem;
  background: var(--surface-ground, #f8fafc);
  color: var(--text-color, #1e293b);
}

.calendar-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.calendar-page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  line-height: 1.2;
  font-weight: 700;
}

.calendar-page-meta {
  margin-top: 0.25rem;
  color: var(--text-color-secondary, #64748b);
  font-size: 0.875rem;
}

.calendar-primary-action,
.calendar-button,
.calendar-toolbar-button,
.calendar-view-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.25rem;
  border: 1px solid var(--surface-border, #d7dde7);
  border-radius: 6px;
  padding: 0.45rem 0.75rem;
  background: var(--surface-card, #ffffff);
  color: var(--text-color, #1e293b);
  cursor: pointer;
  text-decoration: none;
  font: inherit;
  line-height: 1.1;
}

.calendar-primary-action {
  border-color: var(--primary-color, #2563eb);
  background: var(--primary-color, #2563eb);
  color: var(--primary-color-text, #ffffff);
  font-weight: 600;
}

.calendar-primary-action:hover,
.calendar-button:hover,
.calendar-toolbar-button:hover,
.calendar-view-button:hover {
  border-color: var(--primary-color, #2563eb);
}

.calendar-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--surface-border, #d7dde7);
  border-radius: 8px;
  background: var(--surface-card, #ffffff);
}

.calendar-control {
  display: grid;
  gap: 0.25rem;
  min-width: 10rem;
  font-size: 0.8rem;
  color: var(--text-color-secondary, #64748b);
}

.calendar-select,
.calendar-search-input {
  min-height: 2.25rem;
  border: 1px solid var(--surface-border, #d7dde7);
  border-radius: 6px;
  background: var(--surface-card, #ffffff);
  color: var(--text-color, #1e293b);
  padding: 0.35rem 0.55rem;
  font: inherit;
}

.calendar-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.25rem;
  color: var(--text-color, #1e293b);
  cursor: pointer;
}

.overdue-section {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 2.25rem;
  margin-left: auto;
  border: 1px solid var(--overdue-border, #fca5a5);
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  background: var(--overdue-bg, #fee2e2);
  color: var(--overdue-color, #dc2626);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}

.overdue-toggle-icon {
  transition: transform 0.2s ease;
}

.overdue-section.expanded .overdue-toggle-icon {
  transform: rotate(180deg);
}

.overdue-backdrop {
  position: fixed;
  inset: 0;
  z-index: 998;
  background: rgba(15, 23, 42, 0.12);
}

.overdue-panel {
  position: fixed;
  top: 7.5rem;
  left: 50%;
  z-index: 999;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
  gap: 0.5rem;
  width: min(72rem, calc(100vw - 2rem));
  max-height: min(34rem, calc(100vh - 9rem));
  overflow: auto;
  transform: translateX(-50%);
  border: 1px solid var(--overdue-border, #fca5a5);
  border-radius: 8px;
  padding: 0.75rem;
  background: var(--overdue-bg, #fee2e2);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.22);
}

.overdue-task-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.45rem;
  border-radius: 6px;
  padding: 0.55rem;
  background: var(--surface-card, #ffffff);
  color: var(--text-color, #1e293b);
  text-decoration: none;
}

.overdue-task-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.overdue-task-executor {
  grid-column: 2;
  color: var(--text-color-secondary, #64748b);
  font-size: 0.8rem;
}

.overdue-task-date {
  grid-column: 3;
  grid-row: 1 / span 2;
  color: var(--overdue-color, #dc2626);
  font-size: 0.8rem;
  font-weight: 600;
}

.calendar-wrapper {
  display: flex;
  flex: 1;
  min-height: 36rem;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--surface-border, #d7dde7);
  border-radius: 8px;
  background: var(--surface-card, #ffffff);
}

.calendar-toolbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid var(--surface-border, #d7dde7);
  padding: 0.75rem;
}

.calendar-toolbar-group,
.calendar-view-switcher {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.calendar-view-switcher {
  justify-content: flex-end;
}

.calendar-view-button.active {
  border-color: var(--primary-color, #2563eb);
  background: var(--primary-color, #2563eb);
  color: var(--primary-color-text, #ffffff);
}

.calendar-search {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 15rem;
  margin-left: 0.25rem;
  color: var(--text-color-secondary, #64748b);
}

.calendar-search-input {
  width: 100%;
}

.calendar-title {
  margin: 0;
  text-align: center;
  font-size: 1.25rem;
  line-height: 1.2;
  font-weight: 700;
}

.calendar-error {
  margin: 1rem;
  border-radius: 8px;
  padding: 1rem;
  background: var(--red-50, #fef2f2);
  color: var(--red-700, #b91c1c);
}

.calendar-loading {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--text-color-secondary, #64748b);
}

.calendar-month-grid {
  display: grid;
  flex: 1;
  min-height: 0;
  grid-template-columns: repeat(7, minmax(8rem, 1fr));
  grid-auto-rows: minmax(6rem, 1fr);
  overflow: auto;
}

.calendar-weekday,
.calendar-day-cell {
  border-right: 1px solid var(--surface-border, #d7dde7);
  border-bottom: 1px solid var(--surface-border, #d7dde7);
}

.calendar-weekday {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  background: var(--surface-50, #f8fafc);
  color: var(--text-color-secondary, #64748b);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
}

.calendar-day-cell {
  min-height: 7rem;
  padding: 0.35rem;
  background: var(--surface-card, #ffffff);
}

.calendar-day-cell.outside {
  background: var(--surface-50, #f8fafc);
  color: var(--text-color-secondary, #64748b);
}

.calendar-day-cell.today,
.calendar-agenda-day.today {
  background: rgba(37, 99, 235, 0.08);
}

.calendar-day-number {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 1.25rem;
  font-size: 0.8rem;
  font-weight: 700;
}

.calendar-event-list,
.calendar-agenda-events {
  display: grid;
  gap: 0.25rem;
}

.calendar-event,
.calendar-agenda-event {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 0.25rem;
  overflow: hidden;
  border-left: 3px solid var(--event-color, var(--primary-color, #2563eb));
  border-radius: 4px;
  padding: 0.25rem 0.35rem;
  background: color-mix(in srgb, var(--event-color, #2563eb) 14%, transparent);
  color: var(--text-color, #1e293b);
  text-decoration: none;
  font-size: 0.78rem;
}

.calendar-event:hover,
.calendar-agenda-event:hover {
  background: color-mix(in srgb, var(--event-color, #2563eb) 22%, transparent);
}

.calendar-event-title,
.calendar-agenda-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.calendar-event-time,
.calendar-agenda-time,
.calendar-agenda-meta {
  color: var(--text-color-secondary, #64748b);
  font-size: 0.75rem;
}

.calendar-event.event-search-match,
.calendar-agenda-event.event-search-match {
  outline: 2px solid #facc15;
  outline-offset: -2px;
}

.calendar-event.event-overdue,
.calendar-agenda-event.event-overdue {
  color: var(--overdue-color, #dc2626);
}

.calendar-event.event-important,
.calendar-agenda-event.event-important {
  color: #92400e;
}

.calendar-agenda-grid {
  display: grid;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.calendar-agenda-week {
  grid-template-columns: repeat(7, minmax(10rem, 1fr));
}

.calendar-agenda-day {
  min-height: 24rem;
  border-right: 1px solid var(--surface-border, #d7dde7);
  padding: 0.75rem;
}

.calendar-agenda-day.weekend {
  background: var(--surface-50, #f8fafc);
}

.calendar-agenda-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.calendar-agenda-weekday {
  font-size: 1rem;
  font-weight: 700;
  text-transform: capitalize;
}

.calendar-agenda-date {
  color: var(--text-color-secondary, #64748b);
  font-size: 0.82rem;
}

.calendar-agenda-event {
  grid-template-columns: 3.5rem auto minmax(0, 1fr);
  min-height: 2.5rem;
  font-size: 0.85rem;
}

.calendar-agenda-meta {
  grid-column: 3;
}

.calendar-empty-day {
  border: 1px dashed var(--surface-border, #d7dde7);
  border-radius: 6px;
  padding: 1rem;
  color: var(--text-color-secondary, #64748b);
  text-align: center;
}

:global([data-theme="dark"]) .integram-calendar-page,
:global(.app-dark) .integram-calendar-page {
  --surface-ground: #16181d;
  --surface-card: #242832;
  --surface-50: #1c2028;
  --surface-border: #3a4150;
  --text-color: #e5e7eb;
  --text-color-secondary: #a7b0c0;
  --overdue-bg: #450a0a;
  --overdue-border: #7f1d1d;
  --overdue-color: #f87171;
}

@media (max-width: 900px) {
  .calendar-toolbar {
    grid-template-columns: 1fr;
  }

  .calendar-title {
    text-align: left;
  }

  .calendar-view-switcher {
    justify-content: flex-start;
  }

  .calendar-month-grid,
  .calendar-agenda-week {
    grid-template-columns: repeat(7, minmax(7rem, 1fr));
  }
}

@media (max-width: 640px) {
  .integram-calendar-page {
    padding: 0.75rem;
  }

  .calendar-page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .calendar-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .overdue-section {
    margin-left: 0;
  }

  .calendar-search {
    width: 100%;
    min-width: 0;
    margin-left: 0;
  }
}
</style>
