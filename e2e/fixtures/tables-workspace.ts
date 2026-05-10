export const tableTerms = [
  { id: 18, type: 3, name: 'User' },
  { id: 42, type: 3, name: 'Role' },
  { id: 409, type: 8, name: 'Customer' },
  { id: 422, type: 9, name: 'Payment Date' },
  { id: 22, type: 3, name: 'Query' },
  { id: 269, type: 12, name: 'Settings' },
  { id: 901, type: 14, name: 'Invoice Amount' },
]

export const tableFolders = {
  'Избранное': { open: true, tabs: ['18', '42'] },
  'Справочники': { open: true, tabs: ['409', '422'] },
  'Служебные': { open: false, tabs: ['22', '269'] },
}

export const writeGrants = { '1': 'WRITE' }
export const readGrants = { '1': 'READ' }
