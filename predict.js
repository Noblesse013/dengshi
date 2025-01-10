'use client';

import { useState } from 'react';
import * as mobilenet from '@tensorflow-models/mobilenet';

export default function Predict() {
    const [image, setImage] = useState(null);
    const [predictions, setPredictions] = useState([]);

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        const imageUrl = URL.createObjectURL(file);
        setImage(imageUrl);

        // Load the MobileNet model
        const model = await mobilenet.load();
        console.log('Model loaded successfully!');

        // Create an image element for prediction
        const img = new Image();
        img.src = imageUrl;
        img.onload = async () => {
            const preds = await model.classify(img);
            console.log('Predictions:', preds);
            setPredictions(preds);
        };
    };

    return (
        <div>
            <h1>Upload an Image</h1>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            {image && <img src={image} alt="Uploaded Preview" width={300} />}
            {predictions.length > 0 && (
                <div>
                    <h3>Predictions:</h3>
                    <ul>
                        {predictions.map((pred, index) => (
                            <li key={index}>
                                {pred.className}: {(pred.probability * 100).toFixed(2)}%
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

