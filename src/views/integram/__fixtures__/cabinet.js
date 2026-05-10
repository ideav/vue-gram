import cabinetProfileRows from '@/services/__fixtures__/integramApi/cabinet-profile.json'

export const cabinetProfileRowsFixture = cabinetProfileRows

export const cabinetPermissionVariants = {
  regularUser: {
    role: 'user',
    canCreateDatabase: true,
    canRestoreAdmin: true
  },
  freePlanAtDatabaseLimit: {
    role: 'user',
    canCreateDatabase: false,
    reason: 'free-plan-database-limit'
  },
  admin: {
    role: 'admin',
    canCreateDatabase: true,
    canRestoreAdmin: true
  }
}

export const cabinetCommunityRowsFixture = [
  {
    InviteID: '9001',
    Invite: '1778419000',
    DB: 'alpha',
    Name: 'Alpha Workspace',
    Description: 'Open public cooperation',
    GuestUserID: '',
    GuestUser: '',
    HostUserID: '194856',
    HostUser: 'alice@example.test',
    StateID: '371',
    State: 'Новое'
  },
  {
    InviteID: '9002',
    Invite: '1778419100',
    DB: 'clientdb',
    Name: 'Client DB',
    Description: 'Access request',
    GuestUserID: '194856',
    GuestUser: 'alice@example.test',
    HostUserID: '42',
    HostUser: 'owner@example.test',
    StateID: '375',
    State: 'Запрос'
  }
]
