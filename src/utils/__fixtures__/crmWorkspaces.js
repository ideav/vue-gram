export const kanbanStagesFixture = [
  { 'Статус': 'Лид', 'СтатусID': '374', 'Цвет': '#2563eb' },
  { 'Статус': 'Скрининг', 'СтатусID': '324', 'Цвет': '#10b981' },
  { 'Статус': 'КП', 'СтатусID': '3695', 'Цвет': '#f59e0b' },
  { 'Статус': 'Оплата', 'СтатусID': '3699', 'Цвет': '#8b5cf6' }
]

export const kanbanReportFixture = {
  header: 'Мой канбан',
  columns: [
    { id: '333', type: '291', format: 'SHORT', name: 'Проект', granted: 1 },
    { id: '335', type: '291', format: 'NUMBER', name: 'ПроектID', granted: 1 },
    { id: '338', type: '297', format: 'MEMO', name: 'Описание', granted: 1 },
    { id: '340', type: '299', format: 'NUMBER', name: 'Сумма', granted: 1 },
    { id: '342', type: '307', format: 'DATE', name: 'Дата', granted: 1 },
    { id: '344', type: '310', format: 'SHORT', name: 'Контакт', granted: 1 },
    { id: '346', type: '308', format: 'SHORT', name: 'Телефон', granted: 1 },
    { id: '348', type: '311', format: 'SHORT', name: 'Email', granted: 1 },
    { id: '350', type: '350', format: 'SHORT', name: 'Статус', granted: 1, ref: 1 },
    { id: '351', type: '351', format: 'NUMBER', name: 'СтатусID', granted: 1 },
    { id: '357', type: '357', format: 'DATETIME', name: 'Activity', granted: 1 },
    { id: '359', type: '354', format: 'SHORT', name: 'Менеджер', granted: 1, ref: 1 },
    { id: '360', type: '3', format: 'SHORT', name: 'Продукт', granted: 1 },
    { id: '361', type: '3', format: 'SHORT', name: 'Партнер', granted: 1 }
  ],
  data: [
    ['Интеграм', '101', 'Платформа для создания баз данных', '3000000', '19.02.2026', 'Алексей', '+79955060167', 'alex@ideav.pro', 'Лид', '374', '20.02.2026 09:17:14', 'Анна', 'CRM', 'Ideav'],
    ['ProcVac', '102', 'Подбор персонала', '1200000', '20.02.2026', 'Ирина', '+79950000000', 'irina@example.com', 'Скрининг', '324', '21.02.2026 10:00:00', 'Борис', 'HR', 'Sportzania'],
    ['Повторная оплата', '103', 'Продление лицензии', '500000', '21.02.2026', 'Олег', '', '', 'КП', '3695', '22.02.2026 11:00:00', 'Анна', 'CRM', 'Ideav']
  ]
}

export const kanbanObjectMetadataFixture = {
  id: '18',
  type: '3',
  val: 'Лид',
  reqs: [
    { id: '115', val: 'Статус', type: '3', ref: '42' },
    { id: '116', val: 'Описание', type: '12' },
    { id: '117', val: 'Контакт', type: '3' },
    { id: '118', val: 'Телефон', type: '3' },
    { id: '119', val: 'Дата', type: '9' },
    { id: '120', val: 'Сумма', type: '14' },
    { id: '121', val: 'Activity', type: '4' }
  ]
}

export const kanbanObjectRowsFixture = [
  {
    i: 447,
    u: 1,
    o: 0,
    r: [
      'sportzania',
      '145:admin',
      'Администратор системы',
      'Мефистоклюс',
      '89955060167',
      '26.02.2026',
      '150000',
      '1775992679.926'
    ]
  }
]

export const funnelRowsFixture = [
  {
    'Вакансия': 'Frontend',
    'Имя': 'Анна',
    'Месяц': '202602',
    'Дата': '2026-02-20',
    'Тип найма': 'Штат',
    'Первый контакт': 10,
    'Анкета': 8,
    'Интервью': 0,
    'Оффер': 5,
    'Оффер принят': 3,
    'Старт обучения': 2
  },
  {
    'Вакансия': 'Backend',
    'Имя': 'Борис',
    'Месяц': '202602',
    'Дата': '21.02.2026',
    'Тип найма': 'Партнер',
    'Первый контакт': 5,
    'Анкета': 3,
    'Интервью': 2,
    'Оффер': 1,
    'Оффер принят': 0,
    'Старт обучения': 0
  }
]

export const cardsMetadataFixture = {
  id: '18',
  up: '0',
  type: '3',
  val: 'Пользователь',
  unique: '1',
  reqs: [
    { num: 1, id: '115', val: 'Роль', orig: '42', type: '3', ref: '42' },
    { num: 2, id: '41', val: 'Email', orig: '31', type: '3' },
    { num: 3, id: '30', val: 'Телефон', orig: '21', type: '3' },
    { num: 4, id: '156', val: 'Дата', orig: '155', type: '9' },
    { num: 5, id: '33', val: 'Имя', orig: '32', type: '3' },
    { num: 6, id: '39', val: 'Примечание', orig: '35', type: '12' },
    { num: 7, id: '124', val: 'Activity', orig: '123', type: '4' }
  ]
}

export const cardsRowsFixture = [
  {
    i: 287,
    u: 1,
    o: 0,
    r: [
      'ru2',
      '145:admin',
      'drynny@mail.ru',
      '89955060167',
      '26.02.2026',
      'Мефистоклюс',
      'Администратор системы, ноукодер',
      '12.03.2026 12:54:54'
    ]
  }
]

export const statusUpdateSuccessFixture = {
  ok: true,
  id: '101'
}
