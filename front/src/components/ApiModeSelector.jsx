import { useState, useEffect } from 'react'

export default function ApiModeSelector({ currentMode, onModeChange }) {
  const [isChanging, setIsChanging] = useState(false)

  const modes = [
    {
      id: 'standard',
      name: 'Standard API',
      description: 'Original YOLO model detection',
      port: '8000',
      endpoint: '/api/status',
      icon: 'AI',
      features: ['YOLO detection', 'Basic classification', 'Fast inference']
    },
    {
      id: 'enhanced',
      name: 'Enhanced API',
      description: 'Custom labels + YOLO detection',
      port: '5000',
      endpoint: '/status',
      icon: 'LBL',
      features: ['Custom object labeling', 'Priority override system', 'Precision mode']
    }
  ]

  const checkApiStatus = async (mode) => {
    try {
      const response = await fetch(`http://localhost:${mode.port}${mode.endpoint}`)
      return response.ok
    } catch {
      return false
    }
  }

  const handleModeChange = async (newMode) => {
    if (newMode.id === currentMode || isChanging) return

    setIsChanging(true)
    
    // Check if the API is available
    const isAvailable = await checkApiStatus(newMode)
    
    if (!isAvailable) {
      alert(`${newMode.name} is not running!\n\nPlease start it first:\n${
        newMode.id === 'enhanced' 
          ? 'python enhanced_api_with_custom_labels.py'
          : 'python simple_flask_api.py'
      }`)
      setIsChanging(false)
      return
    }

    // Switch to new mode
    onModeChange(newMode.id)
    setIsChanging(false)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white font-semibold mb-4 flex items-center">
        ⚙️ API Mode
      </h3>

      <div className="space-y-3">
        {modes.map((mode) => (
          <div
            key={mode.id}
            className={`border rounded-lg p-3 cursor-pointer transition-all ${
              currentMode === mode.id
                ? 'border-blue-500 bg-blue-900/20'
                : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
            } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => handleModeChange(mode)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{mode.icon}</span>
                <span className="text-white font-medium">{mode.name}</span>
                {currentMode === mode.id && (
                  <span className="px-2 py-1 bg-green-600 text-green-100 text-xs rounded-full">
                    Active
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">:{mode.port}</span>
            </div>
            
            <p className="text-sm text-gray-300 mb-2">{mode.description}</p>
            
            <div className="flex flex-wrap gap-1">
              {mode.features.map((feature, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-600 text-gray-200 text-xs rounded"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isChanging && (
        <div className="mt-3 text-center text-sm text-blue-400">
          Switching API mode...
        </div>
      )}

      <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs text-yellow-200">
        <div className="font-medium mb-1">Quick Setup:</div>
        <div><strong>Standard API:</strong> python simple_flask_api.py</div>
        <div><strong>Enhanced API:</strong> python enhanced_api_with_custom_labels.py</div>
      </div>
    </div>
  )
}