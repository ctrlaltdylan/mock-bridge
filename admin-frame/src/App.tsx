import { EmbeddedApp } from "./components/EmbeddedApp"
import { Modal } from "./components/features/Modal"
import { Loading } from "./components/features/Loading"
import { SaveBar } from "./components/features/SaveBar"
import { Frame } from "./components/Frame"

function App() {
  return (
    <Frame>
      <Loading />
      <Modal />
      <SaveBar />

      <EmbeddedApp />
    </Frame>
  )
}

export default App
