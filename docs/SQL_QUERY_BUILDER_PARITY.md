# SQL / Query Builder Legacy Parity

Issue: https://github.com/ideav/vue-gram/issues/20

Legacy references:

- `templates/sql.html`
- `templates/query.html`

## Backend contract

- [x] Report objects use type `22`.
- [x] Report columns use type `28` and are loaded with `object/28/?F_U={reportId}&LIMIT=1000`.
- [x] Manual joins use type `44` and are loaded with `object/44/?F_U={reportId}&LIMIT=1000`.
- [x] Report preview uses `report/{reportId}?LIMIT={limit}`.
- [x] Report settings serialize to `_m_set/{reportId}` requisites `95` (interactive) and `134` (limit).
- [x] Column settings serialize to `_m_set/{columnId}` using legacy requisite ids.
- [x] Column and join creation goes through `_m_new/28` and `_m_new/44` with the report as parent.
- [x] Column and join delete/move actions use `_m_del/{id}` and `_m_up/{id}`.

## SQL builder controls

- [x] Report list, search, and create flow.
- [x] Deep link loading for `/:database/sql/:reportId`.
- [x] Links from SQL builder to `query`, `report`, and raw object edit views.
- [x] Column alias/name: requisite `100`.
- [x] Formula/expression: requisite `101`.
- [x] Filter from/to: requisites `102` and `103`.
- [x] Function: requisite `104`; includes legacy `abn_ID` (`85`) used by the ID-column action.
- [x] HAVING from/to: requisites `105` and `106`.
- [x] Hidden column flag: requisite `107`.
- [x] Sort order: requisite `109`, preserving positive `ASC` and negative `DESC` priorities.
- [x] Totals: requisite `72` with legacy `SUM`, `AVG`, `MIN`, `MAX`, `COUNT` values.
- [x] Format: requisite `84`.
- [x] Source alias: requisite `58`.
- [x] SET expression: requisite `132`.
- [x] Add regular, calculated, and ID-derived report columns.
- [x] Add, edit, and delete manual joins with alias requisite `265` and condition requisite `266`.
- [x] Legacy column-oriented report result payloads normalize into a row table with totals.
- [x] SQL preview reflects report settings for review before executing the report.

## Query template behavior

- [x] `/:database/query/:reportId?` is routed to the report viewer, matching the legacy `templates/query.html` role of loading a report by id.
- [x] `/:database/report/:reportId?` remains available for the existing report viewer route.

## Tests

- [x] `src/utils/__tests__/integramReportBuilder.spec.js` covers legacy requisite normalization, SQL preview generation, and serialization payloads.
- [x] `src/views/integram/__tests__/IntegramSqlView.spec.js` covers loading a report builder and saving a column alias to requisite `100`.
- [x] `e2e/sql-query-builder.spec.ts` covers loading the builder, changing a column setting, and refreshing report preview/results with mocked Integram endpoints.
