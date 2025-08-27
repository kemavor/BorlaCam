import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Webcam from 'react-webcam';
import { useAppStore } from '../store/useAppStore';
import { createClassifier, runClassifier } from '../inference/yoloClassifier';
import { loadLabels, indexToLabel } from '../utils/labels';

export default function WebcamView() {
	const isRunning = useAppStore((s) => s.isRunning);
	const setFps = useAppStore((s) => s.setFps);
	const setPredictions = useAppStore((s) => s.setPredictions);
	const setModelStatus = useAppStore((s) => s.setModelStatus);
	const threshold = useAppStore((s) => s.confidenceThreshold);

	const webcamRef = useRef(null);
	const sessionRef = useRef(null);
	const rafRef = useRef(0);
	const [permissionError, setPermissionError] = useState('');

	async function loadModel() {
		try {
			setModelStatus('loading');
			sessionRef.current = await createClassifier();
			await loadLabels();
			setModelStatus('ready');
		} catch (e) {
			setModelStatus('error', e?.message || String(e));
		}
	}

	useEffect(() => {
		return () => cancelAnimationFrame(rafRef.current);
	}, []);

	useEffect(() => {
		let last = performance.now();
		let frames = 0;
		let lastReport = last;

		async function loop() {
			if (!isRunning) {
				rafRef.current = requestAnimationFrame(loop);
				return;
			}
			const video = webcamRef.current?.video;
			if (video && sessionRef.current) {
				try {
					const top = await runClassifier(sessionRef.current, video, 5);
					const preds = top
						.filter((p) => p.score >= threshold)
						.map((p) => ({ label: indexToLabel(p.index), score: p.score }));
					setPredictions(preds);
				} catch (e) {
					// ignore per-frame errors
				}
			}

			frames++;
			const now = performance.now();
			if (now - lastReport >= 1000) {
				setFps(frames);
				frames = 0;
				lastReport = now;
			}
			rafRef.current = requestAnimationFrame(loop);
		}
		rafRef.current = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(rafRef.current);
	}, [isRunning, threshold, setFps, setPredictions]);

	return (
		<Paper elevation={0} sx={{ p: 2 }}>
			<Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
				<Button variant="outlined" onClick={loadModel}>Init Model</Button>
				{permissionError && <Typography color="error">{permissionError}</Typography>}
			</Box>
			<Box sx={{ position: 'relative', width: '100%', maxWidth: 720 }}>
				<Webcam
					ref={webcamRef}
					audio={false}
					screenshotFormat="image/jpeg"
					videoConstraints={{ facingMode: 'environment', width: 640, height: 480 }}
					onUserMediaError={(e) => setPermissionError(e?.message || 'Camera error')}
					style={{ width: '100%', borderRadius: 8 }}
				/>
			</Box>
		</Paper>
	);
} 