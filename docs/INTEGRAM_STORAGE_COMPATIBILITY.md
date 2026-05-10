# Integram Storage Compatibility

Issue #35 tracks compatibility between the legacy Integram frontend and the Vue rewrite for user settings stored in cookies, `localStorage`, and Settings objects. Vue must read legacy data first where it exists, keep writing backend-compatible values, and avoid deleting legacy fallback keys during the migration window.

## Storage Key Matrix

| Area | Legacy source | Legacy key or object | Vue key or object | Read behavior | Write behavior |
| --- | --- | --- | --- | --- | --- |
| Theme | Legacy shell / earlier Vue bridge | `localStorage.theme` with `dark` or `light` | `localStorage.darkTheme` with `true` or `false` | `useTheme` prefers `theme`, then falls back to `darkTheme`. | Vue writes both keys so old and new callers stay in sync. |
| Page font size | Legacy shell cookie | `integram-table-font-settings` JSON with `pageFontSize` | Same cookie | `useIntegramShellSettings` reads the cookie and applies the matching root font size. | Vue writes the same cookie shape. |
| Brand background | Legacy shell cookie | `brand-bg-{database}` | Same cookie | Vue reads the database-specific cookie and applies `--brand-bg-opacity`. | Vue writes the same database-specific cookie. |
| Sidebar collapsed | Vue shell setting | `appSidebarCollapsed_{database}` | Same key | Vue reads the database-specific key. | Vue writes the same key. |
| Sidebar width | Vue shell setting | `sidebarWidth_{database}` cookie | Same cookie | Vue reads the database-specific cookie. | Vue writes the same cookie. |
| Menu expansion | Vue shell setting | none in the legacy top-nav UI | `menuExpanded_{database}` | Vue reads the database-specific JSON array of expanded menu ids. | Vue writes normalized string ids to the same key. |
| Table workspace folders | Legacy `templates/dict.html` Settings fallback | `localStorage.settingsID` containing folder JSON when Settings object persistence failed | `integram-table-folders-config`; Settings object type `269`, `t271=UI`, `t273=<folder JSON>` | Vue loads `integram-table-folders-config` or falls back to `settingsID`; a server Settings object still overrides local fallback data when it is available. | Vue writes `integram-table-folders-config` and the Settings object. It does not overwrite `settingsID`. |
| Table workspace Settings object id | Vue migration helper | none reliable; legacy `settingsID` is config JSON, not an object id | `integram-table-folders-settings-id` | Vue reads only the Vue id key. | Vue writes the object id returned by `_m_save` or `_m_new/269`. |
| Data table behavior | Legacy object table cookies / Vue setting | `default_limit` cookie for rows per page | `datatable_settings` for background load and date display options | Vue reads `default_limit` for the initial `LIMIT` and reads `datatable_settings` with defaults for missing options. | Vue writes `datatable_settings`; row-limit writes use the legacy `default_limit` cookie helper. |
| Table filters and sort | Legacy object table URL state | `F_*`, `FR_*`, `TO_*`, `F_U`, `F_I`, `lnx`, `order_val`, `desc` query params | Same URL params | Vue passes legacy query params through to object-list and count requests. | Vue keeps query-state compatible with existing backend contracts. |
| Dashboard panel settings | Legacy dashboard panel object | requisite `1165` (`t1165`) containing JSON settings; report alias `panelSettings` may expose the same value | Same object requisite `1165` | Vue reads `panelSettings` first, then legacy `t1165` / `reqs[1165]` / `requisites[1165]`. | Vue serializes settings as JSON and writes requisite `1165` through `_m_set`. |

## Migration Rules

- Read compatibility is additive: new Vue keys do not remove the ability to read legacy keys.
- Renamed local keys are explicit. `settingsID` is treated only as legacy table folder JSON because the legacy template used it as a config fallback, not a stable Settings object id.
- Object-backed settings keep the legacy backend contract. Table folders remain `type 269 / t271=UI / t273=<JSON>`, and dashboard panels remain `t1165=<JSON>`.
- Invalid JSON falls back to current defaults instead of clearing the old value.
