import { useAppStore } from '../store/useAppStore'

export default function ControlsBar() {
  const threshold = useAppStore(s => s.confidenceThreshold)
  const setThreshold = useAppStore(s => s.setConfidenceThreshold)
  const selectedModel = useAppStore(s => s.selectedModel)
  const setSelectedModel = useAppStore(s => s.setSelectedModel)
  const availableModels = useAppStore(s => s.availableModels)
  const isRunning = useAppStore(s => s.isRunning)

  // Enhanced threshold description based on value
  const getThresholdDescription = (value) => {
    if (value >= 0.8) return "Very High - Only best detections"
    if (value >= 0.6) return "High - Strong detections only"
    if (value >= 0.4) return "Medium - Balanced detection"
    if (value >= 0.25) return "Low - More sensitive detection"
    return "Very Low - Maximum sensitivity"
  }

  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6 px-4 sm:px-6 py-4 bg-gradient-to-r from-[#223649]/40 to-[#223649]/20 rounded-xl backdrop-blur-sm border border-[#223649]/50 shadow-lg">
      <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3 w-full lg:w-auto">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#90adcb]">Confidence Threshold</span>
          <div className={`w-2 h-2 rounded-full ${
            isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
          }`}></div>
        </div>
        <div className="flex flex-col gap-2 w-full xs:w-auto">
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="0.1" 
              max="0.9" 
              step="0.05" 
              value={threshold} 
              onChange={e => setThreshold(parseFloat(e.target.value))} 
              className="flex-1 xs:w-40 sm:w-48 lg:w-56 h-3 bg-[#101a23] rounded-lg appearance-none cursor-pointer touch-manipulation transition-all duration-200 hover:scale-105" 
              style={{
                background: `linear-gradient(to right, 
                  #10b981 0%, #10b981 25%, 
                  #f59e0b 25%, #f59e0b 50%, 
                  #f97316 50%, #f97316 75%, 
                  #ef4444 75%, #ef4444 100%)`,
                WebkitAppearance: 'none',
              }}
            />
            <div className="text-center min-w-[4rem]">
              <div className="text-sm sm:text-base font-bold font-mono bg-[#101a23] px-3 py-1.5 rounded-lg border border-[#223649] shadow-md">
                {Math.round(threshold * 100)}%
              </div>
            </div>
          </div>
          <div className="text-xs text-[#90adcb] italic">
            {getThresholdDescription(threshold)}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3 w-full lg:w-auto">
        <label className="text-sm font-semibold text-[#90adcb] flex items-center gap-2">
          <span>AI Model</span>
        </label>
        <div className="relative w-full xs:w-auto">
          <select 
            value={selectedModel} 
            onChange={e => setSelectedModel(e.target.value)} 
            className="bg-[#101a23] border border-[#223649] rounded-lg px-4 py-2.5 text-sm w-full xs:w-auto touch-manipulation hover:border-[#0d80f2] focus:border-[#0d80f2] focus:ring-2 focus:ring-[#0d80f2]/20 focus:outline-none transition-all duration-200 shadow-md appearance-none cursor-pointer"
          >
            {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-[#90adcb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Enhanced status indicators */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              threshold <= 0.3 ? 'bg-green-400' : 
              threshold <= 0.5 ? 'bg-yellow-400' : 'bg-red-400'
            }`}></div>
            <span className="text-[#90adcb]">
              {threshold <= 0.3 ? 'Sensitive' : 
               threshold <= 0.5 ? 'Balanced' : 'Selective'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 