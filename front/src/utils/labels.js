let cached = null;

export async function loadLabels() {
	if (cached) return cached;
	try {
		// Try to get labels from Flask API first
		const apiRes = await fetch('http://localhost:8000/api/labels');
		if (apiRes.ok) {
			const data = await apiRes.json();
			cached = data.labels || ['organic', 'recyclable'];
			return cached;
		}
		
		// Fallback to local labels file
		const res = await fetch('/models/labels.txt');
		if (!res.ok) throw new Error('no labels');
		const text = await res.text();
		cached = text.split('\n').map((l) => l.trim()).filter(Boolean);
		return cached;
	} catch (_) {
		// Final fallback
		cached = ['organic', 'recyclable'];
		return cached;
	}
}

export function indexToLabel(index) {
	if (!cached || !cached.length) return `Class ${index}`;
	return cached[index] ?? `Class ${index}`;
} 