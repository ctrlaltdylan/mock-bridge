import { useEffect, useRef } from "react";
import { adminRouteForApp, appRouteFromAdminUrl, sameRoute } from "../lib/appRoute";
import { postToEmbeddedApp } from "../lib/embeddedFrame";
import { allowNavigation, isSaveBarDirty } from "../lib/unsavedNavigation";
import { useNavMenuFeatureStore } from "../store/features/nav-menu";

/**
 * Keep the mock admin URL in step with the embedded app.
 * `/campaigns` inside the iframe becomes `/admin/apps/:clientId/campaigns` outside it.
 * Back/forward on the admin URL sends the iframe to that same app route.
 * While the save bar is dirty, browser history is restored and the bar shakes.
 */
export function useAppRouteSync(clientId: string | undefined) {
  const iframeLocation = useNavMenuFeatureStore(state => state.pathname);
  const lockedUrl = useRef(`${window.location.pathname}${window.location.search}`);

  useEffect(() => {
    if (!clientId || !iframeLocation) return;
    if (isSaveBarDirty()) return;

    const next = adminRouteForApp(clientId, iframeLocation);
    const current = `${window.location.pathname}${window.location.search}`;
    lockedUrl.current = next;
    if (sameRoute(current, next)) return;

    const currentPath = new URL(current, window.location.origin).pathname;
    const nextPath = new URL(next, window.location.origin).pathname;
    const update = currentPath === nextPath ? 'replaceState' : 'pushState';
    window.history[update](window.history.state, '', next);
  }, [clientId, iframeLocation]);

  useEffect(() => {
    if (!clientId) return;

    const onPopState = () => {
      if (!allowNavigation()) {
        window.history.pushState(window.history.state, '', lockedUrl.current);
        return;
      }

      const path = appRouteFromAdminUrl(clientId);
      lockedUrl.current = `${window.location.pathname}${window.location.search}`;
      postToEmbeddedApp({ type: 'MOCK_NAVIGATE', path });
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [clientId]);
}
