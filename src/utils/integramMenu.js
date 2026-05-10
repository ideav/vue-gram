const LEGACY_ROUTE_ALIASES = Object.freeze({
  forms: 'form',
  iquiz: 'quiz',
  query: 'report',
  tables: 'table'
})

export const DEFAULT_LEGACY_MENU_DATA = Object.freeze([
  { menu_id: 'dict', menu_up: '', name: 'Объекты', href: 'dict', icon: '<i class="fi fi-rr-database"></i>' },
  { menu_id: 'table', menu_up: '', name: 'Таблицы', href: 'table', icon: '<i class="fi fi-rr-table"></i>' },
  { menu_id: 'edit_types', menu_up: '', name: 'Структура', href: 'edit_types', icon: '<i class="fi fi-rr-sitemap"></i>' },
  { menu_id: 'sql', menu_up: '', name: 'SQL', href: 'sql', icon: '<i class="fi fi-rr-code"></i>' },
  { menu_id: 'smartq', menu_up: '', name: 'Умный запрос', href: 'smartq', icon: '<i class="fi fi-rr-search"></i>' },
  { menu_id: 'report', menu_up: '', name: 'Запросы', href: 'report', icon: '<i class="fi fi-rr-chart-histogram"></i>' },
  { menu_id: 'form', menu_up: '', name: 'Формы', href: 'form', icon: '<i class="fi fi-rr-file"></i>' },
  { menu_id: 'myform', menu_up: '', name: 'Мои формы', href: 'myform', icon: '<i class="fi fi-rr-settings-sliders"></i>' },
  { menu_id: 'quiz', menu_up: '', name: 'Опросы', href: 'quiz', icon: '<i class="fi fi-rr-question"></i>' },
  { menu_id: 'upload', menu_up: '', name: 'Загрузка', href: 'upload', icon: '<i class="fi fi-rr-upload"></i>' },
  { menu_id: 'dir_admin', menu_up: '', name: 'Файлы', href: 'dir_admin', icon: '<i class="fi fi-rr-folder"></i>' },
  { menu_id: 'info', menu_up: '', name: 'Информация', href: 'info', icon: '<i class="fi fi-rr-info"></i>' }
])

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function stripTags(value) {
  return String(value || '').replace(/<[^>]*>/g, '').trim()
}

function normalizeIcon(rawIcon) {
  const decoded = decodeHtmlEntities(rawIcon).trim()
  if (!decoded) return { iconClass: 'fi fi-rr-file', iconText: '' }

  const classMatch = decoded.match(/<i\b[^>]*class=["']([^"']+)["'][^>]*>/i)
  if (classMatch?.[1]) {
    return { iconClass: classMatch[1].trim(), iconText: '' }
  }

  if (/^(pi|fi)\s+/.test(decoded)) {
    return { iconClass: decoded, iconText: '' }
  }

  const text = stripTags(decoded)
  if (text) return { iconClass: '', iconText: text }

  return { iconClass: 'fi fi-rr-file', iconText: '' }
}

function normalizeMenuItem(rawItem, index, usedIds) {
  const rawId = rawItem?.menu_id ?? rawItem?.id ?? rawItem?.key ?? `menu-${index + 1}`
  let id = String(rawId)
  if (!id) id = `menu-${index + 1}`
  if (usedIds.has(id)) id = `${id}-${index + 1}`
  usedIds.add(id)

  const parentId = rawItem?.menu_up ?? rawItem?.parentId ?? rawItem?.up ?? ''
  const label = rawItem?.name ?? rawItem?.label ?? rawItem?.title ?? ''
  const href = rawItem?.href ?? rawItem?.url ?? ''
  const icon = normalizeIcon(rawItem?.icon)

  return {
    id,
    parentId: String(parentId || ''),
    label: String(label || ''),
    href: String(href || '').trim(),
    iconClass: icon.iconClass,
    iconText: icon.iconText,
    raw: rawItem,
    children: []
  }
}

export function normalizeMenuData(menuData, fallbackMenuData = DEFAULT_LEGACY_MENU_DATA) {
  const source = Array.isArray(menuData) && menuData.length > 0 ? menuData : fallbackMenuData
  const usedIds = new Set()
  const nodes = source.map((item, index) => normalizeMenuItem(item, index, usedIds))
  const nodeMap = new Map(nodes.map(item => [item.id, item]))
  const topLevel = []

  for (const node of nodes) {
    const parent = node.parentId && node.parentId !== node.id ? nodeMap.get(node.parentId) : null
    if (parent) {
      parent.children.push(node)
    } else {
      topLevel.push(node)
    }
  }

  return topLevel
}

export function flattenMenuTree(tree, expandedIds = new Set(), options = {}) {
  const rows = []
  const forceExpanded = Boolean(options.forceExpanded)

  function visit(items, level, parentIds) {
    for (const item of items) {
      const hasChildren = item.children.length > 0
      const isExpanded = forceExpanded || expandedIds.has(item.id)
      rows.push({
        item,
        level,
        hasChildren,
        isExpanded,
        parentIds,
        isSearchMatch: item.isSearchMatch === true
      })

      if (hasChildren && isExpanded) {
        visit(item.children, level + 1, [...parentIds, item.id])
      }
    }
  }

  visit(tree, 0, [])
  return rows
}

function getSearchHaystack(item) {
  return `${item.label} ${item.href}`.toLocaleLowerCase()
}

export function filterMenuTree(tree, query) {
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase()
  if (!normalizedQuery) return tree

  function visit(item) {
    const directMatch = getSearchHaystack(item).includes(normalizedQuery)
    const matchingChildren = item.children.map(visit).filter(Boolean)

    if (!directMatch && matchingChildren.length === 0) return null

    return {
      ...item,
      isSearchMatch: directMatch,
      children: directMatch ? item.children : matchingChildren
    }
  }

  return tree.map(visit).filter(Boolean)
}

export function getMenuItemAncestors(tree, itemId) {
  const path = []

  function visit(items, parents) {
    for (const item of items) {
      if (item.id === itemId) {
        path.push(...parents)
        return true
      }
      if (visit(item.children, [...parents, item.id])) return true
    }
    return false
  }

  visit(tree, [])
  return path
}

function splitUrlParts(value) {
  const input = String(value || '').trim()
  const hashIndex = input.indexOf('#')
  const beforeHash = hashIndex === -1 ? input : input.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : input.slice(hashIndex)
  const queryIndex = beforeHash.indexOf('?')
  const path = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex)
  const query = queryIndex === -1 ? '' : beforeHash.slice(queryIndex)
  return { path, query, hash }
}

export function isExternalMenuHref(href) {
  return /^(https?:)?\/\//i.test(String(href || '')) || /^(mailto|tel):/i.test(String(href || ''))
}

function normalizePathSegments(path, database, options = {}) {
  const applyAliases = options.applyAliases !== false
  const db = String(database || '').replace(/^\/+|\/+$/g, '')
  const clean = String(path || '').replace(/^\/+|\/+$/g, '')
  const segments = clean ? clean.split('/').filter(Boolean) : []

  if (db && segments[0] === db) segments.shift()
  if (applyAliases && segments[0] && LEGACY_ROUTE_ALIASES[segments[0]]) {
    segments[0] = LEGACY_ROUTE_ALIASES[segments[0]]
  }

  return segments
}

function comparablePath(value, database, options = {}) {
  if (!value || isExternalMenuHref(value)) return ''
  const { path } = splitUrlParts(value)
  return normalizePathSegments(path, database, options).join('/')
}

function isPathActive(currentPath, itemPath) {
  if (!itemPath) return false
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`)
}

function findActiveWithAliasMode(tree, fullPath, database, options) {
  const currentPath = comparablePath(fullPath, database, options)
  const rows = flattenMenuTree(tree, new Set(), { forceExpanded: true })
  let bestMatch = null
  let bestLength = -1

  for (const row of rows) {
    if (!row.item.href) continue
    const itemPath = comparablePath(row.item.href, database, options)
    if (!isPathActive(currentPath, itemPath)) continue

    if (itemPath.length > bestLength) {
      bestMatch = row.item
      bestLength = itemPath.length
    }
  }

  return bestMatch
}

export function findActiveMenuItem(tree, fullPath, database) {
  return (
    findActiveWithAliasMode(tree, fullPath, database, { applyAliases: false }) ||
    findActiveWithAliasMode(tree, fullPath, database, { applyAliases: true })
  )
}

export function buildLegacyMenuPath(database, href) {
  const rawHref = String(href || '').trim()
  if (!rawHref) return ''
  if (isExternalMenuHref(rawHref)) return rawHref

  const { path, query, hash } = splitUrlParts(rawHref)
  const db = String(database || '').replace(/^\/+|\/+$/g, '')
  const segments = normalizePathSegments(path, db, { applyAliases: true })
  const normalizedPath = segments.join('/')

  return `/${db}${normalizedPath ? `/${normalizedPath}` : ''}${query}${hash}`
}
