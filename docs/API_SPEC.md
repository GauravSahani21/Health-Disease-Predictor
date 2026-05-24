# API Specification

> **Version**: 1.0.0  
> **Base URL**: `http://localhost:5000/api` (development)  
> **Authentication**: JWT Bearer Token

## Medical Disclaimer

All API responses include a `disclaimer` field:

```
"This tool provides informational guidance only and is not a medical diagnosis. For emergencies (chest pain, difficulty breathing, severe bleeding), call your local emergency services immediately. Predictions should be confirmed by a qualified healthcare professional."
```

---

## Authentication Endpoints

### Register User

**POST** `/api/auth/register`

Register a new user account.

**Request Body**:
```json
{
  "name": "Gaurav Sahani",
  "email": "gaurav@example.com",
  "password": "StrongPass123"
}
```

**Validation Rules**:
- `name`: Required, string, 2-100 characters
- `email`: Required, valid email format, must be unique
- `password`: Required, min 8 characters, must contain uppercase, lowercase, and number

**Success Response** (201 Created):
```json
{
  "message": "User registered successfully",
  "userId": "64abc123def456789",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "64abc123def456789",
    "name": "Gaurav Sahani",
    "email": "gaurav@example.com"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation failed
- `409 Conflict`: Email already exists

### Login User

**POST** `/api/auth/login`

Authenticate and get JWT token.

**Request Body**:
```json
{
  "email": "gaurav@example.com",
  "password": "StrongPass123"
}
```

**Success Response** (200 OK):
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "64abc123def456789",
    "name": "Gaurav Sahani",
    "email": "gaurav@example.com",
    "role": "user"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation failed
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account inactive

### Get Current User

**GET** `/api/auth/me`

Get current user profile (requires authentication).

**Headers**:
```
Authorization: Bearer <token>
```

**Success Response** (200 OK):
```json
{
  "user": {
    "id": "64abc123def456789",
    "name": "Gaurav Sahani",
    "email": "gaurav@example.com",
    "role": "user",
    "createdAt": "2026-01-01T10:00:00.000Z",
    "lastLogin": "2026-01-09T10:00:00.000Z"
  }
}
```

---

## Prediction Endpoints

### Text-Based Prediction

**POST** `/api/predict/text`

Analyze symptoms and lab reports to predict possible medical conditions.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "text": "I have had fever for 3 days, sore throat, low appetite, feeling very tired",
  "age": 29,
  "sex": "male",
  "reports": [
    {
      "name": "hemoglobin",
      "value": 9.2,
      "unit": "g/dL"
    },
    {
      "name": "WBC",
      "value": 12000,
      "unit": "/µL"
    }
  ]
}
```

**Field Descriptions**:
- `text` (required): Free-text description of symptoms
- `age` (optional): Patient age (0-150)
- `sex` (optional): "male", "female", or "other"
- `reports` (optional): Array of lab test results
  - `name`: Test name
  - `value`: Numeric value
  - `unit`: Unit of measurement

**Success Response** (200 OK):
```json
{
  "predictions": [
    {
      "condition": "Iron deficiency anemia",
      "score": 0.78,
      "evidence": [
        "low hemoglobin: 9.2 g/dL",
        "fatigue",
        "low appetite"
      ]
    },
    {
      "condition": "Viral pharyngitis",
      "score": 0.43,
      "evidence": [
        "sore throat",
        "fever"
      ]
    }
  ],
  "severity": "moderate",
  "advice": "Visit primary care for CBC retest and iron studies. Increase iron-rich foods (spinach, red meat, beans). If fever persists beyond 5 days or worsens, seek immediate care.",
  "disclaimer": "This tool provides informational guidance only..."
}
```

**Response Fields**:
- `predictions`: Array of predicted conditions (sorted by confidence)
  - `condition`: Name of the condition
  - `score`: Confidence score (0.0-1.0)
  - `evidence`: Supporting evidence from input
- `severity`: One of "minor", "moderate", "severe"
- `advice`: Actionable medical advice
- `disclaimer`: Medical disclaimer text

**Error Responses**:
- `400 Bad Request`: Validation failed
- `401 Unauthorized`: Missing or invalid token
- `503 Service Unavailable`: ML service down

### Image-Based Prediction

**POST** `/api/predict/image`

Analyze skin condition image to predict dermatological conditions.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body** (multipart/form-data):
```
image: <binary file data>
age: 35 (optional)
sex: male (optional)
```

**File Requirements**:
- Accepted types: JPEG, PNG, WebP
- Max size: 10MB
- Recommended: Good lighting, clear focus, close-up of affected area

**Success Response** (200 OK):
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
    },
    {
      "condition": "Contact dermatitis",
      "score": 0.03
    }
  ],
  "severity": "minor",
  "explanation": "Model identified ring-shaped lesion characteristic of fungal infection. Heatmap shows focus on lesion boundary.",
  "advice": "Apply topical antifungal cream (clotrimazole 1% or miconazole 2%) twice daily for 2-4 weeks. Keep area clean and dry. If infection spreads or doesn't improve within 2 weeks, consult a dermatologist.",
  "heatmap_url": "https://s3.amazonaws.com/health-images/heatmaps/abc123.png",
  "disclaimer": "This tool provides informational guidance only..."
}
```

**Response Fields**:
- `predictions`: Array of predicted conditions
- `severity`: "minor", "moderate", or "severe"
- `explanation`: Human-readable explanation of model's analysis
- `advice`: Treatment recommendations
- `heatmap_url`: URL to Grad-CAM heatmap visualization
- `disclaimer`: Medical disclaimer

**Error Responses**:
- `400 Bad Request`: Invalid file or validation failed
- `401 Unauthorized`: Missing or invalid token
- `503 Service Unavailable`: ML service down

---

## History Endpoints

### Get Prediction History

**GET** `/api/history`

Retrieve user's past predictions with pagination and filtering.

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `type` (optional): Filter by "text" or "image"
- `severity` (optional): Filter by "minor", "moderate", or "severe"
- `limit` (optional): Number of results per page (default: 20)
- `skip` (optional): Number of results to skip (default: 0)

**Example**:
```
GET /api/history?type=text&severity=moderate&limit=10&skip=0
```

**Success Response** (200 OK):
```json
{
  "queries": [
    {
      "_id": "64abc123def456789",
      "userId": "64abc123def456788",
      "type": "text",
      "input": {
        "text": "I have had fever for 3 days...",
        "age": 29,
        "sex": "male",
        "reports": [...]
      },
      "modelOutput": [...],
      "severity": "moderate",
      "advice": "Visit primary care...",
      "createdAt": "2026-01-09T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 10,
    "skip": 0,
    "hasMore": true
  }
}
```

### Get Query Statistics

**GET** `/api/history/stats`

Get user's query statistics.

**Headers**:
```
Authorization: Bearer <token>
```

**Success Response** (200 OK):
```json
{
  "queryTypes": [
    {
      "_id": "text",
      "count": 25,
      "avgProcessingTime": 1250.5
    },
    {
      "_id": "image",
      "count": 20,
      "avgProcessingTime": 2100.3
    }
  ],
  "severityBreakdown": [
    {
      "_id": "minor",
      "count": 30
    },
    {
      "_id": "moderate",
      "count": 12
    },
    {
      "_id": "severe",
      "count": 3
    }
  ]
}
```

### Get Query Details

**GET** `/api/history/:id`

Get detailed information for a specific query.

**Headers**:
```
Authorization: Bearer <token>
```

**Success Response** (200 OK):
```json
{
  "query": {
    "_id": "64abc123def456789",
    "userId": "64abc123def456788",
    "type": "text",
    "input": {...},
    "modelOutput": [...],
    "severity": "moderate",
    "advice": "...",
    "resources": {
      "heatmapUrl": null,
      "imageUrl": null
    },
    "metadata": {
      "processingTime": 1250,
      "modelVersion": "0.1.0",
      "backendVersion": "1.0.0"
    },
    "createdAt": "2026-01-09T10:00:00.000Z"
  }
}
```

**Error Responses**:
- `404 Not Found`: Query not found

### Delete Query

**DELETE** `/api/history/:id`

Delete a query (right-to-be-forgotten).

**Headers**:
```
Authorization: Bearer <token>
```

**Success Response** (200 OK):
```json
{
  "message": "Query deleted successfully",
  "deletedId": "64abc123def456789"
}
```

**Error Responses**:
- `404 Not Found`: Query not found

---

## Error Response Format

All errors follow this consistent format:

```json
{
  "error": true,
  "message": "Human-readable error message",
  "details": ["Optional array of specific validation errors"]
}
```

### Common HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid input or validation failed
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions or invalid token
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: ML service unavailable

---

## Rate Limiting

- General API: **100 requests per 15 minutes** per IP
- Prediction endpoints: **20 requests per 15 minutes** per IP

When rate limit is exceeded:
```json
{
  "error": true,
  "message": "Too many requests from this IP, please try again later."
}
```

---

## Testing the API

### Using cURL

**Register**:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Gaurav","email":"gaurav@example.com","password":"Test123456"}'
```

**Login**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gaurav@example.com","password":"Test123456"}'
```

**Text Prediction**:
```bash
curl -X POST http://localhost:5000/api/predict/text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I have fever and sore throat",
    "age": 30,
    "reports": [{"name":"hemoglobin","value":12.5,"unit":"g/dL"}]
  }'
```

**Image Prediction**:
```bash
curl -X POST http://localhost:5000/api/predict/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/skin-photo.jpg" \
  -F "age=35"
```

### Interactive Documentation

Once the server is running, visit:
- Backend API: `http://localhost:5000/` (API info)
- Text ML Service: `http://localhost:8001/docs` (Swagger UI)
- Image ML Service: `http://localhost:8002/docs` (Swagger UI)

---

## Notes for Developers

1. **Severity Thresholds**: All numeric thresholds in severity computation are examples. Require medical professional validation before production.

2. **ML Model Versions**: Track model versions in responses to enable A/B testing and rollback.

3. **Async Processing**: For production, consider making predictions asynchronous with webhook callbacks for long-running inferences.

4. **Caching**: Implement Redis caching for repeated queries to reduce ML service load.

5. **Monitoring**: Log all prediction requests/responses for audit trail and model improvement.
