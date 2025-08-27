import { useAppStore } from '../store/useAppStore'

export default function EnhancedPredictionsPanel() {
  const predictions = useAppStore(s => s.predictions)
  const isRunning = useAppStore(s => s.isRunning)

  const formatConfidence = (score) => {
    return Math.round(score * 100)
  }

  const getClassColor = (label) => {
    switch (label.toLowerCase()) {
      case 'organic':
        return 'text-green-400 bg-green-900/30 border-green-500/50'
      case 'recyclable':
        return 'text-orange-400 bg-orange-900/30 border-orange-500/50'
      default:
        return 'text-gray-400 bg-gray-700/30 border-gray-500/50'
    }
  }

  const getSourceBadge = (prediction) => {
    if (prediction.isCustomLabel) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-900/50 text-purple-200 border border-purple-500/50">
          🏷️ Custom
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-900/50 text-blue-200 border border-blue-500/50">
          AI
        </span>
      )
    }
  }

  const getObjectName = (prediction) => {
    if (prediction.objectName && prediction.objectName !== `${prediction.label}_object`) {
      return prediction.objectName
    }
    return null
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">
          Enhanced Detections
        </h3>
        <div className="flex items-center space-x-2">
          {isRunning && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          )}
          <span className="text-sm text-gray-400">
            {predictions.length} detected
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {predictions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">
              {isRunning ? 'ON' : 'OFF'}
            </div>
            <div className="text-gray-400 text-sm">
              {isRunning ? 'Scanning for waste objects...' : 'Start detection to see results'}
            </div>
          </div>
        ) : (
          predictions.map((prediction, index) => {
            const objectName = getObjectName(prediction)
            const confidence = formatConfidence(prediction.score)
            
            return (
              <div
                key={index}
                className="bg-gray-700 rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition-colors"
              >
                {/* Main prediction info */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-lg font-medium border ${getClassColor(prediction.label)}`}>
                      {prediction.label.toUpperCase()}
                    </span>
                    <span className="text-white font-semibold">
                      {confidence}%
                    </span>
                  </div>
                  {getSourceBadge(prediction)}
                </div>

                {/* Object name if available */}
                {objectName && (
                  <div className="mb-2">
                    <span className="text-sm text-gray-300">
                      📦 <span className="font-medium">{objectName}</span>
                    </span>
                  </div>
                )}

                {/* Custom label details */}
                {prediction.isCustomLabel && prediction.customSimilarity && (
                  <div className="bg-purple-900/20 border border-purple-500/30 rounded p-2 mb-2">
                    <div className="text-xs text-purple-200">
                      <div className="font-medium">Custom Match Details:</div>
                      <div>Similarity: {Math.round(prediction.customSimilarity * 100)}%</div>
                      {prediction.yoloPredict && (
                        <div className="mt-1 text-purple-300/70">
                          AI would predict: {prediction.yoloPredict.class} ({Math.round(prediction.yoloPredict.confidence * 100)}%)
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bounding box info */}
                {prediction.bbox && (
                  <div className="text-xs text-gray-400">
                    📍 Position: [{prediction.bbox.map(b => Math.round(b)).join(', ')}]
                  </div>
                )}

                {/* Confidence indicator */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Confidence</span>
                    <span>{confidence}%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        confidence >= 80 
                          ? 'bg-green-500' 
                          : confidence >= 60 
                          ? 'bg-yellow-500' 
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Summary stats */}
      {predictions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-600">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-purple-900/20 rounded p-2 text-center">
              <div className="text-purple-400 font-semibold">
                {predictions.filter(p => p.isCustomLabel).length}
              </div>
              <div className="text-gray-400">Custom Labels</div>
            </div>
            <div className="bg-blue-900/20 rounded p-2 text-center">
              <div className="text-blue-400 font-semibold">
                {predictions.filter(p => !p.isCustomLabel).length}
              </div>
              <div className="text-gray-400">AI Predictions</div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 p-2 bg-gray-700/50 rounded text-xs">
        <div className="font-medium text-gray-300 mb-1">Legend:</div>
        <div className="flex flex-wrap gap-2">
          <span className="text-purple-200">🏷️ Custom = Your labeled objects</span>
          <span className="text-blue-200">AI = YOLO model predictions</span>
        </div>
      </div>
    </div>
  )
}