// API-based inference for BorlaCam Flask backend
// Supports both Enhanced API (port 5000) and Standard API (port 8000)

export async function createClassifier({ modelPath = 'Auto-detected API', provider = 'auto' } = {}) {
    console.log(`Creating classifier - Provider: ${provider}, Model: ${modelPath}`)
    
    // Try Enhanced API first (port 5000)
    try {
        console.log('Checking Enhanced API (port 5000)...');
        const response = await fetch('http://localhost:5000/status');
        if (response.ok) {
            const status = await response.json();
            console.log('Connected to Enhanced Flask API');
            console.log('Status:', status);
            console.log('Custom objects:', status.custom_objects);
            console.log('Features:', status.features);
            
            return {
                modelPath: status.model || 'Enhanced BorlaCam with Custom Labels',
                isApiMode: true,
                isEnhancedMode: true,
                apiPort: 5000,
                detectEndpoint: '/detect',
                modelClasses: ['organic', 'recyclable'],
                provider: 'enhanced-api',
                customObjectsCount: status.custom_objects
            };
        }
    } catch (error) {
        console.log('Enhanced API not available:', error.message);
    }
    
    // Fallback to Standard API (port 8000)
    try {
        console.log('Checking Standard API (port 8000)...');
        const response = await fetch('http://localhost:8000/api/status');
        if (response.ok) {
            const status = await response.json();
            console.log('Connected to Standard Flask API');
            console.log('Status:', status);
            console.log('GPU:', status.gpu_name);
            console.log('Classes:', status.model_classes);
            
            return {
                modelPath: 'MX450 Waste Model (Standard API)',
                isApiMode: true,
                isEnhancedMode: false,
                apiPort: 8000,
                detectEndpoint: '/api/predict',
                modelClasses: status.model_classes || ['organic', 'recyclable'],
                provider: 'standard-api',
                customObjectsCount: 0
            };
        }
    } catch (error) {
        console.log('Standard API not available:', error.message);
    }
    
    throw new Error('No Flask API available. Please start either:\n- Enhanced API: python enhanced_api_with_custom_labels.py\n- Standard API: python simple_flask_api.py');
}

export async function runClassifier(session, imageSource, topK = 10) {
    try {
        if (!session.isApiMode) {
            throw new Error('Not in API mode');
        }
        
        // Convert image/video to base64
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const width = imageSource.videoWidth || imageSource.width;
        const height = imageSource.videoHeight || imageSource.height;
        
        if (!width || !height) {
            console.warn('Invalid video dimensions');
            return [];
        }
        
        canvas.width = Math.min(width, 640);
        canvas.height = Math.min(height, 480);
        ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        const apiUrl = `http://localhost:${session.apiPort}${session.detectEndpoint}`;
        console.log(`Sending image (${canvas.width}x${canvas.height}) to ${session.provider} at ${apiUrl}...`);
        
        // Send to appropriate API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: imageData
            }),
            timeout: 10000  // 10 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`${session.provider} Response:`, result);
        
        let predictions = [];
        
        if (session.isEnhancedMode) {
            // Enhanced API response format
            if (result.success) {
                predictions = result.detections.slice(0, topK).map((detection, index) => ({
                    index: index,
                    score: detection.confidence,
                    label: detection.class,
                    bbox: detection.bbox || null,
                    // Enhanced properties
                    source: detection.source,
                    objectName: detection.object_name,
                    isCustomLabel: detection.source === 'custom_knowledge',
                    yoloPredict: detection.yolo_prediction,
                    customSimilarity: detection.custom_similarity
                }));
                
                console.log(`Enhanced API returned ${predictions.length} detections`);
                
                // Enhanced logging
                if (predictions.length > 0) {
                    console.log('Detection details:');
                    predictions.forEach((pred, i) => {
                        const source = pred.isCustomLabel ? 'CUSTOM' : 'AI';
                        const objectInfo = pred.objectName !== `${pred.label}_object` ? ` (${pred.objectName})` : '';
                        console.log(`  ${i+1}. ${source} ${pred.label}${objectInfo}: ${Math.round(pred.score * 100)}%`);
                        
                        if (pred.customSimilarity) {
                            console.log(`      Custom similarity: ${Math.round(pred.customSimilarity * 100)}%`);
                        }
                    });
                }
            } else {
                console.error('Enhanced API prediction failed:', result.error);
                throw new Error(result.error || 'Enhanced prediction failed');
            }
        } else {
            // Standard API response format
            if (result.success && result.predictions) {
                predictions = result.predictions.slice(0, topK).map((prediction, index) => ({
                    index: index,
                    score: prediction.confidence || prediction.score,
                    label: prediction.class || prediction.label,
                    bbox: prediction.bbox || null,
                    // Standard properties
                    source: 'yolo_model',
                    objectName: `${prediction.class || prediction.label}_object`,
                    isCustomLabel: false
                }));
                
                console.log(`Standard API returned ${predictions.length} detections`);
                
                if (predictions.length > 0) {
                    console.log('Detection details:');
                    predictions.forEach((pred, i) => {
                        console.log(`  ${i+1}. AI ${pred.label}: ${Math.round(pred.score * 100)}%`);
                    });
                }
            } else {
                console.error('Standard API prediction failed:', result.error);
                throw new Error(result.error || 'Standard API prediction failed');
            }
        }
        
        if (predictions.length === 0) {
            console.log('No detections returned from API');
        }
        
        return predictions;
        
    } catch (error) {
        console.error(`${session.provider || 'API'} inference error:`, error);
        return []; // Return empty array on error
    }
}