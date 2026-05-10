import { describe, expect, it } from 'vitest'

import {
  buildLegacyMenuPath,
  filterMenuTree,
  findActiveMenuItem,
  flattenMenuTree,
  normalizeMenuData
} from '../integramMenu'

const legacyMenuData = [
  { menu_id: '10', menu_up: '', name: 'Рабочие места', href: '', icon: '<i class="pi pi-folder"></i>' },
  { menu_id: '11', menu_up: '10', name: 'Таблицы', href: 'table', icon: '<i class="pi pi-table"></i>' },
  { menu_id: '12', menu_up: '10', name: 'Запросы', href: 'report/77?mode=view', icon: '📊' },
  { menu_id: '13', menu_up: '10', name: 'Старые таблицы', href: 'tables/42', icon: '' },
  { menu_id: '20', menu_up: '', name: 'Формы', href: 'forms', icon: 'pi pi-file' },
  { menu_id: '99', menu_up: 'missing-parent', name: 'Осиротевший пункт', href: 'info', icon: '' }
]

describe('integram menu adapter', () => {
  it('normalizes legacy server menuData into a stable tree', () => {
    const tree = normalizeMenuData(legacyMenuData)

    expect(tree.map(item => item.id)).toEqual(['10', '20', '99'])
    expect(tree[0].children.map(item => item.id)).toEqual(['11', '12', '13'])
    expect(tree[0]).toMatchObject({
      id: '10',
      parentId: '',
      label: 'Рабочие места',
      href: '',
      iconClass: 'pi pi-folder'
    })
    expect(tree[0].children[1]).toMatchObject({
      id: '12',
      label: 'Запросы',
      href: 'report/77?mode=view',
      iconText: '📊'
    })
  })

  it('flattens expanded branches while preserving nesting metadata', () => {
    const tree = normalizeMenuData(legacyMenuData)
    const rows = flattenMenuTree(tree, new Set(['10']))

    expect(rows.map(row => [row.item.id, row.level, row.hasChildren])).toEqual([
      ['10', 0, true],
      ['11', 1, false],
      ['12', 1, false],
      ['13', 1, false],
      ['20', 0, false],
      ['99', 0, false]
    ])
  })

  it('finds active menu items for exact routes and deep links', () => {
    const tree = normalizeMenuData(legacyMenuData)

    expect(findActiveMenuItem(tree, '/my/table/42', 'my')?.id).toBe('11')
    expect(findActiveMenuItem(tree, '/my/report/77?mode=view', 'my')?.id).toBe('12')
    expect(findActiveMenuItem(tree, '/my/tables/42', 'my')?.id).toBe('13')
  })

  it('maps legacy menu hrefs to compatible Vue routes', () => {
    expect(buildLegacyMenuPath('my', 'tables/42')).toBe('/my/table/42')
    expect(buildLegacyMenuPath('my', '/my/forms')).toBe('/my/form')
    expect(buildLegacyMenuPath('my', 'iquiz/801')).toBe('/my/quiz/801')
    expect(buildLegacyMenuPath('my', 'query/77?x=1#top')).toBe('/my/report/77?x=1#top')
    expect(buildLegacyMenuPath('my', 'https://example.test/docs')).toBe('https://example.test/docs')
  })

  it('filters by text and keeps matching ancestors visible', () => {
    const tree = normalizeMenuData(legacyMenuData)
    const filtered = filterMenuTree(tree, 'запрос')
    const rows = flattenMenuTree(filtered, new Set(), { forceExpanded: true })

    expect(rows.map(row => row.item.label)).toEqual(['Рабочие места', 'Запросы'])
    expect(rows[1].isSearchMatch).toBe(true)
  })
})
