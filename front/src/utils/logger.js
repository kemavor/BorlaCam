// Production Logger Utility
// Replaces console.log calls with conditional logging for production

const isDevelopment = import.meta.env.MODE === 'development'
const isVerbose = localStorage.getItem('borlacam_verbose') === 'true'

export const logger = {
  // Development-only logs
  dev: (...args) => {
    if (isDevelopment) {
      console.log('[DEV]', ...args)
    }
  },
  
  // Production info logs (always shown)
  info: (...args) => {
    console.info('[INFO]', ...args)
  },
  
  // Warning logs
  warn: (...args) => {
    console.warn('[WARN]', ...args)
  },
  
  // Error logs
  error: (...args) => {
    console.error('[ERROR]', ...args)
  },
  
  // Verbose logs (only if enabled)
  verbose: (...args) => {
    if (isDevelopment || isVerbose) {
      console.log('[VERBOSE]', ...args)
    }
  },
  
  // Detection logs (structured for production monitoring)
  detection: (scanNumber, detections, timestamp) => {
    if (isDevelopment || isVerbose) {
      console.log(`[SCAN #${scanNumber}] ${detections.length} detections at ${timestamp}`)
      detections.forEach((det, i) => {
        console.log(`  ${i+1}. ${det.label.toUpperCase()}: ${Math.round(det.score * 100)}%`)
      })
    } else {
      // Production: Only log summary
      console.info(`[DETECTION] Scan #${scanNumber}: ${detections.length} detections`)
    }
  },
  
  // Audio logs
  audio: (action, details) => {
    if (isDevelopment || isVerbose) {
      console.log(`[AUDIO] ${action}:`, details)
    } else {
      console.info(`[AUDIO] ${action}`)
    }
  },
  
  // Performance logs
  perf: (metric, value, unit = 'ms') => {
    if (isDevelopment) {
      console.log(`[PERF] ${metric}: ${value}${unit}`)
    }
  }
}

// Global error handler for production
window.addEventListener('error', (event) => {
  logger.error('Global error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection:', event.reason)
})

export default logger