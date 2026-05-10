import { expect, test, type Page, type Route } from '@playwright/test'

const formFixtures = {
  forms: {
    object: [
      { id: 501, typ: 137, up: 1, val: 'Регистрация клиента' },
    ],
    reqs: {},
  },
  formRecord: {
    obj: { id: 501, typ: 137, up: 1, val: 'Регистрация клиента' },
    reqs: {},
  },
  panels: {
    object: [
      { id: 601, typ: 138, up: 501, val: 'Заявка' },
    ],
    reqs: {
      601: {
        184: '42',
        254: '#222222',
        255: '#ffffff',
      },
    },
  },
  fields: {
    object: [
      { id: 701, typ: 144, up: 601, val: 'Название заявки' },
      { id: 702, typ: 144, up: 601, val: 'Email' },
      { id: 703, typ: 144, up: 601, val: 'Согласие' },
      { id: 704, typ: 144, up: 601, val: 'Статус' },
    ],
    reqs: {
      701: { 144: '42', 186: 'Название заявки' },
      702: { 144: '101', 186: 'Email' },
      703: { 144: '102', 186: 'Согласие' },
      704: { 144: '103', 186: 'Статус' },
    },
  },
  buttons: {
    object: [],
    reqs: {},
  },
  metadata: {
    id: 42,
    val: 'Leads',
    reqs: [
      { id: 101, typ: 42, val: 'Email', type: '3', attrs: ':!NULL:' },
      { id: 102, typ: 42, val: 'Согласие', type: '11', attrs: ':!NULL:' },
      { id: 103, typ: 42, val: 'Статус', type: '3', ref: 200, attrs: ':!NULL:' },
    ],
  },
  referenceOptions: {
    301: 'Новый',
  },
}

const quizConfig = {
  type: '77',
  name: 'Анкета участника',
  descr: 'Заполните короткую анкету',
  submit: 'Отправить анкету',
  success: 'Анкета :id: сохранена',
  form: [
    { id: '77', type: '3', base: 'SHORT', name: 'ФИО', label: 'ФИО', required: true },
    { id: '201', type: '9', base: 'DATE', name: 'Дата', label: 'Дата', default: '[TODAY]' },
    { isPageBreak: true },
    { id: '202', type: '3', base: 'DDL', ref_type: '200', name: 'Статус', label: 'Статус', required: true },
    { id: '203', type: '11', base: 'BOOLEAN', name: 'Согласие', label: 'Согласие', required: true },
  ],
}

const quizFixtures = {
  list: {
    object: [
      { id: 801, typ: 269, up: 1, val: 'Анкета участника' },
    ],
    reqs: {
      801: {
        269: 'Анкета участника',
        271: 'QUIZ',
        273: JSON.stringify(quizConfig),
      },
    },
  },
  statuses: {
    object: [
      { id: 301, typ: 200, up: 1, val: 'Новый' },
      { id: 302, typ: 200, up: 1, val: 'Повторный' },
    ],
    reqs: {},
  },
}

async function seedSession(page: Page) {
  await page.addInitScript(() => {
    const session = {
      version: 2,
      server: window.location.origin,
      currentDatabase: 'my',
      databases: {
        my: {
          token: 'test-token',
          xsrfToken: 'test-xsrf',
          userId: '1',
          userName: 'Tester',
          userRole: 'admin',
          ownedDatabases: [],
        },
      },
    }

    localStorage.setItem('token', 'test-token')
    localStorage.setItem('_xsrf', 'test-xsrf')
    localStorage.setItem('db', 'my')
    localStorage.setItem('integram_server', window.location.origin)
    localStorage.setItem('integram_session', JSON.stringify(session))
  })
}

function parsePostBody(route: Route) {
  return Object.fromEntries(new URLSearchParams(route.request().postData() || '').entries())
}

async function installApiMocks(page: Page) {
  const formSubmissions: Record<string, string>[] = []
  const quizSubmissions: Record<string, string>[] = []

  await page.route('**/my/**', async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const path = url.pathname
    let body: unknown = {}

    if (path.endsWith('/my/xsrf')) {
      body = { token: 'test-token', _xsrf: 'test-xsrf', id: '1', user: 'Tester', role: 'admin' }
    } else if (path.endsWith('/my/object/137')) {
      body = formFixtures.forms
    } else if (path.endsWith('/my/object/501')) {
      body = formFixtures.formRecord
    } else if (path.endsWith('/my/object/138')) {
      body = formFixtures.panels
    } else if (path.endsWith('/my/object/144')) {
      body = formFixtures.fields
    } else if (path.endsWith('/my/object/150')) {
      body = formFixtures.buttons
    } else if (path.endsWith('/my/metadata/42')) {
      body = formFixtures.metadata
    } else if (path.endsWith('/my/_ref_reqs/103')) {
      body = formFixtures.referenceOptions
    } else if (path.endsWith('/my/_m_new/42')) {
      formSubmissions.push(parsePostBody(route))
      body = { obj: 9001 }
    } else if (path.endsWith('/my/object/269')) {
      body = quizFixtures.list
    } else if (path.endsWith('/my/object/200')) {
      body = quizFixtures.statuses
    } else if (path.endsWith('/my/_m_new/77')) {
      quizSubmissions.push(parsePostBody(route))
      body = { obj: 9002 }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })

  return { formSubmissions, quizSubmissions }
}

test.describe('Integram form and quiz runtime', () => {
  test('submits a mocked legacy form flow', async ({ page }) => {
    await seedSession(page)
    const submissions = await installApiMocks(page)

    await page.goto('/my/form/501')

    await expect(page.getByTestId('form-title')).toContainText('Регистрация клиента')
    await page.getByTestId('input-601-42').fill('Lead #1')
    await page.getByTestId('input-601-101').fill('lead@example.test')
    await page.getByTestId('input-601-102').check()
    await page.getByTestId('input-601-103').selectOption('301')
    await page.getByTestId('submit-panel-601').click()

    await expect(page.getByTestId('success-601')).toContainText('Данные сохранены: 9001')
    expect(submissions.formSubmissions[0]).toMatchObject({
      _xsrf: 'test-xsrf',
      up: '1',
      t42: 'Lead #1',
      t101: 'lead@example.test',
      t102: 'X',
      b102: '1',
      t103: '301',
    })
  })

  test('submits a mocked legacy quiz flow', async ({ page }) => {
    await seedSession(page)
    const submissions = await installApiMocks(page)

    await page.goto('/my/quiz/801')

    await expect(page.getByTestId('quiz-title')).toContainText('Анкета участника')
    await page.getByTestId('input-77').fill('Иван Петров')
    await page.getByTestId('quiz-next').click()
    await page.getByTestId('input-202').selectOption('301')
    await page.getByTestId('input-203').check()
    await page.getByTestId('quiz-submit').click()

    await expect(page.getByTestId('quiz-completed')).toContainText('Анкета 9002 сохранена')
    expect(submissions.quizSubmissions[0]).toMatchObject({
      _xsrf: 'test-xsrf',
      up: '1',
      t77: 'Иван Петров',
      t202: '301',
      t203: 'X',
      b203: '1',
    })
    expect(submissions.quizSubmissions[0].t201).toMatch(/^\d{4}-\d{2}-\d{2} 00:00:00$/)
  })
})
