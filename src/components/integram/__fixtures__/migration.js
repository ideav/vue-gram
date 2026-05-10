export const migrationMetadataFixture = [
  { id: '101', val: '101:Клиенты' },
  { id: '102', val: '102:Сделки' },
  { id: '103', val: '103:Задачи' }
]

export const migrationQueriesFixture = [
  { i: '501', r: ['501:Активные клиенты'] },
  { i: '502', r: ['502:Воронка продаж'] }
]

export const migrationSettingsFixture = [
  {
    i: '9001',
    r: [
      'CRM bootstrap',
      'migration',
      JSON.stringify({
        version: 1,
        type: 'migration',
        name: 'CRM bootstrap',
        tables: [
          { id: '101', name: 'Клиенты', exportData: true, filter: 'F_401=%25active%25' }
        ],
        queries: [
          { id: '501', name: 'Активные клиенты' }
        ],
        files: [
          { root: 'templates', path: 'crm/dashboard.html', name: 'dashboard.html' }
        ]
      })
    ]
  }
]

export const migrationDirectoryHtml = `<!DOCTYPE html>
<html>
<body>
<form enctype="multipart/form-data" action="/my/dir_admin" method="POST" name="view_dir">
<input type="hidden" name="_xsrf" value="xsrf-token">
<input name="templates" type="hidden" value="1">
<input name="add_path" type="hidden" value="/crm">
<p>Директория на сервере: <b>templates</b>.</p>
<table class="table table-striped table-condensed table-bordered">
  <tr>
    <td><input type="checkbox" name="del[]" value="partials"></td>
    <td colspan="2"><a href="/my/dir_admin/?templates=1&add_path=/crm/partials"><b>partials</b></a></td>
    <td align="right">&nbsp;</td>
    <td align="right">&nbsp;</td>
  </tr>
  <tr>
    <td><input type="checkbox" name="del[]" value="dashboard.html"></td>
    <td>&nbsp;<a href="/my/dir_admin/?templates=1&add_path=/crm&gf=dashboard.html">dashboard.html</a>&nbsp;</td>
    <td>&nbsp;<a href="/ace/editor.html?src=/my/dir_admin/&templates=1&add_path=/crm&gf=dashboard.html" target="_blank"><span class="glyphicon glyphicon-edit"></span></a>&nbsp;</td>
    <td align="right"> &nbsp;2 KB</td>
    <td align="left"> &nbsp;10.05.2026 13:00:00</td>
  </tr>
  <tr>
    <td><input type="checkbox" name="del[]" value="workflow.js"></td>
    <td>&nbsp;<a href="/my/dir_admin/?templates=1&add_path=/crm&gf=workflow.js">workflow.js</a>&nbsp;</td>
    <td>&nbsp;<a href="/ace/editor.html?src=/my/dir_admin/&templates=1&add_path=/crm&gf=workflow.js" target="_blank"><span class="glyphicon glyphicon-edit"></span></a>&nbsp;</td>
    <td align="right"> &nbsp;1 KB</td>
    <td align="left"> &nbsp;10.05.2026 13:05:00</td>
  </tr>
</table>
<p>Файлов: 2, каталогов: 1</p>
</form>
</body>
</html>`

export const migrationFileContentFixture = `
<section data-table="/my/object/101">
  <a href="/my/report/501">Активные клиенты</a>
  <script src="/my/table/102"></script>
</section>
`

export const migrationQueryColumnsFixture = [
  { i: '7001', r: ['101:Клиенты'] },
  { i: '7002', r: ['102:Сделки'] }
]

export const migrationTableMetadataFixture = {
  type: { id: '101', val: 'Клиенты' },
  reqs: [
    { id: '401', val: 'Статус', type: '3' },
    { id: '402', val: 'Email', type: '3' }
  ]
}

export const migrationTableDataFixture = [
  { i: '3001', r: ['Acme', 'active'] }
]

export const migrationQueryRecordFixture = {
  obj: { id: '501', typ: '22', val: 'Активные клиенты' },
  reqs: { 201: 'select * from clients' }
}

export const migrationReportFixture = {
  columns: ['Клиент', 'Статус'],
  rows: [['Acme', 'active']]
}

export const migrationDryRunPackageFixture = {
  version: 1,
  kind: 'integram-migration',
  createdAt: '2026-05-10T13:10:00.000Z',
  source: {
    db: 'my',
    location: 'https://app.integram.io'
  },
  config: {
    version: 1,
    type: 'migration',
    name: 'CRM bootstrap',
    tables: [
      { id: '101', name: 'Клиенты', exportData: false, filter: '' }
    ],
    queries: [
      { id: '501', name: 'Активные клиенты' }
    ],
    files: [
      { root: 'templates', path: 'crm/dashboard.html', name: 'dashboard.html' }
    ]
  },
  tables: [
    {
      id: '101',
      name: 'Клиенты',
      metadata: migrationTableMetadataFixture,
      exportData: false,
      filter: ''
    }
  ],
  queries: [
    {
      id: '501',
      name: 'Активные клиенты',
      record: migrationQueryRecordFixture,
      columns: migrationQueryColumnsFixture,
      report: migrationReportFixture
    }
  ],
  files: [
    {
      root: 'templates',
      path: 'crm/dashboard.html',
      name: 'dashboard.html',
      text: true,
      content: migrationFileContentFixture,
      dependencies: {
        tables: [{ id: '101', name: 'Клиенты', source: 'object' }],
        queries: [{ id: '501', name: 'Активные клиенты', source: 'report' }]
      }
    }
  ]
}

export const migrationStatusFixture = {
  state: 'running',
  progress: 45,
  message: 'Формируется JSON-пакет'
}

export const migrationLogFixture = [
  { level: 'info', message: 'Загружены таблицы: 3', at: '2026-05-10T13:00:00.000Z' },
  { level: 'success', message: 'Dry-run завершен', at: '2026-05-10T13:01:00.000Z' }
]

export const migrationErrorPayload = {
  error: 'Не удалось сформировать экспорт',
  code: 'MIGRATION_EXPORT_FAILED',
  details: {
    tableId: '101'
  }
}
