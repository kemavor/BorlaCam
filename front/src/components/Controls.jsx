import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useAppStore } from '../store/useAppStore';

export default function Controls({ onLoadModel }) {
	const threshold = useAppStore((s) => s.confidenceThreshold);
	const setThreshold = useAppStore((s) => s.setConfidenceThreshold);
	const modelStatus = useAppStore((s) => s.modelStatus);
	const modelError = useAppStore((s) => s.modelError);

	return (
		<Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
			<Box sx={{ minWidth: 240 }}>
				<Typography gutterBottom>Confidence threshold: {Math.round(threshold * 100)}%</Typography>
				<Slider min={0} max={1} step={0.01} value={threshold} onChange={(_, v) => setThreshold(Number(v))} />
			</Box>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
				<Button variant="contained" onClick={onLoadModel} disabled={modelStatus === 'loading'}>
					Load model
				</Button>
				{modelStatus === 'loading' && <CircularProgress size={20} />}
				<Typography variant="body2" color={modelStatus === 'error' ? 'error' : 'text.secondary'}>
					{modelStatus === 'ready' ? 'Model ready' : modelStatus === 'loading' ? 'Loading...' : modelStatus === 'error' ? (modelError || 'Error') : 'Idle'}
				</Typography>
			</Box>
		</Box>
	);
} 