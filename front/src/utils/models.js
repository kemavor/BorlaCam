async function tryHead(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch (_) {
    return false;
  }
}

export async function discoverModels(base = '/models') {
  // Check if Enhanced Flask API is available first (port 5000)
  try {
    const apiRes = await fetch('http://localhost:5000/status');
    if (apiRes.ok) {
      const status = await apiRes.json();
      if (status.model_loaded !== false) {
        // Return Enhanced API model info
        console.log('Enhanced API detected:', status.model);
        return [
          status.model || 'Enhanced BorlaCam with Custom Labels',
          `Custom Objects: ${status.custom_objects || 0}`,
          'High Precision Mode (0.8 confidence)'
        ];
      }
    }
  } catch (_) {
    console.log('Enhanced API not available, checking standard API...');
  }

  // Fallback: Check standard Flask API (port 8000)
  try {
    const apiRes = await fetch('http://localhost:8000/api/status');
    if (apiRes.ok) {
      const status = await apiRes.json();
      if (status.model_loaded) {
        console.log('Standard API detected');
        return ['MX450 Waste Model (Standard API)'];
      }
    }
  } catch (_) {
    console.log('Standard API not available, checking for local ONNX models...');
  }

  // Fallback to ONNX model discovery
  // 1) Try index.json (array of filenames)
  try {
    const res = await fetch(`${base}/index.json`, { cache: 'no-store' });
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items)) return items.filter((x) => typeof x === 'string');
    }
  } catch (_) {}

  // 2) Try index.txt (newline-separated)
  try {
    const res = await fetch(`${base}/index.txt`, { cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      const items = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (items.length) return items;
    }
  } catch (_) {}

  // 3) Probe common filenames (without downloading full models)
  const candidates = [
    'yolov8n-cls.onnx',
    'yolov8s-cls.onnx',
    'yolov8m-cls.onnx',
    'yolov8l-cls.onnx',
    'yolov8x-cls.onnx',
  ];
  const found = [];
  for (const name of candidates) {
    if (await tryHead(`${base}/${name}`)) found.push(name);
  }
  return found.length ? found : ['MX450 Waste Model (Trained)'];
} 