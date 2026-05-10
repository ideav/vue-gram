import { beforeEach, describe, expect, it } from 'vitest'
import {
  canAdmin,
  canReadType,
  canWriteStructure,
  canWriteType,
  readIntegramPermissionContext
} from '../integramPermissions'
import {
  adminPermissionContext,
  missingPermissionContext,
  readOnlyPermissionContext,
  writePermissionContext
} from '../__fixtures__/permissions'

describe('integramPermissions', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('checks read-only, writer, admin, and missing contexts consistently', () => {
    expect(canReadType(42, readOnlyPermissionContext)).toBe(true)
    expect(canWriteType(42, readOnlyPermissionContext)).toBe(false)
    expect(canWriteStructure(readOnlyPermissionContext)).toBe(false)

    expect(canReadType(42, writePermissionContext)).toBe(true)
    expect(canWriteType(42, writePermissionContext)).toBe(true)
    expect(canWriteStructure(writePermissionContext)).toBe(true)

    expect(canAdmin(adminPermissionContext)).toBe(true)
    expect(canWriteType(42, adminPermissionContext)).toBe(true)

    expect(canReadType(42, missingPermissionContext)).toBe(false)
    expect(canWriteType(42, missingPermissionContext)).toBe(false)
    expect(canAdmin(missingPermissionContext)).toBe(false)
  })

  it('reads grants from saved v2 sessions without treating the session envelope as grants', () => {
    localStorage.setItem('integram_session', JSON.stringify({
      version: 2,
      currentDatabase: 'client',
      databases: {
        client: {
          token: 'token',
          xsrf: 'xsrf',
          userName: 'reader',
          userRole: 'reader',
          roleId: 30,
          grants: { 1: 'READ', 42: 'READ' }
        }
      }
    }))

    const context = readIntegramPermissionContext('client')

    expect(context.grants).toEqual({ 1: 'READ', 42: 'READ' })
    expect(context.grants).not.toHaveProperty('databases')
    expect(canReadType(42, context)).toBe(true)
    expect(canWriteType(42, context)).toBe(false)
  })

  it('denies write access when a saved session has no grants or role', () => {
    localStorage.setItem('integram_session', JSON.stringify({
      version: 2,
      currentDatabase: 'client',
      databases: {
        client: {
          token: 'token',
          xsrf: 'xsrf',
          userName: 'alice'
        }
      }
    }))

    const context = readIntegramPermissionContext('client')

    expect(context.grants).toBeNull()
    expect(canWriteType(42, context)).toBe(false)
    expect(canWriteStructure(context)).toBe(false)
    expect(canAdmin(context)).toBe(false)
  })
})
