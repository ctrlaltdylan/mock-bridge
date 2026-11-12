import type { Config } from "../../hooks/useConfig";
import { useEmbedUrl } from "../../hooks/useEmbedUrl";
import { APP_SANDBOX, signalMockEnvironment } from "../../lib/app";
import { appWindows, stores, type AppWindowState } from "../../store/features";

/** `<s-app-window>`: the app's page in a full-screen window over the admin. */
export function AppWindow({ config }: { config: Config }) {
  const open = Object.values(appWindows.value).filter(appWindow => appWindow.open && appWindow.src);

  return open.map(appWindow => (
    <div
      key={appWindow.id}
      className="app-window"
      data-app-window={appWindow.id}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
      }}
    >
      <div
        style={{
          height: '3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 12px',
          backgroundColor: 'rgb(241, 241, 241)',
          borderBottom: '1px solid rgb(227, 227, 227)',
        }}
      >
        <s-button variant="tertiary" accessibilityLabel="Close" onClick={() => stores.appWindow.actions.hide({ id: appWindow.id })}>
          Close
        </s-button>
      </div>
      <AppWindowFrame key={appWindow.src} config={config} appWindow={appWindow} />
    </div>
  ));
}

/**
 * The window's page. Mounts each time the window opens, with a session token fresh for that load.
 * The frame is there (and named) straight away, so the app can reach it once `show()` resolves.
 */
function AppWindowFrame({ config, appWindow }: { config: Config; appWindow: AppWindowState }) {
  const src = useEmbedUrl(config, appWindow.src!);

  return (
    <iframe
      // The app reaches this frame by name as the element's contentWindow.
      name={`app-window-${appWindow.id}`}
      src={src || undefined}
      style={{ flex: 1, border: 'none' }}
      allow="clipboard-write"
      sandbox={APP_SANDBOX}
      onLoad={event => signalMockEnvironment(event.currentTarget, config)}
    />
  );
}
