import { describe, expect, it } from 'vitest';
import {
  buildObjectEditHref,
  buildObjectListHref,
  buildRequisiteCell,
  getObjectReferenceValue,
  getObjectRequisiteValue,
  normalizeObjectListResponse
} from '../objectListCompat';
import {
  emptyObjectListResponse,
  ordinaryObjectListResponse,
  referencedObjectListResponse
} from '../__fixtures__/objectResponses';

describe('object list legacy compatibility helpers', () => {
  it('normalizes an ordinary object list fixture', () => {
    const normalized = normalizeObjectListResponse(ordinaryObjectListResponse);

    expect(normalized.type.val).toBe('Projects');
    expect(normalized.objects).toHaveLength(1);
    expect(normalized.requisites.map(req => req.val)).toEqual(['Status', 'Budget']);
    expect(getObjectRequisiteValue(normalized.reqs, '201', '301')).toBe('Active');
  });

  it('normalizes reference and subordinate metadata from legacy JSON', () => {
    const normalized = normalizeObjectListResponse(referencedObjectListResponse);

    expect(normalized.requisites[0]).toMatchObject({ id: '320', refType: '200', isMulti: false });
    expect(normalized.requisites[1]).toMatchObject({ id: '410', refType: '210', isMulti: true });
    expect(normalized.requisites[2]).toMatchObject({ id: '411', arrType: '411' });
    expect(getObjectReferenceValue(normalized.reqs, '285', '320')).toBe('200:42');
  });

  it('keeps empty object lists renderable', () => {
    const normalized = normalizeObjectListResponse(emptyObjectListResponse);

    expect(normalized.objects).toEqual([]);
    expect(normalized.requisites).toEqual([]);
    expect(normalized.reqs).toEqual({});
  });

  it('builds legacy-compatible object and card URLs', () => {
    expect(buildObjectListHref('my', '200', { F_I: 42 })).toBe('/my/object/200?F_I=42');
    expect(buildObjectListHref('my', '411', { F_U: 285 })).toBe('/my/object/411?F_U=285');
    expect(buildObjectEditHref('my', 285)).toBe('/my/edit_obj/285');
  });

  it('formats a reference cell with the referenced object filter link', () => {
    const normalized = normalizeObjectListResponse(referencedObjectListResponse);
    const req = normalized.requisites[0];

    const cell = buildRequisiteCell({
      database: 'my',
      objectId: '285',
      requisite: req,
      rawValue: getObjectRequisiteValue(normalized.reqs, '285', req.id),
      referenceValue: getObjectReferenceValue(normalized.reqs, '285', req.id)
    });

    expect(cell).toMatchObject({
      kind: 'reference',
      text: 'ACME',
      href: '/my/object/200?F_I=42'
    });
  });
});
