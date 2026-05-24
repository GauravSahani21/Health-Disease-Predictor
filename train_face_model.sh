#!/bin/bash
# Script to retrain the Face Acne Detection Model properly
# Run this if you want to improve the model accuracy

echo "🚀 Starting Face Model Training..."
echo "This will take approximately 10-15 minutes depending on your computer speed."

cd ml_face

# Check for venv
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Install dependencies
echo "📦 Installing/Verifying dependencies..."
pip install -r requirements.txt
pip install matplotlib tqdm

# Run training
# You can change --epochs 20 to a higher number for better accuracy, or lower for speed
echo "🧠 Training model (10 epochs)..."
python train_face.py --epochs 10

echo "✅ Training Complete!"
echo "🔄 Restarting ML Face Service..."

# Kill existing service
pkill -f "uvicorn app.main:app --host 0.0.0.0 --port 8004"

# Start new service
cd ..
./start_ml_face.sh
