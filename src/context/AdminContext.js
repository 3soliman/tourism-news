'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { logoutApi, clearAuthTokens, TOKEN_KEY } from '../api/authApi';

const ADMIN_USER_KEY = 'almohit_admin_user';

const AdminContext = createContext(null);

function normalizeAdminUser(user = {}) {
  const rawRole = String(user.role || '').toLowerCase();
  const role = rawRole === 'customer'
    ? 'guest'
    : rawRole || (user.is_superuser ? 'admin' : user.is_staff ? 'staff' : 'customer');
  return {
    id: user.id,
    email: user.email || '',
    name: user.name || user.full_name || user.email || 'User',
    full_name: user.full_name || user.name || '',
    phone: user.phone || '',
    role,
    is_staff: user.is_staff === true,
    is_superuser: user.is_superuser === true,
    is_active: user.is_active !== false
  };
}

export const AdminProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(ADMIN_USER_KEY);

    if (rawUser && token) {
      try {
        setAdminUser(normalizeAdminUser(JSON.parse(rawUser)));
      } catch {
        localStorage.removeItem(ADMIN_USER_KEY);
      }
    } else if (rawUser && !token) {
      localStorage.removeItem(ADMIN_USER_KEY);
    }

    setLoaded(true);
  }, []);

  const login = useCallback((user) => {
    const nextUser = normalizeAdminUser(user);
    setAdminUser(nextUser);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(nextUser));
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch (e) {
      console.warn('Admin logout API:', e);
    }
    clearAuthTokens();
    setAdminUser(null);
    localStorage.removeItem(ADMIN_USER_KEY);
  }, []);

  const value = useMemo(
    () => ({
      loaded,
      adminUser,
      login,
      logout,
      propertyName: adminUser?.role === 'admin' ? 'System administration' : 'Assigned property workspace'
    }),
    [adminUser, loaded, login, logout]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
};
