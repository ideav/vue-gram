import { beforeEach, describe, expect, it } from 'vitest'
import { useGrants } from '../useGrants'
import {
  adminPermissionContext,
  missingPermissionContext,
  readOnlyPermissionContext,
  writePermissionContext
} from '@/utils/__fixtures__/permissions'

describe('useGrants', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('denies write/admin checks when permission state is missing', () => {
    const grants = useGrants(missingPermissionContext)

    expect(grants.canWriteType(42)).toBe(false)
    expect(grants.canWriteStructure()).toBe(false)
    expect(grants.canAdmin()).toBe(false)
    expect(grants.hasGrant({ key: 42, min: 'WRITE' })).toBe(false)
  })

  it('distinguishes read-only, write, and admin permission contexts', () => {
    const readOnly = useGrants(readOnlyPermissionContext)
    const writer = useGrants(writePermissionContext)
    const admin = useGrants(adminPermissionContext)

    expect(readOnly.canReadType(42)).toBe(true)
    expect(readOnly.canWriteType(42)).toBe(false)
    expect(readOnly.canWriteStructure()).toBe(false)

    expect(writer.canReadType(42)).toBe(true)
    expect(writer.canWriteType(42)).toBe(true)
    expect(writer.canWriteStructure()).toBe(true)
    expect(writer.canAdmin()).toBe(false)

    expect(admin.canWriteType(42)).toBe(true)
    expect(admin.canWriteStructure()).toBe(true)
    expect(admin.canAdmin()).toBe(true)
  })
})
