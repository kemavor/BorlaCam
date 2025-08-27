import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { loadLabels } from '../utils/labels'

export default function Stats() {
  const history = useAppStore(s => s.history)
  const [labels, setLabels] = useState([])

  useEffect(() => {
    loadLabels().then(setLabels).catch(() => setLabels([]))
  }, [])

  const topThree = useMemo(() => {
    const byLabel = new Map()
    for (const h of history) byLabel.set(h.label, (byLabel.get(h.label) || 0) + 1)
    // ensure labels present even if not seen yet
    for (const l of labels) if (!byLabel.has(l)) byLabel.set(l, 0)
    const arr = [...byLabel.entries()].sort((a,b) => b[1]-a[1])
    return arr.slice(0, 3)
  }, [history, labels])

  return (
    <div className="flex flex-wrap gap-2 md:gap-4 p-2 md:p-4">
      {topThree.map(([label, value]) => (
        <div key={label} className="flex min-w-[120px] md:min-w-[158px] flex-1 flex-col gap-2 rounded-lg p-3 md:p-6 bg-[#223649]">
          <p className="text-sm md:text-base font-medium leading-normal capitalize">{label}</p>
          <p className="tracking-light text-xl md:text-2xl font-bold leading-tight">{value}</p>
        </div>
      ))}
      {topThree.length === 0 && (
        <div className="text-[#90adcb] p-2 md:p-4 text-sm md:text-base">No data yet</div>
      )}
    </div>
  )
} 