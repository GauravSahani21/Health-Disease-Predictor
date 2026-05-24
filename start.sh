#!/bin/bash

# Create logs directory
mkdir -p logs

echo "🚀 Starting all services in background..."
echo "📝 Logs will be saved to logs/ directory"

# Export Google AI API Key (New)
export GOOGLE_AI_API_KEY=AIzaSyDh84MdWSnLuQ2niphbZXhNDzwMFm49Qz0

# Start Backend
echo "Starting Backend (Port 5000)..."
cd backend || exit
nohup npm run dev < /dev/null > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo $BACKEND_PID > logs/backend.pid

# Start Frontend
echo "Starting Frontend (Port 3000)..."
cd frontend || exit
nohup npm run dev < /dev/null > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo $FRONTEND_PID > logs/frontend.pid


# Start ML Face
echo "Starting ML Face (Port 8004)..."
cd ml_face/app || exit
# Assuming main.py is in app/ and we need to run uvicorn from parent or app?
# start_ml_face.sh usually does: cd ml_face && uvicorn app.main:app
cd ../..
cd ml_face || exit
source venv/bin/activate
nohup uvicorn app.main:app --port 8004 < /dev/null > ../logs/ml_face.log 2>&1 &
FACE_PID=$!
echo $FACE_PID > ../logs/ml_face.pid
deactivate
cd ..

# Start ML Brain
echo "Starting ML Brain (Port 8003)..."
cd ml_brain || exit
source venv/bin/activate
nohup uvicorn app.main:app --port 8003 < /dev/null > ../logs/ml_brain.log 2>&1 &
BRAIN_PID=$!
echo $BRAIN_PID > ../logs/ml_brain.pid
deactivate
cd ..

# Start ML Image
echo "Starting ML Image (Port 8002)..."
cd ml_image || exit
source venv/bin/activate
nohup uvicorn app.main:app --port 8002 < /dev/null > ../logs/ml_image.log 2>&1 &
IMAGE_PID=$!
echo $IMAGE_PID > ../logs/ml_image.pid
deactivate
cd ..

# Start ML Text
echo "Starting ML Text (Port 8001)..."
cd ml_text || exit
source venv/bin/activate
nohup uvicorn app.main:app --port 8001 < /dev/null > ../logs/ml_text.log 2>&1 &
TEXT_PID=$!
echo $TEXT_PID > ../logs/ml_text.pid
deactivate
cd ..

echo ""
echo "✅ All services started!"
echo "-----------------------------------"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:5000"
echo "   ML Text:   http://localhost:8001"
echo "   ML Image:  http://localhost:8002"
echo "   ML Brain:  http://localhost:8003"
echo "   ML Face:   http://localhost:8004"
echo "-----------------------------------"
echo "Run './stop_all.sh' to stop services."
