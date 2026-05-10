# Integram JSON API Contracts

Issues #14 and #21 fix the Vue-facing contract for the legacy Integram JSON endpoints already used by the migrated UI. The Vue code should call `src/services/integramApiClient.js` or `src/services/integramService.js` methods instead of constructing these URLs inside components.

Fixtures live in `src/services/__fixtures__/integramApi/`. The machine-readable registry lives in `src/services/integramApiContracts.js`.

| Client method | HTTP | Legacy endpoint flag | Required input | Fixture | Normalizer |
| --- | --- | --- | --- | --- | --- |
| `getMetadata` | GET | `/metadata?JSON` | none | `metadata.json` | `normalizeMetadataResponse` |
| `getTerms` | GET | `/terms?JSON` | none | `terms.json` | `normalizeTermsResponse` |
| `getObjectList` | GET | `/object/{typeId}?JSON_DATA` | `typeId`, optional `LIMIT`, `F_U`, `F_I`, `FR_*` | `object-json-data.json` | `normalizeObjectListResponse` |
| `getObjectRecord` | GET | `/object/{objectId}?JSON_OBJ` | `objectId` | `object-json-obj.json` | `normalizeObjectRecordResponse` |
| `executeReport` | GET/POST | `/report/{reportId}?JSON` | `reportId`, optional report filters/paging | `report-json.json` | `normalizeReportResponse` |
| `getReferenceOptions` | GET | `/_ref_reqs/{requisiteId}?JSON` | `requisiteId`, `id`, optional `r`, `type`, `q`, `LIMIT` | `reference-options.json` | `normalizeReferenceOptionsResponse` |
| `createObject` | POST | `/_m_new/{typeId}?JSON` | `typeId`, `up`, `t{typeId}`, optional `t{requisiteId}` | `m-new-success.json`, `m-new-error.json` | `normalizeMutationResponse`, `normalizeApiError` |
| `setObjectRequisites` | POST | `/_m_set/{objectId}?JSON` | `objectId`, `t{requisiteId}` body fields | `m-set-success.json`, `m-set-error.json` | `normalizeMutationResponse`, `normalizeApiError` |
| `getTypeEditorData` | GET | `/edit_types?JSON` | none | `edit-types.json` | `normalizeTypeEditorData` |
| `getTypeMetadata` | GET | `/metadata/{typeId}?JSON` | `typeId` | `type-metadata.json` | `normalizeMetadataResponse` |
| `createType` | POST | `/_d_new?JSON` | `val`, numeric `t`, optional `unique` | `m-new-success.json`, `ddl-error.json` | `normalizeMutationResponse`, `normalizeApiError` |
| `saveType` | POST | `/_d_save/{typeId}?JSON` | `typeId`, `val`, numeric `t`, optional `unique` | `m-set-success.json`, `ddl-error.json` | `normalizeMutationResponse`, `normalizeApiError` |
| `createTypeReference` | POST | `/_d_ref/{typeId}?JSON` | `typeId` | `m-set-success.json`, `ddl-error.json` | `normalizeMutationResponse`, `normalizeApiError` |
| `addRequisite` | POST | `/_d_req/{typeId}?JSON` | `typeId`, numeric `t` | `m-new-success.json`, `ddl-error.json` | `normalizeMutationResponse`, `normalizeApiError` |
| `deleteType` | POST | `/_d_del/{typeId}?JSON` | `typeId` | `m-set-success.json`, `ddl-error.json` | `normalizeMutationResponse`, `normalizeApiError` |
| `deleteRequisite` | POST | `/_d_del_req/{requisiteId}?JSON` | `requisiteId`, optional `forced` | `m-set-success.json`, `ddl-error.json` | `normalizeMutationResponse`, `normalizeApiError` |
| `saveRequisiteAlias` | POST | `/_d_alias/{requisiteId}?JSON&up={typeId}` | `requisiteId`, `val`, optional parent `up` | `m-set-success.json`, `ddl-error.json` | `normalizeMutationResponse`, `normalizeApiError` |
| `saveRequisiteDefaultValue` | POST | `/_d_attrs/{requisiteId}?JSON&up={typeId}` | `requisiteId`, `val`, optional parent `up` | `m-set-success.json`, `ddl-error.json` | `normalizeMutationResponse`, `normalizeApiError` |
| `toggleRequisiteNull` | POST | `/_d_null/{requisiteId}?JSON&up={typeId}` | `requisiteId`, optional parent `up` | `m-set-success.json`, `ddl-error.json` | `normalizeMutationResponse`, `normalizeApiError` |
| `toggleRequisiteMulti` | POST | `/_d_multi/{requisiteId}?JSON` | `requisiteId`, optional parent `up` | `m-set-success.json`, `ddl-error.json` | `normalizeMutationResponse`, `normalizeApiError` |
| `moveRequisiteUp` | POST | `/_d_up/{requisiteId}?JSON` | `requisiteId` | `m-set-success.json`, `ddl-error.json` | `normalizeMutationResponse`, `normalizeApiError` |

Normalized UI errors use `IntegramApiError`:

```js
{
  name: 'IntegramApiError',
  message: 'Object 5001 is locked by another user',
  code: 'OBJECT_LOCKED',
  status: 409,
  type: 'conflict',
  details: { objectId: 5001 },
  retryable: false,
  canRetry: false
}
```
