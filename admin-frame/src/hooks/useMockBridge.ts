import { useCallback, useEffect, useRef, useState } from "react";
import { useConfig } from "./useConfig";

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
      console.log('[MockAdmin] Mock environment signal sent');
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
        console.log('[MockAdmin] Received message:', event.data);

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

    // Log that mock admin is ready
    console.log('[MockShopifyAdmin] Ready - Shop: ${shop}, Client ID: ${this.config.clientId}');

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

    console.log('Host', host, 'Shop', config.shop, 'ID Token', idToken);

    return `${config.appUrl}${basePath}?host=${host}&shop=${config.shop}&embedded=1&id_token=${idToken}`;
  })();

  return {
    iframeRef,
    iframeSrc
    // iframeSrc: ''
  };
}