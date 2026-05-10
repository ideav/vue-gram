export const smartQueryEditObject = {
  obj: {
    id: 900,
    typ: 22,
    val: 'Продажи по клиентам'
  },
  reqs: {
    134: { value: '25' }
  }
}

export const smartQuerySuggestions = {
  object: [
    { id: 900, val: 'Продажи по клиентам', updated_at: '2026-05-01T10:00:00Z' },
    { id: 901, val: 'Просроченные счета', updated_at: '2026-05-02T12:00:00Z' }
  ],
  total_objects: 2
}

export const smartQueryReportResponse = {
  header: 'Продажи по клиентам',
  columns: [
    { id: 1001, name: 'Customer Name', format: 'SHORT' },
    { id: 1002, name: 'Amount', format: 'NUMBER', totals: '300' },
    { id: 1003, name: 'Status', format: 'SHORT' }
  ],
  data: [
    ['Acme Corp', '100', 'Open'],
    ['Beta LLC', '200', 'Closed']
  ]
}

export const smartQueryLoadingState = {
  loading: true,
  message: 'Выполнение SmartQ...'
}

export const smartQueryErrorResponse = {
  error: 'Report execution failed'
}

export const smartQueryChatResponse = {
  html: '<strong>Найдено 2 строки</strong>',
  message: 'Найдено 2 строки'
}
