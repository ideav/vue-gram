export const INTEGRAM_API_CONTRACTS = [
  {
    method: 'getMetadata',
    httpMethod: 'GET',
    endpoint: '/metadata',
    jsonFlag: 'JSON',
    input: {},
    responseFixture: 'metadata.json',
    normalizer: 'normalizeMetadataResponse'
  },
  {
    method: 'getTerms',
    httpMethod: 'GET',
    endpoint: '/terms',
    jsonFlag: 'JSON',
    input: {},
    responseFixture: 'terms.json',
    normalizer: 'normalizeTermsResponse'
  },
  {
    method: 'getObjectList',
    httpMethod: 'GET',
    endpoint: '/object/{typeId}',
    jsonFlag: 'JSON_DATA',
    input: {
      path: ['typeId'],
      query: ['LIMIT', 'F_U', 'F_I', 'FR_*']
    },
    responseFixture: 'object-json-data.json',
    normalizer: 'normalizeObjectListResponse'
  },
  {
    method: 'getObjectRecord',
    httpMethod: 'GET',
    endpoint: '/object/{objectId}',
    jsonFlag: 'JSON_OBJ',
    input: {
      path: ['objectId']
    },
    responseFixture: 'object-json-obj.json',
    normalizer: 'normalizeObjectRecordResponse'
  },
  {
    method: 'executeReport',
    httpMethod: 'GET',
    endpoint: '/report/{reportId}',
    jsonFlag: 'JSON',
    input: {
      path: ['reportId'],
      query: ['LIMIT', 'PAGE', 'FR_*', 'ORDER_*']
    },
    responseFixture: 'report-json.json',
    normalizer: 'normalizeReportResponse'
  },
  {
    method: 'getReferenceOptions',
    httpMethod: 'GET',
    endpoint: '/_ref_reqs/{requisiteId}',
    jsonFlag: 'JSON',
    input: {
      path: ['requisiteId'],
      query: ['id', 'r', 'type', 'q', 'LIMIT']
    },
    responseFixture: 'reference-options.json',
    normalizer: 'normalizeReferenceOptionsResponse'
  },
  {
    method: 'createObject',
    httpMethod: 'POST',
    endpoint: '/_m_new/{typeId}',
    jsonFlag: 'JSON',
    input: {
      path: ['typeId'],
      body: ['up', 't{typeId}', 't{requisiteId}']
    },
    responseFixture: 'm-new-success.json',
    errorFixture: 'm-new-error.json',
    normalizer: 'normalizeMutationResponse'
  },
  {
    method: 'setObjectRequisites',
    httpMethod: 'POST',
    endpoint: '/_m_set/{objectId}',
    jsonFlag: 'JSON',
    input: {
      path: ['objectId'],
      body: ['t{requisiteId}']
    },
    responseFixture: 'm-set-success.json',
    errorFixture: 'm-set-error.json',
    normalizer: 'normalizeMutationResponse'
  },
  {
    method: 'uploadFile',
    httpMethod: 'POST',
    endpoint: '/_upload',
    jsonFlag: 'JSON',
    input: {
      body: ['_xsrf', 'file', 'path']
    },
    responseFixture: 'upload-success.json',
    errorFixture: 'upload-error.json',
    normalizer: 'normalizeUploadResponse'
  },
  {
    method: 'uploadRequisiteFile',
    httpMethod: 'POST',
    endpoint: '/_m_set/{objectId}',
    jsonFlag: 'JSON',
    input: {
      path: ['objectId'],
      body: ['_xsrf', 't{requisiteId}=File']
    },
    responseFixture: 'upload-success.json',
    errorFixture: 'upload-error.json',
    normalizer: 'normalizeUploadResponse'
  },
  {
    method: 'getTypeEditorData',
    httpMethod: 'GET',
    endpoint: '/edit_types',
    jsonFlag: 'JSON',
    input: {},
    responseFixture: 'edit-types.json',
    normalizer: 'normalizeTypeEditorData'
  },
  {
    method: 'getTypeMetadata',
    httpMethod: 'GET',
    endpoint: '/metadata/{typeId}',
    jsonFlag: 'JSON',
    input: {
      path: ['typeId']
    },
    responseFixture: 'type-metadata.json',
    normalizer: 'normalizeMetadataResponse'
  },
  {
    method: 'createType',
    httpMethod: 'POST',
    endpoint: '/_d_new',
    jsonFlag: 'JSON',
    input: {
      body: ['val', 't', 'unique']
    },
    responseFixture: 'm-new-success.json',
    errorFixture: 'ddl-error.json',
    normalizer: 'normalizeMutationResponse'
  },
  {
    method: 'saveType',
    httpMethod: 'POST',
    endpoint: '/_d_save/{typeId}',
    jsonFlag: 'JSON',
    input: {
      path: ['typeId'],
      body: ['val', 't', 'unique']
    },
    responseFixture: 'm-set-success.json',
    errorFixture: 'ddl-error.json',
    normalizer: 'normalizeMutationResponse'
  },
  {
    method: 'createTypeReference',
    httpMethod: 'POST',
    endpoint: '/_d_ref/{typeId}',
    jsonFlag: 'JSON',
    input: {
      path: ['typeId']
    },
    responseFixture: 'm-set-success.json',
    errorFixture: 'ddl-error.json',
    normalizer: 'normalizeMutationResponse'
  },
  {
    method: 'addRequisite',
    httpMethod: 'POST',
    endpoint: '/_d_req/{typeId}',
    jsonFlag: 'JSON',
    input: {
      path: ['typeId'],
      body: ['t']
    },
    responseFixture: 'm-new-success.json',
    errorFixture: 'ddl-error.json',
    normalizer: 'normalizeMutationResponse'
  },
  {
    method: 'deleteType',
    httpMethod: 'POST',
    endpoint: '/_d_del/{typeId}',
    jsonFlag: 'JSON',
    input: {
      path: ['typeId']
    },
    responseFixture: 'm-set-success.json',
    errorFixture: 'ddl-error.json',
    normalizer: 'normalizeMutationResponse'
  },
  {
    method: 'deleteRequisite',
    httpMethod: 'POST',
    endpoint: '/_d_del_req/{requisiteId}',
    jsonFlag: 'JSON',
    input: {
      path: ['requisiteId'],
      body: ['forced']
    },
    responseFixture: 'm-set-success.json',
    errorFixture: 'ddl-error.json',
    normalizer: 'normalizeMutationResponse'
  },
  {
    method: 'saveRequisiteAlias',
    httpMethod: 'POST',
    endpoint: '/_d_alias/{requisiteId}',
    jsonFlag: 'JSON',
    input: {
      path: ['requisiteId'],
      query: ['up'],
      body: ['val']
    },
    responseFixture: 'm-set-success.json',
    errorFixture: 'ddl-error.json',
    normalizer: 'normalizeMutationResponse'
  },
  {
    method: 'saveRequisiteDefaultValue',
    httpMethod: 'POST',
    endpoint: '/_d_attrs/{requisiteId}',
    jsonFlag: 'JSON',
    input: {
      path: ['requisiteId'],
      query: ['up'],
      body: ['val']
    },
    responseFixture: 'm-set-success.json',
    errorFixture: 'ddl-error.json',
    normalizer: 'normalizeMutationResponse'
  },
  {
    method: 'toggleRequisiteNull',
    httpMethod: 'POST',
    endpoint: '/_d_null/{requisiteId}',
    jsonFlag: 'JSON',
    input: {
      path: ['requisiteId'],
      query: ['up']
    },
    responseFixture: 'm-set-success.json',
    errorFixture: 'ddl-error.json',
    normalizer: 'normalizeMutationResponse'
  },
  {
    method: 'toggleRequisiteMulti',
    httpMethod: 'POST',
    endpoint: '/_d_multi/{requisiteId}',
    jsonFlag: 'JSON',
    input: {
      path: ['requisiteId'],
      query: ['up']
    },
    responseFixture: 'm-set-success.json',
    errorFixture: 'ddl-error.json',
    normalizer: 'normalizeMutationResponse'
  },
  {
    method: 'moveRequisiteUp',
    httpMethod: 'POST',
    endpoint: '/_d_up/{requisiteId}',
    jsonFlag: 'JSON',
    input: {
      path: ['requisiteId']
    },
    responseFixture: 'm-set-success.json',
    errorFixture: 'ddl-error.json',
    normalizer: 'normalizeMutationResponse'
  }
]

export function getIntegramApiContract(method) {
  return INTEGRAM_API_CONTRACTS.find(contract => contract.method === method) ?? null
}
