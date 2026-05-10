import { describe, expect, it } from 'vitest'
import {
  buildDirAdminParams,
  parseDirAdminHtml,
  resolveDirAdminGrant
} from '../integramDirAdmin'
import {
  dirAdminDirectoryHtml,
  dirAdminPermissionDeniedHtml
} from '../../components/integram/__fixtures__/dirAdminFixtures'

describe('integramDirAdmin helpers', () => {
  it('parses legacy dir_admin HTML into folders, files, and item URLs', () => {
    const parsed = parseDirAdminHtml(dirAdminDirectoryHtml, {
      database: 'my',
      fallbackFolder: 'templates',
      fallbackPath: ''
    })

    expect(parsed.accessDenied).toBe(false)
    expect(parsed.folder).toBe('templates')
    expect(parsed.addPath).toBe('/emails')
    expect(parsed.warning).toBe('Файл layout.html загружен')
    expect(parsed.counts).toEqual({ files: 2, folders: 1 })
    expect(parsed.folders).toEqual([
      expect.objectContaining({
        type: 'folder',
        name: 'partials',
        openAddPath: '/emails/partials'
      })
    ])
    expect(parsed.files).toEqual([
      expect.objectContaining({
        type: 'file',
        name: 'layout.html',
        size: '1.5 KB',
        modified: '10.05.2026 12:00:00',
        downloadUrl: '/my/dir_admin/?templates=1&add_path=%2Femails&gf=layout.html',
        editorUrl: '/ace/editor.html?src=/my/dir_admin/&templates=1&add_path=%2Femails&gf=layout.html',
        templatePath: '/templates/{_global_.z}/emails/layout.html',
        concretePath: '/templates/my/emails/layout.html'
      }),
      expect.objectContaining({ name: 'styles.css' })
    ])
  })

  it('normalizes legacy folder query params with sanitized add_path', () => {
    expect(buildDirAdminParams('download', '../unsafe/icons')).toEqual({
      download: '1',
      add_path: '/unsafe/icons'
    })
  })

  it('detects permission-denied legacy responses', () => {
    const parsed = parseDirAdminHtml(dirAdminPermissionDeniedHtml, {
      database: 'my'
    })

    expect(parsed.accessDenied).toBe(true)
    expect(parsed.error).toContain('Недостаточно прав')
    expect(parsed.files).toEqual([])
    expect(parsed.folders).toEqual([])
  })

  it('resolves explicit FILE grants before falling back to owner/admin access', () => {
    expect(resolveDirAdminGrant({
      userName: 'my',
      grants: { FILE: 'READ' }
    }, 'my')).toBe('READ')
    expect(resolveDirAdminGrant({ userName: 'admin' }, 'clientdb')).toBe('WRITE')
    expect(resolveDirAdminGrant({ userName: 'alice' }, 'clientdb')).toBe('WRITE')
  })
})
