function hasOwn(map, key) {
  return Object.prototype.hasOwnProperty.call(map, key);
}

function getByKey(map, key) {
  if (!map || key === null || key === undefined) return undefined;

  if (hasOwn(map, key)) return map[key];

  const stringKey = String(key);
  if (hasOwn(map, stringKey)) return map[stringKey];

  if (/^\d+$/.test(stringKey)) {
    const numberKey = Number(stringKey);
    if (hasOwn(map, numberKey)) return map[numberKey];
  }

  return undefined;
}

function cleanId(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isLikelyObjectId(value) {
  return /^\d+$/.test(cleanId(value));
}

export function getDisplayText(value) {
  if (value === null || value === undefined) return '';

  if (Array.isArray(value)) {
    return value.map(getDisplayText).filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    const display = value.displayValue ?? value.display ?? value.text ?? value.name ?? value.val ?? value.value;
    if (display !== undefined && display !== value) return getDisplayText(display);
    if (value.id !== undefined) return cleanId(value.id);
    return '';
  }

  return String(value);
}

function getReferenceIdFromValue(value) {
  if (value === null || value === undefined) return '';

  if (typeof value === 'object' && !Array.isArray(value)) {
    return cleanId(value.dirRowId ?? value.rowId ?? value.objectId ?? value.ref ?? value.id ?? value.value);
  }

  return isLikelyObjectId(value) ? cleanId(value) : '';
}

function splitDisplayValues(value) {
  if (Array.isArray(value)) return value.map(getDisplayText).filter(Boolean);

  const text = getDisplayText(value);
  if (!text) return [];

  return text.split(',').map(item => item.trim()).filter(Boolean);
}

export function parseReferenceValue(referenceValue, fallbackTableId = null) {
  let tableId = cleanId(fallbackTableId) || null;
  let ids = [];

  if (referenceValue === null || referenceValue === undefined || referenceValue === '') {
    return { tableId, ids };
  }

  if (Array.isArray(referenceValue)) {
    ids = referenceValue.map(getReferenceIdFromValue).filter(Boolean);
    return { tableId, ids };
  }

  if (typeof referenceValue === 'object') {
    tableId = cleanId(
      referenceValue.tableId ??
      referenceValue.typeId ??
      referenceValue.refType ??
      referenceValue.refTableId ??
      tableId
    ) || tableId;

    const rowIds = referenceValue.rowIds ?? referenceValue.ids ?? referenceValue.values;
    if (Array.isArray(rowIds)) {
      ids = rowIds.map(getReferenceIdFromValue).filter(Boolean);
    } else {
      const id = getReferenceIdFromValue(referenceValue);
      if (id) ids = [id];
    }

    return { tableId, ids };
  }

  const text = cleanId(referenceValue);
  const separatorIndex = text.indexOf(':');

  if (separatorIndex >= 0) {
    tableId = cleanId(text.slice(0, separatorIndex)) || tableId;
    ids = text.slice(separatorIndex + 1).split(',').map(cleanId).filter(Boolean);
  } else {
    ids = text.split(',').map(cleanId).filter(Boolean);
  }

  return { tableId, ids };
}

export function buildObjectListHref(database, typeId, query = {}) {
  const path = `/${encodeURIComponent(database)}/object/${encodeURIComponent(typeId)}`;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }

  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export function buildObjectEditHref(database, objectId) {
  return `/${encodeURIComponent(database)}/edit_obj/${encodeURIComponent(objectId)}`;
}

export function normalizeObjectListResponse(response = {}) {
  const reqType = response.req_type || {};
  const reqOrder = Array.isArray(response.req_order)
    ? response.req_order
    : Object.keys(reqType);

  const requisites = reqOrder.map(reqId => {
    const id = cleanId(reqId);
    const attrs = getByKey(response.req_attrs, id) || '';
    const refType = getByKey(response.ref_type, id) || null;
    const arrType = getByKey(response.arr_type, id) ? id : null;

    return {
      id,
      val: getByKey(reqType, id) || `Req ${id}`,
      base: getByKey(response.req_base, id) || 'TEXT',
      baseId: getByKey(response.req_base_id, id),
      refType,
      arrType,
      isMulti: attrs.includes(':MULTI:'),
      attrs
    };
  });

  return {
    type: response.type || null,
    objects: Array.isArray(response.object) ? response.object : [],
    reqs: response.reqs || {},
    requisites
  };
}

export function getObjectRequisiteValue(reqs, objectId, requisiteId) {
  const row = getByKey(reqs, objectId) || {};
  return getByKey(row, requisiteId) ?? '';
}

export function getObjectReferenceValue(reqs, objectId, requisiteId) {
  const row = getByKey(reqs, objectId) || {};
  return getByKey(row, `ref_${requisiteId}`) ?? '';
}

export function buildRequisiteCell({ database, objectId, requisite, rawValue, referenceValue }) {
  const valueText = getDisplayText(rawValue);

  if (requisite?.arrType) {
    const count = valueText === '' ? '0' : valueText;
    return {
      kind: 'nested',
      text: `(${count})`,
      href: buildObjectListHref(database, requisite.arrType, { F_U: objectId })
    };
  }

  if (requisite?.refType) {
    const reference = parseReferenceValue(referenceValue, requisite.refType);
    const displayValues = splitDisplayValues(rawValue);
    let ids = reference.ids;

    if (ids.length === 0 && Array.isArray(rawValue)) {
      ids = rawValue.map(getReferenceIdFromValue).filter(Boolean);
    } else if (ids.length === 0) {
      const fallbackId = getReferenceIdFromValue(rawValue);
      if (fallbackId) ids = [fallbackId];
    }

    const items = ids.map((id, index) => ({
      id,
      text: displayValues[index] || id,
      href: reference.tableId
        ? buildObjectListHref(database, reference.tableId, { F_I: id })
        : null
    }));

    if (items.length === 0 && valueText) {
      items.push({ id: null, text: valueText, href: null });
    }

    if (requisite.isMulti) {
      return {
        kind: 'multi-reference',
        text: items.map(item => item.text).join(', '),
        items
      };
    }

    const item = items[0] || { text: valueText, href: null };
    return {
      kind: 'reference',
      text: item.text || '',
      href: item.href
    };
  }

  return {
    kind: valueText ? 'text' : 'empty',
    text: valueText,
    href: null
  };
}
