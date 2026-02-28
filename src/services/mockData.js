// Mock data for demonstration purposes

export const statuses = [
  { id: 3689, name: 'Лид', color: '#a85555' },
  { id: 3691, name: 'Первичный контакт', color: '#b87355' },
  { id: 3693, name: 'Квалификация', color: '#b88655' },
  { id: 3695, name: 'Отправлено КП', color: '#b8a555' },
  { id: 2849, name: 'Презентация / демо', color: '#a5b855' },
  { id: 2843, name: 'Согласование', color: '#86b855' },
  { id: 2806, name: 'Триал / апробация', color: '#55b875' },
  { id: 3697, name: 'Закрытие сделки', color: '#55b8a5' },
  { id: 3699, name: 'Оплата', color: '#5586b8' },
  { id: 3701, name: 'Повторная оплата', color: '#7355b8' },
  { id: 2824, name: 'Отказ / срыв сделки', color: '#a555b8' }
]

export const taskTypes = [
  { id: 1, name: 'Звонок' },
  { id: 2, name: 'Отправить обновление' },
  { id: 3, name: 'Видеозвонок' },
  { id: 4, name: 'Прогрев / касание' },
  { id: 5, name: 'Напомнить о продлении' },
  { id: 6, name: 'Передать лида партнеру' }
]

export const partners = [
  { id: 1, name: 'ООО "Техносервис"', type: 'Дистрибьютор', manager: 'Иванов И.И.', status: 'Активный', deals: 15 },
  { id: 2, name: 'ИП Петров', type: 'Партнер', manager: 'Сидоров С.С.', status: 'Активный', deals: 8 },
  { id: 3, name: 'ООО "Софтлайн"', type: 'Дистрибьютор', manager: 'Иванов И.И.', status: 'Активный', deals: 23 },
  { id: 4, name: 'ООО "ИТ-Решения"', type: 'Партнер', manager: 'Петрова А.А.', status: 'Новый', deals: 2 },
  { id: 5, name: 'ЗАО "Бизнес-Системы"', type: 'Дистрибьютор', manager: 'Сидоров С.С.', status: 'Активный', deals: 12 }
]

export const leads = [
  {
    id: 1,
    name: 'Компания "Альфа"',
    statusId: 3689,
    manager: 'Иванов И.И.',
    phone: '+7 (495) 123-45-67',
    email: 'info@alfa.ru',
    product: 'CRM система',
    source: 'Сайт',
    tasks: 2,
    deals: 0,
    created: '2026-02-20'
  },
  {
    id: 2,
    name: 'ООО "Бета Софт"',
    statusId: 3691,
    manager: 'Сидоров С.С.',
    phone: '+7 (495) 234-56-78',
    email: 'contact@beta.ru',
    product: 'Бухгалтерия',
    source: 'Реклама',
    tasks: 1,
    deals: 0,
    created: '2026-02-18'
  },
  {
    id: 3,
    name: 'ИП Козлов А.В.',
    statusId: 3693,
    manager: 'Петрова А.А.',
    phone: '+7 (499) 345-67-89',
    email: 'kozlov@mail.ru',
    product: 'Складской учет',
    source: 'Партнер',
    tasks: 3,
    deals: 0,
    created: '2026-02-15'
  },
  {
    id: 4,
    name: 'ООО "Гамма Трейд"',
    statusId: 3695,
    manager: 'Иванов И.И.',
    phone: '+7 (495) 456-78-90',
    email: 'sales@gamma.ru',
    product: 'CRM система',
    source: 'Холодный звонок',
    tasks: 1,
    deals: 1,
    created: '2026-02-10'
  },
  {
    id: 5,
    name: 'ЗАО "Дельта"',
    statusId: 2849,
    manager: 'Сидоров С.С.',
    phone: '+7 (499) 567-89-01',
    email: 'info@delta.com',
    product: 'ERP система',
    source: 'Сайт',
    tasks: 2,
    deals: 1,
    created: '2026-02-05'
  },
  {
    id: 6,
    name: 'ООО "Эпсилон"',
    statusId: 2843,
    manager: 'Петрова А.А.',
    phone: '+7 (495) 678-90-12',
    email: 'contact@epsilon.ru',
    product: 'CRM система',
    source: 'Реклама',
    tasks: 1,
    deals: 1,
    created: '2026-01-28'
  },
  {
    id: 7,
    name: 'ИП Морозов',
    statusId: 2806,
    manager: 'Иванов И.И.',
    phone: '+7 (499) 789-01-23',
    email: 'morozov@example.com',
    product: 'Бухгалтерия',
    source: 'Партнер',
    tasks: 2,
    deals: 0,
    created: '2026-01-20'
  },
  {
    id: 8,
    name: 'ООО "Зета Групп"',
    statusId: 3697,
    manager: 'Сидоров С.С.',
    phone: '+7 (495) 890-12-34',
    email: 'info@zeta.ru',
    product: 'CRM система',
    source: 'Сайт',
    tasks: 1,
    deals: 2,
    created: '2026-01-15'
  },
  {
    id: 9,
    name: 'ООО "Эта Системс"',
    statusId: 3699,
    manager: 'Петрова А.А.',
    phone: '+7 (499) 901-23-45',
    email: 'sales@eta.com',
    product: 'ERP система',
    source: 'Холодный звонок',
    tasks: 0,
    deals: 1,
    created: '2026-01-10'
  },
  {
    id: 10,
    name: 'ЗАО "Тета"',
    statusId: 3701,
    manager: 'Иванов И.И.',
    phone: '+7 (495) 012-34-56',
    email: 'info@theta.ru',
    product: 'CRM система',
    source: 'Партнер',
    tasks: 1,
    deals: 3,
    created: '2025-12-01'
  }
]

export const tasks = [
  {
    id: 1,
    name: 'Звонок клиенту Альфа',
    type: 'Звонок',
    leadId: 1,
    leadName: 'Компания "Альфа"',
    executor: 'Иванов И.И.',
    deadline: '2026-03-01',
    status: 'Активная',
    priority: 'Высокий'
  },
  {
    id: 2,
    name: 'Отправить коммерческое предложение',
    type: 'Отправить обновление',
    leadId: 1,
    leadName: 'Компания "Альфа"',
    executor: 'Иванов И.И.',
    deadline: '2026-03-02',
    status: 'Активная',
    priority: 'Средний'
  },
  {
    id: 3,
    name: 'Презентация продукта',
    type: 'Видеозвонок',
    leadId: 2,
    leadName: 'ООО "Бета Софт"',
    executor: 'Сидоров С.С.',
    deadline: '2026-03-03',
    status: 'Активная',
    priority: 'Высокий'
  },
  {
    id: 4,
    name: 'Согласовать условия договора',
    type: 'Звонок',
    leadId: 3,
    leadName: 'ИП Козлов А.В.',
    executor: 'Петрова А.А.',
    deadline: '2026-03-05',
    status: 'Активная',
    priority: 'Средний'
  },
  {
    id: 5,
    name: 'Напомнить о продлении лицензии',
    type: 'Напомнить о продлении',
    leadId: 10,
    leadName: 'ЗАО "Тета"',
    executor: 'Иванов И.И.',
    deadline: '2026-03-10',
    status: 'Активная',
    priority: 'Высокий'
  },
  {
    id: 6,
    name: 'Подготовить демо-версию',
    type: 'Прогрев / касание',
    leadId: 5,
    leadName: 'ЗАО "Дельта"',
    executor: 'Сидоров С.С.',
    deadline: '2026-03-07',
    status: 'Активная',
    priority: 'Средний'
  }
]

export const deals = [
  {
    id: 1,
    leadId: 4,
    leadName: 'ООО "Гамма Трейд"',
    partner: 'ООО "Техносервис"',
    product: 'CRM система',
    amount: 150000,
    licenses: 10,
    period: '12 месяцев',
    status: 'В работе',
    created: '2026-02-12'
  },
  {
    id: 2,
    leadId: 5,
    leadName: 'ЗАО "Дельта"',
    partner: 'ООО "Софтлайн"',
    product: 'ERP система',
    amount: 350000,
    licenses: 25,
    period: '12 месяцев',
    status: 'Согласование',
    created: '2026-02-08'
  },
  {
    id: 3,
    leadId: 6,
    leadName: 'ООО "Эпсилон"',
    partner: 'ИП Петров',
    product: 'CRM система',
    amount: 120000,
    licenses: 8,
    period: '12 месяцев',
    status: 'Триал',
    created: '2026-02-01'
  },
  {
    id: 4,
    leadId: 8,
    leadName: 'ООО "Зета Групп"',
    partner: 'ООО "Техносервис"',
    product: 'CRM система',
    amount: 200000,
    licenses: 15,
    period: '12 месяцев',
    status: 'Закрыта',
    created: '2026-01-20'
  },
  {
    id: 5,
    leadId: 9,
    leadName: 'ООО "Эта Системс"',
    partner: 'ООО "Софтлайн"',
    product: 'ERP система',
    amount: 450000,
    licenses: 30,
    period: '12 месяцев',
    status: 'Оплачено',
    created: '2026-01-15'
  }
]

// API simulation helpers
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const api = {
  async getLeads(statusId = null) {
    await delay(300)
    if (statusId) {
      return leads.filter(lead => lead.statusId === statusId)
    }
    return leads
  },

  async getTasks() {
    await delay(300)
    return tasks
  },

  async getPartners() {
    await delay(300)
    return partners
  },

  async getDeals() {
    await delay(300)
    return deals
  },

  async getStatuses() {
    await delay(100)
    return statuses
  },

  async updateLeadStatus(leadId, newStatusId) {
    await delay(200)
    const lead = leads.find(l => l.id === leadId)
    if (lead) {
      lead.statusId = newStatusId
    }
    return lead
  }
}
