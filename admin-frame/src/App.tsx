import { AdminPage } from "./components/AdminPage"
import { EmbeddedApp } from "./components/EmbeddedApp"
import { AppWindow } from "./components/features/AppWindow"
import { Loading } from "./components/features/Loading"
import { Modal } from "./components/features/Modal"
import { SaveBar } from "./components/features/SaveBar"
import { Share } from "./components/features/Share"
import { Toast } from "./components/features/Toast"
import { Frame } from "./components/Frame"
import { useAdminRoute } from "./hooks/useAdminRoute"
import { useBridgeMessages } from "./hooks/useBridgeMessages"
import { useConfig } from "./hooks/useConfig"
import { adminPath } from "./store/features"

function App() {
  const config = useConfig()
  const { route, navigateApp, openApp } = useAdminRoute(config)
  useBridgeMessages(config)

  return (
    <Frame config={config} onNavigateApp={navigateApp} onOpenApp={openApp}>
      <Loading />
      <Modal />
      <SaveBar />
      <Toast />
      <Share />

      {adminPath.value !== null ? (
        <AdminPage path={adminPath.value} />
      ) : config && route && (
        <>
          <AppWindow config={config} />
          <EmbeddedApp key={route.key} config={config} entry={route.entry} />
        </>
      )}
    </Frame>
  )
}

export default App
