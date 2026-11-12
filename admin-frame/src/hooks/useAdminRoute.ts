import { useCallback, useEffect, useState } from "preact/hooks";
import { appPath } from "../lib/app";
import { stores } from "../store/features";
import type { Config } from "./useConfig";

type AppRoute = {
  /** Where the app loads, relative to its URL. */
  entry: string;
  /** Changes whenever the app reloads at a new entry. */
  key: number;
};

export const adminUrl = (path: string) => (path === '/' ? '/admin' : `/admin${path}`);

/**
 * Keeps the admin's URL and what it shows in step: `/admin/apps/<client id>/<path>` is the
 * app at `<path>`, other `/admin/...` URLs are admin pages. The app's own history entries
 * live in its iframe, so the admin only mirrors the app's URL; admin pages get entries of their own.
 */
export function useAdminRoute(config: Config | null) {
  const [route, setRoute] = useState<AppRoute | null>(null);
  const appsPrefix = config ? `/admin/apps/${config.clientId}` : '';

  const showApp = useCallback((entry: string) => {
    stores.navigation.set({ adminPath: null });
    setRoute(current => ({ entry, key: (current?.key ?? 0) + 1 }));
  }, []);

  // The initial URL, and back/forward between the app and admin pages.
  useEffect(() => {
    if (!config) return;

    const apply = () => {
      const { pathname, search, hash } = location;
      if (pathname === appsPrefix || pathname.startsWith(`${appsPrefix}/`)) {
        // `/admin/apps/<client id>` alone is the app's entry page, `appPath`.
        showApp((pathname.slice(appsPrefix.length) || (config.appPath ?? '')) + search + hash);
      } else if (pathname === '/admin' || pathname.startsWith('/admin/')) {
        stores.navigation.set({ adminPath: (pathname.slice('/admin'.length) || '/') + search + hash });
      } else {
        showApp(config.appPath ?? '');
      }
    };

    apply();
    window.addEventListener('popstate', apply);
    return () => window.removeEventListener('popstate', apply);
  }, [config, appsPrefix, showApp]);

  useEffect(() => {
    if (!config) return;

    return stores.navigation.subscribe((state, previous) => {
      // Each navigation appends one entry; the oldest drop off once the history is full.
      const entry = state.entries !== previous.entries ? state.entries.at(-1) : undefined;
      if (entry?.type === 'admin' && entry.newContext) window.open(adminUrl(entry.path), '_blank');

      if (state.adminPath !== null && state.adminPath !== previous.adminPath) {
        const url = adminUrl(state.adminPath);
        if (url !== location.pathname + location.search + location.hash) history.pushState(null, '', url);
      } else if (state.adminPath === null && state.url && state.url !== previous.url) {
        const path = appPath(config, state.url);
        if (path !== null) history.replaceState(null, '', `${appsPrefix}${path}`);
      }
    });
  }, [config, appsPrefix]);

  /** Follows an app nav menu item: the showing app routes it, otherwise the app loads there. */
  const navigateApp = useCallback((href: string) => {
    if (!config) return;
    const { adminPath, url } = stores.navigation.state.peek();
    if (adminPath === null) {
      stores.navigation.actions.navigate({ href });
      return;
    }
    const path = appPath(config, new URL(href, url ?? location.href).href) ?? href;
    history.pushState(null, '', `${appsPrefix}${path}`);
    showApp(path);
  }, [config, appsPrefix, showApp]);

  /** Goes back to the app, where it last was. */
  const openApp = useCallback(() => {
    if (!config) return;
    const { url } = stores.navigation.state.peek();
    const path = (url ? appPath(config, url) : null) ?? config.appPath ?? '';
    history.pushState(null, '', `${appsPrefix}${path}`);
    showApp(path);
  }, [config, appsPrefix, showApp]);

  return { route, navigateApp, openApp };
}
