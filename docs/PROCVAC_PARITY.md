# ProcVac Legacy Parity

Issue: https://github.com/ideav/vue-gram/issues/32

Legacy references:

- `templates/sportzania/procvac.html`
- `js/procvac.js`
- `css/procvac.css`

## Backend Contract

- [x] The ProcVac workspace is available at `/:database/procvac`.
- [x] Vacancy metadata is loaded with `GET metadata/8137?JSON`.
- [x] Vacancy rows are loaded with `GET object/8137?JSON_OBJ&LIMIT=10000&ORDER=8140`.
- [x] Event counts use the legacy array requisite when metadata exposes the `События` source.
- [x] Event counts fall back to `GET object/5616?JSON_OBJ&LIMIT=10000` when the event-count source is absent.
- [x] Reference editors load options from `GET _ref_reqs/{requisiteId}?JSON&LIMIT=200`.
- [x] Requisite edits are posted to `POST _m_set/{rowId}?JSON` with `t{requisiteId}` and `_xsrf`.
- [x] Main vacancy title edits are posted to `POST _m_save/{rowId}?JSON`.
- [x] Creating vacancies calls the legacy `openCreateRecordForm(8137, 1)` workflow when it is present.
- [x] Creating vacancy events calls the legacy `openCreateRecordForm(5616, rowId)` workflow when it is present.
- [x] Event links continue to point to table `5616` filtered with `F_U={rowId}`.

## Workspace Behavior

- [x] Fixed ProcVac column order is preserved: vacancy title, status, department, plan, fact, request, responsible, start date, deadline, exit date, hire type, weeks in work, events, comments.
- [x] Legacy metadata names and array ids are mapped to the fixed columns, including `Статус вакансии`, `Департамент`, `Пользователь`, and event array `5616`.
- [x] Active vacancies are rows whose status is `В работе` or `Не начато`.
- [x] The current-month section includes non-active rows with an exit date in the current month, or rows with no exit date and a deadline in the current month.
- [x] Remaining rows are grouped into the collapsed archive.
- [x] Archive rows keep the legacy month filter based on vacancy start month and the 25-row page size.
- [x] Department values are abbreviated from their display names.
- [x] Reference values preserve the `id:label` storage format and display only the label.
- [x] Weeks in work are derived from `Старт работы` using the same rounded days-over-seven calculation.
- [x] Status and hire-type summaries keep the legacy display order.
- [x] Quick search scans displayed row values and highlights matches.
- [x] Request URLs render as document links.
- [x] Column resizing persists through local storage and the legacy `procvac-column-widths` cookie.

## Tests

- [x] `src/utils/__tests__/procvac.spec.js` covers metadata mapping, section grouping, search, archive month behavior, event fallback counts, reference option parsing, and `_m_set` payloads.
- [x] `e2e/procvac.spec.ts` covers the primary workspace workflow with mocked legacy endpoints: load rows, search, expand archive, edit status, open legacy create workflows, and capture a screenshot.
