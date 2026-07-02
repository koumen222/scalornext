'use client';

/**
 * router-compat — API React Router v6 implémentée sur next/navigation.
 * Objectif : migrer les ~160 pages de la SPA sans réécrire chaque appel.
 * - useNavigate / useLocation / useParams / useSearchParams / Link / NavLink / Navigate
 * - location.state est émulé (stash mémoire + sessionStorage) : next/navigation n'a pas d'équivalent
 * - Outlet/Routes/Route ne sont PAS supportés : les layouts sont convertis en layouts App Router (Phase 3)
 */

import React, { useEffect, useMemo } from 'react';
import NextLink from 'next/link';
import {
  useRouter,
  usePathname,
  useParams as useNextParams,
  useSearchParams as useNextSearchParams,
} from 'next/navigation';

// ─── Types (contrat React Router v6, en version pragmatique) ────────────────

export type To = string | { pathname?: string; search?: string; hash?: string };

export interface NavigateOptions {
  replace?: boolean;
  state?: any;
}

export interface Location {
  pathname: string;
  search: string;
  hash: string;
  state: any;
  key: string;
}

type SetSearchParamsInit =
  | URLSearchParams
  | string
  | Record<string, string>
  | string[][]
  | ((prev: URLSearchParams) => URLSearchParams | string | Record<string, string> | string[][]);

// ─── Émulation de location.state (React Router) ────────────────────────────
const STATE_PREFIX = '__rr_state:';
const memoryStates = new Map<string, any>();

function stashState(pathname: string, state: any): void {
  if (state === undefined) return;
  memoryStates.set(pathname, state);
  try {
    sessionStorage.setItem(STATE_PREFIX + pathname, JSON.stringify(state));
  } catch { /* quota / privé — le stash mémoire suffit pour la session courante */ }
}

function readState(pathname: string): any {
  if (memoryStates.has(pathname)) return memoryStates.get(pathname);
  try {
    const raw = sessionStorage.getItem(STATE_PREFIX + pathname);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function toHref(to: To): string {
  if (typeof to === 'string') return to;
  if (to && typeof to === 'object') {
    const pathname = to.pathname || '';
    const search = to.search ? (to.search.startsWith('?') ? to.search : `?${to.search}`) : '';
    const hash = to.hash ? (to.hash.startsWith('#') ? to.hash : `#${to.hash}`) : '';
    return `${pathname}${search}${hash}`;
  }
  return String(to ?? '');
}

function pathnameOf(href: string): string {
  const q = href.indexOf('?');
  const h = href.indexOf('#');
  let end = href.length;
  if (q !== -1) end = Math.min(end, q);
  if (h !== -1) end = Math.min(end, h);
  return href.slice(0, end) || '/';
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useNavigate() {
  const router = useRouter();
  return useMemo(() => {
    return function navigate(to: To | number, options: NavigateOptions = {}) {
      if (typeof to === 'number') {
        if (to === -1) router.back();
        else if (to === 1) router.forward();
        return;
      }
      const href = toHref(to);
      if (options.state !== undefined) stashState(pathnameOf(href), options.state);
      if (options.replace) router.replace(href);
      else router.push(href);
    };
  }, [router]);
}

export function useLocation(): Location {
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  return useMemo(() => {
    const search = searchParams?.toString() ? `?${searchParams.toString()}` : '';
    return {
      pathname,
      search,
      hash: typeof window !== 'undefined' ? window.location.hash : '',
      state: readState(pathname),
      key: `${pathname}${search}`,
    };
  }, [pathname, searchParams]);
}

export function useParams(): Record<string, string> {
  // Même contrat que React Router (objet { param: valeur })
  return (useNextParams() || {}) as Record<string, string>;
}

export function useSearchParams(): [
  URLSearchParams,
  (init: SetSearchParamsInit, options?: { replace?: boolean }) => void,
] {
  const router = useRouter();
  const pathname = usePathname();
  const nextParams = useNextSearchParams();

  const params = useMemo(
    () => new URLSearchParams(nextParams?.toString() || ''),
    [nextParams]
  );

  const setSearchParams = useMemo(() => {
    return (init: SetSearchParamsInit, options: { replace?: boolean } = {}) => {
      const next =
        typeof init === 'function' ? init(new URLSearchParams(params)) : init;
      const qs = new URLSearchParams(next as any).toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (options.replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    };
  }, [router, pathname, params]);

  return [params, setSearchParams];
}

// ─── Composants ─────────────────────────────────────────────────────────────

type NextLinkProps = React.ComponentPropsWithoutRef<typeof NextLink>;

export interface LinkProps extends Omit<NextLinkProps, 'href'> {
  to: To;
  state?: any;
  replace?: boolean;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, state, replace, children, ...rest },
  ref
) {
  const href = toHref(to);
  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    if (state !== undefined) stashState(pathnameOf(href), state);
    rest.onClick?.(e);
  };
  return (
    <NextLink ref={ref} href={href} replace={replace} {...rest} onClick={handleClick}>
      {children}
    </NextLink>
  );
});

export interface NavLinkProps extends Omit<LinkProps, 'className' | 'style' | 'children'> {
  end?: boolean;
  className?: string | ((props: { isActive: boolean }) => string | undefined);
  style?: React.CSSProperties | ((props: { isActive: boolean }) => React.CSSProperties | undefined);
  children?: React.ReactNode | ((props: { isActive: boolean }) => React.ReactNode);
}

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, end = false, className, style, children, ...rest },
  ref
) {
  const pathname = usePathname();
  const href = toHref(to);
  const target = pathnameOf(href);
  const isActive = end
    ? pathname === target
    : pathname === target || pathname.startsWith(`${target}/`);

  const resolvedClassName =
    typeof className === 'function' ? className({ isActive }) : className;
  const resolvedStyle = typeof style === 'function' ? style({ isActive }) : style;

  return (
    <Link
      ref={ref}
      to={to}
      className={resolvedClassName}
      style={resolvedStyle}
      aria-current={isActive ? 'page' : undefined}
      {...rest}
    >
      {typeof children === 'function' ? children({ isActive }) : children}
    </Link>
  );
});

export function Navigate({ to, replace = false, state }: { to: To; replace?: boolean; state?: any }) {
  const router = useRouter();
  useEffect(() => {
    const href = toHref(to);
    if (state !== undefined) stashState(pathnameOf(href), state);
    if (replace) router.replace(href);
    else router.push(href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ─── Non supportés (convertis en layouts App Router en Phase 3) ────────────
function unsupported(name: string): never {
  throw new Error(
    `[router-compat] <${name}> n'est pas supporté : convertir ce composant en layout App Router (voir MIGRATION_LOG.md).`
  );
}

export function Outlet(): never {
  return unsupported('Outlet');
}
export function Routes(): never {
  return unsupported('Routes');
}
export function Route(): never {
  return unsupported('Route');
}

export interface PathPattern {
  path: string;
  end?: boolean;
}

export interface PathMatch {
  params: Record<string, string>;
  pathname: string;
  pattern: { path: string; end: boolean };
}

export function matchPath(pattern: string | PathPattern, pathname: string): PathMatch | null {
  // Implémentation minimale (suffisante pour les usages du projet : chemins avec :params)
  const path = typeof pattern === 'string' ? pattern : pattern.path;
  const end = typeof pattern === 'object' && pattern.end !== undefined ? pattern.end : true;
  const names: string[] = [];
  const regexSrc = path
    .replace(/\/+$/, '')
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) {
        names.push(seg.slice(1));
        return '([^/]+)';
      }
      if (seg === '*') {
        names.push('*');
        return '(.*)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  const re = new RegExp(`^${regexSrc}${end ? '/?$' : '(?:/|$)'}`);
  const m = pathname.match(re);
  if (!m) return null;
  const params: Record<string, string> = {};
  names.forEach((n, i) => { params[n] = m[i + 1]; });
  return { params, pathname, pattern: { path, end } };
}
