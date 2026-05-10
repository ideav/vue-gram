export const formApiFixtures = {
  forms: {
    object: [
      { id: 501, typ: 137, up: 1, val: 'Регистрация клиента' }
    ],
    reqs: {}
  },
  formRecord: {
    obj: { id: 501, typ: 137, up: 1, val: 'Регистрация клиента' },
    reqs: {}
  },
  panels: {
    object: [
      { id: 601, typ: 138, up: 501, val: 'Заявка' }
    ],
    reqs: {
      601: {
        184: '42',
        254: '#222222',
        255: '#ffffff',
        257: '/thanks'
      }
    }
  },
  fields: {
    object: [
      { id: 701, typ: 144, up: 601, val: 'Название заявки' },
      { id: 702, typ: 144, up: 601, val: 'Email' },
      { id: 703, typ: 144, up: 601, val: 'Согласие' },
      { id: 704, typ: 144, up: 601, val: 'Статус' },
      { id: 705, typ: 144, up: 601, val: 'Документ' }
    ],
    reqs: {
      701: { 144: '42', 186: 'Название заявки' },
      702: { 144: '101', 186: 'Email' },
      703: { 144: '102', 186: 'Согласие' },
      704: { 144: '103', 186: 'Статус' },
      705: { 144: '104', 186: 'Документ' }
    }
  },
  buttons: {
    object: [
      { id: 711, typ: 150, up: 601, val: 'Документы' }
    ],
    reqs: {
      711: { 216: 'object/42', 218: 'btn-sm btn-outline-secondary' }
    }
  },
  metadata: {
    id: 42,
    val: 'Leads',
    reqs: [
      { id: 101, typ: 42, val: 'Email', type: '3', attrs: ':!NULL:' },
      { id: 102, typ: 42, val: 'Согласие', type: '11', attrs: ':!NULL:' },
      { id: 103, typ: 42, val: 'Статус', type: '3', ref: 200, attrs: ':!NULL:' },
      { id: 104, typ: 42, val: 'Документ', type: '10', attrs: '' }
    ]
  },
  referenceOptions: {
    301: 'Новый'
  }
}

export const filledFormValues = {
  42: 'Lead #1',
  101: 'lead@example.test',
  102: true,
  103: 301
}

export const validationErrorsFixture = {
  42: 'Заполните поле Название заявки',
  101: 'Заполните поле Email',
  102: 'Заполните поле Согласие',
  103: 'Заполните поле Статус'
}

export const quizSchemaFixture = {
  type: '77',
  name: 'Анкета участника',
  descr: 'Заполните короткую анкету',
  submit: 'Отправить анкету',
  success: 'Анкета :id: сохранена',
  fail: 'Не удалось отправить анкету',
  form: [
    {
      id: '77',
      type: '3',
      base: 'SHORT',
      name: 'ФИО',
      label: 'ФИО',
      required: true
    },
    {
      id: '201',
      type: '9',
      base: 'DATE',
      name: 'Дата',
      label: 'Дата',
      default: '[TODAY]'
    },
    {
      isPageBreak: true
    },
    {
      id: '202',
      type: '3',
      base: 'DDL',
      ref_type: '200',
      name: 'Статус',
      label: 'Статус',
      required: true
    },
    {
      id: '203',
      type: '11',
      base: 'BOOLEAN',
      name: 'Согласие',
      label: 'Согласие',
      required: true
    }
  ]
}

export const quizApiFixtures = {
  list: {
    object: [
      { id: 801, typ: 269, up: 1, val: 'Анкета участника' }
    ],
    reqs: {
      801: {
        269: 'Анкета участника',
        271: 'QUIZ',
        273: JSON.stringify(quizSchemaFixture)
      }
    }
  },
  referenceOptions: {
    object: [
      { id: 301, typ: 200, up: 1, val: 'Новый' },
      { id: 302, typ: 200, up: 1, val: 'Повторный' }
    ],
    reqs: {}
  }
}

export const quizResultFixture = {
  objectValue: 'Иван Петров',
  requisites: {
    201: '2026-05-10',
    202: '301',
    203: true
  },
  result: {
    id: 9001,
    message: 'Анкета 9001 сохранена'
  }
}
