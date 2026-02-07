import { useMockBridge } from "../hooks/useMockBridge";

export function EmbeddedApp() {
  const { iframeRef, iframeSrc } = useMockBridge();

  if (!iframeSrc) return null;

  return (
    <iframe
      id="app-iframe"
      ref={iframeRef}
      src={iframeSrc}
      style={{ width: '100%', height: '100%', border: 'none' }}
      allow="clipboard-write"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
    />
  )
}