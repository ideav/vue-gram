/**
 * Calendar Utilities
 *
 * Utilities for calendar operations, timezone handling, and iCalendar export
 */

/**
 * Common timezones list
 */
export const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Kiev', label: 'Киев (UTC+2)' },
  { value: 'Europe/Minsk', label: 'Минск (UTC+3)' },
  { value: 'Europe/London', label: 'Лондон (UTC+0)' },
  { value: 'Europe/Paris', label: 'Париж (UTC+1)' },
  { value: 'Europe/Berlin', label: 'Берлин (UTC+1)' },
  { value: 'America/New_York', label: 'Нью-Йорк (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC-8)' },
  { value: 'America/Chicago', label: 'Чикаго (UTC-6)' },
  { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Шанхай (UTC+8)' },
  { value: 'Asia/Dubai', label: 'Дубай (UTC+4)' },
  { value: 'Australia/Sydney', label: 'Сидней (UTC+11)' }
];

/**
 * Get user's timezone
 */
export function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (error) {
    return 'UTC';
  }
}

/**
 * Format date in timezone
 *
 * @param {Date|string} date - Date to format
 * @param {string} timezone - Timezone
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDateInTimezone(date, timezone = 'UTC', options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone
  };

  return new Date(date).toLocaleString('ru-RU', { ...defaultOptions, ...options });
}

/**
 * Convert date to ISO string in timezone
 *
 * @param {Date} date - Date object
 * @param {string} timezone - Timezone
 * @returns {string} ISO 8601 string
 */
export function dateToISOInTimezone(date, timezone) {
  // Note: This is a simplified version. For production, use a library like date-fns-tz or luxon
  return date.toISOString();
}

/**
 * Generate iCalendar (.ics) file content
 *
 * @param {Object} meeting - Meeting object
 * @returns {string} iCalendar content
 */
export function generateICalendar(meeting) {
  const {
    title,
    description = '',
    startTime,
    endTime,
    joinUrl,
    organizerEmail,
    organizerName = 'Организатор'
  } = meeting;

  // Format dates for iCal (YYYYMMDDTHHMMSSZ)
  const formatICalDate = (dateStr) => {
    return new Date(dateStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const uid = `${meeting.id}@drondoc.ru`;
  const dtstamp = formatICalDate(new Date().toISOString());
  const dtstart = formatICalDate(startTime);
  const dtend = formatICalDate(endTime);

  const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DronDoc//Video Conference Scheduler//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
DTSTART:${dtstart}
DTEND:${dtend}
DTSTAMP:${dtstamp}
ORGANIZER;CN=${organizerName}:mailto:${organizerEmail}
UID:${uid}
SUMMARY:${title}
DESCRIPTION:${description}\\n\\nПрисоединиться: ${joinUrl}
LOCATION:${joinUrl}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

  return icalContent;
}

/**
 * Download iCalendar file
 *
 * @param {Object} meeting - Meeting object
 * @param {string} filename - File name (default: meeting title)
 */
export function downloadICalendar(meeting, filename) {
  const icalContent = generateICalendar(meeting);
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${meeting.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Add to Google Calendar URL
 *
 * @param {Object} meeting - Meeting object
 * @returns {string} Google Calendar URL
 */
export function getGoogleCalendarUrl(meeting) {
  const { title, description, startTime, endTime, joinUrl } = meeting;

  const formatGoogleDate = (dateStr) => {
    return new Date(dateStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: `${description || ''}\n\nПрисоединиться: ${joinUrl}`,
    location: joinUrl,
    dates: `${formatGoogleDate(startTime)}/${formatGoogleDate(endTime)}`
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Add to Outlook Calendar URL
 *
 * @param {Object} meeting - Meeting object
 * @returns {string} Outlook Calendar URL
 */
export function getOutlookCalendarUrl(meeting) {
  const { title, description, startTime, endTime, joinUrl } = meeting;

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    body: `${description || ''}\n\nПрисоединиться: ${joinUrl}`,
    location: joinUrl,
    startdt: new Date(startTime).toISOString(),
    enddt: new Date(endTime).toISOString()
  });

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Calculate meeting duration in minutes
 *
 * @param {string} startTime - Start time (ISO 8601)
 * @param {string} endTime - End time (ISO 8601)
 * @returns {number} Duration in minutes
 */
export function calculateDuration(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.round((end - start) / (1000 * 60));
}

/**
 * Format duration as human-readable string
 *
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} мин`;
  } else if (mins === 0) {
    return `${hours} ч`;
  } else {
    return `${hours} ч ${mins} мин`;
  }
}

/**
 * Check if meeting is happening now
 *
 * @param {string} startTime - Start time (ISO 8601)
 * @param {string} endTime - End time (ISO 8601)
 * @returns {boolean} True if meeting is in progress
 */
export function isMeetingNow(startTime, endTime) {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  return now >= start && now <= end;
}

/**
 * Check if meeting is upcoming (within next hour)
 *
 * @param {string} startTime - Start time (ISO 8601)
 * @returns {boolean} True if meeting starts within next hour
 */
export function isMeetingUpcoming(startTime) {
  const now = new Date();
  const start = new Date(startTime);
  const oneHour = 60 * 60 * 1000;
  return start > now && (start - now) <= oneHour;
}

/**
 * Check if meeting is in the past
 *
 * @param {string} endTime - End time (ISO 8601)
 * @returns {boolean} True if meeting has ended
 */
export function isMeetingPast(endTime) {
  const now = new Date();
  const end = new Date(endTime);
  return end < now;
}

/**
 * Get meeting status based on time
 *
 * @param {string} startTime - Start time (ISO 8601)
 * @param {string} endTime - End time (ISO 8601)
 * @param {string} status - Scheduled status
 * @returns {string} Status: 'upcoming', 'now', 'past', 'cancelled'
 */
export function getMeetingStatus(startTime, endTime, status = 'scheduled') {
  if (status === 'cancelled') return 'cancelled';
  if (isMeetingNow(startTime, endTime)) return 'now';
  if (isMeetingPast(endTime)) return 'past';
  return 'upcoming';
}

/**
 * Get status color for badge/chip
 *
 * @param {string} status - Meeting status
 * @returns {string} Color name for PrimeVue severity
 */
export function getStatusColor(status) {
  switch (status) {
    case 'now':
      return 'success';
    case 'upcoming':
      return 'info';
    case 'past':
      return 'secondary';
    case 'cancelled':
      return 'danger';
    default:
      return 'info';
  }
}

/**
 * Get status label
 *
 * @param {string} status - Meeting status
 * @returns {string} Human-readable status label
 */
export function getStatusLabel(status) {
  switch (status) {
    case 'now':
      return 'Сейчас';
    case 'upcoming':
      return 'Предстоящая';
    case 'past':
      return 'Завершена';
    case 'cancelled':
      return 'Отменена';
    default:
      return 'Запланирована';
  }
}

/**
 * Parse recurrence pattern to human-readable text
 *
 * @param {string} pattern - Recurrence pattern
 * @returns {string} Human-readable recurrence description
 */
export function getRecurrenceLabel(pattern) {
  switch (pattern) {
    case 'none':
      return 'Не повторяется';
    case 'daily':
      return 'Ежедневно';
    case 'weekly':
      return 'Еженедельно';
    case 'monthly':
      return 'Ежемесячно';
    case 'custom':
      return 'Пользовательское расписание';
    default:
      return 'Не повторяется';
  }
}

export const CALENDAR_TASK_REPORT_ID = 4283;
export const CALENDAR_EXECUTOR_REPORT_ID = 5230;
export const CALENDAR_TASK_TYPE_REPORT_ID = 5241;
export const CALENDAR_STATUS_REPORT_ID = 'Все статусы задач';
export const CALENDAR_TASK_TYPE_ID = 3596;
export const CALENDAR_DEADLINE_REQUISITE_ID = 3888;

export const CALENDAR_VIEW_MODES = Object.freeze({
  month: {
    value: 'month',
    label: 'Месяц',
    legacyView: 'dayGridMonth'
  },
  week: {
    value: 'week',
    label: 'Неделя',
    legacyView: 'timeGridWeek'
  },
  day: {
    value: 'day',
    label: 'День',
    legacyView: 'timeGridDay'
  }
});

export const CALENDAR_WEEKDAYS = Object.freeze([
  'Пн',
  'Вт',
  'Ср',
  'Чт',
  'Пт',
  'Сб',
  'Вс'
]);

export const CALENDAR_TASK_TYPE_ICONS = Object.freeze({
  'Звонок': 'pi pi-phone',
  'Доработка CRM': 'pi pi-file',
  'Встреча': 'pi pi-users',
  'Email': 'pi pi-envelope',
  'Другое': 'pi pi-pencil'
});

const RUSSIAN_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
const LOCAL_ISO_DATE_RE = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
const OFFSET_ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;

function pad2(value) {
  return String(value).padStart(2, '0');
}

function cloneDate(date) {
  return new Date(date.getTime());
}

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function startOfDay(date) {
  const copy = cloneDate(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  const copy = cloneDate(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date, months) {
  const copy = cloneDate(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function makeLocalDate(year, month, day, hours = 0, minutes = 0, seconds = 0) {
  const date = new Date(year, month - 1, day, hours, minutes, seconds, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hours ||
    date.getMinutes() !== minutes ||
    date.getSeconds() !== seconds
  ) {
    return null;
  }
  return date;
}

export function parseCalendarDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return isValidDate(value) ? cloneDate(value) : null;
  }

  const text = String(value).trim();
  if (!text) return null;

  if (OFFSET_ISO_DATE_RE.test(text)) {
    const date = new Date(text);
    return isValidDate(date) ? date : null;
  }

  const ruMatch = text.match(RUSSIAN_DATE_RE);
  if (ruMatch) {
    const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = ruMatch;
    return makeLocalDate(
      Number(year),
      Number(month),
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds)
    );
  }

  const isoMatch = text.match(LOCAL_ISO_DATE_RE);
  if (isoMatch) {
    const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = isoMatch;
    return makeLocalDate(
      Number(year),
      Number(month),
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds)
    );
  }

  return null;
}

export function formatCalendarApiDate(value) {
  const date = parseCalendarDate(value);
  if (!date) return '';
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

export function formatCalendarApiDateTime(value) {
  const date = parseCalendarDate(value);
  if (!date) return '';
  return `${formatCalendarApiDate(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

export function formatCalendarDayKey(value) {
  const date = parseCalendarDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function getCalendarWeekStart(value) {
  const date = startOfDay(parseCalendarDate(value) || new Date());
  const daysFromMonday = (date.getDay() + 6) % 7;
  return addDays(date, -daysFromMonday);
}

export function getCalendarDateRange(viewMode = 'month', value = new Date()) {
  const date = parseCalendarDate(value) || new Date();

  if (viewMode === 'day') {
    const start = startOfDay(date);
    return {
      viewMode: 'day',
      start,
      end: addDays(start, 1),
      currentStart: start,
      currentEnd: addDays(start, 1)
    };
  }

  if (viewMode === 'week') {
    const start = getCalendarWeekStart(date);
    return {
      viewMode: 'week',
      start,
      end: addDays(start, 7),
      currentStart: start,
      currentEnd: addDays(start, 7)
    };
  }

  const currentStart = startOfMonth(date);
  const currentEnd = addMonths(currentStart, 1);
  const start = getCalendarWeekStart(currentStart);
  let end = getCalendarWeekStart(currentEnd);
  if (end.getTime() < currentEnd.getTime()) end = addDays(end, 7);

  return {
    viewMode: 'month',
    start,
    end,
    currentStart,
    currentEnd
  };
}

export function getCalendarPeriodTitle(viewMode, date) {
  const range = getCalendarDateRange(viewMode, date);

  if (range.viewMode === 'day') {
    return formatCalendarApiDate(range.currentStart);
  }

  if (range.viewMode === 'week') {
    return `${formatCalendarApiDate(range.start)} - ${formatCalendarApiDate(addDays(range.end, -1))}`;
  }

  return range.currentStart.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric'
  });
}

export function shiftCalendarDate(viewMode, value, direction) {
  const date = parseCalendarDate(value) || new Date();
  if (viewMode === 'day') return addDays(date, direction);
  if (viewMode === 'week') return addDays(date, direction * 7);
  return addMonths(date, direction);
}

export function enumerateCalendarDays(start, end) {
  const days = [];
  let cursor = startOfDay(parseCalendarDate(start) || new Date());
  const endDate = startOfDay(parseCalendarDate(end) || cursor);

  while (cursor.getTime() < endDate.getTime()) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function buildCalendarReportParams(range, filters = {}) {
  const params = {
    _jsonFormat: 'JSON_KV',
    FR_date: formatCalendarApiDate(range.start),
    TO_date: formatCalendarApiDate(range.end)
  };

  if (filters.executorId) {
    params['FR_ИсполнительID'] = String(filters.executorId);
    params['FR_Исполнитель'] = '%';
  }

  if (filters.taskTypeId) {
    params['FR_Тип задачиID'] = String(filters.taskTypeId);
  }

  if (filters.statusId) {
    params['FR_Статус задачиID'] = String(filters.statusId);
  }

  if (filters.importantOnly) {
    params['FR_Важно'] = '%';
  }

  return params;
}

export function getCalendarOptionValue(item, idKeys, valueKeys = []) {
  if (!item || typeof item !== 'object') return '';
  for (const key of idKeys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') return String(item[key]);
  }
  for (const key of valueKeys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') return String(item[key]);
  }
  return '';
}

export function getCalendarOptionLabel(item, labelKeys, fallbackKeys = []) {
  if (!item || typeof item !== 'object') return '';
  for (const key of labelKeys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') return String(item[key]);
  }
  for (const key of fallbackKeys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') return String(item[key]);
  }
  return '';
}

export function normalizeCalendarOption(item, idKeys, labelKeys) {
  const value = getCalendarOptionValue(item, idKeys, labelKeys);
  const label = getCalendarOptionLabel(item, labelKeys, idKeys);
  return value || label ? { value: value || label, label: label || value, raw: item } : null;
}

export function normalizeCalendarTask(rawTask = {}, now = new Date()) {
  const deadline = parseCalendarDate(rawTask['Срок'] ?? rawTask.deadline ?? rawTask.start);
  const taskType = rawTask['Тип задачи'] || rawTask.taskType || 'Другое';
  const status = rawTask['Статус'] || rawTask.status || '';
  const deadlineLabel = rawTask['Срок'] || (deadline ? formatCalendarApiDateTime(deadline) : '');
  const important = rawTask['Важно'] === 'X' || rawTask.important === true;
  const completed = status === 'Выполнена';

  return {
    id: String(rawTask['ЗадачаID'] ?? rawTask.id ?? ''),
    title: rawTask['Задача'] || rawTask.title || 'Без названия',
    description: rawTask['Описание'] || rawTask.description || '',
    client: rawTask['Клиент'] || rawTask.client || '',
    executor: rawTask['Исполнитель'] || rawTask.executor || '',
    executorId: String(rawTask['ИсполнительID'] ?? rawTask.executorId ?? ''),
    status,
    statusId: String(rawTask['Статус задачиID'] ?? rawTask.statusId ?? ''),
    taskType,
    taskTypeId: String(rawTask['Тип задачиID'] ?? rawTask.taskTypeId ?? ''),
    deadline,
    deadlineLabel,
    important,
    completed,
    customColor: rawTask.color || '',
    isOverdue: Boolean(deadline && deadline < now && !completed),
    raw: rawTask
  };
}

export function taskMatchesCalendarSearch(task, query) {
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  return [
    task.title,
    task.description,
    task.client,
    task.executor,
    task.status,
    task.taskType,
    task.deadlineLabel
  ].some(field => String(field || '').toLocaleLowerCase().includes(normalizedQuery));
}

export function buildCalendarTaskEvent(task, searchQuery = '') {
  const iconClass = CALENDAR_TASK_TYPE_ICONS[task.taskType] || CALENDAR_TASK_TYPE_ICONS['Другое'];
  const classNames = [];
  let color = 'var(--primary-color)';

  if (task.customColor) {
    color = task.customColor;
    classNames.push('event-custom');
  } else if (task.isOverdue) {
    color = 'var(--overdue-color)';
    classNames.push('event-overdue');
  } else if (task.important) {
    color = 'var(--important-color)';
    classNames.push('event-important');
  }

  if (searchQuery && taskMatchesCalendarSearch(task, searchQuery)) {
    classNames.push('event-search-match');
  }

  return {
    id: task.id,
    title: task.title,
    start: task.deadline,
    color,
    iconClass,
    classNames,
    task
  };
}

export function groupCalendarTasksByDay(tasks = []) {
  const grouped = new Map();
  for (const task of tasks) {
    if (!task.deadline) continue;
    const key = formatCalendarDayKey(task.deadline);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(task);
  }

  for (const items of grouped.values()) {
    items.sort((left, right) => {
      const leftTime = left.deadline?.getTime() || 0;
      const rightTime = right.deadline?.getTime() || 0;
      return leftTime - rightTime || left.title.localeCompare(right.title, 'ru');
    });
  }

  return grouped;
}

export function isCalendarTaskActionAllowed(authInfo = {}) {
  const role = String(authInfo.userRole || authInfo.role || '').toLocaleLowerCase();
  if (['readonly', 'read-only', 'viewer', 'guest'].includes(role)) return false;
  const grants = authInfo.grants || {};
  const taskGrant = grants[CALENDAR_TASK_TYPE_ID] || grants[String(CALENDAR_TASK_TYPE_ID)];
  if (taskGrant && String(taskGrant).toLocaleUpperCase() === 'READ') return false;
  return true;
}

export default {
  TIMEZONES,
  CALENDAR_TASK_REPORT_ID,
  CALENDAR_EXECUTOR_REPORT_ID,
  CALENDAR_TASK_TYPE_REPORT_ID,
  CALENDAR_STATUS_REPORT_ID,
  CALENDAR_TASK_TYPE_ID,
  CALENDAR_DEADLINE_REQUISITE_ID,
  CALENDAR_VIEW_MODES,
  CALENDAR_WEEKDAYS,
  CALENDAR_TASK_TYPE_ICONS,
  getUserTimezone,
  formatDateInTimezone,
  dateToISOInTimezone,
  generateICalendar,
  downloadICalendar,
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  calculateDuration,
  formatDuration,
  isMeetingNow,
  isMeetingUpcoming,
  isMeetingPast,
  getMeetingStatus,
  getStatusColor,
  getStatusLabel,
  getRecurrenceLabel,
  parseCalendarDate,
  formatCalendarApiDate,
  formatCalendarApiDateTime,
  formatCalendarDayKey,
  getCalendarWeekStart,
  getCalendarDateRange,
  getCalendarPeriodTitle,
  shiftCalendarDate,
  enumerateCalendarDays,
  buildCalendarReportParams,
  getCalendarOptionValue,
  getCalendarOptionLabel,
  normalizeCalendarOption,
  normalizeCalendarTask,
  taskMatchesCalendarSearch,
  buildCalendarTaskEvent,
  groupCalendarTasksByDay,
  isCalendarTaskActionAllowed
};
