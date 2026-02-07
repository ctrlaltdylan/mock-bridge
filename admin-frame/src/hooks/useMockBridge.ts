import { useCallback, useEffect, useRef, useState } from "react";
import { useConfig } from "./useConfig";
import { getFeatureStore, type FeatureActionName, type FeatureActionPayload, type FeatureName } from "../store/features";

export type FeatureActionRequest<
  F extends FeatureName = FeatureName,
  A extends FeatureActionName<F> = FeatureActionName<F>,
  P extends FeatureActionPayload<F, A> = FeatureActionPayload<F, A>
> = {
  feature: F;
  action: A | FeatureActionName<F>;
  payload: P | FeatureActionPayload<F, A>;
}

export function useMockBridge() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
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
          const { feature, action, payload } = event.data as FeatureActionRequest;

          const featureStore = getFeatureStore(feature);
          const actionFn = featureStore.getState()[action];

          if (actionFn) {
            actionFn(payload);
          } else {
            console.warn('[MockAdmin] Unknown feature action:', action);
          }

          iframeRef.current?.contentWindow?.postMessage({
            type: 'FEATURE_ACTION_RESPONSE',
            action_id: event.data.action_id,
          }, '*');
        }
      }
    }

    const handleIframeLoad = () => {
      // Send signal immediately
      sendMockSignal();

      // Send signal a few more times to ensure delivery before timeout
      setTimeout(sendMockSignal, 10);
      setTimeout(sendMockSignal, 50);
      setTimeout(sendMockSignal, 100);
    }

    window.addEventListener('message', handleMessage);

    // Send signal immediately when iframe starts loading
    iframeRef.current?.addEventListener('load', handleIframeLoad);

    return () => {
      window.removeEventListener('message', handleMessage);
      iframe.removeEventListener('load', handleIframeLoad);
    };
  }, [config, sendMockSignal, sessionToken]);

  const iframeSrc = (() => {
    if (!config || !sessionToken) return '';

    const basePath = config.appPath || '';
    const host = btoa(config.shop);
    const idToken = sessionToken;

    return `${config.appUrl}${basePath}?host=${host}&shop=${config.shop}&embedded=1&id_token=${idToken}`;
  })();

  return {
    iframeRef,
    iframeSrc
    // iframeSrc: ''
  };
} 