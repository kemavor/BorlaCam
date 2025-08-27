import WebcamPanelRefined from './components/WebcamPanelRefined'
import Stats from './components/Stats'
import Log from './components/Log'
import ControlsBar from './components/ControlsBar'
import Reports from './components/Reports'
import DebugPanel from './components/DebugPanel'
import { useEffect } from 'react'
import { discoverModels } from './utils/models'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const setAvailableModels = useAppStore(s => s.setAvailableModels)
  useEffect(() => {
    discoverModels('/models').then(setAvailableModels).catch(() => {})
  }, [setAvailableModels])

  return (
    <div className="relative flex min-h-screen flex-col bg-[#101a23] text-white overflow-x-hidden" style={{ fontFamily: 'Space Grotesk, Noto Sans, sans-serif' }}>
      {/* Header - Enhanced Mobile Responsive */}
      <div className="flex items-center justify-between border-b border-[#223649] px-3 sm:px-4 md:px-6 lg:px-10 py-2 sm:py-3">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="size-4 sm:size-5">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor"></path>
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold leading-tight tracking-[-0.015em]">BorlaCam</h2>
        </div>
        <div className="flex flex-1 justify-end gap-2 sm:gap-4 md:gap-8">
          {/* Mobile hamburger menu for small screens */}
          <div className="sm:hidden">
            <button className="p-2 rounded-md hover:bg-[#223649]/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          <div className="hidden sm:flex md:hidden items-center gap-3">
            <a className="text-xs font-medium" href="/">Dash</a>
            <a className="text-xs font-medium" href="/reports">Reports</a>
          </div>
          <div className="hidden md:flex items-center gap-6 lg:gap-9">
            <a className="text-sm font-medium hover:text-blue-400 transition-colors" href="/">Dashboard</a>
            <a className="text-sm font-medium hover:text-blue-400 transition-colors" href="/reports">Reports</a>
            <a className="text-sm font-medium hover:text-blue-400 transition-colors" href="/settings">Settings</a>
          </div>
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-6 sm:size-8 md:size-10" style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuDb9Stam-9pMgAMSnh8l93BLnkFpec8jfNHYc4-n099GMrvI1N6SR2NXaCm4x72X3p4uLBbj3acKS5oDUxIX_YTYRUFQwxiZOxnzjweowCP_ixjgN74ca4HqJVuBHGECRxV5KgfFpZ7Pzt6w0BE0cnYB5UrDenRyQB9nfHrdBo6QP8sKvfVKQE5grHkld1rU6-LB-rcvrHHB2UC-FJOxRt7fbtL1S2c6JEFz80RNc6CGvIlexs9LSTHzXutthH4woJG8cVhm53BBDkN)' }}></div>
        </div>
      </div>
      
      {/* Main Content - Enhanced Mobile-First Responsive Layout */}
      <div className="flex-1 flex flex-col xl:flex-row gap-2 sm:gap-4 px-2 sm:px-4 md:px-6 py-2 sm:py-4 md:py-5">
        {/* Main Panel - Webcam & Controls (Mobile First) */}
        <div className="flex flex-col flex-1 min-w-0 order-1">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 p-2 md:p-4 w-full">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-tight tracking-tight">
              Waste Detection
            </h1>
            {/* Mobile status indicator */}
            <div className="sm:hidden text-xs text-[#90adcb]">
              Real-time AI Classification
            </div>
          </div>
          <div className="p-1 sm:p-2 md:p-4">
            <div className="w-full space-y-3 sm:space-y-4">
              <ControlsBar />
              <WebcamPanelRefined />
            </div>
          </div>
        </div>
        
        {/* Sidebar - Stats & Log (Collapsible on Mobile) */}
        <div className="flex flex-col xl:w-80 2xl:w-96 order-2 xl:order-2">
          {/* Mobile toggle for stats */}
          <div className="xl:hidden">
            <button className="w-full flex items-center justify-between bg-[#223649]/30 rounded-lg p-3 mb-3 hover:bg-[#223649]/50 transition-colors">
              <span className="text-sm font-medium">View Statistics & Log</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* Stats and Log - Always visible for testing */}
          <div className="block space-y-4">
            <div>
              <h2 className="text-base lg:text-lg xl:text-xl font-bold leading-tight tracking-[-0.015em] px-2 md:px-4 pb-2 pt-1">
                Statistics
              </h2>
              <Stats />
            </div>
            <div>
              <h2 className="text-base lg:text-lg xl:text-xl font-bold leading-tight tracking-[-0.015em] px-2 md:px-4 pb-2 pt-3">
                Log
              </h2>
              <Log />
            </div>
            <div className="px-2 md:px-4 pt-3">
              <DebugPanel />
            </div>
          </div>
        </div>
      </div>
      <div id="reports">
        <div className="px-6">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="p-4">
              <div className="w-full">
                <div className="bg-[#101a23] rounded-lg border border-[#223649]">
                  <div className="p-2">
                    <h2 className="text-xl font-semibold px-2 py-2">Reports</h2>
                  </div>
                  <div className="border-t border-[#223649]">
                    <Reports />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
