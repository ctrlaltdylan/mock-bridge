import { useEffect, useState } from "preact/hooks";
import { embedUrl, fetchSessionToken } from "../lib/app";
import type { Config } from "./useConfig";

/**
 * Where a frame loads the app's page at `url`, with the parameters the admin adds, once it has
 * a session token. The token is fetched when the frame mounts, so each load gets a fresh one.
 */
export function useEmbedUrl(config: Config, url: string) {
  const [sessionToken, setSessionToken] = useState('');

  useEffect(() => {
    let current = true;
    fetchSessionToken(config).then(token => { if (current) setSessionToken(token); })
      .catch(error => console.error('[MockAdmin] Could not fetch a session token:', error));
    return () => { current = false; };
  }, [config]);

  return sessionToken ? embedUrl(config, url, sessionToken) : '';
}
