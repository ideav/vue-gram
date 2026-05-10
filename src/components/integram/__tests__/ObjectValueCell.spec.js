import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ObjectValueCell from '../ObjectValueCell.vue';
import {
  getObjectReferenceValue,
  getObjectRequisiteValue,
  normalizeObjectListResponse
} from '../objectListCompat';
import {
  ordinaryObjectListResponse,
  referencedObjectListResponse
} from '../__fixtures__/objectResponses';

const RouterLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>'
};

function mountCell(props) {
  return mount(ObjectValueCell, {
    props,
    global: {
      stubs: {
        RouterLink: RouterLinkStub
      }
    }
  });
}

describe('ObjectValueCell', () => {
  it('renders ordinary values as text', () => {
    const normalized = normalizeObjectListResponse(ordinaryObjectListResponse);
    const req = normalized.requisites[0];

    const wrapper = mountCell({
      database: 'my',
      objectId: '201',
      requisite: req,
      rawValue: getObjectRequisiteValue(normalized.reqs, '201', req.id)
    });

    expect(wrapper.text()).toBe('Active');
    expect(wrapper.find('a').exists()).toBe(false);
  });

  it('renders single reference values as legacy object-filter links', () => {
    const normalized = normalizeObjectListResponse(referencedObjectListResponse);
    const req = normalized.requisites[0];

    const wrapper = mountCell({
      database: 'my',
      objectId: '285',
      requisite: req,
      rawValue: getObjectRequisiteValue(normalized.reqs, '285', req.id),
      referenceValue: getObjectReferenceValue(normalized.reqs, '285', req.id)
    });

    expect(wrapper.find('a').attributes('href')).toBe('/my/object/200?F_I=42');
    expect(wrapper.text()).toBe('ACME');
  });

  it('renders multiselect references as separate links', () => {
    const normalized = normalizeObjectListResponse(referencedObjectListResponse);
    const req = normalized.requisites[1];

    const wrapper = mountCell({
      database: 'my',
      objectId: '285',
      requisite: req,
      rawValue: getObjectRequisiteValue(normalized.reqs, '285', req.id),
      referenceValue: getObjectReferenceValue(normalized.reqs, '285', req.id)
    });

    const links = wrapper.findAll('a');
    expect(links.map(link => link.attributes('href'))).toEqual([
      '/my/object/210?F_I=7',
      '/my/object/210?F_I=8'
    ]);
    expect(links.map(link => link.text())).toEqual(['Urgent', 'External']);
  });

  it('renders subordinate columns as parent-filter links', () => {
    const normalized = normalizeObjectListResponse(referencedObjectListResponse);
    const req = normalized.requisites[2];

    const wrapper = mountCell({
      database: 'my',
      objectId: '285',
      requisite: req,
      rawValue: getObjectRequisiteValue(normalized.reqs, '285', req.id)
    });

    expect(wrapper.find('a').attributes('href')).toBe('/my/object/411?F_U=285');
    expect(wrapper.text()).toBe('(3)');
  });
});
