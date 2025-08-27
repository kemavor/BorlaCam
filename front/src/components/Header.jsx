import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Switch from '@mui/material/Switch';
import Stack from '@mui/material/Stack';
import { useAppStore } from '../store/useAppStore';

export default function Header() {
	const selectedModel = useAppStore((s) => s.selectedModel);
	const availableModels = useAppStore((s) => s.availableModels);
	const setSelectedModel = useAppStore((s) => s.setSelectedModel);
	const isRunning = useAppStore((s) => s.isRunning);
	const setIsRunning = useAppStore((s) => s.setIsRunning);

	return (
		<AppBar position="static" color="default" sx={{ borderBottom: 1, borderColor: 'divider' }}>
			<Toolbar sx={{ gap: 2, justifyContent: 'space-between' }}>
				<Typography variant="h6" component="div">
					BorlaCam
				</Typography>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
					<FormControl size="small">
						<InputLabel id="model-label">Model</InputLabel>
						<Select labelId="model-label" label="Model" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
							{availableModels.map((m) => (
								<MenuItem key={m} value={m}>{m}</MenuItem>
							))}
						</Select>
					</FormControl>
					<Stack direction="row" spacing={1} alignItems="center">
						<Typography variant="body2">Stop</Typography>
						<Switch checked={isRunning} onChange={(e) => setIsRunning(e.target.checked)} />
						<Typography variant="body2">Run</Typography>
					</Stack>
				</Box>
			</Toolbar>
		</AppBar>
	);
} 