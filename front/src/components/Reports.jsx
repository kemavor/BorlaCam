import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'

function toCsv(rows) {
  const esc = (s) => '"' + String(s).replace(/"/g, '""') + '"'
  const header = ['timestamp', 'label', 'score']
  const lines = [header.map(esc).join(',')]
  for (const r of rows) {
    lines.push([new Date(r.ts).toISOString(), r.label, r.score].map(esc).join(','))
  }
  return lines.join('\n')
}

export default function Reports() {
  const history = useAppStore(s => s.history)
  const summary = useMemo(() => {
    const total = history.length
    const byLabel = new Map()
    let firstTs = Number.POSITIVE_INFINITY
    let lastTs = 0
    for (const h of history) {
      byLabel.set(h.label, (byLabel.get(h.label) || 0) + 1)
      if (h.ts < firstTs) firstTs = h.ts
      if (h.ts > lastTs) lastTs = h.ts
    }
    const top = [...byLabel.entries()].sort((a,b) => b[1]-a[1]).slice(0, 10)
    return { total, byLabel, firstTs: isFinite(firstTs) ? firstTs : null, lastTs: lastTs || null, top }
  }, [history])

  function downloadCsv() {
    const csv = toCsv(history)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'borlacam_report.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Reports</h1>
        <button className="bg-[#223649] hover:bg-[#2a4157] px-3 py-1 rounded text-sm" onClick={downloadCsv}>Download CSV</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#223649] rounded p-4">
          <div className="text-sm text-[#90adcb]">Total classifications</div>
          <div className="text-3xl font-bold">{summary.total}</div>
        </div>
        <div className="bg-[#223649] rounded p-4">
          <div className="text-sm text-[#90adcb]">First seen</div>
          <div className="text-xl">{summary.firstTs ? new Date(summary.firstTs).toLocaleString() : '-'}</div>
        </div>
        <div className="bg-[#223649] rounded p-4">
          <div className="text-sm text-[#90adcb]">Last seen</div>
          <div className="text-xl">{summary.lastTs ? new Date(summary.lastTs).toLocaleString() : '-'}</div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">Top classes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {summary.top.map(([label, count]) => (
          <div key={label} className="bg-[#101a23] rounded p-3 border border-[#223649]">
            <div className="flex items-center justify-between">
              <span className="font-medium">{label}</span>
              <span className="text-sm text-[#90adcb]">{count}</span>
            </div>
          </div>
        ))}
        {summary.top.length === 0 && <div className="text-[#90adcb]">No data yet</div>}
      </div>
    </div>
  )
} 