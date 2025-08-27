import { useEffect, useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { useAppStore } from '../store/useAppStore'
import { createClassifier as createStandardClassifier, runClassifier as runStandardClassifier } from '../inference/apiClassifier'
import { createClassifier as createEnhancedClassifier, runClassifier as runEnhancedClassifier } from '../inference/enhancedApiClassifier'

export default function EnhancedWebcamPanel({ apiMode = 'enhanced' }) {
  const isRunning = useAppStore(s => s.isRunning)
  const setIsRunning = useAppStore(s => s.setIsRunning)
  const setFps = useAppStore(s => s.setFps)
  const setPredictions = useAppStore(s => s.setPredictions)
  const addHistoryItem = useAppStore(s => s.addHistoryItem)
  const setModelStatus = useAppStore(s => s.setModelStatus)
  const modelStatus = useAppStore(s => s.modelStatus)

  const panelRef = useRef(null)
  const webcamRef = useRef(null)
  const sessionRef = useRef(null)
  const rafRef = useRef(0)
  const overlayCanvasRef = useRef(null)
  const [permissionError, setPermissionError] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Enhanced state for better detection and audio management
  const [detectionHistory, setDetectionHistory] = useState([])
  const [lastAudioTime, setLastAudioTime] = useState(0)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [confidenceBuffer, setConfidenceBuffer] = useState([])
  const [startupComplete, setStartupComplete] = useState(false)
  const [autoConfidenceThreshold, setAutoConfidenceThreshold] = useState(0.8) // Higher for enhanced mode

  const initModel = useCallback(async () => {
    try {
      console.log(`Starting BorlaCam Enhanced initialization (${apiMode} mode)...`)
      setModelStatus('loading')
      
      // Clear any existing predictions to prevent phantom detections
      setPredictions([])
      setDetectionHistory([])
      setConfidenceBuffer([])
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const video = webcamRef.current?.video
      if (!video || !video.videoWidth || !video.videoHeight) {
        throw new Error('Camera not ready - please ensure camera access is granted and try again')
      }
      
      console.log(`📹 Camera ready: ${video.videoWidth}x${video.videoHeight}`)
      
      // Initialize the appropriate classifier based on mode
      let session
      if (apiMode === 'enhanced') {
        session = await createEnhancedClassifier({
          modelPath: 'Enhanced BorlaCam with Custom Labels',
          provider: 'enhanced-api'
        })
      } else {
        session = await createStandardClassifier({
          modelPath: 'MX450 Waste Model (Trained)', 
          provider: 'api'
        })
      }
      
      sessionRef.current = session
      
      console.log('Model session created successfully')
      console.log('Session info:', session)
      
      setModelStatus('ready')
      setInitialized(true)
      setStartupComplete(true)
      
      console.log('BorlaCam Enhanced ready for detection!')
      
    } catch (error) {
      console.error('Initialization error:', error)
      setModelStatus('error')
      setPermissionError(error.message)
    }
  }, [apiMode, setModelStatus, setPredictions])

  const runInference = useCallback(async () => {
    try {
      if (!sessionRef.current || !webcamRef.current?.video || !isRunning) {
        return
      }

      const video = webcamRef.current.video
      if (video.readyState !== 4) return

      console.log(`Running ${apiMode} inference...`)
      
      const startTime = performance.now()
      
      // Run the appropriate classifier
      let predictions
      if (apiMode === 'enhanced') {
        predictions = await runEnhancedClassifier(sessionRef.current, video, 10)
      } else {
        predictions = await runStandardClassifier(sessionRef.current, video, 10)
      }
      
      const endTime = performance.now()
      const inferenceTime = endTime - startTime
      const currentFps = 1000 / inferenceTime
      
      // Enhanced prediction filtering and confidence management
      const filteredPredictions = predictions.filter(pred => 
        pred.score >= autoConfidenceThreshold
      )
      
      console.log(`${apiMode} inference: ${predictions.length} total, ${filteredPredictions.length} above threshold (${autoConfidenceThreshold})`)
      
      // Update confidence buffer for auto-adjustment
      if (predictions.length > 0) {
        const avgConfidence = predictions.reduce((sum, pred) => sum + pred.score, 0) / predictions.length
        setConfidenceBuffer(prev => [...prev.slice(-9), avgConfidence])
      }
      
      // Enhanced detection history with source tracking
      const enhancedPredictions = filteredPredictions.map(pred => ({
        ...pred,
        timestamp: Date.now(),
        inferenceTime: inferenceTime,
        apiMode: apiMode,
        isEnhanced: apiMode === 'enhanced'
      }))
      
      setPredictions(enhancedPredictions)
      setFps(Math.round(currentFps))
      
      // Add to history for enhanced analytics
      if (enhancedPredictions.length > 0) {
        setDetectionHistory(prev => [...prev.slice(-99), ...enhancedPredictions])
        
        enhancedPredictions.forEach(pred => {
          addHistoryItem({
            label: pred.label,
            confidence: pred.score,
            timestamp: pred.timestamp,
            source: pred.source || 'unknown',
            isCustomLabel: pred.isCustomLabel || false,
            objectName: pred.objectName || pred.label
          })
        })
      }
      
      // Enhanced audio feedback with custom label awareness
      if (enhancedPredictions.length > 0 && !isPlayingAudio) {
        const customLabels = enhancedPredictions.filter(p => p.isCustomLabel)
        if (customLabels.length > 0) {
          // Special audio cue for custom label detections
          playEnhancedAudio('custom_detection')
        } else {
          playEnhancedAudio('standard_detection')
        }
      }
      
      drawDetections(enhancedPredictions)
      
    } catch (error) {
      console.error(`💥 ${apiMode} inference error:`, error)
    }
  }, [isRunning, apiMode, autoConfidenceThreshold, setPredictions, setFps, addHistoryItem, isPlayingAudio])

  const playEnhancedAudio = useCallback((type) => {
    const now = Date.now()
    if (now - lastAudioTime < 2000) return // Throttle audio
    
    setIsPlayingAudio(true)
    setLastAudioTime(now)
    
    // Different beep patterns for different detection types
    const context = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(context.destination)
    
    if (type === 'custom_detection') {
      // Higher pitch for custom labels
      oscillator.frequency.setValueAtTime(800, context.currentTime)
      oscillator.frequency.setValueAtTime(600, context.currentTime + 0.1)
    } else {
      // Standard detection beep
      oscillator.frequency.setValueAtTime(400, context.currentTime)
    }
    
    gainNode.gain.setValueAtTime(0.1, context.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2)
    
    oscillator.start(context.currentTime)
    oscillator.stop(context.currentTime + 0.2)
    
    setTimeout(() => setIsPlayingAudio(false), 2000)
  }, [lastAudioTime])

  const drawDetections = useCallback((predictions) => {
    const canvas = overlayCanvasRef.current
    const video = webcamRef.current?.video
    
    if (!canvas || !video) return
    
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    predictions.forEach((prediction, index) => {
      if (!prediction.bbox) return
      
      const [x1, y1, x2, y2] = prediction.bbox
      const width = x2 - x1
      const height = y2 - y1
      
      // Enhanced color coding with custom label indicator
      let color, bgColor
      if (prediction.isCustomLabel) {
        color = prediction.label === 'organic' ? '#10B981' : '#F59E0B' // Green/Amber for custom
        bgColor = prediction.label === 'organic' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'
      } else {
        color = prediction.label === 'organic' ? '#22C55E' : '#EF4444' // Light green/red for AI
        bgColor = prediction.label === 'organic' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'
      }
      
      // Draw bounding box
      ctx.strokeStyle = color
      ctx.lineWidth = prediction.isCustomLabel ? 3 : 2
      ctx.setLineDash(prediction.isCustomLabel ? [] : [5, 5]) // Solid for custom, dashed for AI
      ctx.strokeRect(x1, y1, width, height)
      
      // Draw background
      ctx.fillStyle = bgColor
      ctx.fillRect(x1, y1, width, height)
      
      // Draw label with enhanced info
      const confidence = Math.round(prediction.score * 100)
      const source = prediction.isCustomLabel ? 'CUSTOM' : 'AI'
      const objectName = prediction.objectName && prediction.objectName !== `${prediction.label}_object` 
        ? ` (${prediction.objectName})` 
        : ''
      
      const label = `${source} ${prediction.label.toUpperCase()}${objectName}: ${confidence}%`
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(x1, y1 - 25, ctx.measureText(label).width + 10, 20)
      
      ctx.fillStyle = color
      ctx.font = 'bold 12px Arial'
      ctx.fillText(label, x1 + 5, y1 - 8)
    })
  }, [])

  const loop = useCallback(() => {
    if (isRunning && initialized && startupComplete) {
      runInference()
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [isRunning, initialized, startupComplete, runInference])

  // Auto-adjust confidence threshold based on detection patterns
  useEffect(() => {
    if (confidenceBuffer.length >= 10) {
      const avgConfidence = confidenceBuffer.reduce((a, b) => a + b, 0) / confidenceBuffer.length
      const newThreshold = apiMode === 'enhanced' ? 
        Math.max(0.6, Math.min(0.9, avgConfidence - 0.1)) : // Enhanced mode: higher baseline
        Math.max(0.25, Math.min(0.7, avgConfidence - 0.15))  // Standard mode: lower baseline
      
      if (Math.abs(newThreshold - autoConfidenceThreshold) > 0.05) {
        setAutoConfidenceThreshold(newThreshold)
        console.log(`Auto-adjusted confidence threshold to: ${newThreshold.toFixed(2)}`)
      }
    }
  }, [confidenceBuffer, autoConfidenceThreshold, apiMode])

  useEffect(() => {
    initModel()
  }, [initModel])

  useEffect(() => {
    if (initialized) {
      loop()
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [initialized, loop])

  const handleStart = () => {
    if (modelStatus === 'ready') {
      setIsRunning(true)
      console.log(`Started ${apiMode} detection`)
    }
  }

  const handleStop = () => {
    setIsRunning(false)
    setPredictions([])
    console.log(`⏹️ Stopped ${apiMode} detection`)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      panelRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  return (
    <div ref={panelRef} className={`bg-gray-900 rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Enhanced Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-white font-semibold">
            📹 Enhanced BorlaCam
          </h2>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            apiMode === 'enhanced' 
              ? 'bg-purple-600 text-purple-100' 
              : 'bg-blue-600 text-blue-100'
          }`}>
            {apiMode === 'enhanced' ? 'Enhanced Mode' : 'Standard Mode'}
          </span>
          <div className={`w-2 h-2 rounded-full ${
            modelStatus === 'ready' ? 'bg-green-500' : 
            modelStatus === 'loading' ? 'bg-yellow-500 animate-pulse' : 
            'bg-red-500'
          }`} />
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">
            Threshold: {autoConfidenceThreshold.toFixed(2)}
          </span>
          {modelStatus === 'ready' && (
            <>
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  ▶️ Start
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  ⏹️ Stop
                </button>
              )}
            </>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            ⛶
          </button>
        </div>
      </div>

      {/* Camera and Overlay */}
      <div className="relative">
        {permissionError ? (
          <div className="aspect-video bg-gray-800 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-400 text-lg mb-2">X</div>
              <div className="text-red-400 font-medium mb-2">Camera Error</div>
              <div className="text-gray-400 text-sm max-w-md">
                {permissionError}
              </div>
              <button
                onClick={initModel}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              className="w-full aspect-video object-cover"
              onUserMediaError={(error) => {
                console.error('Webcam error:', error)
                setPermissionError('Camera access denied. Please grant camera permissions and refresh.')
              }}
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          </>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-700 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <span className="text-gray-300">
            Status: <span className={`font-medium ${
              modelStatus === 'ready' ? 'text-green-400' : 
              modelStatus === 'loading' ? 'text-yellow-400' : 
              'text-red-400'
            }`}>
              {modelStatus === 'ready' ? 'Ready' : 
               modelStatus === 'loading' ? 'Loading' : 
               'Error'}
            </span>
          </span>
          {isRunning && (
            <span className="text-blue-400">
              Detecting...
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4 text-gray-400">
          <span>Mode: {apiMode}</span>
          <span>Auto-threshold: {autoConfidenceThreshold.toFixed(2)}</span>
          {detectionHistory.length > 0 && (
            <span>History: {detectionHistory.length}</span>
          )}
        </div>
      </div>
    </div>
  )
}