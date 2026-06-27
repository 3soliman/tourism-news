import { apiDelete, apiGet, apiPatch, apiPost } from './client';

const ROLE_LABELS = {
  admin: 'Admin',
  staff: 'Staff',
  customer: 'Customer'
};

const ROLE_BADGE_CLASSES = {
  admin: 'badge badge-admin',
  staff: 'badge badge-staff',
  customer: 'badge badge-customer'
};

export function mapUser(api = {}) {
  return {
    id: String(api.id),
    email: api.email || '',
    fullName: api.full_name || '',
    phone: api.phone || '',
    role: api.role || 'customer',
    roleDisplay: api.role_display || api.role || 'customer',
    isActive: api.is_active !== false,
    isStaff: !!api.is_staff,
    lastLogin: api.last_login || null,
    ownedPropertiesCount: api.owned_properties_count ?? 0,
    bookingCount: api.booking_count ?? 0,
    createdAt: api.created_at || ''
  };
}

export function mapUserDetail(api = {}) {
  return {
    id: String(api.id),
    email: api.email || '',
    fullName: api.full_name || '',
    phone: api.phone || '',
    role: api.role || 'customer',
    roleDisplay: api.role_display || api.role || 'customer',
    isActive: api.is_active !== false,
    isStaff: !!api.is_staff,
    isSuperuser: !!api.is_superuser,
    lastLogin: api.last_login || null,
    ownedProperties: api.owned_properties || [],
    recentBookings: api.recent_bookings || [],
    createdAt: api.created_at || '',
    updatedAt: api.updated_at || ''
  };
}

export function buildUserPayload(form) {
  const payload = {
    email: form.email.trim(),
    full_name: form.fullName.trim(),
    phone: form.phone.trim(),
    role: form.role || 'customer',
    is_active: form.isActive !== false
  };
  if (form.password?.trim()) payload.password = form.password;
  return payload;
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

export function roleBadgeClass(role) {
  return ROLE_BADGE_CLASSES[role] || 'badge';
}

export function roleOptions() {
  return Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
}

export async function fetchUsers(params = {}) {
  const query = new URLSearchParams();
  if (params.role) query.set('role', params.role);
  if (params.status === 'active') query.set('is_active', 'true');
  if (params.status === 'inactive') query.set('is_active', 'false');
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', params.page);
  const qs = query.toString();
  const data = await apiGet(`/auth/users/${qs ? `?${qs}` : ''}`, { force: true });
  const list = Array.isArray(data) ? data : data.results || data.data || [];
  return {
    users: list.map(mapUser),
    total: data.count ?? list.length,
    next: data.next || null,
    previous: data.previous || null
  };
}

export async function fetchUserById(id) {
  const data = await apiGet(`/auth/users/${id}/`);
  return mapUserDetail(data);
}

export async function createUser(form) {
  const data = await apiPost('/auth/users/', buildUserPayload(form));
  return mapUser(data);
}

export async function updateUser(id, form) {
  const data = await apiPatch(`/auth/users/${id}/`, buildUserPayload(form));
  return mapUser(data);
}

export async function deleteUser(id) {
  return apiDelete(`/auth/users/${id}/`);
}

export async function activateUser(id) {
  const data = await apiPost(`/auth/users/${id}/activate/`);
  return mapUser(data);
}

export async function deactivateUser(id) {
  const data = await apiPost(`/auth/users/${id}/deactivate/`);
  return mapUser(data);
}

export async function changeUserRole(id, role) {
  const data = await apiPost(`/auth/users/${id}/change-role/`, { role });
  return mapUser(data);
}

export async function resetUserPassword(id, password) {
  return apiPost(`/auth/users/${id}/reset-password/`, { password });
}
