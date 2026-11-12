import { useEffect } from "preact/hooks";
import type { Config } from "../hooks/useConfig";
import { useEmbedUrl } from "../hooks/useEmbedUrl";
import { APP_SANDBOX, appBase, signalMockEnvironment } from "../lib/app";
import { clearAppState } from "../store/features";

export function EmbeddedApp({ config, entry }: { config: Config; entry: string }) {
  const iframeSrc = useEmbedUrl(config, `${appBase(config)}${entry}`);
  useEffect(() => clearAppState, []);

  if (!iframeSrc) return null;

  return (
    <iframe
      id="app-iframe"
      src={iframeSrc}
      style={{ width: '100%', height: '100%', border: 'none' }}
      allow="clipboard-write"
      sandbox={APP_SANDBOX}
      // Scripts can't be injected across origins: the app detects the mock environment and loads the mock App Bridge.
      // A prop, not an effect, so the listener is there before the first load.
      onLoad={event => signalMockEnvironment(event.currentTarget, config)}
    />
  )
}
