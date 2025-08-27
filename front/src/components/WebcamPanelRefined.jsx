import { useEffect, useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { useAppStore } from '../store/useAppStore'
import { createClassifier, runClassifier } from '../inference/apiClassifier'
import { loadLabels } from '../utils/labels'

export default function WebcamPanelRefined() {
  const isRunning = useAppStore(s => s.isRunning)
  const setIsRunning = useAppStore(s => s.setIsRunning)
  const setFps = useAppStore(s => s.setFps)
  const setPredictions = useAppStore(s => s.setPredictions)
  const addHistoryItem = useAppStore(s => s.addHistoryItem)
  const setModelStatus = useAppStore(s => s.setModelStatus)
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
  
  // Enhanced state for better detection and audio management
  const [detectionHistory, setDetectionHistory] = useState([])
  const [lastAudioTime, setLastAudioTime] = useState(0)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [confidenceBuffer, setConfidenceBuffer] = useState([])
  const [startupComplete, setStartupComplete] = useState(false)
  const [autoConfidenceThreshold, setAutoConfidenceThreshold] = useState(0.25)
  const [startTime] = useState(Date.now()) // Track when detection started for scan numbering

  const initModel = useCallback(async () => {
    try {
      console.log('Starting BorlaCam Enhanced initialization...')
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
      
      console.log(`Camera confirmed: ${video.videoWidth}x${video.videoHeight}`)
      
      const selectedModel = useAppStore.getState().selectedModel
      console.log('Settings:', { selectedModel })
      
      const modelPath = 'borlacam-enhanced'
      console.log('Connecting to Enhanced Flask API...')
      sessionRef.current = await createClassifier({ provider: 'api', modelPath })
      
      console.log('Loading labels...')
      await loadLabels()
      
      console.log('Enhanced Model ready!')
      setModelStatus('ready')
      setInitialized(true)
      setIsRunning(false)
      
      // Set startup complete after a short delay to prevent phantom audio
      setTimeout(() => setStartupComplete(true), 2000)
      
      console.log('BorlaCam Enhanced initialized successfully!')
      console.log('Click the GREEN START button to begin enhanced waste detection')
    } catch (e) {
      console.error('Initialization failed:', e)
      setModelStatus('error', e?.message || String(e))
      setInitialized(false)
      setIsRunning(false)
    }
  }, [setModelStatus, setPredictions, setIsRunning])

  function drawEnhancedBoundingBoxes(detections) {
    const canvas = overlayCanvasRef.current
    const video = webcamRef.current?.video
    
    if (!canvas || !video) {
      console.log('BBOX: Missing canvas or video element')
      return
    }
    
    const ctx = canvas.getContext('2d')
    const videoWidth = video.videoWidth || 640
    const videoHeight = video.videoHeight || 480
    const rect = video.getBoundingClientRect()
    
    canvas.width = rect.width
    canvas.height = rect.height
    
    console.log(`BBOX: Canvas ${canvas.width}x${canvas.height}, Video ${videoWidth}x${videoHeight}`)
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (!detections || detections.length === 0) {
      console.log('BBOX: No detections to draw')
      return
    }
    
    console.log(`BBOX: Drawing ${detections.length} enhanced detections`)
    
    const scaleX = canvas.width / videoWidth
    const scaleY = canvas.height / videoHeight
    
    console.log(`BBOX: Scale factors - X: ${scaleX.toFixed(3)}, Y: ${scaleY.toFixed(3)}`)
    
    detections.forEach((detection, index) => {
      let x, y, boxWidth, boxHeight
      
      if (detection.bbox && detection.bbox.x1 !== undefined) {
        // Convert normalized coordinates to canvas coordinates
        x = Math.max(0, detection.bbox.x1 * scaleX)
        y = Math.max(0, detection.bbox.y1 * scaleY)
        boxWidth = Math.min(canvas.width - x, (detection.bbox.x2 - detection.bbox.x1) * scaleX)
        boxHeight = Math.min(canvas.height - y, (detection.bbox.y2 - detection.bbox.y1) * scaleY)
        console.log(`BBOX: API bbox - x:${x.toFixed(1)}, y:${y.toFixed(1)}, w:${boxWidth.toFixed(1)}, h:${boxHeight.toFixed(1)}`)
      } else {
        // Center fallback bbox with offset for multiple detections
        boxWidth = Math.min(canvas.width * 0.4, 200)
        boxHeight = Math.min(canvas.height * 0.4, 150)
        x = (canvas.width - boxWidth) / 2 + (index * 20)
        y = (canvas.height - boxHeight) / 2 + (index * 20)
        console.log(`BBOX: Fallback bbox - x:${x.toFixed(1)}, y:${y.toFixed(1)}, w:${boxWidth.toFixed(1)}, h:${boxHeight.toFixed(1)}`)
      }
      
      // Enhanced visual design based on waste type and confidence
      const confidence = detection.score
      const isOrganic = detection.label === 'organic'
      
      // Dynamic colors and styling based on confidence
      const baseColor = isOrganic ? '#22c55e' : '#f97316' // Green for organic, orange for recyclable
      const glowColor = isOrganic ? '#16a34a' : '#ea580c'
      const alpha = Math.max(0.6, confidence) // Higher confidence = more opaque
      
      // Enhanced glow effect for high confidence detections
      if (confidence > 0.6) {
        ctx.shadowColor = glowColor
        ctx.shadowBlur = 15
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      }
      
      // Draw main bounding box with gradient effect
      const gradient = ctx.createLinearGradient(x, y, x, y + boxHeight)
      gradient.addColorStop(0, `${baseColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`)
      gradient.addColorStop(1, `${glowColor}${Math.round(alpha * 0.5 * 255).toString(16).padStart(2, '0')}`)
      
      ctx.strokeStyle = gradient
      ctx.lineWidth = confidence > 0.5 ? 5 : 3
      ctx.setLineDash(confidence < 0.4 ? [10, 5] : []) // Dashed for low confidence
      ctx.strokeRect(x, y, boxWidth, boxHeight)
      
      // Reset shadow and dash
      ctx.shadowBlur = 0
      ctx.setLineDash([])
      
      // Enhanced label with confidence indicator
      const labelHeight = 40
      const labelText = `${detection.label.toUpperCase()}`
      const confidenceText = `${Math.round(confidence * 100)}%`
      
      // Label background with rounded corners effect
      ctx.fillStyle = baseColor
      ctx.fillRect(x, y - labelHeight, Math.max(boxWidth, 180), labelHeight)
      
      // Confidence bar
      const barWidth = Math.max(boxWidth, 180) - 8
      const barHeight = 4
      const barY = y - labelHeight + 28
      
      // Background bar
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(x + 4, barY, barWidth, barHeight)
      
      // Confidence bar fill
      ctx.fillStyle = confidence > 0.7 ? '#10b981' : confidence > 0.4 ? '#f59e0b' : '#ef4444'
      ctx.fillRect(x + 4, barY, barWidth * confidence, barHeight)
      
      // Label text with enhanced typography
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(labelText, x + 8, y - 20)
      
      // Confidence percentage
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'right'
      ctx.fillText(confidenceText, x + Math.max(boxWidth, 180) - 8, y - 20)
      
      // Detection index indicator
      ctx.fillStyle = confidence > 0.6 ? '#065f46' : '#7c2d12'
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`${index + 1}`, x + 20, y + 25)
      
      console.log(`BBOX: Drew enhanced ${detection.label} box (${Math.round(confidence * 100)}%)`)
    })
  }

  // ENHANCED: Structured audio feedback with conflict prevention
  const scheduleStructuredAudioFeedback = useCallback((label, confidence, scanNumber) => {
    const now = Date.now()
    
    // Don't play audio during startup phase
    if (!startupComplete) {
      console.log(`AUDIO SKIP: Scan #${scanNumber} - Startup not complete`)
      return
    }
    
    // Skip if audio is currently playing
    if (isPlayingAudio) {
      console.log(`AUDIO SKIP: Scan #${scanNumber} - Audio currently playing`)
      return
    }
    
    // Prevent audio conflicts with minimum 3-second gap
    const timeSinceLastAudio = now - lastAudioTime
    if (timeSinceLastAudio < 3000) {
      const waitTime = Math.round((3000 - timeSinceLastAudio) / 1000)
      console.log(`AUDIO SKIP: Scan #${scanNumber} - Too recent (wait ${waitTime}s)`)
      return
    }
    
    console.log(`AUDIO TRIGGER: Scan #${scanNumber} - Playing ${label.toUpperCase()} announcement`)
    console.log(`AUDIO DETAILS: Confidence ${Math.round(confidence * 100)}%, Gap ${Math.round(timeSinceLastAudio/1000)}s`)
    
    playStructuredDetectionSound(label, confidence, scanNumber)
  }, [startupComplete, isPlayingAudio, lastAudioTime])

  const scheduleSmartAudioFeedback = useCallback((label, confidence) => {
    // Fallback to structured audio for compatibility
    scheduleStructuredAudioFeedback(label, confidence, 0)
  }, [scheduleStructuredAudioFeedback])
  
  // ENHANCED: Structured audio system with clear logging and conflict prevention
  function playStructuredDetectionSound(label, confidence, scanNumber) {
    try {
      setIsPlayingAudio(true)
      setLastAudioTime(Date.now())
      
      console.log(`AUDIO START: Scan #${scanNumber} - Speaking "${label}" announcement`)
      console.log(`AUDIO CONFIG: Confidence ${Math.round(confidence * 100)}%, Voice synthesis active`)
      
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        
        // Simplified, clear speech content
        let speechText = ''
        const confidencePercent = Math.round(confidence * 100)
        
        if (label.toLowerCase().includes('organic')) {
          speechText = `Organic waste detected, ${confidencePercent} percent confidence`
        } else if (label.toLowerCase().includes('recyclable')) {
          speechText = `Recyclable waste detected, ${confidencePercent} percent confidence`
        } else {
          speechText = `${label} waste detected, ${confidencePercent} percent confidence`
        }
        
        const utterance = new SpeechSynthesisUtterance(speechText)
        utterance.rate = 1.0  // Standard speed for clarity
        utterance.volume = 0.8
        utterance.pitch = 1.0
        
        utterance.onstart = () => {
          console.log(`AUDIO PLAYING: "${speechText}"`)
        }
        
        utterance.onend = () => {
          console.log(`AUDIO COMPLETE: Scan #${scanNumber} - Ready for next detection`)
          setIsPlayingAudio(false)
        }
        
        utterance.onerror = (error) => {
          console.log(`AUDIO ERROR: Scan #${scanNumber} - ${error.error}`)
          setIsPlayingAudio(false)
        }
        
        window.speechSynthesis.speak(utterance)
        
      } else {
        console.log(`AUDIO FALLBACK: Scan #${scanNumber} - Speech synthesis not available`)
        setIsPlayingAudio(false)
      }
    } catch (error) {
      console.log(`AUDIO EXCEPTION: Scan #${scanNumber} - ${error.message}`)
      setIsPlayingAudio(false)
    }
  }
  
  // Legacy function for backward compatibility
  function playEnhancedDetectionSound(label, confidence) {
    // Redirect to new structured audio system
    playStructuredDetectionSound(label, confidence, 0)
  }
  
  function playEnhancedFallbackBeep(label, confidence) {
    try {
      console.log('FALLBACK: Enhanced beep for:', label, `(${Math.round(confidence * 100)}%)`)
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      
      // Enhanced patterns based on both label and confidence
      let baseFrequency = 800
      let pattern = 'single'
      
      if (label.toLowerCase().includes('recyclable')) {
        baseFrequency = 1200
        pattern = confidence > 0.6 ? 'confident-double' : 'double'
      } else if (label.toLowerCase().includes('organic')) {
        baseFrequency = 600
        pattern = confidence > 0.6 ? 'confident-rising' : 'rising'
      }
      
      // Confidence-based frequency modulation
      const confidentModifier = 1 + (confidence - 0.5) * 0.3
      const finalFrequency = baseFrequency * confidentModifier
      
      if (pattern === 'confident-double') {
        playTone(audioContext, finalFrequency, 0.0, 0.12, 0.3)
        playTone(audioContext, finalFrequency * 1.2, 0.15, 0.27, 0.3)
      } else if (pattern === 'double') {
        playTone(audioContext, finalFrequency, 0.0, 0.15, 0.2)
        playTone(audioContext, finalFrequency, 0.2, 0.35, 0.2)
      } else if (pattern === 'confident-rising') {
        playRisingTone(audioContext, finalFrequency, finalFrequency * 1.6, 0.0, 0.6, 0.3)
      } else if (pattern === 'rising') {
        playRisingTone(audioContext, finalFrequency, finalFrequency * 1.4, 0.0, 0.5, 0.2)
      } else {
        playTone(audioContext, finalFrequency, 0.0, 0.3, confidence * 0.3)
      }
      
      setTimeout(() => {
        setIsPlayingAudio(false)
      }, 700)
      
    } catch (fallbackError) {
      console.error('FALLBACK: Enhanced beep failed:', fallbackError)
      setIsPlayingAudio(false)
    }
  }
  
  function playTone(audioContext, frequency, startTime, endTime, volume = 0.2) {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startTime)
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime)
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + startTime + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + endTime)
    
    oscillator.start(audioContext.currentTime + startTime)
    oscillator.stop(audioContext.currentTime + endTime)
  }
  
  function playRisingTone(audioContext, startFreq, endFreq, startTime, endTime, volume = 0.2) {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(startFreq, audioContext.currentTime + startTime)
    oscillator.frequency.linearRampToValueAtTime(endFreq, audioContext.currentTime + endTime)
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime)
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + startTime + 0.05)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + endTime)
    
    oscillator.start(audioContext.currentTime + startTime)
    oscillator.stop(audioContext.currentTime + endTime)
  }

  function toggleFullscreen() {
    const el = panelRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
    } else if (document.fullscreenElement === el) {
      document.exitFullscreen?.()
    } else {
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

  useEffect(() => {
    const video = webcamRef.current?.video
    if (video && !initialized && !sessionRef.current) {
      console.log('Webcam loaded, auto-initializing enhanced system...')
      const timer = setTimeout(() => {
        if (video.videoWidth && video.videoHeight) {
          initModel()
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [webcamRef.current?.video, initialized, initModel])

  useEffect(() => {
    let frames = 0
    let lastReport = performance.now()
    let lastInference = 0

    async function enhancedLoop() {
      if (!isRunning) {
        rafRef.current = requestAnimationFrame(enhancedLoop)
        return
      }
      
      const video = webcamRef.current?.video
      const now = performance.now()
      
      // Fixed 5-second inference interval for clear audio feedback
      const inferenceInterval = 5000 // 5 seconds fixed interval
      
      if (video && sessionRef.current && (now - lastInference > inferenceInterval)) {
        try {
          console.log('INFERENCE: Running enhanced waste detection...')
          const detections = await runClassifier(sessionRef.current, video, 5)
          console.log('Raw enhanced detections:', detections)
          
          // Enhanced detection processing with automatic confidence threshold
          const validDetections = detections
            .filter(d => d.score >= autoConfidenceThreshold)
            .filter(d => {
              // Additional frontend filtering for false positives
              if (!d.bbox) return true // Keep non-bbox detections for now
              
              const width = d.bbox.x2 - d.bbox.x1
              const height = d.bbox.y2 - d.bbox.y1
              const area = width * height
              
              // Filter out extremely small or large detections
              if (area < 1000 || area > 300000) {
                console.log(`FRONTEND FILTER: Rejected ${d.label} - invalid area: ${area}`)
                return false
              }
              
              // Filter out extreme aspect ratios
              if (height > 0) {
                const aspectRatio = width / height
                if (aspectRatio > 5 || aspectRatio < 0.2) {
                  console.log(`FRONTEND FILTER: Rejected ${d.label} - invalid aspect ratio: ${aspectRatio.toFixed(2)}`)
                  return false
                }
              }
              
              return true
            })
            .map(d => ({
              label: d.label || 'unknown',
              score: d.score,
              bbox: d.bbox || null,
              index: d.index,
              timestamp: now
            }))
          
          console.log(`INFERENCE: Valid detections (>=${Math.round(autoConfidenceThreshold*100)}%):`, validDetections.length)
          setPredictions(validDetections)
          
          // Automatic confidence threshold adjustment
          if (detections.length > 0) {
            const avgConfidence = detections.reduce((sum, d) => sum + d.score, 0) / detections.length
            const highConfidenceDetections = detections.filter(d => d.score > 0.7).length
            
            // Adjust threshold based on detection patterns
            if (highConfidenceDetections > 0) {
              // If we have high confidence detections, raise the threshold slightly
              setAutoConfidenceThreshold(prev => Math.min(prev + 0.02, 0.5))
            } else if (avgConfidence < 0.3 && validDetections.length === 0) {
              // If average confidence is low and no valid detections, lower threshold
              setAutoConfidenceThreshold(prev => Math.max(prev - 0.01, 0.15))
            }
            
            console.log(`AUTO-CONFIDENCE: Threshold now ${autoConfidenceThreshold.toFixed(3)} (avg: ${avgConfidence.toFixed(3)})`)
          }
          
          // Always draw enhanced bounding boxes
          drawEnhancedBoundingBoxes(validDetections)
          
          // ENHANCED: Structured 5-second logging with conflict-free audio
          const scanNumber = Math.floor((now - startTime) / inferenceInterval) + 1
          const timestamp = new Date().toLocaleTimeString()
          
          console.log('='.repeat(60))
          console.log(`5-SECOND SCAN #${scanNumber} - ${timestamp}`)
          console.log('='.repeat(60))
          
          if (validDetections.length > 0) {
            const topDetection = validDetections[0]
            
            console.log(`DETECTION RESULT: ${topDetection.label.toUpperCase()} waste detected`)
            console.log(`CONFIDENCE LEVEL: ${Math.round(topDetection.score * 100)}%`)
            console.log(`TOTAL DETECTIONS: ${validDetections.length}`)
            console.log(`AUTO-THRESHOLD: ${Math.round(autoConfidenceThreshold * 100)}%`)
            
            // Detailed breakdown of all detections
            console.log('\nDETECTION BREAKDOWN:')
            validDetections.forEach((det, i) => {
              const confidence = Math.round(det.score * 100)
              const indicator = i === 0 ? '★ PRIMARY' : confidence > 70 ? '▲ HIGH' : confidence > 50 ? '● GOOD' : '○ LOW'
              console.log(`  ${indicator} ${i+1}. ${det.label.toUpperCase()}: ${confidence}%`)
              
              if (det.bbox) {
                const width = Math.round(det.bbox.x2 - det.bbox.x1)
                const height = Math.round(det.bbox.y2 - det.bbox.y1)
                console.log(`     Box: ${width}×${height}px at (${Math.round(det.bbox.x1)}, ${Math.round(det.bbox.y1)})`)
              }
            })
            
            // Action taken
            if (topDetection.score > 0.3) {
              console.log(`\nACTION: Processing ${topDetection.label} detection`)
              
              // Add to statistics immediately
              addHistoryItem({ 
                ts: Date.now(), 
                label: topDetection.label, 
                score: topDetection.score,
                bbox: topDetection.bbox
              })
              
              // Enhanced audio feedback with conflict prevention
              scheduleStructuredAudioFeedback(topDetection.label, topDetection.score, scanNumber)
              
            } else {
              console.log(`\nACTION: Skipped - confidence too low (minimum: 30%)`)
            }
            
          } else {
            drawEnhancedBoundingBoxes([])
            
            console.log('DETECTION RESULT: No waste detected')
            console.log('SCENE STATUS: Clean - ready for waste detection')
            console.log(`AUTO-THRESHOLD: ${Math.round(autoConfidenceThreshold * 100)}%`)
            console.log('ACTION: Maintaining detection readiness')
            
            // Track empty frames for better "no waste" detection  
            const emptyDetection = {
              label: 'none',
              score: 0.9, // High confidence for "no waste"
              timestamp: now,
              isEmpty: true
            }
            
            const newHistory = [...detectionHistory, emptyDetection].slice(-10)
            setDetectionHistory(newHistory)
            
            // Clear confidence buffer since no detections
            setConfidenceBuffer([])
          }
          
          console.log('='.repeat(60))
          lastInference = now
        } catch (error) {
          console.error('Enhanced inference error:', error)
        }
      }
      
      frames++
      if (now - lastReport >= 1000) {
        setFps(Math.round(frames))
        frames = 0
        lastReport = now
      }
      rafRef.current = requestAnimationFrame(enhancedLoop)
    }

    rafRef.current = requestAnimationFrame(enhancedLoop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      // Clear predictions and audio when stopping
      setPredictions([])
      drawEnhancedBoundingBoxes([])
    }
  }, [isRunning, autoConfidenceThreshold, setFps, setPredictions, addHistoryItem, detectionHistory, confidenceBuffer, scheduleSmartAudioFeedback])

  const wrapperBase = 'relative bg-gradient-to-br from-[#0d80f2] to-[#1e40af] bg-cover bg-center rounded-xl flex items-center justify-center shadow-2xl'
  const wrapperSize = isFullscreen ? 'w-screen h-screen' : 'aspect-video p-1 sm:p-2 md:p-4 min-h-[250px] sm:min-h-[300px] md:min-h-[400px] lg:min-h-[450px]'

  return (
    <div ref={panelRef} className={`${wrapperBase} ${wrapperSize}`}>
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{ 
          facingMode: 'user',
          width: { ideal: 1280, min: 640 }, 
          height: { ideal: 720, min: 480 } 
        }}
        mirrored={true}
        onUserMedia={() => {
          console.log('Enhanced webcam access granted')
          setPermissionError('')
        }}
        onUserMediaError={e => {
          console.error('Enhanced webcam error:', e)
          setPermissionError(e?.message || 'Enhanced camera access denied')
        }}
        onLoadedData={() => {
          console.log('Enhanced webcam data loaded')
        }}
        className="absolute inset-0 w-full h-full object-cover rounded-xl"
        style={{ transform: 'scaleX(1)' }}
      />
      
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none rounded-xl"
        style={{ zIndex: 10 }}
      />
      
      {!initialized && modelStatus !== 'loading' && (
        <div className="flex flex-col items-center gap-4 p-4">
          <button 
            className="flex shrink-0 items-center justify-center rounded-full size-16 sm:size-18 md:size-22 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 active:from-blue-600 active:to-blue-700 text-white touch-manipulation transition-all duration-300 shadow-xl hover:shadow-2xl active:scale-95 border-2 border-white/20" 
            onClick={initModel}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="sm:w-7 sm:h-7 md:w-9 md:h-9" fill="currentColor" viewBox="0 0 256 256">
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm36.44-94.66-48-32A8,8,0,0,0,104,96v64a8,8,0,0,0,12.44,6.66l48-32a8,8,0,0,0,0-13.32ZM120,145.05V111l25.58,17Z"></path>
            </svg>
          </button>
          <div className="text-white text-sm sm:text-base bg-black/60 px-6 py-3 rounded-xl text-center backdrop-blur-sm">
            <div className="font-semibold">Initialize Enhanced Detection</div>
            <div className="text-xs text-gray-300 mt-1">Click to connect to enhanced AI model</div>
          </div>
        </div>
      )}
      
      {modelStatus === 'loading' && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm rounded-xl">
          <div className="text-white text-center bg-black/50 p-8 rounded-xl backdrop-blur-sm">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-400 mx-auto mb-6"></div>
            <div className="text-xl font-semibold">Initializing Enhanced AI...</div>
            <div className="text-sm text-gray-300 mt-3">Connecting to advanced Flask API</div>
          </div>
        </div>
      )}
      
      {modelStatus === 'error' && (
        <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center backdrop-blur-sm rounded-xl">
          <div className="text-white text-center bg-black/70 p-8 rounded-xl max-w-md backdrop-blur-sm">
            <div className="text-xl font-semibold mb-4">Enhanced Initialization Error</div>
            <div className="text-sm mb-6 text-gray-200">{modelError}</div>
            <button 
              onClick={initModel}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-xl text-sm hover:from-blue-400 hover:to-blue-500 transition-all duration-300 shadow-lg"
            >
              Retry Enhanced Setup
            </button>
          </div>
        </div>
      )}
      
      {permissionError && (
        <div className="absolute bottom-3 left-3 right-3 bg-black/60 px-4 py-3 rounded-xl text-sm backdrop-blur-sm text-white">
          ERROR: {permissionError}
        </div>
      )}
      
      {initialized && !isRunning && (
        <div className="absolute top-3 left-3 bg-green-500/90 text-white text-sm px-4 py-2 rounded-xl flex items-center gap-2 backdrop-blur-sm shadow-lg">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span className="font-medium">ENHANCED READY</span>
        </div>
      )}

      {initialized && (
        <button 
          className={`absolute top-3 right-3 text-white text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3 rounded-xl touch-manipulation font-bold transition-all duration-300 shadow-xl hover:shadow-2xl active:scale-95 backdrop-blur-sm border border-white/20 ${
            isRunning 
              ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 animate-pulse' 
              : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500'
          }`}
          onClick={() => {
            console.log(`${isRunning ? 'STOPPING' : 'STARTING'} enhanced waste detection...`)
            
            if (!isRunning && !window.borlaCamAudioContext) {
              try {
                console.log('AUDIO: Initializing enhanced AudioContext')
                window.borlaCamAudioContext = new (window.AudioContext || window.webkitAudioContext)()
                playEnhancedDetectionSound('test', 0.5)
              } catch (err) {
                console.error('AUDIO: Enhanced initialization failed:', err)
              }
            }
            
            setIsRunning(!isRunning)
          }}
        >
          {isRunning ? 'STOP' : 'START'}
        </button>
      )}
        
      {/* Detection Status Indicator */}
      {initialized && isRunning && (
        <div className="absolute top-3 right-3 bg-blue-600/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm border border-white/20 animate-pulse">
          5-sec scans
        </div>
      )}
      
      <button 
        className="absolute top-3 left-3 bg-black/60 hover:bg-black/80 active:bg-black/90 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-xl touch-manipulation transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 backdrop-blur-sm border border-white/20" 
        onClick={toggleFullscreen}
      >
        <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Full'}</span>
        <span className="sm:hidden">{isFullscreen ? 'X' : 'F'}</span>
      </button>
      
      {initialized && isRunning && (
        <div className="absolute bottom-3 right-3 bg-green-500/90 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 backdrop-blur-sm">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-full animate-pulse"></div>
          <span className="font-medium">ENHANCED DETECTING</span>
        </div>
      )}
      
      {initialized && isRunning && (
        <div className="absolute top-16 left-3 bg-black/70 text-white text-xs px-3 py-2 rounded-xl backdrop-blur-sm">
          <div>Enhanced Loop: {isRunning ? 'ACTIVE' : 'IDLE'}</div>
          <div>API: {sessionRef.current ? 'CONNECTED' : 'NONE'}</div>
          <div>Video: {webcamRef.current?.video?.videoWidth || 'NO_VIDEO'}</div>
          <div>History: {detectionHistory.length}/10</div>
          <div>Threshold: {autoConfidenceThreshold.toFixed(3)}</div>
        </div>
      )}
    </div>
  )
} 