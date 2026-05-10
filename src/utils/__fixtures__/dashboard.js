export const dashboardRecordFixture = {
  id: '900',
  val: 'Sales dashboard',
  type: 'Дэшборд'
}

export const dashboardModelFixture = [
  {
    sheetID: 's1',
    sheet: 'Main',
    panelID: '1',
    panel: 'Revenue',
    period: 'Месяц',
    periodFrom: '01.01.2026',
    periodTo: '28.02.2026',
    itemsHead: 'Metric',
    itemID: '1001',
    item: 'Revenue',
    level: 1,
    format: 'NUMBER',
    MU: 'USD',
    RG: 'rg-main',
    RGtype: 'rg',
    rgHead: '',
    RGsourceID: '',
    RGcolumns: '',
    RGformulas: '',
    value: '',
    formulas: '[]',
    panelSettings: JSON.stringify([
      { type: 'bar', default: true },
      { type: 'pivot', fieldMap: { pivotRows: 'Строка', pivotCols: 'Колонка', pivotVals: 'Значение' } },
      { panelColumns: { md: 12, lg: 8, xl: 8, xxl: 6 } }
    ]),
    panelNotes: 'Monthly revenue dashboard',
    panelFilter: ''
  },
  {
    sheetID: 's1',
    sheet: 'Main',
    panelID: '1',
    panel: 'Revenue',
    period: 'Месяц',
    periodFrom: '01.01.2026',
    periodTo: '28.02.2026',
    itemsHead: 'Metric',
    itemID: '1002',
    item: 'Cost',
    level: 1,
    format: 'NUMBER',
    MU: 'USD',
    RG: 'rg-main',
    RGtype: 'rg',
    rgHead: '',
    RGsourceID: '',
    RGcolumns: '',
    RGformulas: '',
    value: '',
    formulas: '[]',
    panelSettings: '',
    panelNotes: '',
    panelFilter: ''
  },
  {
    sheetID: 's1',
    sheet: 'Main',
    panelID: '1',
    panel: 'Revenue',
    period: 'Месяц',
    periodFrom: '01.01.2026',
    periodTo: '28.02.2026',
    itemsHead: 'Metric',
    itemID: '1003',
    item: 'Profit',
    level: 1,
    format: 'NUMBER',
    MU: 'USD',
    RG: 'rg-main',
    RGtype: 'rg',
    rgHead: '',
    RGsourceID: '',
    RGcolumns: '',
    RGformulas: '',
    value: '',
    formulas: '[1001] - [1002]',
    panelSettings: '',
    panelNotes: '',
    panelFilter: ''
  },
  {
    sheetID: 's1',
    sheet: 'Main',
    panelID: '1',
    panel: 'Revenue',
    period: 'Месяц',
    periodFrom: '01.01.2026',
    periodTo: '28.02.2026',
    itemsHead: 'Metric',
    itemID: '1004',
    item: 'Margin',
    level: 1,
    format: 'PERCENT',
    MU: '%',
    RG: 'rg-main',
    RGtype: 'rg',
    rgHead: '',
    RGsourceID: '',
    RGcolumns: '',
    RGformulas: '',
    value: '',
    formulas: '([1003] / [1001]) * 100',
    panelSettings: '',
    panelNotes: '',
    panelFilter: ''
  },
  {
    sheetID: 's1',
    sheet: 'Main',
    panelID: '2',
    panel: 'Pipeline',
    period: 'Месяц',
    periodFrom: '01.01.2026',
    periodTo: '28.02.2026',
    itemsHead: 'Metric',
    itemID: '',
    item: '',
    level: 1,
    format: '',
    MU: '',
    RG: 'report-main',
    RGtype: 'value',
    rgHead: 'Pipeline',
    RGsourceID: '',
    RGcolumns: '',
    RGformulas: '',
    value: '',
    formulas: '',
    panelSettings: JSON.stringify([
      {
        type: 'pivot',
        default: true,
        fieldMap: { pivotRows: 'Stage', pivotCols: 'Owner', pivotVals: 'Amount' }
      },
      { type: 'bar', fieldMap: { labelField: 'Stage', valueField: 'Amount', seriesField: 'Owner' } }
    ]),
    panelNotes: '',
    panelFilter: 'Stage:Won',
    reportId: '77'
  }
]

export const dashboardPeriodFixture = {
  Месяц: [
    { r: ['January', '01.01.2026', '31.01.2026'] },
    { r: ['February', '01.02.2026', '28.02.2026'] }
  ]
}

export const dashboardValuesFixture = [
  {
    item: 'Revenue',
    valueItemID: '5001',
    'Колонка группы': '',
    'Метка': '',
    value: '{"date":"20260115","val":"1000"},{"date":"20260210","val":"1300"}'
  },
  {
    item: 'Cost',
    valueItemID: '5002',
    'Колонка группы': '',
    'Метка': '',
    value: '{"date":"20260120","val":"400"},{"date":"20260211","val":"500"}'
  }
]

export const dashboardReportFixture = {
  header: 'Pipeline',
  columns: [
    { id: 'stage', name: 'Stage', format: 'SHORT' },
    { id: 'owner', name: 'Owner', format: 'SHORT' },
    { id: 'amount', name: 'Amount', format: 'NUMBER', totals: '1800' }
  ],
  data: [
    ['Won', 'Ann', '1000'],
    ['Won', 'Bob', '500'],
    ['Open', 'Ann', '300']
  ]
}
