import { apiGet } from './client';
import { resolveNextApiPath } from './pagination';

const ACTION_LABELS = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  registered: 'Registered',
  profile_updated: 'Profile updated',
  login: 'Login',
  logout: 'Logout',
  activate: 'Activated',
  deactivate: 'Deactivated',
  change_role: 'Role changed',
  reset_password: 'Password reset',
  password_reset: 'Password reset',
  password_reset_requested: 'Password reset requested',
  published: 'Published',
  unpublished: 'Unpublished',
  archived: 'Archived',
  unarchived: 'Unarchived',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  inquiry_created: 'Inquiry created'
};

export const AUDIT_ACTION_GROUPS = {
  all: null,
  created: ['created', 'registered', 'inquiry_created'],
  updated: ['updated', 'profile_updated'],
  deleted: ['deleted'],
  published: ['published', 'unpublished', 'archived', 'unarchived'],
  bookings: ['confirmed', 'cancelled', 'inquiry_created', 'created'],
  users: ['activate', 'deactivate', 'change_role', 'reset_password', 'password_reset', 'password_reset_requested'],
  auth: ['login', 'logout', 'registered', 'password_reset', 'password_reset_requested']
};

export const AUDIT_ACTION_FILTER_KEYS = [
  { id: 'all', labelKey: 'pages.auditLogs.allActions' },
  { id: 'created', labelKey: 'pages.auditLogs.actionCreated' },
  { id: 'updated', labelKey: 'pages.auditLogs.actionUpdated' },
  { id: 'deleted', labelKey: 'pages.auditLogs.actionDeleted' },
  { id: 'published', labelKey: 'pages.auditLogs.actionPublished' },
  { id: 'bookings', labelKey: 'pages.auditLogs.actionBookings' },
  { id: 'users', labelKey: 'pages.auditLogs.actionUsers' },
  { id: 'auth', labelKey: 'pages.auditLogs.actionAuth' }
];

function parseList(data) {
  if (Array.isArray(data)) {
    return { results: data, count: data.length, next: null, previous: null };
  }
  return {
    results: data.results || data.data || [],
    count: data.count ?? null,
    next: data.next ?? null,
    previous: data.previous ?? null
  };
}

function formatActionLabel(action) {
  const key = String(action || 'unknown').toLowerCase();
  if (ACTION_LABELS[key]) return ACTION_LABELS[key];
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveEntityType(api) {
  const raw = api.content_type ?? api.model ?? api.entity_type ?? api.resource_type ?? '';
  if (raw && typeof raw === 'object') {
    return raw.model || raw.name || raw.label || raw.app_label || '';
  }
  return String(raw || '').replace(/_/g, ' ');
}

function resolveActor(api) {
  const actor = api.actor ?? api.user ?? api.performed_by ?? api.created_by;
  if (actor && typeof actor === 'object') {
    return {
      id: String(actor.id ?? actor.pk ?? ''),
      email: actor.email || '',
      name:
        actor.name ||
        actor.full_name ||
        actor.username ||
        actor.email ||
        'Unknown user'
    };
  }

  const id = actor != null && actor !== '' ? String(actor) : api.actor_id != null ? String(api.actor_id) : '';
  const email = api.user_email || api.actor_email || api.email || '';
  const name =
    api.user_name ||
    api.actor_name ||
    api.username ||
    email ||
    (id ? `User #${id}` : 'System');

  return { id, email, name };
}

/** Normalize API change payloads into [{ field, before, after }] */
export function normalizeAuditChanges(raw) {
  if (!raw) return [];

  if (typeof raw === 'string') {
    return [{ field: 'message', before: '', after: raw }];
  }

  if (Array.isArray(raw)) {
    return raw.map((entry, index) => {
      if (typeof entry === 'string') {
        return { field: `change_${index + 1}`, before: '', after: entry };
      }
      if (entry && typeof entry === 'object') {
        return {
          field: entry.field || entry.name || `change_${index + 1}`,
          before: entry.before ?? entry.old ?? entry.from ?? '',
          after: entry.after ?? entry.new ?? entry.to ?? ''
        };
      }
      return { field: `change_${index + 1}`, before: '', after: String(entry) };
    });
  }

  if (typeof raw === 'object') {
    return Object.entries(raw).map(([field, value]) => {
      if (Array.isArray(value) && value.length >= 2) {
        return { field, before: value[0], after: value[1] };
      }
      if (value && typeof value === 'object') {
        if ('old' in value || 'new' in value) {
          return {
            field,
            before: value.old ?? '',
            after: value.new ?? ''
          };
        }
        return {
          field,
          before: value.before ?? value.old ?? value.from ?? '',
          after: value.after ?? value.new ?? value.to ?? JSON.stringify(value)
        };
      }
      return { field, before: '', after: value != null ? String(value) : '' };
    });
  }

  return [];
}

export function mapAuditLog(api) {
  const action = api.action ?? api.action_type ?? api.event ?? api.verb ?? 'unknown';
  const changesSource =
    api.changes ??
    api.change_message ??
    api.diff ??
    api.changed_fields ??
    api.metadata?.changes ??
    api.extra?.changes;

  return {
    id: String(api.id),
    action: String(action).toLowerCase(),
    actionLabel: api.action_display || api.action_label || formatActionLabel(action),
    entityType: resolveEntityType(api),
    objectId: String(api.object_id ?? api.object_pk ?? api.target_id ?? ''),
    objectRepr: api.object_repr ?? api.object_name ?? api.target_repr ?? api.description ?? '',
    actor: resolveActor(api),
    timestamp: api.timestamp ?? api.created_at ?? api.date ?? api.performed_at ?? '',
    changes: normalizeAuditChanges(changesSource),
    ipAddress: api.ip_address ?? api.remote_addr ?? api.ip ?? '',
    requestMethod: api.request_method ?? api.http_method ?? '',
    requestPath: api.request_path ?? api.path ?? '',
    userAgent: api.user_agent ?? api.http_user_agent ?? '',
    notes: api.notes ?? api.comment ?? api.message ?? '',
    raw: api
  };
}

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('page_size', String(params.pageSize));
  if (params.search) qs.set('search', params.search);
  if (params.contentType) qs.set('content_type', params.contentType);
  if (params.objectId) qs.set('object_id', params.objectId);
  if (params.userId) qs.set('user', params.userId);
  return qs.toString();
}

/** GET /api/audit-logs/ */
export async function fetchAuditLogs(params = {}) {
  const query = buildQuery({ page: 1, pageSize: 20, ...params });
  const path = query ? `/audit-logs/?${query}` : '/audit-logs/';
  const data = await apiGet(path, { force: params.force === true });
  const { results, count, next, previous } = parseList(data);
  return {
    logs: results.map(mapAuditLog),
    count,
    next,
    previous
  };
}

/** GET /api/audit-logs/:id/ */
export async function fetchAuditLogById(id, { force = false } = {}) {
  const data = await apiGet(`/audit-logs/${id}/`, { force });
  return mapAuditLog(data);
}

export function auditActionBadgeClass(action) {
  const key = String(action || '').toLowerCase();
  if (['created', 'registered', 'inquiry_created', 'published', 'unarchived', 'confirmed', 'activate'].includes(key)) {
    return 'badge-confirmed';
  }
  if (['updated', 'profile_updated', 'change_role', 'reset_password', 'password_reset'].includes(key)) {
    return 'badge-pending';
  }
  if (['deleted', 'deactivate', 'cancelled', 'archived', 'unpublished'].includes(key)) {
    return 'badge-cancelled';
  }
  if (['login', 'logout', 'password_reset_requested'].includes(key)) {
    return 'badge-type';
  }
  return 'badge-type';
}

export function matchesAuditActionFilter(log, filterKey) {
  if (!filterKey || filterKey === 'all') return true;
  const group = AUDIT_ACTION_GROUPS[filterKey];
  if (group) return group.includes(log.action);
  return log.action === filterKey;
}

export function filterAuditLogs(logs, { action = 'all', query = '' } = {}) {
  const q = query.trim().toLowerCase();
  return logs.filter((log) => {
    if (!matchesAuditActionFilter(log, action)) return false;
    if (!q) return true;
    const haystack = [
      log.actionLabel,
      log.action,
      log.entityType,
      log.objectRepr,
      log.objectId,
      log.actor.name,
      log.actor.email,
      log.requestMethod,
      log.requestPath,
      log.notes,
      ...log.changes.map((c) => `${c.field} ${c.before} ${c.after}`)
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function formatAuditTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function getAuditPageFromPath(path) {
  if (!path) return 1;
  try {
    const url = path.startsWith('http') ? new URL(path) : new URL(path, 'http://local');
    const page = Number(url.searchParams.get('page'));
    return Number.isFinite(page) && page > 0 ? page : 1;
  } catch {
    return 1;
  }
}

export { resolveNextApiPath };
