export const readOnlyPermissionContext = {
  userId: 'reader-id',
  userName: 'reader',
  userRole: 'reader',
  roleId: 30,
  grants: {
    1: 'READ',
    42: 'READ',
    44: 'READ',
    FILE: 'READ'
  }
}

export const writePermissionContext = {
  userId: 'writer-id',
  userName: 'writer',
  userRole: 'writer',
  roleId: 20,
  grants: {
    1: 'WRITE',
    42: 'WRITE',
    44: 'WRITE',
    FILE: 'WRITE'
  }
}

export const adminPermissionContext = {
  userId: 'admin-id',
  userName: 'admin',
  userRole: 'admin',
  roleId: 1,
  grants: {}
}

export const missingPermissionContext = {
  userId: 'user-id',
  userName: 'user',
  userRole: '',
  roleId: null,
  grants: null
}
