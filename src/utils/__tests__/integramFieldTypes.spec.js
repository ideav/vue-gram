import { describe, expect, it } from 'vitest'
import {
  getIntegramArrayTypeId,
  getIntegramBaseType,
  isIntegramArrayRequisite,
  isIntegramReferenceRequisite
} from '../integramFieldTypes'

describe('integramFieldTypes', () => {
  it('maps legacy base type ids used by object editors', () => {
    expect(getIntegramBaseType(2)).toBe('HTML')
    expect(getIntegramBaseType(3)).toBe('SHORT')
    expect(getIntegramBaseType(4)).toBe('DATETIME')
    expect(getIntegramBaseType(6)).toBe('PWD')
    expect(getIntegramBaseType(7)).toBe('BUTTON')
    expect(getIntegramBaseType(8)).toBe('CHARS')
    expect(getIntegramBaseType(9)).toBe('DATE')
    expect(getIntegramBaseType(10)).toBe('FILE')
    expect(getIntegramBaseType(11)).toBe('BOOLEAN')
    expect(getIntegramBaseType(12)).toBe('MEMO')
    expect(getIntegramBaseType(13)).toBe('NUMBER')
    expect(getIntegramBaseType(14)).toBe('SIGNED')
    expect(getIntegramBaseType(15)).toBe('CALCULATABLE')
    expect(getIntegramBaseType(16)).toBe('REPORT_COLUMN')
    expect(getIntegramBaseType(17)).toBe('PATH')
  })

  it('does not classify DATETIME type id 4 as an array by itself', () => {
    expect(isIntegramArrayRequisite({ id: 4, type: '4' })).toBe(false)
  })

  it('detects subordinate array requisites from explicit array metadata', () => {
    const req = { id: 90, type: '3', arr: 901 }

    expect(isIntegramArrayRequisite(req)).toBe(true)
    expect(getIntegramArrayTypeId(req)).toBe(901)
    expect(isIntegramReferenceRequisite(req)).toBe(false)
  })

  it('detects subordinate array requisites from edit_obj arr_type mapping', () => {
    const req = { id: 90, type: '3' }

    expect(isIntegramArrayRequisite(req, { 90: 901 })).toBe(true)
    expect(getIntegramArrayTypeId(req, { 90: 901 })).toBe(901)
  })

  it('detects references only when the requisite is not an array', () => {
    expect(isIntegramReferenceRequisite({ id: 18, type: '3', ref: 500 })).toBe(true)
    expect(isIntegramReferenceRequisite({ id: 90, type: '3', ref: 500, arr: 901 })).toBe(false)
  })
})
