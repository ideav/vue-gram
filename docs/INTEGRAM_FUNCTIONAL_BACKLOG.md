# Бэклог функционального паритета Интеграма

Issue #9 требует создать отдельную задачу на каждый фрагмент функционала,
который нужно перенести с точным паритетом к текущему Интеграму.

Бэклог ниже составлен на основе:

- перенесенного плана в `docs/VUE_INTEGRAM_REWRITE_PLAN.md`;
- текущих Vue routes и components в `src/router/index.js`, `src/views/integram/` и `src/components/integram/`;
- legacy-поверхности Интеграма из `ideav/crm`: `templates/`, `js/` и `css/`.

Каждая созданная задача намеренно описывает паритет с текущим поведением
Интеграма, а не редизайн или приблизительную замену.

| Задача | Фрагмент функционала | Legacy-поверхность |
| --- | --- | --- |
| [#11](https://github.com/ideav/vue-gram/issues/11) | Shell: layout, тема, пользовательское меню и logout | `templates/main.html`, `js/app.js`, `js/main-app.js`, `css/main-app.css`, `css/styles.css` |
| [#12](https://github.com/ideav/vue-gram/issues/12) | Авторизация, XSRF и совместимость сессии | `index.php`, `templates/main.html`, `js/app.js`, `/xsrf?JSON`, `/auth?JSON` |
| [#13](https://github.com/ideav/vue-gram/issues/13) | Меню: вложенность, поиск, mobile/sidebar и старые ссылки | `templates/main.html`, `js/main-app.js`, серверный `menuData` |
| [#14](https://github.com/ideav/vue-gram/issues/14) | Контракты JSON API и fixtures | `/metadata`, `/terms?JSON`, `/object/*`, `/report/*`, `/_m_new`, `/_m_set`, `/_ref_reqs` |
| [#15](https://github.com/ideav/vue-gram/issues/15) | Рабочее место "Таблицы" | `templates/tables.html`, `js/tables.js`, `css/tables.css` |
| [#16](https://github.com/ideav/vue-gram/issues/16) | Таблица объектов / паритет IntegramTable | `templates/table.html`, `js/integram-table.js`, `js/integram-table/*`, `css/integram-table.css` |
| [#17](https://github.com/ideav/vue-gram/issues/17) | Карточка объекта и список объектов | `templates/object.html`, сценарии `/object/{typeId}?JSON_*` |
| [#18](https://github.com/ideav/vue-gram/issues/18) | Редактор объекта и базовые типы полей | `templates/edit_obj.html`, legacy-сценарии редактора объекта |
| [#19](https://github.com/ideav/vue-gram/issues/19) | Отчеты и report embed/viewer | `templates/report.html`, `/report/{reportId}?JSON` |
| [#20](https://github.com/ideav/vue-gram/issues/20) | Паритет SQL/query builder | `templates/sql.html`, `templates/query.html` |
| [#21](https://github.com/ideav/vue-gram/issues/21) | Справочник и редактор типов | `templates/dict.html`, `templates/edit_types.html` |
| [#22](https://github.com/ideav/vue-gram/issues/22) | Загрузка файлов | `templates/upload.html`, поведение upload endpoint |
| [#23](https://github.com/ideav/vue-gram/issues/23) | Администрирование директорий | `templates/dir_admin.html` |
| [#24](https://github.com/ideav/vue-gram/issues/24) | Системная информация и диагностика | `templates/info.html`, `js/info.js`, `css/info.css` |
| [#25](https://github.com/ideav/vue-gram/issues/25) | Kanban, funnel and cards workspaces | `templates/kanban.html`, `templates/funnel.html`, `templates/cards.html` |
| [#26](https://github.com/ideav/vue-gram/issues/26) | Dashboard | `templates/dash.html`, `js/dash.js`, `css/dash.css` |
| [#27](https://github.com/ideav/vue-gram/issues/27) | SmartQ and AI chat | `templates/smartq.html`, `js/ai-chat.js`, `css/ai-chat.css` |
| [#28](https://github.com/ideav/vue-gram/issues/28) | Конструктор форм, прохождение форм и quiz | `templates/form.html`, `templates/forms.html`, `templates/quiz.html` |
| [#29](https://github.com/ideav/vue-gram/issues/29) | Календарь | `templates/calendar.html`, связанные calendar/task сценарии |
| [#30](https://github.com/ideav/vue-gram/issues/30) | Личный кабинет | `templates/my/*`, `js/cabinet.js`, `css/cabinet.css` |
| [#31](https://github.com/ideav/vue-gram/issues/31) | Рабочее место migr | `templates/migr.html`, `js/migr.js`, `css/migr.css` |
| [#32](https://github.com/ideav/vue-gram/issues/32) | Рабочее место ProcVac | `js/procvac.js`, `css/procvac.css`, связанные legacy routes |
| [#33](https://github.com/ideav/vue-gram/issues/33) | Рабочие места Sportzania | `templates/sportzania/*` |
| [#34](https://github.com/ideav/vue-gram/issues/34) | Permissions, grants и видимость действий | глобальные `grants`, `role`, `roleId`, permission checks across legacy UI |
| [#35](https://github.com/ideav/vue-gram/issues/35) | Совместимость пользовательских настроек | cookies/localStorage и object-backed settings для shell, tables, menu and dashboard |

## Правило для следующих задач

При реализации любой из этих задач сначала нужно описать legacy-сценарий и API
contract, затем добавить fixtures/tests и только после этого заменять UI
поведение. Parity issue не стоит закрывать только на основании визуального
приближения.
