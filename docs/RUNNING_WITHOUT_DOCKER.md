# Running Without Docker - Quick Start Guide

Since Docker is not installed, you can run individual services manually for development and testing.

## Prerequisites

- Node.js 16+ (for backend and frontend)
- Python 3.9+ (for ML services)
- MongoDB (can use MongoDB Atlas free tier)

## Option 1: Install Docker Desktop (Recommended)

1. **Download Docker Desktop for Mac**:
   - Visit: https://www.docker.com/products/docker-desktop
   - Download the Mac version (Apple Silicon or Intel)
   - Install and start Docker Desktop

2. **After installation, run**:
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

## Option 2: Run Services Manually (Without Docker)

### 1. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and set:
# MONGODB_URI=mongodb://localhost:27017/health_predictor
# Or use MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/health_predictor
# JWT_SECRET=your-super-secret-key-here
# TEXT_ML_URL=http://localhost:8001
# IMAGE_ML_URL=http://localhost:8002
# S3_ENDPOINT=http://localhost:9000  # Optional, for image uploads
# S3_BUCKET=health-images
# FRONTEND_URL=http://localhost:3000

# Run backend
npm run dev
```

Backend will be at: http://localhost:5000

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Run frontend
npm run dev
```

Frontend will be at: http://localhost:3000

### 3. Setup Text ML Service

```bash
cd ml_text

# Create virtual environment (if not exists)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run service
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Text ML API will be at: http://localhost:8001

### 4. Setup Image ML Service

```bash
cd ml_image

# Create virtual environment (if not exists)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run service
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

Image ML API will be at: http://localhost:8002

### 5. MongoDB Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Option B: MongoDB Atlas (Free Cloud)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a free cluster
4. Get connection string
5. Use in backend .env file

## Testing the Application

1. Start all services in separate terminal windows
2. Visit http://localhost:3000
3. Register a new user
4. Try text prediction or image prediction
5. View history

## Minimal Setup (Just Backend + Frontend)

If you only want to test the UI without ML:

1. **Backend**: Follow step 1 above
   - The ML endpoints will return dummy data if ML services are down
   
2. **Frontend**: Follow step 2 above

3. **MongoDB**: Use MongoDB Atlas (free tier)

This gives you a working demo without needing Docker or ML services!

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or for other ports
lsof -ti:3000 | xargs kill -9
lsof -ti:8001 | xargs kill -9
```

### MongoDB Connection Issues
- Check MongoDB is running: `brew services list`
- Or use MongoDB Atlas connection string

### ML Service Issues
- Make sure virtual environment is activated
- Check trained models exist in ml_text/models and ml_image/models
- Models were already trained earlier

## Quick Test Script

```bash
#!/bin/bash

# Start backend in background
cd backend && npm run dev &
BACKEND_PID=$!

# Start frontend in background
cd../frontend && npm run dev &
FRONTEND_PID=$!

echo "Services started!"
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
```

Save this as `scripts/run-local.sh` and run with:
```bash
chmod +x scripts/run-local.sh
./scripts/run-local.sh
```
