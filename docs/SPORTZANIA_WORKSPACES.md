# Sportzania Workspace Parity

Issue: https://github.com/ideav/vue-gram/issues/33

Legacy references from `templates/sportzania/*`:

| Legacy template | Vue route or fallback | Backend contract | Status |
| --- | --- | --- | --- |
| `templates/sportzania/main.html` | `/:database` | Integram shell/session/menu storage | Covered by the Vue Integram shell |
| `templates/sportzania/taskdash.html` | `/:database/sportzania/taskdash`, legacy alias `/:database/taskdash` | `report/155675?JSON_KV`, filters `FR_Месяц`, `TO_Месяц`, `FR_Департамент`, `FR_СтатусID` | Ported |
| `templates/sportzania/rating.html` | `/:database/sportzania/rating`, legacy alias `/:database/rating` | `report/155768?JSON_KV`, filters `FR_Срок`, `TO_Срок`, `FR_Департамент`, `FR_ФИО` | Ported |
| `templates/sportzania/struct.html` | `/:database/sportzania/struct`, legacy alias `/:database/struct` | `report/8027?JSON_KV`, active hire status `2985`, `Руководитель` marks department heads | Ported |
| `templates/sportzania/procvac.html` | `/:database/sportzania/procvac` explicit fallback | Legacy bundle boundary: `js/procvac.js`, `css/procvac.css` | Deferred to issue #32 |

## Ported Behavior

- The task dashboard preserves the legacy report id, JSON_KV mode, current-year date default, department/status filters, incomplete-status `!8925` option, KPI totals, monthly stacked chart, and sortable result table.
- The rating workspace preserves the legacy report id, JSON_KV mode, current-year period default, department/person filters, task-weighted performer aggregation, score calculation, leader list, and sortable result table.
- The structure workspace preserves the report id, active employee filter, department parent hierarchy, head/employee split, and expandable employee lists.
- The ProcVac route is intentionally visible as a fallback because the related legacy JS/CSS bundle is tracked separately by issue #32.

## Fixtures And Tests

- `src/utils/__fixtures__/sportzania.js` contains minimal task dashboard, rating, and org chart report payloads.
- `src/utils/__tests__/sportzaniaWorkspaces.spec.js` covers template inventory documentation, JSON_KV normalization, report filter parameters, metric aggregation, and org tree building.
- `e2e/sportzania.spec.ts` opens `taskdash`, `rating`, `struct`, and the explicit `procvac` fallback with mocked Integram API responses, and verifies the legacy aliases redirect to the Vue workspace routes.
