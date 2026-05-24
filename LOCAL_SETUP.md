# Health Disease Predictor - Local Setup Guide (No Docker)

## 🎯 Quick Start

This guide helps you run the Health Disease Predictor system locally **without Docker**.

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- **MongoDB Atlas** account (cloud database)
- **Google AI API Key**: `AIzaSyDh84MdWSnLuQ2niphbZXhNDzwMFm49Qz0`

---

## 📦 One-Time Setup

### Step 1: Stop Docker (if running)

```bash
cd /Users/gauravsahani/Desktop/1ST_mini_project
docker-compose -f docker-compose.dev.yml down
```

### Step 2: Setup ML Services

Run the setup script to create virtual environments and install dependencies for all ML services:

```bash
./setup_ml_services.sh
```

This will:
- Create Python virtual environments for each ML service
- Install all required packages
- Configure Google AI API key

**Time:** ~5-10 minutes (depending on internet speed)

### Step 3: Configure Backend Environment

The backend `.env` file has been automatically updated with localhost URLs. Verify it:

```bash
cat backend/.env | grep ML_URL
```

Should show:
```
TEXT_ML_URL=http://localhost:8001
IMAGE_ML_URL=http://localhost:8002
BRAIN_ML_URL=http://localhost:8003
FACE_ML_URL=http://localhost:8004
```

### Step 4: Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### Step 5: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

✅ **Setup complete!** You're ready to run the system.

---

## 🚀 Running the System

You'll need **6 terminal windows** to run all services:

### Terminal 1: Backend (Required)

```bash
./start_backend.sh
```

**URL:** http://localhost:5000  
**Status:** Wait for "Server running on port 5000"

### Terminal 2: Frontend (Required)

```bash
./start_frontend.sh
```

**URL:** http://localhost:3000  
**Status:** Wait for "Local: http://localhost:3000"

### Terminal 3: ML Text Service (Required)

```bash
./start_ml_text.sh
```

**URL:** http://localhost:8001  
**Status:** Wait for "Application startup complete"

### Terminal 4: ML Face Service (Required)

```bash
./start_ml_face.sh
```

**URL:** http://localhost:8004  
**Status:** Wait for "Application startup complete"

### Terminal 5: ML Brain Service (Required)

```bash
./start_ml_brain.sh
```

**URL:** http://localhost:8003  
**Status:** Wait for "Application startup complete"

### Terminal 6: ML Image Service (Optional)

```bash
./start_ml_image.sh
```

**URL:** http://localhost:8002  
**Status:** Wait for "Application startup complete"

---

## ✅ Verify Everything is Running

### Quick Health Check

Open these URLs in your browser:

1. **Frontend:** http://localhost:3000 → Should show the app
2. **Backend API:** http://localhost:5000/health → Should return `{"status":"ok"}`
3. **ML Text:** http://localhost:8001/health → Should return AI status
4. **ML Face:** http://localhost:8004/health → Should return AI status
5. **ML Brain:** http://localhost:8003/health → Should return AI status

### Test the Features

1. **Symptom Analysis:** http://localhost:3000/predict-text
   - Enter: "I have fever and sore throat"
   - Should get AI predictions with health advice

2. **Face Scan:** http://localhost:3000/face-scan
   - Upload a facial image
   - Should get AI skin health advice

3. **Brain Scan:** http://localhost:3000/brain-scan
   - Upload a brain MRI image
   - Should get AI neurological advice

---

## 🛑 Stopping Services

Press `Ctrl+C` in each terminal window to stop the services.

Or run this command to kill all services:

```bash
killall node python
```

---

## 🔧 Troubleshooting

### Backend won't start

**Error:** `Cannot find module`
```bash
cd backend
npm install
npm run dev
```

### Frontend won't start

**Error:** `Module not found`
```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

### ML Service won't start

**Error:** `ModuleNotFoundError: No module named 'google'`
```bash
cd ml_text  # or ml_face, ml_brain, ml_image
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### Google AI not working

**Error:** `GOOGLE_AI_API_KEY not set`

Make sure the API key is exported:
```bash
export GOOGLE_AI_API_KEY=AIzaSyDh84MdWSnLuQ2niphbZXhNDzwMFm49Qz0
```

Add to `.zshrc` or `.bashrc` for permanent setup:
```bash
echo 'export GOOGLE_AI_API_KEY=AIzaSyDh84MdWSnLuQ2niphbZXhNDzwMFm49Qz0' >> ~/.zshrc
source ~/.zshrc
```

### Port already in use

```bash
# Find and kill the process using the port
lsof -ti:5000 | xargs kill  # Backend
lsof -ti:3000 | xargs kill  # Frontend
lsof -ti:8001 | xargs kill  # ML Text
lsof -ti:8004 | xargs kill  # ML Face
lsof -ti:8003 | xargs kill  # ML Brain
```

---

## 📁 Project Structure

```
1ST_mini_project/
├── backend/           → Node.js API (Port 5000)
├── frontend/          → React app (Port 3000)
├── ml_text/           → AI Symptom Analysis (Port 8001)
├── ml_face/           → AI Face Scan (Port 8004)
├── ml_brain/          → AI Brain Scan (Port 8003)
├── ml_image/          → ML Image Analysis (Port 8002)
├── start_backend.sh   → Start backend
├── start_frontend.sh  → Start frontend
├── start_ml_*.sh      → Start ML services
└── setup_ml_services.sh → One-time ML setup
```

---

## 🎉 Benefits of No Docker

✅ **Faster development** - No container rebuild times  
✅ **Easier debugging** - Direct access to logs and code  
✅ **Less resource usage** - No Docker overhead  
✅ **Better IDE integration** - Direct file access and IntelliSense  
✅ **Simpler onboarding** - Just `npm install` and `pip install`

---

## 💡 Tips

1. **Use tmux or screen** to manage multiple terminals easily
2. **Create aliases** for common commands in `.zshrc`:
   ```bash
   alias health-start="./start_backend.sh & ./start_frontend.sh"
   alias health-ml="./start_ml_text.sh & ./start_ml_face.sh & ./start_ml_brain.sh"
   ```
3. **Monitor logs** using `tail -f` on log files
4. **Auto-restart** services using `nodemon` (backend) and uvicorn's `--reload` (ML services)

---

## 📚 Next Steps

- Test all features thoroughly
- Add more health conditions to the AI
- Deploy to production (Vercel for frontend, Railway for backend + ML services)
- Set up CI/CD pipelines

**Enjoy your Docker-free development! 🚀**
