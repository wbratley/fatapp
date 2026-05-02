import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PreferencesProvider } from './context/PreferencesContext'
import { HomePage } from './pages/HomePage'
import { ManagePage } from './pages/ManagePage'
import { LogPage } from './pages/LogPage'
import { FoodsPage } from './pages/FoodsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/manage" element={<ManagePage />} />
            <Route path="/log" element={<LogPage />} />
            <Route path="/foods" element={<FoodsPage />} />
          </Routes>
        </BrowserRouter>
      </PreferencesProvider>
    </QueryClientProvider>
  )
}
