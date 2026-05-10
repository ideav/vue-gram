export const ordinaryObjectListResponse = {
  type: { id: '101', val: 'Projects', up: '0' },
  object: [
    { id: '201', val: 'Apollo', ord: 1, up: '1' }
  ],
  req_order: ['301', '302'],
  req_type: {
    301: 'Status',
    302: 'Budget'
  },
  req_base: {
    301: 'SHORT',
    302: 'NUMBER'
  },
  reqs: {
    201: {
      301: 'Active',
      302: '1000'
    }
  }
};

export const referencedObjectListResponse = {
  type: { id: '110', val: 'Contracts', up: '0' },
  object: [
    { id: '285', val: 'Contract A', ord: 1, up: '1' }
  ],
  req_order: ['320', '410', '411'],
  req_type: {
    320: 'Client',
    410: 'Tags',
    411: 'Tasks'
  },
  req_base: {
    320: 'SHORT',
    410: 'SHORT',
    411: 'ARRAY'
  },
  ref_type: {
    320: '200',
    410: '210'
  },
  req_attrs: {
    410: ':MULTI:'
  },
  arr_type: {
    411: '1'
  },
  reqs: {
    285: {
      320: 'ACME',
      ref_320: '200:42',
      410: 'Urgent, External',
      ref_410: '210:7,8',
      411: '3'
    }
  }
};

export const emptyObjectListResponse = {
  type: { id: '120', val: 'Empty table', up: '0' },
  object: [],
  req_order: [],
  req_type: {},
  req_base: {},
  reqs: {}
};
