# Brain MRI Analysis Service

This service provides deep learning-based analysis of brain MRI and X-ray images to detect potential brain diseases.

## Features

- Multi-class brain disease classification
- Disease detection: Tumors, Stroke, Hemorrhage, Normal scans
- Severity assessment (minor, moderate, severe, critical)
- Medical recommendations and urgency assessment
- Grad-CAM heatmap visualization (planned)

## Model Architecture

- **Base Model**: EfficientNet-B1 (transfer learning)
- **Input**: 224x224 RGB images
- **Output**: Disease probabilities with confidence scores
- **Training**: ~50 epochs on brain MRI dataset

## Dataset

This model requires training on brain MRI datasets. Suggested sources:

- [Brain Tumor MRI Dataset (Kaggle)](https://www.kaggle.com/datasets/masoudnickparvar/brain-tumor-mri-dataset)
- Organize as: `data/train/class_name/*.jpg`

Classes typically include:
- Glioma
- Meningioma
- Pituitary Tumor
- No Tumor / Normal

## Training

```bash
# Install dependencies
pip install -r requirements.txt

# Download and prepare dataset
# Organize in data/train/ and data/val/ directories

# Train model
python train_model.py --epochs 50 --batch-size 32 --data-dir ./data/train

# Model will be saved to models/brain_model/
```

## Running the Service

### Development
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
```

### Docker
```bash
docker build -t brain-mri-service .
docker run -p 8003:8003 brain-mri-service
```

## API Endpoints

### POST /infer
Upload a brain MRI image for analysis.

**Request:**
- `image`: Brain MRI/X-ray image file
- `age` (optional): Patient age
- `sex` (optional): Patient sex

**Response:**
```json
{
  "predictions": [
    {
      "disease": "Glioma",
      "score": 0.85,
      "description": "Potential glioma..."
    }
  ],
  "severity": "severe",
  "explanation": "Analysis detected patterns...",
  "recommendations": "This scan shows concerning findings...",
  "should_see_doctor": true,
  "urgency_level": "urgent",
  "heatmap_url": null,
  "processing_time_ms": 234.5,
  "model_version": "0.1.0-brain"
}
```

### GET /health
Health check endpoint.

### GET /
Service information.

## Medical Disclaimer

⚠️ This tool provides informational guidance only and is not a medical diagnosis. For emergencies (severe headache, loss of consciousness, seizures, stroke symptoms), call emergency services immediately. All predictions must be confirmed by qualified healthcare professionals.

## Model Performance

Target metrics (on validation set):
- **Accuracy**: >85%
- **Sensitivity**: >80% for severe conditions
- **Specificity**: >85%

*Note: Actual performance depends on dataset quality and size.*
