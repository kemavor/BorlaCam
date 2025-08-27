import { useAppStore } from '../store/useAppStore'

export default function Log() {
  const history = useAppStore(s => s.history)
  const items = history.slice(0, 5)
  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && (
        <div className="flex items-center gap-4 bg-[#101a23] px-4 min-h-[72px] py-2">
          <div className="flex flex-col justify-center">
            <p className="text-base font-medium leading-normal">No items yet</p>
            <p className="text-[#90adcb] text-sm">Perform a classification to see logs here</p>
          </div>
        </div>
      )}
      {items.map((h, i) => (
        <div key={i} className="flex items-center gap-4 bg-[#101a23] px-4 min-h-[72px] py-2 rounded">
          <div className="flex flex-col justify-center">
            <p className="text-base font-medium leading-normal line-clamp-1">{h.label}</p>
            <p className="text-[#90adcb] text-sm font-normal leading-normal line-clamp-2">{new Date(h.ts).toLocaleTimeString()}</p>
          </div>
        </div>
      ))}
    </div>
  )
} 