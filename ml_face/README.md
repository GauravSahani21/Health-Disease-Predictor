# Face Acne Detection Service

AI-powered facial skin condition analysis service for detecting acne, pimples, blackheads, dark spots, and other skin conditions.

## Features

- Multi-label skin condition detection
- Conditions: Acne, Pimples, Blackheads, Dark Spots, Redness, Clear Skin
- Severity grading (clear, mild, moderate, severe)
- Doctor visit recommendations with reasoning
- Treatment suggestions:
  - Over-the-counter medicines
  - Skincare routines (morning, evening, weekly)
  - Dietary advice
  - Lifestyle recommendations

## Model Architecture

- **Base Model**: MobileNetV2 (fast inference for real-time use)
- **Input**: 224x224 RGB facial images
- **Output**: Multi-label probabilities for skin conditions
- **Training**: ~50 epochs on facial skin condition dataset

## Dataset

This model requires training on facial skin condition datasets. Suggested sources:

- [Acne Severity Grading Dataset (Kaggle)](https://www.kaggle.com/datasets/rutviklathiyatruptiinfotech/acne-grading-classifcation-using-deep-learning)
- Organize as: `data/train/condition_name/*.jpg`

Classes typically include:
- Acne
- Pimples
- Blackheads
- Dark Spots
- Redness
- Clear Skin

## Training

```bash
# Install dependencies
pip install -r requirements.txt

# Download and prepare dataset
# Organize in data/train/ and data/val/ directories

# Train model (multi-label classification)
python train_model.py --epochs 50 --batch-size 32 --multi-label

# Model will be saved to models/face_model/
```

## Running the Service

### Development
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8004 --reload
```

### Docker
```bash
docker build -t face-acne-service .
docker run -p 8004:8004 face-acne-service
```

## API Endpoints

### POST /infer
Upload a facial image for skin condition analysis.

**Request:**
- `image`: Facial image file (clear, well-lit, makeup-free recommended)
- `age` (optional): User age
- `sex` (optional): User sex

**Response:**
```json
{
  "conditions": [
    {
      "condition": "Acne",
      "severity": "moderate",
      "score": 0.68,
      "affected_areas": ["T-zone", "cheeks"]
    }
  ],
  "overall_severity": "moderate",
  "should_see_doctor": true,
  "doctor_recommendation_reason": "Moderate skin condition...",
  "treatments": [
    {
      "category": "Over-the-Counter Medicines",
      "recommendations": [
        "Benzoyl Peroxide 2.5% - 5%",
        "Salicylic Acid 2% cleanser"
      ]
    }
  ],
  "skincare_routine": {
    "Morning": ["Gentle cleanser", "Sunscreen SPF 50+"],
    "Evening": ["Cleanser", "Treatment", "Moisturizer"]
  },
  "dietary_advice": [
    "Drink 8-10 glasses of water daily",
    "Reduce dairy intake"
  ],
  "processing_time_ms": 187.3,
  "model_version": "0.1.0-face"
}
```

### GET /health
Health check endpoint.

### GET /
Service information.

## Best Practices for Image Capture

For accurate results:
- Use good, natural lighting
- Face camera directly
- Clean, makeup-free face recommended
- High-resolution image
- Neutral facial expression

## Medical Disclaimer

⚠️ This tool provides informational guidance only and is not a professional dermatological diagnosis. For severe or persistent skin conditions, infections, or concerning symptoms, please consult a qualified dermatologist. Recommendations are for general skincare only.

## Model Performance

Target metrics (on validation set):
- **Accuracy**: >80%
- **Precision**: >75% per class
- **Recall**: >75% per class

*Note: Actual performance depends on dataset quality and diversity.*
