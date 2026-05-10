import { expect, test, type Page } from '@playwright/test'

const dictionaryResponse = {
  200: 'Clients',
  300: 'Contracts',
  350: 'Service marker',
}

const dictionarySettingsResponse = {
  object: [{ id: '9001', val: 'tester' }],
  reqs: {
    9001: {
      273: JSON.stringify({
        Избранное: { open: true, tabs: ['200'] },
        Справочники: { open: true, tabs: [] },
        Служебные: { open: false, tabs: ['350'] },
      }),
    },
  },
}

const editTypesResponse = {
  edit_types: {
    id: ['200', '200', '300', '300'],
    t: ['3', '3', '3', '3'],
    ref_val: ['', '', '', ''],
    uniq: ['1', '', '0', ''],
    val: ['Clients', 'Name', 'Contracts', 'Client'],
    ord: ['', '1', '', '1'],
    req_id: ['', '601', '', '701'],
    req_t: ['', '3', '', '200'],
    attrs: ['', ':!NULL:', '', ':MULTI::ALIAS=Customer:'],
    reft: ['', '', '', '200'],
  },
}

const typeMetadataResponse = {
  type: { id: '300', val: 'Contracts', t: '3', unique: false },
  reqs: [
    { id: '701', typ: '300', val: 'Client', type: '200', reft: '200' },
  ],
}

async function installApiMocks(page: Page) {
  await page.route('**/api/my/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname

    if (path.includes('/xsrf')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'test-token', _xsrf: 'test-xsrf', id: '1', user: 'tester', role: 'admin' }),
      })
      return
    }

    if (path.includes('/dict')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dictionaryResponse) })
      return
    }

    if (path.includes('/object/269')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dictionarySettingsResponse) })
      return
    }

    if (path.includes('/edit_types')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(editTypesResponse) })
      return
    }

    if (path.includes('/metadata/300')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(typeMetadataResponse) })
      return
    }

    if (path.includes('/_d_save/300')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ obj: '300' }) })
      return
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
}

async function authenticate(page: Page) {
  await installApiMocks(page)
  await page.addInitScript(() => {
    const session = {
      database: 'my',
      token: 'test-token',
      xsrfToken: 'test-xsrf',
      userId: '1',
      userName: 'tester',
      userRole: 'admin',
      authServer: 'http://localhost:3000',
      authDatabase: 'my',
    }
    localStorage.setItem('integram_server', 'http://localhost:3000')
    localStorage.setItem('integram_session', JSON.stringify(session))
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('_xsrf', 'test-xsrf')
    localStorage.setItem('user', 'tester')
    localStorage.setItem('id', '1')
    localStorage.setItem('db', 'my')
  })
}

test.describe('dictionary and type editor migration smoke', () => {
  test('opens dict/edit_types and performs a safe mocked type save', async ({ page }) => {
    await authenticate(page)

    await page.goto('/my/dict')
    await expect(page.getByText('Таблицы').first()).toBeVisible()
    await expect(page.getByText('Clients').first()).toBeVisible()

    await page.goto('/my/edit_types')
    await expect(page.getByText('Структура').first()).toBeVisible()

    await page.getByTestId('schema-legacy-edit-300').click()
    await page.locator('#editTypeName').fill('Contracts Updated')

    const saveRequest = page.waitForRequest(request =>
      request.method() === 'POST' && request.url().includes('/api/my/_d_save/300')
    )
    await page.getByTestId('save-edited-type').click()

    const request = await saveRequest
    const body = request.postData() || ''
    expect(body).toContain('val=Contracts+Updated')
    expect(body).toContain('t=3')
    expect(body).toContain('_xsrf=test-xsrf')
  })
})
