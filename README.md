# Vue-Gram CRM

Vue-Gram CRM - Vue 3 фронтенд для Интеграма. Проект переносит текущие
PHP-шаблоны и legacy JavaScript рабочие места из
[ideav/crm](https://github.com/ideav/crm) в поддерживаемое SPA на Vite,
сохраняя существующий backend Интеграма как источник авторизации, прав,
структуры данных, отчетов и DDL/DML операций.

Под Интеграмом здесь понимается CRM-платформа Ideav, а не Instagram.

## Текущее состояние

Репозиторий уже содержит не только ранний CRM demo-экран, а совместимую
оболочку Интеграма и набор перенесенных рабочих мест. README актуализирован
по закрытым parity issues и текущему коду:

- #11-#13: shell, авторизация, восстановление сессии, XSRF/token handling,
  меню, mobile/sidebar и совместимость старых ссылок.
- #14: JSON API contracts, fixtures и нормализация ответов backend.
- #15-#18: рабочее место таблиц, объектная таблица, карточка объекта,
  редактор объекта и базовые типы полей.
- #19-#20: отчеты, report embed/viewer, SQL editor и query builder.
- #21-#24: справочник, редактор типов, загрузка файлов, dir_admin,
  системная информация и диагностика.
- #25-#30: kanban/funnel/cards, dashboard, SmartQ/AI chat, формы, quiz,
  календарь и личный кабинет.
- #31-#33: migr, ProcVac и Sportzania workspaces.
- #34-#35: grants/permissions, видимость действий, cookies/localStorage и
  пользовательские настройки shell, таблиц, меню и dashboard.

Детальный список задач паритета находится в
[docs/INTEGRAM_FUNCTIONAL_BACKLOG.md](docs/INTEGRAM_FUNCTIONAL_BACKLOG.md).

## Возможности

- Совместимый Integram shell: верхняя панель, выбор базы, пользовательское
  меню, logout, смена темы, размер шрифта, brand background, sidebar,
  поиск по меню и мобильная навигация.
- Авторизация через `/login` с выбором сервера, входом в базу, регистрацией,
  сбросом пароля, восстановлением сохраненных сессий и переключением между
  доступными базами.
- Адаптер меню, который принимает legacy `menuData`, сохраняет вложенность,
  активный пункт, раскрытие разделов и старые URL aliases.
- Таблицы и объекты: список таблиц, объектная таблица, карточка объекта,
  inline/edit flows, subordinate tables, быстрые действия, drag/drop,
  сортировка, группировка, фильтры, настройки вида и compatibility helpers.
- Редактор типов и реквизитов с базовыми field/editor компонентами:
  boolean, chars, date, datetime, file, HTML, memo, number, password,
  path, reference, signed, short, report column и button.
- Отчеты: выполнение reports, embed/viewer режим, SQL editor, query builder,
  dashboard panels и сохранение настроек dashboard.
- Специализированные рабочие места: kanban/funnel/cards, SmartQ и AI chat,
  forms/myform/quiz, calendar, upload, dir_admin, migr, info diagnostics,
  cabinet, ProcVac и Sportzania task dashboard/rating/structure.
- Совместимость с правами и настройками Интеграма: `grants`, `role`,
  `roleId`, cookies, legacy localStorage keys, table UI settings и
  object-backed settings.

## Установка

### Требования

- **Node.js 20 или новее** (Vite 6 и Vitest 4 не работают на Node ниже 18; 20 LTS — рекомендуемая версия).
- **npm 10+** (поставляется с Node 20). `pnpm` и `yarn` совместимы по структуре, но команды ниже даны для npm.
- **git** для клонирования.

Проверить версии:

```bash
node --version    # должно быть v20.x или выше
npm --version     # должно быть 10.x или выше
```

### 1. Клонирование

```bash
git clone https://github.com/ideav/vue-gram.git
cd vue-gram
```

### 2. Установка зависимостей

```bash
npm install
```

`package-lock.json` зафиксирован — для воспроизводимой установки можно использовать `npm ci` (быстрее и строже, но не обновляет lock-файл).

### 3. Настройка окружения (опционально)

По умолчанию приложение указывает на `https://app.integram.io`. Если нужен другой backend Интеграма, создайте файл `.env.local` в корне:

```env
# .env.local — локальные переменные окружения для Vite
VITE_INTEGRAM_URL=https://dronedoc.ru
```

Источник сервера выбирается в порядке: `localStorage.integram_server` → `VITE_INTEGRAM_URL` → `https://app.integram.io`. На экране входа также можно выбрать один из готовых серверов: `https://dronedoc.ru`, `https://integram.io`, `https://app.integram.io`.

`.env.local` уже в `.gitignore` и в репозиторий не попадает.

### 4. Запуск dev-сервера

```bash
npm run dev
```

Vite поднимает локальный dev-сервер на `http://localhost:3000` с hot module reload. После старта откройте этот адрес в браузере — должна загрузиться страница `/login`. Введите учётные данные на выбранном backend Интеграма (см. шаг 3), и фронтенд должен начать работать с реальными данными.

### 5. Сборка production-версии

```bash
npm run build      # собирает оптимизированную сборку в dist/
npm run preview    # локальный сервер для проверки собранной версии
```

`dist/` — статическая сборка, её можно отдавать любым веб-сервером (nginx, Apache, статический хостинг). Маршрутизация на стороне клиента (Vue Router в history-режиме) — серверу нужно отдавать `index.html` для всех неизвестных путей.

### 6. Запуск тестов

Unit/component (Vitest):

```bash
npm test           # один прогон в jsdom-окружении
npm run test:watch # watch-режим для разработки
```

End-to-end (Playwright):

```bash
npx playwright install   # первый раз — установить браузеры (≈ 200-300 МБ)
npm run test:e2e
```

Unit-тесты покрывают API-адаптеры, shell, grants, таблицы, формы, отчёты, SmartQ, dashboard, миграции, Sportzania/ProcVac утилиты и компоненты полей/редакторов. Playwright покрывает основные route-level рабочие места.

## Настройка API

Основной API-клиент находится в
[`src/services/integramApiClient.js`](src/services/integramApiClient.js).
Он строит запросы в формате `{server}/{database}/{endpoint}?JSON_KV`,
хранит token/XSRF/session state и нормализует ответы backend.

Источник сервера выбирается в таком порядке:

1. `localStorage.integram_server`, если пользователь уже выбирал сервер.
2. `VITE_INTEGRAM_URL`.
3. `https://app.integram.io`.

Экран входа также дает выбрать один из известных серверов:
`https://dronedoc.ru`, `https://integram.io`, `https://app.integram.io`.

## Основные маршруты

Все рабочие места после входа открываются внутри маршрута `/:database`.

| Маршрут | Назначение |
| --- | --- |
| `/login` | вход, регистрация, сброс пароля, список активных баз |
| `/:database` | стартовая страница базы в Integram shell |
| `/:database/dict` | справочник объектов |
| `/:database/table` и `/:database/table/:typeId` | список таблиц и таблица данных |
| `/:database/object/:typeId` | объектный список/карточка типа |
| `/:database/edit_obj/:objectId` | редактор объекта |
| `/:database/edit_types` | редактор типов и реквизитов |
| `/:database/sql/:reportId?` | SQL editor |
| `/:database/smartq/:reportId?` | SmartQ и AI chat |
| `/:database/report/:reportId?` | отчеты |
| `/:database/report/:reportId/embed` | embedded report viewer |
| `/:database/dash/:dashboardId` | dashboard |
| `/:database/kanban/:sourceId?` | kanban workspace |
| `/:database/funnel/:sourceId?` | funnel workspace |
| `/:database/cards/:typeId?` | cards workspace |
| `/:database/calendar` | календарь |
| `/:database/form/:formId?` | конструктор и runtime форм |
| `/:database/myform/:formId?` | пользовательские формы |
| `/:database/quiz/:quizId?` | quiz runtime |
| `/:database/upload` | загрузка файлов |
| `/:database/dir_admin` | администрирование директорий |
| `/:database/migr` | migration workspace |
| `/:database/info` | системная информация и диагностика |
| `/:database/cabinet` | личный кабинет |
| `/:database/procvac` | ProcVac workspace |
| `/:database/sportzania/:workspace` | `taskdash`, `rating`, `struct`, `procvac` fallback |

Для совместимости сохранены redirects старых ссылок:
`tables -> table`, `query -> report`, `forms -> form`, `iquiz -> quiz`,
а также короткие Sportzania routes `taskdash`, `rating` и `struct`.

## Архитектура проекта

```text
src/
  assets/css/theme.css
  components/integram/       # общие и рабочие Vue-компоненты Интеграма
  composables/               # shell, theme, grants, session и UI state
  router/index.js            # Vue Router и legacy redirects
  services/
    integramApiClient.js     # прямой клиент JSON API Интеграма
    integramService.js       # высокоуровневые операции поверх API client
  stores/                    # Pinia state
  utils/                     # нормализация, permissions, reports, workspaces
  views/integram/            # route-level рабочие места
e2e/                         # Playwright smoke/e2e specs
docs/                        # migration/parity/API/storage documentation
experiments/                 # одноразовые исследовательские скрипты
```

## Документация

- [План переписывания CRM на Vue + Интеграм](docs/VUE_INTEGRAM_REWRITE_PLAN.md)
- [Бэклог функционального паритета](docs/INTEGRAM_FUNCTIONAL_BACKLOG.md)
- [JSON API contracts](docs/INTEGRAM_JSON_API_CONTRACTS.md)
- [Storage compatibility](docs/INTEGRAM_STORAGE_COMPATIBILITY.md)
- [SQL / Query Builder parity](docs/SQL_QUERY_BUILDER_PARITY.md)
- [ProcVac legacy parity](docs/PROCVAC_PARITY.md)
- [Sportzania workspace parity](docs/SPORTZANIA_WORKSPACES.md)

Скриншоты ключевых рабочих мест лежат в [docs/screenshots](docs/screenshots).

## Лицензия

ISC

## Благодарности

Проект основан на [Ideav CRM](https://github.com/ideav/crm) и переносит ее
функциональность в Vue-приложение с сохранением совместимости Интеграма.
