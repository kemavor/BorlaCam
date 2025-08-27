import { useState, useRef } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { useAppStore } from '../store/useAppStore';
import WebcamView from './WebcamView';
import PredictionsPanel from './PredictionsPanel';
import PerformanceBar from './PerformanceBar';

export default function TabsView() {
  const [tab, setTab] = useState(0);
  const provider = useAppStore((s) => s.provider);
  const setProvider = useAppStore((s) => s.setProvider);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const availableModels = useAppStore((s) => s.availableModels);
  const history = useAppStore((s) => s.history);
  const clearHistory = useAppStore((s) => s.clearHistory);
  const addHistoryItem = useAppStore((s) => s.addHistoryItem);
  const predictions = useAppStore((s) => s.predictions);

  const imageRef = useRef(null);

  function captureImageSnapshot() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = imageRef.current;
      if (!img) return null;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (_) {
      return null;
    }
  }

  function saveCurrentPredictions() {
    if (!predictions || predictions.length === 0) return;
    const top = predictions[0];
    const snapshot = captureImageSnapshot();
    addHistoryItem({ ts: Date.now(), label: top.label, score: top.score, snapshotDataUrl: snapshot });
  }

  return (
    <>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Live" />
        <Tab label="Image" />
        <Tab label="History" />
        <Tab label="Settings" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <WebcamView />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <PredictionsPanel />
              <Box sx={{ mt: 2 }}>
                <PerformanceBar />
                <Button sx={{ mt: 1 }} variant="outlined" onClick={saveCurrentPredictions} disabled={!predictions?.length}>Save to history</Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Classify image (drag & drop below)</Typography>
          <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2, textAlign: 'center' }}>
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              const img = new Image();
              img.onload = () => {
                if (imageRef.current) imageRef.current.src = url;
              };
              img.src = url;
            }} />
            <Box sx={{ mt: 2 }}>
              <img ref={imageRef} alt="preview" style={{ maxWidth: '100%', borderRadius: 8 }} />
            </Box>
          </Box>
        </Paper>
      )}

      {tab === 2 && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1">History</Typography>
            <Button size="small" onClick={clearHistory}>Clear</Button>
          </Box>
          <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
            {history.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No saved items</Typography>
            ) : history.map((h, i) => (
              <Paper key={i} sx={{ p: 1 }}>
                {h.snapshotDataUrl && (<img src={h.snapshotDataUrl} alt="snapshot" style={{ width: '100%', borderRadius: 6 }} />)}
                <Typography variant="body2" sx={{ mt: 1 }}>{h.label}</Typography>
                <Typography variant="caption" color="text.secondary">{(h.score * 100).toFixed(1)}% • {new Date(h.ts).toLocaleString()}</Typography>
              </Paper>
            ))}
          </Box>
        </Paper>
      )}

      {tab === 3 && (
        <Paper sx={{ p: 2, mt: 2, display: 'grid', gap: 2, maxWidth: 600 }}>
          <TextField select label="Execution provider" size="small" value={provider} onChange={(e) => setProvider(e.target.value)}>
            <MenuItem value="wasm">WASM (CPU)</MenuItem>
            <MenuItem value="webgl">WebGL (GPU)</MenuItem>
            <MenuItem value="webgpu">WebGPU (GPU)</MenuItem>
          </TextField>
          <TextField select label="Model" size="small" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
            {availableModels.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>
          <Typography variant="body2" color="text.secondary">Models should be placed under public/models.</Typography>
        </Paper>
      )}
    </>
  );
} 