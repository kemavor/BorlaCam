// Enhanced API-based inference with custom labels support
export async function createClassifier({ modelPath = 'Enhanced BorlaCam with Custom Labels', provider = 'enhanced-api' } = {}) {
    console.log(`Creating enhanced classifier - Provider: ${provider}, Model: ${modelPath}`)
    try {
        // Test connection to Enhanced Flask API
        const response = await fetch('http://localhost:5000/status');
        if (!response.ok) {
            throw new Error('Enhanced Flask API not available. Make sure to run: python enhanced_api_with_custom_labels.py');
        }
        
        const status = await response.json();
        console.log('Connected to Enhanced API');
        console.log('Model info:', status.model);
        console.log('Custom objects:', status.custom_objects);
        console.log('Features:', status.features);
        
        // Return a session object that the React app expects
        return {
            modelPath: modelPath,
            isEnhancedApiMode: true,
            modelClasses: ['organic', 'recyclable'],
            provider: provider,
            customObjectsCount: status.custom_objects,
            features: status.features
        };
    } catch (error) {
        console.error('Failed to connect to Enhanced API:', error);
        throw new Error(`Enhanced API Connection Failed: ${error.message}`);
    }
}

export async function runClassifier(session, imageSource, topK = 10) {
    try {
        if (!session.isEnhancedApiMode) {
            throw new Error('Not in enhanced API mode');
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
        
        console.log(`Sending image (${canvas.width}x${canvas.height}) to Enhanced API...`);
        
        // Send to Enhanced Flask API
        const response = await fetch('http://localhost:5000/detect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: imageData
            }),
            timeout: 10000  // 10 second timeout for enhanced processing
        });
        
        if (!response.ok) {
            throw new Error(`Enhanced API request failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Enhanced API Response:', result);
        
        if (result.success) {
            // Convert enhanced detections to format expected by React app
            const predictions = result.detections.slice(0, topK).map((detection, index) => ({
                index: index,
                score: detection.confidence,
                label: detection.class,
                bbox: detection.bbox || null,
                // Enhanced properties from custom labeling system
                source: detection.source, // 'custom_knowledge' or 'yolo_model'
                objectName: detection.object_name,
                isCustomLabel: detection.source === 'custom_knowledge',
                yoloPredict: detection.yolo_prediction,
                customSimilarity: detection.custom_similarity
            }));
            
            console.log(`Enhanced API returned ${predictions.length} detections`);
            
            // Enhanced logging with custom label info
            if (predictions.length > 0) {
                console.log('Detection details:');
                predictions.forEach((pred, i) => {
                    const source = pred.isCustomLabel ? 'CUSTOM' : 'AI';
                    const objectInfo = pred.objectName !== `${pred.label}_object` ? ` (${pred.objectName})` : '';
                    console.log(`  ${i+1}. ${source} ${pred.label}${objectInfo}: ${Math.round(pred.score * 100)}%`);
                    
                    if (pred.customSimilarity) {
                        console.log(`      Custom match similarity: ${Math.round(pred.customSimilarity * 100)}%`);
                    }
                });
            } else {
                console.log('No detections returned from Enhanced API');
            }
            
            return predictions;
        } else {
            console.error('Enhanced API prediction failed:', result.error);
            throw new Error(result.error || 'Enhanced prediction failed');
        }
        
    } catch (error) {
        console.error('Enhanced API inference error:', error);
        return []; // Return empty array on error
    }
}

// New function to get custom labels
export async function getCustomLabels() {
    try {
        const response = await fetch('http://localhost:5000/custom-labels');
        if (!response.ok) {
            throw new Error('Failed to fetch custom labels');
        }
        
        const result = await response.json();
        console.log('Custom labels loaded:', result);
        
        return result;
    } catch (error) {
        console.error('Error fetching custom labels:', error);
        return { total: 0, organic: [], recyclable: [] };
    }
}

// New function to add custom label from frontend
export async function addCustomLabel(imageData, bbox, label, objectName) {
    try {
        const response = await fetch('http://localhost:5000/add-custom-label', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: imageData,
                bbox: bbox,
                label: label,
                object_name: objectName
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to add custom label');
        }
        
        const result = await response.json();
        console.log('Custom label added:', result);
        
        return result;
    } catch (error) {
        console.error('Error adding custom label:', error);
        throw error;
    }
}

// New function to remove custom label
export async function removeCustomLabel(objectId) {
    try {
        const response = await fetch('http://localhost:5000/remove-custom-label', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                object_id: objectId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to remove custom label');
        }
        
        const result = await response.json();
        console.log('Custom label removed:', result);
        
        return result;
    } catch (error) {
        console.error('Error removing custom label:', error);
        throw error;
    }
}