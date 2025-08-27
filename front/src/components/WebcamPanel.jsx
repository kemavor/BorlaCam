import { useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { useAppStore } from '../store/useAppStore'
import { createClassifier, runClassifier } from '../inference/apiClassifier'
import { loadLabels, indexToLabel } from '../utils/labels'

export default function WebcamPanel() {
  const isRunning = useAppStore(s => s.isRunning)
  const setIsRunning = useAppStore(s => s.setIsRunning)
  const setFps = useAppStore(s => s.setFps)
  const setPredictions = useAppStore(s => s.setPredictions)
  const addHistoryItem = useAppStore(s => s.addHistoryItem)
  const setModelStatus = useAppStore(s => s.setModelStatus)
  const threshold = useAppStore(s => s.confidenceThreshold)
  const modelStatus = useAppStore(s => s.modelStatus)
  const modelError = useAppStore(s => s.modelError)

  const panelRef = useRef(null)
  const webcamRef = useRef(null)
  const sessionRef = useRef(null)
  const rafRef = useRef(0)
  const overlayCanvasRef = useRef(null)
  const [permissionError, setPermissionError] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [detectionHistory, setDetectionHistory] = useState([])

  async function initModel() {
    try {
      console.log('Starting BorlaCam initialization...')
      setModelStatus('loading')
      
      // Wait a moment for webcam to fully load
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Check webcam access
      const video = webcamRef.current?.video
      if (!video || !video.videoWidth || !video.videoHeight) {
        throw new Error('Camera not ready - please ensure camera access is granted and try again')
      }
      
      console.log(`Camera confirmed: ${video.videoWidth}x${video.videoHeight}`)
      
      // Get current settings
      const selectedModel = useAppStore.getState().selectedModel
      
      console.log('Settings:', { selectedModel })
      
      // Always use API mode
      const modelPath = 'borlacam-enhanced'
      
      console.log('Connecting to Flask API...')
      sessionRef.current = await createClassifier({ provider: 'api', modelPath })
      
      console.log('Loading labels...')
      await loadLabels()
      
      console.log('Model ready!')
      setModelStatus('ready')
      setInitialized(true)
      setIsRunning(false)  // Ensure detection is stopped initially
      
      console.log('BorlaCam initialized successfully!')
      console.log('Click the GREEN START button to begin waste detection')
    } catch (e) {
      console.error('Initialization failed:', e)
      setModelStatus('error', e?.message || String(e))
      setInitialized(false)
      setIsRunning(false)
    }
  }

  function drawBoundingBoxes(detections) {
    const canvas = overlayCanvasRef.current
    const video = webcamRef.current?.video
    
    if (!canvas || !video) {
      console.log('BBOX: Missing canvas or video element')
      return
    }
    
    const ctx = canvas.getContext('2d')
    
    // Get video dimensions
    const videoWidth = video.videoWidth || 640
    const videoHeight = video.videoHeight || 480
    const rect = video.getBoundingClientRect()
    
    // Set canvas size to match video display
    canvas.width = rect.width
    canvas.height = rect.height
    
    console.log(`BBOX: Canvas size ${canvas.width}x${canvas.height}, Video size ${videoWidth}x${videoHeight}`)
    
    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (!detections || detections.length === 0) {
      console.log('BBOX: No detections to draw')
      return
    }
    
    console.log(`BBOX: Drawing ${detections.length} detections`)
    
    // Calculate scaling factors
    const scaleX = canvas.width / videoWidth
    const scaleY = canvas.height / videoHeight
    
    // Draw bounding boxes for each detection
    detections.forEach((detection, index) => {
      let x, y, boxWidth, boxHeight
      
      if (detection.bbox) {
        // Scale API coordinates to canvas coordinates
        x = detection.bbox.x1 * scaleX
        y = detection.bbox.y1 * scaleY
        boxWidth = (detection.bbox.x2 - detection.bbox.x1) * scaleX
        boxHeight = (detection.bbox.y2 - detection.bbox.y1) * scaleY
        console.log(`BBOX: API bbox scaled - x:${x}, y:${y}, w:${boxWidth}, h:${boxHeight}`)
      } else {
        // Fallback: Generate a box around center of canvas
        boxWidth = canvas.width * 0.4
        boxHeight = canvas.height * 0.4
        x = (canvas.width - boxWidth) / 2 + (index * 30)
        y = (canvas.height - boxHeight) / 2 + (index * 30)
        console.log(`BBOX: Fallback bbox - x:${x}, y:${y}, w:${boxWidth}, h:${boxHeight}`)
      }
      
      // Set colors based on detection type
      const color = detection.label === 'organic' ? '#00ff00' : '#ff6600'
      
      // Draw bounding box
      ctx.strokeStyle = color
      ctx.lineWidth = 4
      ctx.strokeRect(x, y, boxWidth, boxHeight)
      
      // Draw label background
      const labelHeight = 35
      ctx.fillStyle = color
      ctx.fillRect(x, y - labelHeight, Math.max(boxWidth, 200), labelHeight)
      
      // Draw label text
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 18px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(
        `${detection.label} ${Math.round(detection.score * 100)}%`, 
        x + 8, 
        y - 8
      )
      
      console.log(`BBOX: Drew ${detection.label} box in ${color}`)
    })
  }

  function playDetectionSound(label) {
    try {
      console.log(`SPEECH: Speaking detection for: ${label}`)
      
      // Use Web Speech API for text-to-speech
      if ('speechSynthesis' in window) {
        // Cancel any previous speech
        window.speechSynthesis.cancel()
        
        // Create speech text based on detected label
        let speechText = ''
        const confidence = Math.round(Math.random() * 100) // This will be replaced with actual confidence
        
        if (label.toLowerCase().includes('organic')) {
          speechText = `Organic waste detected`
        } else if (label.toLowerCase().includes('recyclable')) {
          speechText = `Recyclable waste detected`
        } else if (label.toLowerCase().includes('plastic')) {
          speechText = `Plastic waste detected`
        } else if (label.toLowerCase().includes('paper')) {
          speechText = `Paper waste detected`
        } else if (label.toLowerCase().includes('metal')) {
          speechText = `Metal waste detected`
        } else if (label.toLowerCase().includes('glass')) {
          speechText = `Glass waste detected`
        } else {
          speechText = `${label} detected`
        }
        
        console.log(`SPEECH: Speaking: "${speechText}"`)
        
        // Create speech utterance
        const utterance = new SpeechSynthesisUtterance(speechText)
        
        // Configure speech settings
        utterance.volume = 1.0          // Max volume
        utterance.rate = 0.9            // Slightly slower for clarity
        utterance.pitch = 1.0           // Normal pitch
        utterance.lang = 'en-US'        // English US
        
        // Optional: Use different voices for different waste types
        const voices = speechSynthesis.getVoices()
        if (voices.length > 0) {
          // Try to find a clear female voice for better clarity
          const preferredVoice = voices.find(voice => 
            voice.lang.includes('en') && voice.name.toLowerCase().includes('female')
          ) || voices.find(voice => voice.lang.includes('en')) || voices[0]
          
          utterance.voice = preferredVoice
          console.log(`SPEECH: Using voice: ${preferredVoice.name}`)
        }
        
        // Add event listeners for debugging
        utterance.onstart = () => {
          console.log('SPEECH: Speech started')
        }
        
        utterance.onend = () => {
          console.log('SPEECH: Speech completed')
        }
        
        utterance.onerror = (error) => {
          console.error('SPEECH: Speech error:', error)
        }
        
        // Speak the detection
        window.speechSynthesis.speak(utterance)
        
      } else {
        console.warn('SPEECH: Speech synthesis not supported, falling back to beep')
        playFallbackBeep(label)
      }
      
    } catch (error) {
      console.error('SPEECH: Speech synthesis failed:', error)
      playFallbackBeep(label)
    }
  }
  
  function playFallbackBeep(label) {
    try {
      console.log('FALLBACK: Playing beep for:', label)
      
      // Simple beep fallback
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Different frequencies for different waste types
      let frequency = 800
      if (label.toLowerCase().includes('recyclable')) {
        frequency = 1200
      } else if (label.toLowerCase().includes('plastic')) {
        frequency = 1000
      } else if (label.toLowerCase().includes('paper')) {
        frequency = 600
      }
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
      
    } catch (fallbackError) {
      console.error('FALLBACK: Beep fallback also failed:', fallbackError)
    }
  }

  function toggleFullscreen() {
    const el = panelRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
    } else if (document.fullscreenElement === el) {
      document.exitFullscreen?.()
    } else {
      // another element is fullscreen; exit then request ours
      document.exitFullscreen?.().then(() => el.requestFullscreen?.())
    }
  }

  useEffect(() => {
    function onFsChange() {
      const el = panelRef.current
      setIsFullscreen(document.fullscreenElement === el)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // Auto-initialize when webcam loads
  useEffect(() => {
    const video = webcamRef.current?.video
    if (video && !initialized && !sessionRef.current) {
      console.log('Webcam loaded, auto-initializing...')
      // Add a small delay to ensure video is fully ready
      const timer = setTimeout(() => {
        if (video.videoWidth && video.videoHeight) {
          initModel()
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [webcamRef.current?.video, initialized])

  useEffect(() => {
    let frames = 0
    let lastReport = performance.now()
    let lastInference = 0

    async function loop() {
      if (!isRunning) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }
      
      const video = webcamRef.current?.video
      const now = performance.now()
      
      // Optimized inference timing for partially trained model
      if (video && sessionRef.current && (now - lastInference > 400)) {
        try {
          console.log('INFERENCE LOOP: Running waste detection inference...')
          console.log('INFERENCE LOOP: Video dimensions:', video.videoWidth, 'x', video.videoHeight)
          console.log('INFERENCE LOOP: Session:', sessionRef.current)
          const detections = await runClassifier(sessionRef.current, video, 5)
          console.log('Raw detections from API:', detections)
          
          // Process detections with enhanced filtering
          const validDetections = detections
            .filter(d => d.score >= threshold)
            .map(d => ({
              label: d.label || 'unknown',
              score: d.score,
              bbox: d.bbox || null,
              index: d.index
            }))
          
          console.log(`INFERENCE: Valid detections (>=${Math.round(threshold*100)}%):`, validDetections.length)
          console.log('INFERENCE: Valid detection details:', validDetections)
          
          setPredictions(validDetections)
          
          // ALWAYS draw bounding boxes, even if using fallback
          console.log('INFERENCE: About to draw bounding boxes...')
          if (validDetections.length === 0) {
            // Create a test detection for debugging
            console.log('INFERENCE: No valid detections, creating test fallback')
            const testDetection = [{
              label: 'test',
              score: 0.5,
              bbox: null,
              index: 0
            }]
            drawBoundingBoxes(testDetection)
          } else {
            drawBoundingBoxes(validDetections)
          }
          
          // TEMPORARY: Always draw a test box to verify canvas works
          console.log('TESTING: Drawing test bounding box regardless of detections')
          const testBox = [{
            label: 'TEST-DETECTION',
            score: 0.99,
            bbox: null,
            index: 99
          }]
          drawBoundingBoxes(testBox)
          
          // Enhanced detection processing with smoothing
          if (validDetections.length > 0) {
            const topDetection = validDetections[0]
            console.log(`TOP DETECTION: ${topDetection.label} (${Math.round(topDetection.score * 100)}%)`)
            
            // Add to detection history for smoothing
            const newHistory = [...detectionHistory, topDetection].slice(-5) // Keep last 5
            setDetectionHistory(newHistory)
            
            // Check for consistent detection (appeared in at least 2 of last 3 frames)
            const recentLabels = newHistory.slice(-3).map(d => d.label)
            const labelCounts = {}
            recentLabels.forEach(label => {
              labelCounts[label] = (labelCounts[label] || 0) + 1
            })
            
            const isConsistent = Object.values(labelCounts).some(count => count >= 2)
            
            console.log(`CONSISTENCY: Recent labels: ${recentLabels.join(', ')}`)
            console.log(`CONSISTENCY: Label counts:`, labelCounts)
            console.log(`CONSISTENCY: Is consistent: ${isConsistent}`)
            
            if (isConsistent) {
              // Add to history only for consistent detections
              addHistoryItem({ 
                ts: Date.now(), 
                label: topDetection.label, 
                score: topDetection.score,
                bbox: topDetection.bbox
              })
              
              // Play audio feedback for consistent detections
              console.log(`CONSISTENT DETECTION: Playing audio for ${topDetection.label}!`)
              playDetectionSound(topDetection.label, topDetection.score)
            } else {
              // For debugging: also play audio for single detections but with different tone
              console.log(`SINGLE DETECTION: ${topDetection.label} (not consistent yet)`)
              // Enable immediate audio testing:
              console.log('TESTING: Playing audio for single detection')
              playDetectionSound(topDetection.label, topDetection.score)
            }
            
            // Log all detections for debugging
            validDetections.forEach((det, i) => {
              console.log(`  ${i+1}. ${det.label}: ${Math.round(det.score * 100)}%`)
            })
          } else {
            // Clear boxes when no detections
            drawBoundingBoxes([])
            console.log('No detections above threshold')
            // Clear detection history when no detections
            setDetectionHistory([])
          }
          lastInference = now
        } catch (error) {
          console.error('Inference error:', error)
          // Don't clear on error, keep last valid detections
        }
      }
      
      frames++
      if (now - lastReport >= 1000) {
        setFps(Math.round(frames))
        frames = 0
        lastReport = now
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isRunning, threshold, setFps, setPredictions, addHistoryItem])

  const wrapperBase = 'relative bg-[#0d80f2] bg-cover bg-center rounded-lg flex items-center justify-center'
  const wrapperSize = isFullscreen ? 'w-screen h-screen' : 'aspect-video p-1 sm:p-2 md:p-4 min-h-[250px] sm:min-h-[300px] md:min-h-[400px] lg:min-h-[450px]'

  return (
    <div ref={panelRef} className={`${wrapperBase} ${wrapperSize}`}>
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{ 
          facingMode: 'user',  // Use front camera for better testing
          width: { ideal: 1280, min: 640 }, 
          height: { ideal: 720, min: 480 } 
        }}
        mirrored={false}
        onUserMedia={() => {
          console.log('Webcam access granted')
          setPermissionError('')
        }}
        onUserMediaError={e => {
          console.error('Webcam error:', e)
          setPermissionError(e?.message || 'Camera access denied')
        }}
        onLoadedData={() => {
          console.log('Webcam data loaded')
        }}
        className="absolute inset-0 w-full h-full object-cover rounded-lg"
        style={{ transform: 'scaleX(1)' }}
      />
      {/* Bounding Box Overlay Canvas */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none rounded-lg"
        style={{ zIndex: 10 }}
      />
      {!initialized && modelStatus !== 'loading' && (
        <div className="flex flex-col items-center gap-3 sm:gap-4 p-4">
          <button 
            className="flex shrink-0 items-center justify-center rounded-full size-14 sm:size-16 md:size-20 bg-blue-500/80 hover:bg-blue-400/80 active:bg-blue-600/80 text-white touch-manipulation transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95" 
            onClick={initModel}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" className="sm:w-6 sm:h-6 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 256 256">
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm36.44-94.66-48-32A8,8,0,0,0,104,96v64a8,8,0,0,0,12.44,6.66l48-32a8,8,0,0,0,0-13.32ZM120,145.05V111l25.58,17Z"></path>
            </svg>
          </button>
          <div className="text-white text-xs sm:text-sm bg-black/60 px-4 py-2 rounded-lg text-center">
            <div className="font-medium">Initialize Detection</div>
            <div className="text-xs text-gray-300 mt-1">Click to connect to model</div>
          </div>
        </div>
      )}
      
      {/* Show model status when loading or error */}
      {modelStatus === 'loading' && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
          <div className="text-white text-center bg-black/50 p-6 rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <div className="text-lg font-medium">Initializing Detection...</div>
            <div className="text-sm text-gray-300 mt-2">Connecting to Flask API</div>
          </div>
        </div>
      )}
      
      {modelStatus === 'error' && (
        <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center backdrop-blur-sm">
          <div className="text-white text-center bg-black/70 p-6 rounded-lg max-w-sm">
            <div className="text-lg font-medium mb-2">Initialization Error</div>
            <div className="text-sm mb-4 text-gray-200">{modelError}</div>
            <button 
              onClick={initModel}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-400 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      {permissionError && (
        <div className="absolute bottom-2 md:bottom-3 left-2 md:left-3 right-2 md:right-3 bg-black/50 px-2 md:px-3 py-2 rounded text-xs md:text-sm">{permissionError}</div>
      )}
      {/* Model Ready Indicator */}
      {initialized && !isRunning && (
        <div className="absolute top-2 left-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          READY
        </div>
      )}

      {/* START/STOP Button - Enhanced Mobile */}
      {initialized && (
        <button 
          className={`absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4 text-white text-xs sm:text-sm md:text-base px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl touch-manipulation font-bold transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 ${
            isRunning 
              ? 'bg-red-500/90 hover:bg-red-400/90 active:bg-red-600/90 animate-pulse' 
              : 'bg-green-500/90 hover:bg-green-400/90 active:bg-green-600/90'
          }`}
          onClick={() => {
            console.log(`${isRunning ? 'STOPPING' : 'STARTING'} waste detection...`)
            
            // Initialize audio context on user interaction (required by browsers)
            if (!isRunning && !window.borlaCamAudioContext) {
              try {
                console.log('AUDIO: Initializing AudioContext on user interaction')
                window.borlaCamAudioContext = new (window.AudioContext || window.webkitAudioContext)()
                // Test audio to ensure it works
                playDetectionSound('test')
              } catch (err) {
                console.error('AUDIO: Failed to initialize on user interaction:', err)
              }
            }
            
            setIsRunning(!isRunning)
          }}
        >
          {isRunning ? 'STOP' : 'START'}
        </button>
      )}
      {/* Fullscreen toggle - Enhanced Mobile */}
      <button className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-black/50 hover:bg-black/70 active:bg-black/80 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded touch-manipulation transition-all duration-200 shadow-md hover:shadow-lg active:scale-95" onClick={toggleFullscreen}>
        <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Full'}</span>
        <span className="sm:hidden">{isFullscreen ? 'X' : 'F'}</span>
      </button>
      
      {/* Detection Status Indicator - Enhanced Mobile */}
      {initialized && isRunning && (
        <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 bg-green-500/90 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded shadow-lg flex items-center gap-1 sm:gap-2">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
          <span className="font-medium">DETECTING</span>
        </div>
      )}
      
      {/* Debug Info */}
      {initialized && isRunning && (
        <div className="absolute top-12 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          <div>Loop Running: {isRunning ? 'YES' : 'NO'}</div>
          <div>Session: {sessionRef.current ? 'CONNECTED' : 'NONE'}</div>
          <div>Video: {webcamRef.current?.video?.videoWidth || 'NO_VIDEO'}</div>
        </div>
      )}
    </div>
  )
} 