import { EmbeddedApp } from "./components/EmbeddedApp"
import { Modal } from "./components/features/Modal"
import { Frame } from "./components/Frame"

function App() {
  return (
    <Frame>
      <Modal />

      <EmbeddedApp />
    </Frame>
  )
}

export default App
