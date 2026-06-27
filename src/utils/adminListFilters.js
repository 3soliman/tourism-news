function normalizeQuery(query) {
  return String(query || '').trim().toLowerCase();
}

function haystackIncludes(fields, query) {
  const q = normalizeQuery(query);
  if (!q) return true;
  const haystack = fields.filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(q);
}

export function filterAdminProperties(properties, query) {
  const list = Array.isArray(properties) ? properties : [];
  const q = normalizeQuery(query);
  if (!q) return list;

  return list.filter((property) =>
    haystackIncludes(
      [
        property.name,
        property.id,
        property.city,
        property.country,
        property.address,
        property.propertyType,
        property.subdomain,
        property.isActive !== false ? 'active' : 'inactive'
      ],
      q
    )
  );
}

export function filterAdminRoomTypes(roomTypes, query, { resolvePropertyName } = {}) {
  const list = Array.isArray(roomTypes) ? roomTypes : [];
  const q = normalizeQuery(query);
  if (!q) return list;

  return list.filter((room) => {
    const propertyLabel =
      room.propertyName ||
      (typeof resolvePropertyName === 'function' ? resolvePropertyName(room.property) : '');

    return haystackIncludes(
      [
        room.name,
        room.id,
        propertyLabel,
        room.property,
        room.unitTypeLabel,
        room.unitType,
        room.bedTypeLabel,
        room.bedType,
        room.description,
        room.currency,
        room.basePrice,
        room.isActive ? 'active' : 'inactive'
      ],
      q
    );
  });
}
