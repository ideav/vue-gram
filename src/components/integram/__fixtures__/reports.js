export const reportRowsResponse = {
  header: 'Sales report',
  columns: [
    { id: 1001, name: 'Created At', type: 3, format: 'DATE' },
    { id: 1002, name: 'Amount', type: 13, format: 'NUMBER', totals: '300' },
    { id: 1003, name: 'Status', type: 3, format: 'SHORT' }
  ],
  data: [
    ['2026-05-01', '100', 'Open'],
    ['2026-05-02', '200', 'Closed']
  ]
}

export const emptyReportResponse = {
  header: 'Empty report',
  columns: [
    { id: 2001, name: 'Name', type: 3, format: 'SHORT' },
    { id: 2002, name: 'Total', type: 13, format: 'NUMBER' }
  ],
  data: []
}

export const permissionErrorResponse = {
  error: 'Доступ запрещен.'
}

export const backendErrorResponse = {
  message: 'Ошибка сервера: SQL execution failed'
}
