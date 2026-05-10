import {
  ACCESS_LEVELS,
  canAdmin,
  hasWriteRole,
  normalizeGrantValue
} from './integramPermissions'

export const DIR_ADMIN_GRANTS = {
  WRITE: 'WRITE',
  READ: 'READ',
  BARRED: 'BARRED'
}

const FOLDERS = new Set(['templates', 'download'])

export function normalizeDirAdminFolder(folder = 'templates') {
  return FOLDERS.has(folder) ? folder : 'templates'
}

export function normalizeAddPath(path = '') {
  if (!path) return ''

  const parts = String(path)
    .replace(/\\/g, '/')
    .split('/')
    .map(part => part.trim())
    .filter(part => part && part !== '.' && part !== '..')

  return parts.length ? `/${parts.join('/')}` : ''
}

export function buildDirAdminParams(folder = 'templates', addPath = '', extra = {}) {
  const normalizedFolder = normalizeDirAdminFolder(folder)
  return {
    [normalizedFolder]: '1',
    add_path: normalizeAddPath(addPath),
    ...extra
  }
}

export function normalizeDirAdminGrant(value) {
  if (value === undefined) return null

  const level = normalizeGrantValue(value)
  if (level === null) return null
  if (level >= ACCESS_LEVELS.WRITE) return DIR_ADMIN_GRANTS.WRITE
  if (level >= ACCESS_LEVELS.READ) return DIR_ADMIN_GRANTS.READ
  if (level <= ACCESS_LEVELS.NONE) return DIR_ADMIN_GRANTS.BARRED
  return null
}

function lookupExplicitFileGrant(grants) {
  const direct = normalizeDirAdminGrant(grants)
  if (direct) return direct
  if (!grants || typeof grants !== 'object') return null

  const keys = [
    'FILE',
    'file',
    'File',
    'files',
    'dir_admin',
    'DIR_ADMIN',
    'repository',
    'repo'
  ]

  for (const key of keys) {
    const grant = normalizeDirAdminGrant(grants[key])
    if (grant) return grant
  }

  return null
}

export function resolveDirAdminGrant(authInfo = {}, database = '') {
  const explicitGrant = lookupExplicitFileGrant(authInfo?.grants)
  if (explicitGrant) return explicitGrant

  const userName = String(authInfo?.userName || '').trim()
  const dbName = String(database || authInfo?.database || '').trim()

  if (userName === 'admin' || canAdmin(authInfo) || hasWriteRole(authInfo) || (userName && userName === dbName)) {
    return DIR_ADMIN_GRANTS.WRITE
  }

  return DIR_ADMIN_GRANTS.BARRED
}

export function isDirAdminPermissionError(text = '') {
  return /Недостаточно прав|Insufficient permissions|Not grants?|no grant|нет прав/i.test(String(text))
}

function textContent(element) {
  return element?.textContent?.replace(/\s+/g, ' ').trim() || ''
}

function parseUrlParams(href = '') {
  const query = href.includes('?') ? href.slice(href.indexOf('?') + 1) : href
  return new URLSearchParams(query.replace(/&amp;/g, '&'))
}

function makeQueryString(params) {
  return new URLSearchParams(params).toString()
}

function buildFileDetails({ database, folder, addPath, name }) {
  const normalizedFolder = normalizeDirAdminFolder(folder)
  const normalizedPath = normalizeAddPath(addPath)
  const query = makeQueryString({
    [normalizedFolder]: '1',
    add_path: normalizedPath,
    gf: name
  })

  return {
    downloadUrl: `/${database}/dir_admin/?${query}`,
    editorUrl: `/ace/editor.html?src=/${database}/dir_admin/&${query}`,
    templatePath: `/${normalizedFolder}/{_global_.z}${normalizedPath}/${name}`.replace(/\/+/g, '/'),
    concretePath: `/${normalizedFolder}/${database}${normalizedPath}/${name}`.replace(/\/+/g, '/')
  }
}

function buildFolderDetails({ database, folder, addPath, name, openAddPath }) {
  const normalizedFolder = normalizeDirAdminFolder(folder)
  const normalizedPath = normalizeAddPath(openAddPath || `${addPath}/${name}`)
  const query = makeQueryString({
    [normalizedFolder]: '1',
    add_path: normalizedPath
  })

  return {
    openAddPath: normalizedPath,
    openUrl: `/${database}/dir_admin/?${query}`
  }
}

function parseFolderFromDocument(doc, fallbackFolder) {
  const folderInput = doc.querySelector('form[name="view_dir"] input[name="templates"], form[name="view_dir"] input[name="download"]')
  if (folderInput?.name) return normalizeDirAdminFolder(folderInput.name)

  const folderLabel = textContent(doc.querySelector('form[name="view_dir"] p b'))
  if (FOLDERS.has(folderLabel)) return folderLabel

  return normalizeDirAdminFolder(fallbackFolder)
}

function parseCounts(text) {
  const match = text.match(/Файлов:\s*(\d+),\s*каталогов:\s*(\d+)/i)
  if (!match) return { files: 0, folders: 0 }

  return {
    files: Number(match[1]),
    folders: Number(match[2])
  }
}

function parseBreadcrumbs(addPath) {
  const breadcrumbs = []
  let current = ''
  for (const part of normalizeAddPath(addPath).split('/').filter(Boolean)) {
    current = `${current}/${part}`
    breadcrumbs.push({
      name: part,
      addPath: current
    })
  }
  return breadcrumbs
}

export function parseDirAdminHtml(html = '', options = {}) {
  const {
    database = 'my',
    fallbackFolder = 'templates',
    fallbackPath = ''
  } = options

  const rawHtml = String(html || '')
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html')
  const bodyText = textContent(doc.body) || rawHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const warning = textContent(doc.querySelector('.alert-info, [role="alert"]'))
  const form = doc.querySelector('form[name="view_dir"]')
  const accessDenied = isDirAdminPermissionError(bodyText) && !form

  if (accessDenied) {
    return {
      folder: normalizeDirAdminFolder(fallbackFolder),
      anotherFolder: normalizeDirAdminFolder(fallbackFolder) === 'templates' ? 'download' : 'templates',
      addPath: normalizeAddPath(fallbackPath),
      breadcrumbs: [],
      folders: [],
      files: [],
      items: [],
      counts: { files: 0, folders: 0 },
      warning: '',
      error: bodyText,
      accessDenied: true
    }
  }

  const folder = parseFolderFromDocument(doc, fallbackFolder)
  const addPath = normalizeAddPath(form?.querySelector('input[name="add_path"]')?.value ?? fallbackPath)
  const folders = []
  const files = []

  if (form) {
    for (const checkbox of form.querySelectorAll('input[name="del[]"]')) {
      const row = checkbox.closest('tr')
      const name = checkbox.getAttribute('value') || checkbox.value
      if (!row || !name) continue

      const links = Array.from(row.querySelectorAll('a'))
      const fileLink = links.find(link => parseUrlParams(link.getAttribute('href') || '').has('gf'))

      if (fileLink) {
        const cells = Array.from(row.children).map(cell => textContent(cell))
        files.push({
          type: 'file',
          key: `file:${name}`,
          name,
          size: cells.at(-2) || '',
          modified: cells.at(-1) || '',
          ...buildFileDetails({ database, folder, addPath, name })
        })
        continue
      }

      const folderLink = links.find(link => {
        const params = parseUrlParams(link.getAttribute('href') || '')
        return params.has('add_path') && !params.has('gf')
      })
      const openAddPath = folderLink
        ? parseUrlParams(folderLink.getAttribute('href') || '').get('add_path')
        : `${addPath}/${name}`

      folders.push({
        type: 'folder',
        key: `folder:${name}`,
        name,
        ...buildFolderDetails({ database, folder, addPath, name, openAddPath })
      })
    }
  }

  return {
    folder,
    anotherFolder: folder === 'templates' ? 'download' : 'templates',
    addPath,
    breadcrumbs: parseBreadcrumbs(addPath),
    folders,
    files,
    items: [...folders, ...files],
    counts: parseCounts(bodyText),
    warning,
    error: '',
    accessDenied: false
  }
}
