import { useState, useEffect } from 'react'
import { getCustomLabels, removeCustomLabel } from '../inference/enhancedApiClassifier'

export default function CustomLabelsPanel() {
  const [customLabels, setCustomLabels] = useState({ total: 0, organic: [], recyclable: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    loadCustomLabels()
  }, [])

  const loadCustomLabels = async () => {
    try {
      setLoading(true)
      const labels = await getCustomLabels()
      setCustomLabels(labels)
      setError('')
    } catch (err) {
      setError('Failed to load custom labels')
      console.error('Error loading custom labels:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveLabel = async (objectId, objectName) => {
    if (!confirm(`Remove "${objectName}" from custom labels?`)) {
      return
    }

    try {
      await removeCustomLabel(objectId)
      await loadCustomLabels() // Reload after removal
    } catch (err) {
      setError('Failed to remove custom label')
      console.error('Error removing label:', err)
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDisplayedLabels = () => {
    switch (selectedCategory) {
      case 'organic':
        return customLabels.organic
      case 'recyclable':
        return customLabels.recyclable
      case 'all':
      default:
        return [...customLabels.organic, ...customLabels.recyclable]
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center">
          🏷️ Custom Labels
        </h3>
        <div className="text-gray-400 text-center py-8">
          Loading custom labels...
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center">
          🏷️ Custom Labels
          <span className="ml-2 px-2 py-1 bg-blue-600 text-xs rounded-full">
            {customLabels.total}
          </span>
        </h3>
        <button
          onClick={loadCustomLabels}
          className="text-blue-400 hover:text-blue-300 text-sm"
          title="Refresh labels"
        >
          🔄
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-3 py-2 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Category Filter */}
      <div className="flex space-x-2 mb-4">
        {[
          { key: 'all', label: 'All', count: customLabels.total },
          { key: 'organic', label: 'Organic', count: customLabels.organic.length },
          { key: 'recyclable', label: 'Recyclable', count: customLabels.recyclable.length }
        ].map(category => (
          <button
            key={category.key}
            onClick={() => setSelectedCategory(category.key)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedCategory === category.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {category.label} ({category.count})
          </button>
        ))}
      </div>

      {/* Labels List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {getDisplayedLabels().length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            <div className="text-4xl mb-2">📝</div>
            <div className="text-sm">
              {selectedCategory === 'all' 
                ? 'No custom labels yet. Use the labeling system to add objects.'
                : `No ${selectedCategory} labels yet.`
              }
            </div>
          </div>
        ) : (
          getDisplayedLabels().map((item) => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-lg p-3 flex items-center justify-between hover:bg-gray-600 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-lg ${
                    item.label === 'organic' ? '🟢' : '🟠'
                  }`}>
                    {item.label === 'organic' ? '🌱' : '♻️'}
                  </span>
                  <span className="text-white font-medium">{item.name}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    item.label === 'organic' 
                      ? 'bg-green-900 text-green-200' 
                      : 'bg-orange-900 text-orange-200'
                  }`}>
                    {item.label}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Added: {formatDate(item.timestamp)} • Confidence: {Math.round(item.confidence * 100)}%
                </div>
              </div>
              <button
                onClick={() => handleRemoveLabel(item.id, item.name)}
                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/30 transition-colors"
                title="Remove this label"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      {/* Quick Stats */}
      {customLabels.total > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-600">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-green-900/30 rounded p-2">
              <div className="text-green-400 font-semibold">{customLabels.organic.length}</div>
              <div className="text-xs text-gray-400">Organic Objects</div>
            </div>
            <div className="bg-orange-900/30 rounded p-2">
              <div className="text-orange-400 font-semibold">{customLabels.recyclable.length}</div>
              <div className="text-xs text-gray-400">Recyclable Objects</div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-200">
        <div className="font-medium mb-1">How to add custom labels:</div>
        <div>1. Run: <code className="bg-blue-900/50 px-1 rounded">python custom_labeling_system.py --mode label</code></div>
        <div>2. Click & drag to select objects</div>
        <div>3. Press 'o' for organic, 'r' for recyclable</div>
      </div>
    </div>
  )
}