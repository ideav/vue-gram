import { describe, expect, it } from 'vitest';

import monthTasks from '@/services/__fixtures__/integramApi/calendar-month-tasks.json';
import weekTasks from '@/services/__fixtures__/integramApi/calendar-week-tasks.json';
import dayTasks from '@/services/__fixtures__/integramApi/calendar-day-tasks.json';
import {
  buildCalendarReportParams,
  buildCalendarTaskEvent,
  formatCalendarApiDate,
  formatCalendarApiDateTime,
  getCalendarDateRange,
  groupCalendarTasksByDay,
  isCalendarTaskActionAllowed,
  normalizeCalendarTask,
  parseCalendarDate,
  taskMatchesCalendarSearch
} from '../calendarUtils';
import {
  adminPermissionContext,
  missingPermissionContext,
  readOnlyPermissionContext,
  writePermissionContext
} from '../__fixtures__/permissions';

describe('calendarUtils legacy calendar parity', () => {
  it('normalizes legacy task date strings and preserves local wall-clock time', () => {
    const ruDate = parseCalendarDate('15.01.2026 23:59:58');
    const isoDate = parseCalendarDate('2026-01-15 08:07:06');

    expect(ruDate).toBeInstanceOf(Date);
    expect(ruDate.getFullYear()).toBe(2026);
    expect(ruDate.getMonth()).toBe(0);
    expect(ruDate.getDate()).toBe(15);
    expect(ruDate.getHours()).toBe(23);
    expect(ruDate.getMinutes()).toBe(59);
    expect(ruDate.getSeconds()).toBe(58);

    expect(isoDate).toBeInstanceOf(Date);
    expect(isoDate.getFullYear()).toBe(2026);
    expect(isoDate.getHours()).toBe(8);

    expect(parseCalendarDate('31.02.2026 10:00:00')).toBeNull();
    expect(parseCalendarDate('not a date')).toBeNull();
  });

  it('formats dates for the same report and update contracts used by legacy calendar.html', () => {
    const date = new Date(2026, 0, 5, 8, 9, 7);

    expect(formatCalendarApiDate(date)).toBe('05.01.2026');
    expect(formatCalendarApiDateTime(date)).toBe('05.01.2026 08:09:07');
  });

  it('uses Monday as first day and FullCalendar-compatible exclusive ranges', () => {
    expect(getCalendarDateRange('month', new Date(2026, 0, 15))).toMatchObject({
      start: new Date(2025, 11, 29),
      end: new Date(2026, 1, 2),
      currentStart: new Date(2026, 0, 1),
      currentEnd: new Date(2026, 1, 1)
    });

    expect(getCalendarDateRange('week', new Date(2026, 0, 11))).toMatchObject({
      start: new Date(2026, 0, 5),
      end: new Date(2026, 0, 12)
    });

    expect(getCalendarDateRange('day', new Date(2026, 0, 15, 12))).toMatchObject({
      start: new Date(2026, 0, 15),
      end: new Date(2026, 0, 16)
    });
  });

  it('builds the legacy report query parameters for month, week, and day fixtures', () => {
    const monthRange = getCalendarDateRange('month', new Date(2026, 0, 15));
    const weekRange = getCalendarDateRange('week', new Date(2026, 0, 11));
    const dayRange = getCalendarDateRange('day', new Date(2026, 0, 15));

    expect(buildCalendarReportParams(monthRange, {
      executorId: '7',
      taskTypeId: '44',
      statusId: '12',
      importantOnly: true
    })).toEqual({
      _jsonFormat: 'JSON_KV',
      FR_date: '29.12.2025',
      TO_date: '02.02.2026',
      'FR_ИсполнительID': '7',
      'FR_Исполнитель': '%',
      'FR_Тип задачиID': '44',
      'FR_Статус задачиID': '12',
      'FR_Важно': '%'
    });

    expect(buildCalendarReportParams(weekRange, {}).TO_date).toBe('12.01.2026');
    expect(buildCalendarReportParams(dayRange, {}).FR_date).toBe('15.01.2026');
  });

  it('covers month/week/day task fixtures and edge dates when grouping by day', () => {
    const groupedMonth = groupCalendarTasksByDay(monthTasks.map(task => normalizeCalendarTask(task)));
    const groupedWeek = groupCalendarTasksByDay(weekTasks.map(task => normalizeCalendarTask(task)));
    const groupedDay = groupCalendarTasksByDay(dayTasks.map(task => normalizeCalendarTask(task)));

    expect(groupedMonth.get('2025-12-31')).toHaveLength(1);
    expect(groupedMonth.get('2026-01-01')[0].id).toBe('9102');
    expect(groupedMonth.get('2026-02-01')[0].title).toBe('Проверка границы февраля');
    expect(groupedWeek.get('2026-01-05')[0].title).toBe('План на понедельник');
    expect(groupedWeek.get('2026-01-11')[0].title).toBe('Воскресный контроль');
    expect(groupedDay.get('2026-01-15')).toHaveLength(2);
  });

  it('matches legacy search fields and event classification', () => {
    const task = normalizeCalendarTask(monthTasks[1], new Date(2026, 0, 2));
    const event = buildCalendarTaskEvent(task, 'созвон');

    expect(taskMatchesCalendarSearch(task, 'beta')).toBe(true);
    expect(taskMatchesCalendarSearch(task, 'звонок')).toBe(true);
    expect(taskMatchesCalendarSearch(task, 'missing')).toBe(false);
    expect(event).toMatchObject({
      id: '9102',
      title: 'Новогодний созвон',
      iconClass: 'pi pi-phone',
      classNames: expect.arrayContaining(['event-overdue', 'event-search-match'])
    });
    expect(event.classNames).not.toContain('event-important');
  });

  it('uses centralized grants for task write actions', () => {
    expect(isCalendarTaskActionAllowed(readOnlyPermissionContext)).toBe(false);
    expect(isCalendarTaskActionAllowed(missingPermissionContext)).toBe(false);
    expect(isCalendarTaskActionAllowed(writePermissionContext)).toBe(true);
    expect(isCalendarTaskActionAllowed(adminPermissionContext)).toBe(true);
  });
});
