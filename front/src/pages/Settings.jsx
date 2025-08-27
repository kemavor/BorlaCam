import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { discoverModels } from '../utils/models'

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4" />
      <span className="text-sm">{label}</span>
    </label>
  )
}

export default function Settings() {
  const provider = useAppStore(s => s.provider)
  const setProvider = useAppStore(s => s.setProvider)
  const selectedModel = useAppStore(s => s.selectedModel)
  const setSelectedModel = useAppStore(s => s.setSelectedModel)
  const availableModels = useAppStore(s => s.availableModels)
  const setAvailableModels = useAppStore(s => s.setAvailableModels)

  const [autoStart, setAutoStart] = useState(false)
  const [saveSnapshots, setSaveSnapshots] = useState(true)

  useEffect(() => {
    // attempt auto-discovery on load
    discoverModels('/models').then(setAvailableModels).catch(() => {})
  }, [setAvailableModels])

  return (
    <div className="min-h-screen bg-[#101a23] text-white">
      <div className="border-b border-[#223649] px-6 py-3">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>
      <div className="p-6 grid gap-6 max-w-3xl">
        <section className="grid gap-2">
          <h2 className="text-lg font-semibold">Execution</h2>
          <div className="flex items-center gap-4">
            <label className="text-sm text-[#90adcb] w-28">Provider</label>
            <select value={provider} onChange={e => setProvider(e.target.value)} className="bg-[#101a23] border border-[#223649] rounded px-2 py-1">
              <option value="wasm">WASM</option>
              <option value="webgl">WebGL</option>
              <option value="webgpu">WebGPU</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-[#90adcb] w-28">Model</label>
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="bg-[#101a23] border border-[#223649] rounded px-2 py-1">
              {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button className="mt-2 bg-[#223649] hover:bg-[#2a4157] px-3 py-1 rounded text-sm" onClick={() => discoverModels('/models').then(setAvailableModels)}>Refresh models</button>
        </section>

        <section className="grid gap-2">
          <h2 className="text-lg font-semibold">Behavior</h2>
          <Toggle label="Auto-start after model init" checked={autoStart} onChange={setAutoStart} />
          <Toggle label="Save top prediction to history" checked={saveSnapshots} onChange={setSaveSnapshots} />
        </section>

        <section className="grid gap-2">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="text-[#90adcb] text-sm">Place models under <code>/public/models</code>. You can provide <code>index.json</code> or <code>index.txt</code> to list available models. A fallback probe for common model names is also used.</p>
        </section>
      </div>
    </div>
  )
}

// Optional wrapper to share layout when embedding under router
export function Wrapper({ children }) {
  return (
    <div className="min-h-screen bg-[#101a23] text-white">
      <div className="border-b border-[#223649] px-6 py-3">
        <h1 className="text-xl font-bold">Reports</h1>
      </div>
      {children}
    </div>
  )
} 