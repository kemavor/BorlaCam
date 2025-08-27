import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useAppStore } from '../store/useAppStore';

export default function PredictionsPanel() {
	const predictions = useAppStore((s) => s.predictions);
	return (
		<Paper elevation={0} sx={{ p: 2 }}>
			<Typography variant="subtitle1" gutterBottom>Predictions</Typography>
			{predictions.length === 0 ? (
				<Typography variant="body2" color="text.secondary">No predictions yet</Typography>
			) : (
				<List dense>
					{predictions.map((p, i) => (
						<ListItem key={i} disableGutters>
							<Box sx={{ width: '100%' }}>
								<ListItemText primary={p.label} secondary={`${(p.score * 100).toFixed(1)}%`} />
								<LinearProgress variant="determinate" value={Math.min(100, Math.max(0, p.score * 100))} />
							</Box>
						</ListItem>
					))}
				</List>
			)}
		</Paper>
	);
} 