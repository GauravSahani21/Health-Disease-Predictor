# Health Disease Predictor & Advisor System

> **⚠️ MEDICAL DISCLAIMER**: This tool provides informational guidance only and is not a medical diagnosis. For emergencies (chest pain, difficulty breathing, severe bleeding), call your local emergency services immediately. Predictions should be confirmed by a qualified healthcare professional.

## Overview

A comprehensive health analysis platform combining **MERN stack** (MongoDB, Express, React, Node.js) with two ML services:

1. **Text & Report NLP Model** - Analyzes symptoms and lab values to predict possible conditions
2. **Skin-image Vision Model** - Analyzes skin images to identify possible dermatological conditions

## Repository Structure

```
/
├── frontend/          # React + Tailwind UI
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── public/
│   └── package.json
│
├── backend/           # Node.js + Express API
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── services/
│   ├── utils/
│   └── server.js
│
├── ml_text/          # Text/NLP ML Service
│   ├── notebooks/    # Jupyter notebooks for training
│   ├── models/       # Saved model artifacts
│   ├── app/          # FastAPI service
│   └── requirements.txt
│
├── ml_image/         # Image/Vision ML Service
│   ├── notebooks/    # Jupyter notebooks for training
│   ├── models/       # Saved model artifacts
│   ├── app/          # FastAPI service
│   └── requirements.txt
│
├── infra/            # Infrastructure & deployment
│   ├── docker/
│   ├── k8s/
│   └── ci-cd/
│
└── docker-compose.dev.yml
```

## Quick Start (Local Development)

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend dev)
- Python 3.9+ (for ML notebooks)

### Run All Services

```bash
# Clone the repository
git clone <repo-url>
cd health-predictor

# Start all services with Docker Compose
docker-compose -f docker-compose.dev.yml up --build

# Services will be available at:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:5000
# - Text ML Service: http://localhost:8001
# - Image ML Service: http://localhost:8002
# - MongoDB: localhost:27017
# - MinIO (S3): http://localhost:9000
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Backend
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://mongo:27017/health_predictor
JWT_SECRET=your_jwt_secret_change_this_in_production
JWT_EXPIRES_IN=3600

# ML Services
TEXT_ML_URL=http://ml_text:8001
IMAGE_ML_URL=http://ml_image:8002

# S3 Storage (MinIO for local dev)
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=health-images
S3_REGION=us-east-1

# CORS
FRONTEND_URL=http://localhost:3000
```

Create `.env` files in `ml_text/app` and `ml_image/app`:

```env
MODEL_PATH=/app/models/model.pkl
LOG_LEVEL=INFO
```

### Individual Service Development

#### Frontend Only
```bash
cd frontend
npm install
npm run dev
```

#### Backend Only
```bash
cd backend
npm install
npm run dev
```

#### ML Services
```bash
cd ml_text/app  # or ml_image/app
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

## Architecture Overview

```
┌─────────────┐
│   React     │
│  Frontend   │
└──────┬──────┘
       │ HTTPS/JWT
       ▼
┌─────────────────────────────────────┐
│      Node.js/Express Backend        │
│  ┌──────────────────────────────┐   │
│  │  Auth, Validation, Routing   │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │   MongoDB (Mongoose ODM)     │   │
│  └──────────────────────────────┘   │
└────┬────────────────────┬───────────┘
     │                    │
     │ REST API           │ REST API
     ▼                    ▼
┌──────────┐         ┌──────────┐
│ Text ML  │         │ Image ML │
│ Service  │         │ Service  │
│ (FastAPI)│         │ (FastAPI)│
└──────────┘         └──────────┘
     │                    │
     └────────┬───────────┘
              ▼
         ┌─────────┐
         │   S3    │
         │ Storage │
         └─────────┘
```

### Component Responsibilities

- **Frontend**: User interaction, auth, form validation, result visualization
- **Backend**: API gateway, authentication, business logic, database operations, ML orchestration
- **ML Services**: Model inference, explainability (SHAP, Grad-CAM), prediction confidence
- **MongoDB**: User data, query history, predictions
- **S3/MinIO**: Image storage, heatmap storage

## API Documentation

See [API_SPEC.md](./docs/API_SPEC.md) for complete endpoint documentation.

### Key Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/predict/text` - Text-based prediction
- `POST /api/predict/image` - Image-based prediction
- `GET /api/history` - User prediction history

## Security Features

- ✅ JWT-based authentication with refresh tokens
- ✅ Bcrypt password hashing
- ✅ Input validation and sanitization
- ✅ File upload validation (size, type, virus scan ready)
- ✅ HTTPS enforcement (production)
- ✅ CORS protection
- ✅ Rate limiting
- ✅ Audit logging for predictions
- ✅ S3 signed URLs with expiration

## ML Models

### Text Model (Symptoms + Lab Reports)
- **Architecture**: DistilBERT fine-tuned for multi-label classification
- **Input**: Concatenated text (symptoms) + structured lab values
- **Output**: Ranked predictions with confidence scores, severity, evidence
- **Explainability**: SHAP values, attention weights

### Image Model (Skin Conditions)
- **Architecture**: EfficientNet-B0 with transfer learning
- **Input**: 224x224 RGB images
- **Output**: Condition predictions with confidence, Grad-CAM heatmap
- **Explainability**: Grad-CAM visualization overlay

See individual ML service READMEs for training details:
- [Text ML README](./ml_text/README.md)
- [Image ML README](./ml_image/README.md)

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# ML service tests
cd ml_text/app
pytest

cd ml_image/app
pytest
```

## Deployment

### Docker Build
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Push to registry
docker-compose -f docker-compose.prod.yml push
```

### Kubernetes
```bash
# Apply K8s manifests
kubectl apply -f infra/k8s/
```

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment instructions.

## CI/CD

GitHub Actions workflow automatically:
- Runs linting and tests on PRs
- Builds Docker images on merge to main
- Deploys to staging environment

See [.github/workflows/ci-cd.yml](./.github/workflows/ci-cd.yml)

## Monitoring & Observability

- **Logs**: Centralized logging (ELK/hosted)
- **Metrics**: Request latency, ML inference time, error rates
- **Alerts**: Service health, error thresholds, performance degradation

## Development Roadmap

- [x] Phase 0: Project bootstrap
- [ ] Phase 1: API & DB design
- [ ] Phase 2: ML prototyping
- [ ] Phase 3: Integration
- [ ] Phase 4: Frontend development
- [ ] Phase 5: Testing, CI/CD, deployment

## Important Notes

⚠️ **Severity Thresholds**: All numeric thresholds for lab values and severity classification are examples only and require validation by qualified medical professionals before production use.

⚠️ **Model Bias**: ML models may exhibit bias across different demographics, skin tones, and populations. Always recommend clinical confirmation.

⚠️ **Data Privacy**: Ensure HIPAA/GDPR compliance before handling real patient data. Current implementation is for demonstration purposes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Add tests for new functionality
5. Submit a pull request

## License

[Specify License - e.g., MIT, Apache 2.0]

## Support

For issues and questions, please open a GitHub issue or contact the development team.

---

**Remember**: This is a demonstration system. All predictions must be validated by healthcare professionals.
