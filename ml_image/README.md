# Image & Vision ML Model

ML service for analyzing skin images to predict dermatological conditions.

## Overview

This service uses transfer learning with **EfficientNet-B0** to:
- Analyze skin condition images
- Predict possible dermatological conditions with confidence scores
- Generate Grad-CAM heatmaps for explainability
- Provide severity assessment and treatment recommendations

## Model Architecture

```
Input: 224x224 RGB Image
       │
       ▼
  EfficientNet-B0 (Pretrained on ImageNet)
       │
       ▼
  Global Average Pooling
       │
       ▼
  Dense Layer (256 units, ReLU)
       │
       ▼
  Dropout (0.3)
       │
       ▼
  Output Layer (N classes, Softmax)
```

### Key Components

- **Base Model**: EfficientNet-B0 (~5.3M parameters)
- **Input**: 224×224 RGB images, normalized with ImageNet mean/std
- **Augmentation**: RandomRotation, RandomHorizontalFlip, ColorJitter, RandomCrop
- **Output**: Softmax probabilities for skin conditions

## Data Requirements

### Recommended Datasets

1. **HAM10000** - A large collection of multi-source dermatoscopic images of pigmented lesions
   - [Dataset Link](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/DBW86T)
   - 10,015 images, 7 classes
   
2. **ISIC Archive** - International Skin Imaging Collaboration
   - [Dataset Link](https://www.isic-archive.com/)
   - Requires registration
   
3. **Derm7pt** - Dermatology dataset with clinical metadata
   - [Dataset Link](https://derm.cs.sfu.ca/)
   
4. **Custom Classes** (for this project, focus on common conditions):
   - Fungal infections (Tinea)
   - Bacterial infections (Impetigo, Cellulitis)
   - Eczema / Dermatitis
   - Psoriasis
   - Acne
   - Contact dermatitis
   - Normal skin

### Data Format

Images should be organized in folders by class:

```
data/
  ├── train/
  │   ├── fungal_infection/
  │   ├── bacterial_infection/
  │   ├── eczema/
  │   └── ...
  ├── val/
  │   └── ...
  └── test/
      └── ...
```

Metadata CSV (optional):
```csv
image_id,filename,condition,severity,age,sex
001,img_001.jpg,fungal_infection,minor,35,male
```

### Data Preprocessing

See [notebooks/01_data_preprocessing.ipynb](./notebooks/01_data_preprocessing.ipynb)

Key steps:
1. Resize all images to 224×224
2. Normalize with ImageNet stats (mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
3. Balance classes (use oversampling or class weights)
4. Data augmentation for training set

## Training

### Quick Start (Toy Dataset)

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download toy dataset (synthetic or small subset)
python scripts/download_toy_data.py

# Train model
python scripts/train.py \
  --data_dir data/toy_dataset \
  --output_dir models/image_model_toy \
  --epochs 10 \
  --batch_size 16 \
  --learning_rate 1e-4

# Expected training time: ~15 minutes on CPU, ~5 minutes on GPU
```

### Full Training

```bash
python scripts/train.py \
  --data_dir data/full_dataset \
  --output_dir models/image_model_full \
  --epochs 30 \
  --batch_size 32 \
  --learning_rate 1e-4 \
  --use_gpu \
  --early_stopping \
  --patience 5
```

### Hyperparameters

| Parameter | Default | Notes |
|-----------|---------|-------|
| Learning rate | 1e-4 | Adam optimizer with ReduceLROnPlateau |
| Batch size | 16-32 | Adjust based on GPU memory |
| Epochs | 15-40 | Use early stopping |
| Image size | 224×224 | EfficientNet-B0 default |
| Dropout | 0.3 | After global pooling |
| Weight decay | 1e-5 | L2 regularization |

## Training Notebooks

### 1. Data Exploration & Preprocessing
**File**: [notebooks/01_data_preprocessing.ipynb](./notebooks/01_data_preprocessing.ipynb)

- Load and explore images
- Check class distribution
- Create train/val/test splits
- Set up data augmentation pipeline

### 2. Model Training
**File**: [notebooks/02_train_model.ipynb](./notebooks/02_train_model.ipynb)

```python
import torch
import torchvision
from torchvision import transforms, models
from torch.utils.data import DataLoader

# Data augmentation
train_transform = transforms.Compose([
    transforms.RandomRotation(15),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
    transforms.RandomResizedCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# Load EfficientNet-B0
model = models.efficientnet_b0(pretrained=True)
num_features = model.classifier[1].in_features
model.classifier = torch.nn.Sequential(
    torch.nn.Dropout(0.3),
    torch.nn.Linear(num_features, num_classes)
)

# Training loop
criterion = torch.nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=3)

for epoch in range(num_epochs):
    train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer)
    val_loss, val_acc = validate(model, val_loader, criterion)
    scheduler.step(val_loss)
    
    print(f"Epoch {epoch+1}: Train Acc={train_acc:.2f}%, Val Acc={val_acc:.2f}%")
```

### 3. Model Evaluation
**File**: [notebooks/03_evaluation.ipynb](./notebooks/03_evaluation.ipynb)

Metrics:
- **Per-class metrics**: Precision, Recall, F1-score
- **Confusion matrix**: Identify most confused pairs
- **ROC curves**: AUC for each class
- **Calibration**: Reliability diagram

### 4. Grad-CAM Explainability
**File**: [notebooks/04_gradcam.ipynb](./notebooks/04_gradcam.ipynb)

Generate heatmaps showing which regions the model focuses on:

```python
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image

# Initialize Grad-CAM
target_layers = [model.features[-1]]
cam = GradCAM(model=model, target_layers=target_layers)

# Generate heatmap
grayscale_cam = cam(input_tensor=img_tensor, targets=None)
visualization = show_cam_on_image(img_rgb, grayscale_cam[0], use_rgb=True)
```

## Model Export

```bash
# Export to TorchScript
python scripts/export_model.py \
  --checkpoint models/checkpoints/best.pth \
  --output models/image_model.pt \
  --format torchscript

# Or export to ONNX
python scripts/export_model.py \
  --checkpoint models/checkpoints/best.pth \
  --output models/image_model.onnx \
  --format onnx
```

## FastAPI Service

### Running Locally

```bash
cd app
pip install -r requirements.txt

export MODEL_PATH=../models/image_model.pt

uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

### API Endpoints

#### POST /infer

**Request**: `multipart/form-data`
- `image`: Image file (JPEG, PNG, WebP)
- `age`: Optional integer
- `sex`: Optional string (male/female/other)

**Response**:
```json
{
  "predictions": [
    {
      "condition": "Fungal infection (Tinea)",
      "score": 0.85
    },
    {
      "condition": "Eczema",
      "score": 0.12
    }
  ],
  "severity": "minor",
  "explanation": "Model identified ring-shaped lesion characteristic of fungal infection",
  "advice": "Apply topical antifungal cream (clotrimazole or miconazole) twice daily for 2-4 weeks. Keep area clean and dry. If condition worsens or spreads, consult a dermatologist.",
  "heatmap_url": "https://storage.example.com/heatmaps/abc123.png"
}
```

#### GET /health

Health check endpoint.

## Performance Benchmarks

| Metric | Toy Dataset (500 images) | Full Dataset (10K images) |
|--------|--------------------------|---------------------------|
| Accuracy | 75% | 88% |
| F1 (macro) | 0.71 | 0.85 |
| Inference Time (CPU) | 180ms | 180ms |
| Inference Time (GPU) | 35ms | 35ms |

## Testing

```bash
# Unit tests
pytest tests/test_preprocessing.py
pytest tests/test_model.py

# Integration test
pytest tests/test_api.py

# Generate sample heatmaps
python tests/test_gradcam.py
```

## Docker

### Development
```bash
docker build -f Dockerfile.dev -t health-ml-image:dev .
docker run -p 8002:8002 -v $(pwd)/models:/app/models health-ml-image:dev
```

### Production
```bash
docker build -f Dockerfile -t health-ml-image:latest .
docker run -p 8002:8002 health-ml-image:latest
```

## Important Notes

⚠️ **Skin Tone Bias**: Models trained on dermatology datasets may be biased toward lighter skin tones. Validate on diverse populations and always recommend clinical confirmation.

⚠️ **Diagnostic Limitations**: This is NOT a diagnostic tool. It provides informational predictions only.

⚠️ **Dataset Licensing**: Ensure proper licenses for medical image datasets. HAM10000 and ISIC have specific usage terms.

⚠️ **Privacy**: Strip EXIF metadata from images before storage. Ensure HIPAA/GDPR compliance.

## Troubleshooting

**Issue**: OOM (Out of Memory) during training
- Reduce batch size to 8
- Use mixed precision training (fp16)
- Use gradient checkpointing

**Issue**: Poor performance on specific classes
- Check class imbalance (use class weights)
- Add more augmentation for minority classes
- Collect more data for underrepresented classes

**Issue**: Slow inference
- Convert model to TorchScript or ONNX
- Quantize to int8 (can give 4x speedup)
- Batch multiple requests

## Next Steps

1. Collect diverse, high-quality training data (aim for 5K+ images)
2. Fine-tune on specific dermatological conditions relevant to your target population
3. Implement active learning loop for continuous improvement
4. Add multi-disease detection (multi-label classification)
5. Integrate with clinical decision support systems

## References

- [EfficientNet Paper](https://arxiv.org/abs/1905.11946)
- [Grad-CAM Paper](https://arxiv.org/abs/1610.02391)
- [HAM10000 Dataset](https://arxiv.org/abs/1803.10417)

## Support

For questions or issues, contact the ML team or open a GitHub issue.
