import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export default function DebugPanel() {
  const [apiStatus, setApiStatus] = useState('checking...')
  const [lastError, setLastError] = useState('')
  const modelStatus = useAppStore(s => s.modelStatus)
  const isRunning = useAppStore(s => s.isRunning)
  const fps = useAppStore(s => s.fps)
  const clearHistory = useAppStore(s => s.clearHistory)
  
  useEffect(() => {
    async function checkAPI() {
      try {
        const response = await fetch('http://localhost:8000/api/status')
        if (response.ok) {
          const data = await response.json()
          setApiStatus(data.model_loaded ? 'Connected ' : 'Model not loaded ')
        } else {
          setApiStatus('Failed ')
        }
      } catch (error) {
        setApiStatus('Disconnected ')
        setLastError(error.message)
      }
    }
    
    checkAPI()
    const interval = setInterval(checkAPI, 5000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="bg-[#223649]/50 rounded-lg p-3 text-xs space-y-2">
      <h3 className="font-semibold text-[#90adcb]">Debug Info</h3>
      <div className="space-y-1">
        <div>API Status: <span className="text-white">{apiStatus}</span></div>
        <div>Model Status: <span className="text-white">{modelStatus}</span></div>
        <div>Detection: <span className="text-white">{isRunning ? 'Running' : 'Stopped'}</span></div>
        <div>FPS: <span className="text-white">{fps}</span></div>
        {lastError && (
          <div className="text-red-400">Error: {lastError}</div>
        )}
      </div>
      <div className="border-t border-[#90adcb]/20 pt-2 mt-2">
        <div className="text-[#90adcb] text-xs">Quick Actions:</div>
        <div className="mt-1 space-y-1">
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500/80 text-white px-2 py-1 rounded text-xs hover:bg-blue-400/80 w-full"
          >
            Refresh Page
          </button>
          <button 
            onClick={() => {
              clearHistory()
              console.clear()
            }} 
            className="bg-gray-500/80 text-white px-2 py-1 rounded text-xs hover:bg-gray-400/80 w-full"
          >
            Clear History
          </button>
        </div>
      </div>
    </div>
  )
}