import { useEffect } from "preact/hooks";
import type { FeatureActionRequestMessage, FeatureActionResponseMessage } from "../../../src/core/protocol";
import { runFeatureAction } from "../../../src/core/stores";
import { fetchSessionToken } from "../lib/app";
import { appFrame, clearAppState, saveBarFrames, stores } from "../store/features";
import type { Config } from "./useConfig";

/**
 * What only the main app reports: its URL, title bar and nav menu. Pages in app windows run
 * App Bridge too, but the admin's URL and chrome follow the app, not them.
 */
const APP_ONLY: Record<string, (action: string) => boolean> = {
  navigation: action => action === 'sync',
  titleBar: () => true,
  navMenu: () => true,
};

/** Answers App Bridge requests from the app and its app windows. */
export function useBridgeMessages(config: Config | null) {
  useEffect(() => {
    if (!config) return;
    // The page the app frame last reported from.
    let appPage: string | undefined;

    const handleMessage = (event: MessageEvent) => {
      const source = event.source as Window | null;
      if (!source || !event.data?.type) return;

      if (event.data.type === 'SESSION_TOKEN_REQUEST') {
        fetchSessionToken(config).then(token => {
          source.postMessage({ type: 'SESSION_TOKEN_RESPONSE', token }, '*');
        }).catch(error => console.error('[MockAdmin] Could not fetch a session token:', error));
      }

      // The app called something, like shopify.modal.show('modal_id'): run it on the feature's store.
      if (event.data.type === 'FEATURE_ACTION_REQUEST') {
        const { action_id, page, feature, action, payload } = event.data as FeatureActionRequestMessage;
        const fromApp = source === appFrame();

        // The app frame loaded a new page (a link, a form post, a reload) without unmounting.
        if (fromApp && page && page !== appPage) {
          if (appPage !== undefined) clearAppState();
          appPage = page;
        }
        if (feature === 'saveBar' && typeof (payload as { id?: unknown })?.id === 'string') {
          saveBarFrames.set((payload as { id: string }).id, source);
        }

        const reply = (response: Omit<FeatureActionResponseMessage, 'type' | 'action_id'>) =>
          source.postMessage({ type: 'FEATURE_ACTION_RESPONSE', action_id, ...response } satisfies FeatureActionResponseMessage, '*');
        const fail = (error: unknown) => {
          console.error('[MockAdmin] Feature action failed:', feature, action, error);
          // Answer anyway: some calls (like sharing) wait for the admin without a timeout.
          reply({ error: error instanceof Error ? error.message : String(error) });
        };

        let result: unknown;
        try {
          const ignored = !fromApp && Object.hasOwn(APP_ONLY, feature) && APP_ONLY[feature](action);
          const run = ignored ? { handled: true, result: undefined } : runFeatureAction(stores, feature, action, payload);
          if (!run.handled) console.warn('[MockAdmin] Unknown feature action:', feature, action);
          result = run.result;
        } catch (error) {
          fail(error);
          return;
        }

        // Some actions (like sharing) resolve once the merchant answers. Replying in a later
        // task lets Preact render first, so e.g. an app window is on screen when show() resolves.
        Promise.resolve(result).then(payload => setTimeout(() => reply({ payload })), fail);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [config]);
}
