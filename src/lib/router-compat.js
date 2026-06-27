'use client';

import NextLink from 'next/link';
import {
  useRouter,
  usePathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
  redirect
} from 'next/navigation';
import { useEffect, useMemo } from 'react';

/** Drop-in replacement for react-router-dom Link (`to` → `href`). */
export function Link({ to, href, replace, state: _state, ...props }) {
  const destination = href ?? to ?? '/';
  return <NextLink href={destination} replace={replace} {...props} />;
}

/** Active-state nav link for guest/admin shells. */
export function NavLink({ to, end, className, children, onMouseEnter, ...rest }) {
  const pathname = usePathname();
  const href = to || '/';
  const isActive = end
    ? pathname === href
    : href !== '/'
      ? pathname === href || pathname.startsWith(`${href}/`)
      : pathname === '/';
  const resolvedClassName =
    typeof className === 'function' ? className({ isActive }) : className;

  return (
    <NextLink
      href={href}
      className={resolvedClassName}
      onMouseEnter={onMouseEnter}
      {...rest}
    >
      {children}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useRouter();
  return (to, options = {}) => {
    if (typeof to === 'number') {
      if (to < 0) router.back();
      else router.forward();
      return;
    }
    if (options.replace) router.replace(to);
    else router.push(to);
  };
}

export function useParams() {
  return useNextParams();
}

/** Returns `[searchParams]` like react-router (read-only). */
export function useSearchParams() {
  const params = useNextSearchParams();
  const serialized = params.toString();
  return useMemo(() => [params], [params, serialized]);
}

export function useLocation() {
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  const search = searchParams.toString();
  return {
    pathname,
    search: search ? `?${search}` : '',
    hash: typeof window !== 'undefined' ? window.location.hash : '',
    state: null,
    key: 'default'
  };
}

/** Client redirect — use in page components that gate on auth. */
export function Navigate({ to, replace = false }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [router, to, replace]);
  return null;
}

/** Layouts receive `children` from Next.js instead of Outlet. */
export function Outlet({ children }) {
  return children ?? null;
}

export { redirect };
