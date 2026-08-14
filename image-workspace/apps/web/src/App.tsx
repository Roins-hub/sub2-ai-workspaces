import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
// import ConversationFlowPage from './pages/ConversationFlowPage'
// import FlowPage from './pages/FlowPage'
import FlowPageV2 from './pages/FlowPageV2'
import ImageGenerator from './pages/ImageGenerator'

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<ImageGenerator />} />
        <Route path="/flow" element={<FlowPageV2 />} />
        {/* <Route path="/flow2" element={<FlowPageV2 />} /> */}
        {/* <Route path="/chat" element={<ConversationFlowPage />} /> */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
