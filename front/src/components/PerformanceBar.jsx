import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useAppStore } from '../store/useAppStore';

export default function PerformanceBar() {
	const fps = useAppStore((s) => s.fps);
	const modelStatus = useAppStore((s) => s.modelStatus);
	return (
		<Paper elevation={0} sx={{ p: 2, display: 'flex', gap: 3 }}>
			<Box>
				<Typography variant="caption" color="text.secondary">FPS</Typography>
				<Typography variant="body1">{fps}</Typography>
			</Box>
			<Box>
				<Typography variant="caption" color="text.secondary">Model</Typography>
				<Typography variant="body1">{modelStatus}</Typography>
			</Box>
		</Paper>
	);
} 