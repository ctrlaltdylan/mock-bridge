import { useCallback, useEffect, useRef, useState } from "react";
import { useConfig } from "./useConfig";
import { getFeatureStore, type FeatureActionName, type FeatureActionPayload, type FeatureName } from "../store/features";
import { useResourcePickerFeatureStore } from "../store/features/resource-picker";
import type { ResourcePickerOpenOptions } from "../types/resource-picker";

export type FeatureActionRequest<
  F extends FeatureName = FeatureName,
  A extends FeatureActionName<F> = FeatureActionName<F>,
  P extends FeatureActionPayload<F, A> = FeatureActionPayload<F, A>
> = {
  feature: F;
  action: A | FeatureActionName<F>;
  payload: P | FeatureActionPayload<F, A>;
}

/** Includes special-case features handled in useMockBridge (e.g. resourcePicker). */
export type HostFeatureActionMessage = FeatureActionRequest | {
  feature: 'resourcePicker';
  action: 'open';
  payload: ResourcePickerOpenOptions;
}

export function useMockBridge() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mockSignalTimeoutsRef = useRef<number[]>([]);
  const mockSignalIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const config = useConfig();

  const [sessionToken, setSessionToken] = useState<string>('');

  // Signal to the iframe that it's in a mock environment
  // Send the signal multiple times to ensure it's received before the timeout
  const sendMockSignal = useCallback(() => {
    if (!config) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      iframe.contentWindow?.postMessage({
        type: 'MOCK_SHOPIFY_ENVIRONMENT',
        mockServerUrl: location.origin,
        shop: config.shop,
        clientId: config.clientId,
      }, '*');
    } catch (e) {
      console.warn('[MockAdmin] Could not signal mock environment:', (e as Error).message);
    }
  }, [config]);

  const clearMockSignalSchedule = useCallback(() => {
    for (const id of mockSignalTimeoutsRef.current) {
      window.clearTimeout(id);
    }
    mockSignalTimeoutsRef.current = [];
    if (mockSignalIntervalRef.current != null) {
      window.clearInterval(mockSignalIntervalRef.current);
      mockSignalIntervalRef.current = null;
    }
  }, []);

  const scheduleMockEnvironmentSignals = useCallback(() => {
    clearMockSignalSchedule();
    sendMockSignal();
    const delays = [10, 50, 100, 250, 500, 1000, 2000, 4000, 6000];
    for (const d of delays) {
      mockSignalTimeoutsRef.current.push(window.setTimeout(sendMockSignal, d));
    }
    mockSignalIntervalRef.current = window.setInterval(sendMockSignal, 400);
    mockSignalTimeoutsRef.current.push(
      window.setTimeout(() => {
        if (mockSignalIntervalRef.current != null) {
          window.clearInterval(mockSignalIntervalRef.current);
          mockSignalIntervalRef.current = null;
        }
      }, 12_000),
    );
  }, [clearMockSignalSchedule, sendMockSignal]);

  const getSessionToken = useCallback(() => {
    if (!config) return Promise.resolve('');

    return fetch('/api/session-token', {
      method: 'POST',
      body: JSON.stringify({ shop: config.shop }),
    }).then(res => res.json())
      .then(data => data.token);
  }, [config]);

  useEffect(() => {
    // Need a session token to initially load the iframe
    getSessionToken().then(token => {
      setSessionToken(token);
    });
  }, [getSessionToken]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (!sessionToken) return;

    // Note: We can't inject scripts directly due to cross-origin restrictions
    // Instead, the embedded app should detect it's in a mock environment and load the mock App Bridge

    // Handle postMessage communication with embedded app

    const handleMessage = (event: MessageEvent) => {
      if (!config) return;

      // Handle App Bridge messages from the embedded app
      if (event.data && event.data.type) {
        // Handle session token requests
        if (event.data.type === 'SESSION_TOKEN_REQUEST') {
          // Generate and send back a session token
          getSessionToken().then(token => {
            iframeRef.current?.contentWindow?.postMessage({
              type: 'SESSION_TOKEN_RESPONSE',
              token: token,
            }, '*');
          });
        }

        // Embedded app called something, like shopify.modal.show('modal_id')
        // Proxy the calls to their corresponding feature store
        if (event.data.type === 'FEATURE_ACTION_REQUEST') {
          const { feature, action, payload } = event.data as HostFeatureActionMessage;
          const actionId = event.data.action_id as string;

          if (feature === 'resourcePicker' && action === 'open') {
            useResourcePickerFeatureStore.getState().openFromBridge({
              actionId,
              iframeWindow: iframeRef.current?.contentWindow ?? null,
              options: (payload ?? {}) as ResourcePickerOpenOptions,
            });
            return;
          }

          const respond = (body: {
            payload: unknown;
            error?: { code: string; message: string };
          }) => {
            iframeRef.current?.contentWindow?.postMessage(
              {
                type: 'FEATURE_ACTION_RESPONSE',
                action_id: actionId,
                payload: body.payload,
                ...(body.error && { error: body.error }),
              },
              '*',
            );
          };

          try {
            const featureStore = getFeatureStore(feature as FeatureName);
            const state = featureStore.getState() as Record<string, unknown>;
            const actionFn = state[action as string];

            if (typeof actionFn === 'function') {
              (actionFn as (payload: unknown) => void)(payload);
            } else {
              console.warn('[MockAdmin] Unknown feature action:', action);
            }
            respond({ payload: undefined });
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            console.warn('[MockAdmin] Feature action failed:', message);
            respond({
              payload: undefined,
              error: { code: 'FEATURE_ACTION_FAILED', message },
            });
          }
        }
      }
    }

    const handleIframeLoad = () => {
      scheduleMockEnvironmentSignals();
    };

    window.addEventListener('message', handleMessage);

    iframe.addEventListener('load', handleIframeLoad);
    // Iframe may have already fired `load` before this effect ran; SPAs also mount listeners late.
    scheduleMockEnvironmentSignals();

    return () => {
      clearMockSignalSchedule();
      window.removeEventListener('message', handleMessage);
      iframe.removeEventListener('load', handleIframeLoad);
    };
  }, [clearMockSignalSchedule, config, scheduleMockEnvironmentSignals, sessionToken]);

  const iframeSrc = (() => {
    if (!config || !sessionToken) return '';

    const basePath = config.appPath || '';
    const host = btoa(config.shop);
    const idToken = sessionToken;

    const origin = config.proxy ? '/__proxy' : config.appUrl;

    return `${origin}${basePath}?host=${host}&shop=${config.shop}&embedded=1&id_token=${idToken}`;
  })();

  return {
    iframeRef,
    iframeSrc
    // iframeSrc: ''
  };
} 