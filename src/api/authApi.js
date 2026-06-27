import { apiGet, apiPatch, apiPost } from './client';
import { TOKEN_KEY, REFRESH_KEY, AUTH_SCHEME } from '../config/auth';

export { TOKEN_KEY, REFRESH_KEY } from '../config/auth';

export function saveAuthTokens(data) {
  if (!data || typeof data !== 'object') return;
  const useBearer = AUTH_SCHEME === 'Bearer';
  const token = useBearer
    ? (data.access || data.token || data.access_token)
    : (data.token || data.access || data.access_token);
  if (token) localStorage.setItem(TOKEN_KEY, token);
  const refresh = data.refresh || data.refresh_token;
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearAuthTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function hasStoredAuth() {
  return Boolean(getStoredToken());
}

function resolveRedirectPath(redirectUrl) {
  if (!redirectUrl || typeof redirectUrl !== 'string') return null;
  const trimmed = redirectUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/')) return trimmed;

  try {
    const url = new URL(trimmed, window.location.origin);
    if (url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return null;
  }

  return null;
}

export function mapApiUser(u, fallback = {}) {
  if (!u || typeof u !== 'object') return null;
  const email = u.email || fallback.email || '';
  const full_name = (u.full_name || fallback.full_name || '').trim();
  const name = full_name || u.name || email.split('@')[0] || 'Guest';
  const rawRole = u.role || fallback.role || (u.is_superuser ? 'admin' : u.is_staff ? 'staff' : 'guest');
  const role = rawRole === 'customer' ? 'guest' : rawRole;

  return {
    id: u.id,
    email,
    full_name,
    name,
    phone: u.phone ?? fallback.phone ?? '',
    role,
    is_staff: u.is_staff === true,
    is_superuser: u.is_superuser === true,
    is_active: u.is_active !== false,
    email_verified: u.email_verified !== false,
    created_at: u.created_at || null
  };
}

/** Normalize login response: { token, role, redirect_url, user } */
export function parseAuthLoginResponse(data, fallback = {}) {
  const apiRole = data?.user?.role || data?.role || fallback.role;
  const user = mapApiUser(data?.user || data, { ...fallback, role: apiRole });
  const useBearer = AUTH_SCHEME === 'Bearer';

  return {
    user,
    role: apiRole || user?.role || null,
    redirectPath: resolveRedirectPath(data?.redirect_url),
    token: useBearer ? (data?.access || data?.token || null) : (data?.token || data?.access || null),
    raw: data
  };
}

export function parseUserFromAuthResponse(data, fallback = {}) {
  return parseAuthLoginResponse(data, fallback).user;
}

/** GET /api/auth/me/ */
export async function fetchCurrentUser() {
  const data = await apiGet('/auth/me/');
  return mapApiUser(data);
}

/** PATCH /api/auth/me/ */
export async function updateCurrentUser(payload) {
  const body = {};
  if (payload.full_name != null) body.full_name = String(payload.full_name).trim();
  if (payload.phone != null) body.phone = String(payload.phone).trim();
  const data = await apiPatch('/auth/me/', body);
  return mapApiUser(data);
}

async function postLogin(path, credentials) {
  const data = await apiPost(path, {
    email: credentials.email.trim(),
    password: credentials.password
  });
  saveAuthTokens(data);
  return data;
}

/** POST /api/auth/admin/login/ */
export async function adminLoginApi(credentials) {
  return postLogin('/auth/admin/login/', credentials);
}

/** POST /api/auth/customer/login/ */
export async function customerLoginApi(credentials) {
  return postLogin('/auth/customer/login/', credentials);
}

/** POST /api/auth/signup/ */
export async function customerSignupApi(fields) {
  return apiPost('/auth/signup/', {
    email: fields.email.trim(),
    first_name: fields.first_name.trim(),
    last_name: fields.last_name.trim(),
    password: fields.password,
    password_confirm: fields.password_confirm
  });
}

/** POST /api/auth/verify-otp/ */
export async function verifyOTPApi(email, code) {
  return apiPost('/auth/verify-otp/', { email: email.trim(), code });
}

/** POST /api/auth/resend-otp/ */
export async function resendOTPApi(email) {
  return apiPost('/auth/resend-otp/', { email: email.trim() });
}

/** POST /api/auth/forgot-password/ */
export async function forgotPasswordApi(email) {
  return apiPost('/auth/forgot-password/', { email: email.trim() });
}

/** @deprecated Use customerLoginApi or adminLoginApi */
export async function loginApi(credentials) {
  return customerLoginApi(credentials);
}

/** POST /api/auth/logout/ */
export async function logoutApi() {
  const refresh = localStorage.getItem(REFRESH_KEY);
  const body = refresh ? { refresh } : {};
  return apiPost('/auth/logout/', body);
}

export function isAdminAuthRole(role, user) {
  const normalized = String(role || user?.role || '').toLowerCase();
  return user?.is_staff === true || normalized === 'admin' || normalized === 'staff';
}

/** POST /api/auth/login/ — Generic login for all roles */
export async function unifiedLoginApi(credentials) {
  return postLogin('/auth/login/', credentials);
}

/** Map role to frontend redirect path */
export function getRedirectPathForRole(role) {
  switch (role) {
    case 'admin':
    case 'staff':
      return '/';
    default:
      return '/my-bookings';
  }
}

/** True if role should be routed to the admin dashboard */
export function isDashboardRole(role) {
  return ['admin', 'staff'].includes(role);
}
