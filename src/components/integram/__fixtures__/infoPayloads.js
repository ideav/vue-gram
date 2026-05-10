export const adminInfoPayload = {
  session: {
    database: 'demo',
    authDatabase: 'my',
    userId: '1',
    userName: 'demo',
    userRole: 'admin',
    roleId: '42'
  },
  runtime: {
    appVersion: '1.0.0',
    frontend: 'Vue 3',
    generatedAt: '2026-05-10T13:00:00.000Z'
  },
  environment: {
    mode: 'test',
    server: 'https://app.integram.io',
    route: '/demo/info'
  },
  grants: {
    1: 'WRITE',
    18: 'READ'
  },
  reports: [
    {
      id: '299',
      name: 'Мои отчеты',
      description: 'Быстрые ссылки',
      format: 'report',
      priority: true
    }
  ],
  forms: [
    {
      id: '54',
      name: 'Форма заявки',
      description: 'Ежедневная форма для пользователей'
    }
  ],
  debug: {
    cookies: {
      hints_mode: 'on'
    },
    localStorageKeys: ['integram_session', 'token', '_xsrf']
  }
}

export const regularInfoPayload = {
  session: {
    database: 'demo',
    authDatabase: 'demo',
    userId: '7',
    userName: 'employee@example.com',
    userRole: 'user',
    roleId: '11'
  },
  runtime: {
    appVersion: '1.0.0',
    frontend: 'Vue 3',
    generatedAt: '2026-05-10T13:00:00.000Z'
  },
  environment: {
    mode: 'test',
    server: 'https://app.integram.io',
    route: '/demo/info'
  },
  grants: {
    1: 'READ'
  },
  reports: [],
  forms: [
    {
      id: '54',
      name: 'Форма заявки',
      description: 'Ежедневная форма для пользователей'
    }
  ],
  debug: {
    cookies: {
      hints_mode: 'off'
    },
    localStorageKeys: ['integram_session']
  }
}
