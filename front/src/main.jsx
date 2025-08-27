import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Reports from './components/Reports'
import Settings, { Wrapper as ReportsWrapper } from './pages/Settings'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/reports', element: <ReportsWrapper><Reports /></ReportsWrapper> },
  { path: '/settings', element: <Settings /> },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
