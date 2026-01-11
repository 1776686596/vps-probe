import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import NodeDetail from './pages/NodeDetail'
import Setup from './pages/Setup'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5000 } }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/node/:id" element={<NodeDetail />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
