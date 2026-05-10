# Integram JSON API Contracts

Issue #14 fixes the Vue-facing contract for the legacy Integram JSON endpoints already used by the migrated UI. The Vue code should call `src/services/integramApiClient.js` or `src/services/integramService.js` methods instead of constructing these URLs inside components.

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
