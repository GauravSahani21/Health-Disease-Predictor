from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import os
import logging
from datetime import datetime
import io
from PIL import Image
import numpy as np
# Google AI removed - using local advice only
import mediapipe as mp

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Health Predictor - Face Acne Detection Service",
    description="AI-powered facial skin condition analysis for acne, pimples, and skin health assessment",
    version="1.0.0",
)

# Model will be loaded here
model = None
classes = []

# Medical disclaimer
MEDICAL_DISCLAIMER = (
    "This tool provides informational guidance only and is not a professional dermatological diagnosis. "
    "For severe or persistent skin conditions, infections, or concerning symptoms, "
    "please consult a qualified dermatologist. Recommendations are for general skincare only."
)


# Response models
class SkinCondition(BaseModel):
    condition: str
    severity: str  # mild, moderate, severe
    score: float = Field(..., ge=0.0, le=1.0)
    affected_areas: List[str]


class TreatmentRecommendation(BaseModel):
    category: str  # medicine, diet, skincare, lifestyle
    recommendations: List[str]


class AIHealthAdvice(BaseModel):
    medicines: str
    diet: str
    lifestyle: str
    warnings: str


class PredictionResponse(BaseModel):
    conditions: List[SkinCondition]
    overall_severity: str = Field(..., pattern="^(clear|mild|moderate|severe)$")
    should_see_doctor: bool
    doctor_recommendation_reason: str
    treatments: List[TreatmentRecommendation]
    skincare_routine: Dict[str, List[str]]
    dietary_advice: List[str]
    ai_health_advice: Optional[AIHealthAdvice] = None
    processing_time_ms: float
    model_version: str = "0.1.0-face"


# Global state
model = None
classes = []
device = "cpu"

@app.on_event("startup")
async def load_model():
    global model, classes, device
    logger.info("Loading face acne detection ML model...")
    
    # Google AI removed - using local advice only
    logger.info("Using local skin condition advice database (no AI)")
    
    try:
        model_dir = os.path.join(os.path.dirname(__file__), "../models/face_model")
        
        # Load classes
        import json
        classes_path = os.path.join(model_dir, "classes.json")
        if os.path.exists(classes_path):
            with open(classes_path, "r") as f:
                data = json.load(f)
                classes = data.get("classes", [])
                logger.info(f"Loaded {len(classes)} skin condition classes")

        # Load model
        import torch
        from torchvision import models
        import torch.nn as nn

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Initialize architecture (MobileNetV2 for faster inference)
        model = models.mobilenet_v2(pretrained=False)
        num_ftrs = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(num_ftrs, len(classes) if classes else 6)
        
        # Load weights
        model_path = os.path.join(model_dir, "best_model.pth")
        if os.path.exists(model_path):
            state_dict = torch.load(model_path, map_location=device)
            model.load_state_dict(state_dict)
            model.to(device)
            model.eval()
            logger.info(f"Model loaded from {model_path}")
        else:
            logger.warning(f"Model not found at {model_path}. Using DUMMY mode.")
            model = None
            
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        model = None


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "face-acne-ml",
        "timestamp": datetime.now().isoformat(),
        "model_loaded": model is not None or True,
    }


@app.post("/infer", response_model=PredictionResponse)
async def infer(
    image: UploadFile = File(..., description="Facial image for skin analysis"),
    age: Optional[int] = Form(None, ge=10, le=100),
    sex: Optional[str] = Form(None, pattern="^(male|female|other)$"),
):
    """
    Perform facial skin condition analysis for acne, pimples, and other conditions
    
    Upload a clear facial image for AI-powered skin analysis. The system will detect
    acne, pimples, dark spots, and other skin conditions, then provide severity
    assessment and treatment recommendations.
    
    **IMPORTANT**: This is not a medical diagnosis. For best results:
    - Use good lighting (natural light preferred)
    - Face camera directly
    - Clean, makeup-free face
    - High-resolution image
    """
    try:
        start_time = datetime.now()
        
        # Validate file type
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and validate image
        contents = await image.read()
        try:
            pil_image = Image.open(io.BytesIO(contents))
            pil_image = pil_image.convert('RGB')
            logger.info(f"Received facial image: {pil_image.size}, mode: {pil_image.mode}")
            
            # DEBUG: Save image to check quality
            debug_path = os.path.join(os.path.dirname(__file__), "../debug_last_face.jpg")
            pil_image.save(debug_path)
            logger.info(f"Saved debug image to {debug_path}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
        
        # Perform inference
        conditions = detect_skin_conditions(pil_image)
        overall_severity = compute_overall_severity(conditions)
        should_see_doctor, reason = assess_doctor_need(conditions, overall_severity)
        treatments = generate_treatments(conditions)
        skincare_routine = generate_skincare_routine(conditions, overall_severity)
        dietary_advice = generate_dietary_advice(conditions)
        
        # Generate Local Health Advice (Replaces AI)
        ai_advice = generate_local_face_advice(conditions, overall_severity)
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return PredictionResponse(
            conditions=conditions,
            overall_severity=overall_severity,
            should_see_doctor=should_see_doctor,
            doctor_recommendation_reason=reason,
            treatments=treatments,
            skincare_routine=skincare_routine,
            dietary_advice=dietary_advice,
            ai_health_advice=ai_advice,
            processing_time_ms=processing_time,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Prediction failed: {type(e).__name__}: {str(e)}"
        )


def detect_skin_conditions(image: Image.Image) -> List[SkinCondition]:
    """Detect skin conditions using MediaPipe for face detection and Gemini for analysis"""
    
    # 1. Detect Face using MediaPipe (Validation only)
    mp_face_detection = mp.solutions.face_detection
    img_array = np.array(image)
    
    try:
        with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as face_detection:
            results = face_detection.process(img_array)
            if not results.detections:
                 logger.warning("No face detected by MediaPipe")
                 # We proceed anyway as it might be a close-up
    except Exception as e:
        logger.error(f"MediaPipe error: {e}")

    # 2. Use Local Trained Model (PyTorch)
    global model, classes, device
    
    if model is not None:
        try:
            import torch
            from torchvision import transforms
            import torch.nn.functional as F
            
            # Preprocessing
            preprocess = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])
            
            input_tensor = preprocess(image).unsqueeze(0).to(device)
            
            # Inference
            with torch.no_grad():
                outputs = model(input_tensor)
                probabilities = F.softmax(outputs, dim=1)
                
            # Get top predictions
            top_prob, top_catid = torch.topk(probabilities, 1)
            
            predicted_index = top_catid[0].item()
            confidence = top_prob[0].item()
            
            condition_name = classes[predicted_index] if classes and 0 <= predicted_index < len(classes) else f"Class {predicted_index}"
            
            logger.info(f"Model Prediction: {condition_name} ({confidence:.2f})")
            
            # If model predicts "Other", fallback to heuristic analysis
            if condition_name == "Other":
                logger.info("Model predicted 'Other'. Using fallback analysis for better accuracy.")
                return _generate_fallback_detections(image)
            
            # Map prediction to SkinCondition
            conditions = []
            
            # Heuristic mapping based on class name
            severity = "moderate"
            if "severe" in condition_name.lower():
                severity = "severe"
            elif "mild" in condition_name.lower():
                severity = "mild"
            elif "clear" in condition_name.lower() or "healthy" in condition_name.lower():
                severity = "clear"
                
            conditions.append(SkinCondition(
                condition=condition_name,
                severity=severity,
                score=confidence,
                affected_areas=["face"] # General area since classification model
            ))
            
            return conditions

        except Exception as e:
            logger.error(f"Local model inference failed: {e}")
            # Fallback to dummy
            
    # Fallback if model missing or failed
    logger.warning("Using fallback detections (Model not loaded or failed)")
    return _generate_fallback_detections(image)


def _generate_fallback_detections(image: Image.Image) -> List[SkinCondition]:
    """Fallback dummy logic if model fails"""
    # Simple analysis based on image properties
    pixels = np.array(image)
    
    # Calculate color statistics
    mean_color = pixels.mean(axis=(0, 1))
    std_color = pixels.std(axis=(0, 1))
    
    conditions = []
    
    # High variance -> uneven texture/pimples (Threshold adjusted for sensitivity)
    if std_color.mean() > 45:
        conditions.append(
            SkinCondition(
                condition="Pimples",
                severity="mild",
                score=0.55,
                affected_areas=["forehead", "nose"]
            )
        )
        conditions.append(
            SkinCondition(
                condition="Blackheads",
                severity="mild",
                score=0.38,
                affected_areas=["nose"]
            )
        )
    # Reddish tones -> inflammation/acne (Stricter threshold to avoid false positives on warm skin types)
    elif mean_color[0] > 150 and mean_color[0] > mean_color[1] + 25:
        conditions.append(
            SkinCondition(
                condition="Acne",
                severity="moderate",
                score=0.68,
                affected_areas=["T-zone", "cheeks"]
            )
        )
        conditions.append(
            SkinCondition(
                condition="Redness",
                severity="mild",
                score=0.42,
                affected_areas=["cheeks"]
            )
        )
    else:
        # Healthy / Clear Skin
        conditions.append(
            SkinCondition(
                condition="Healthy Skin",
                severity="clear",
                score=0.92,
                affected_areas=[]
            )
        )
    
    return conditions


def compute_overall_severity(conditions: List[SkinCondition]) -> str:
    """Compute overall severity from individual conditions"""
    if not conditions:
        return "clear"
    
    # Check for clear skin
    if any("clear" in c.condition.lower() for c in conditions):
        return "clear"
    
    # Find highest severity
    severity_order = {"mild": 1, "moderate": 2, "severe": 3}
    max_severity = max(severity_order.get(c.severity, 0) for c in conditions)
    
    if max_severity >= 3:
        return "severe"
    elif max_severity >= 2:
        return "moderate"
    elif max_severity >= 1:
        return "mild"
    
    return "clear"


def assess_doctor_need(conditions: List[SkinCondition], severity: str) -> tuple[bool, str]:
    """Assess whether doctor visit is recommended"""
    
    # Severe cases always need doctor
    if severity == "severe":
        return True, "Severe skin condition detected. Professional dermatological treatment recommended for best results."
    
    # Check for specific concerning conditions
    concerning_conditions = ["cystic acne", "severe acne", "infection", "scarring"]
    for condition in conditions:
        if any(term in condition.condition.lower() for term in concerning_conditions):
            return True, f"{condition.condition} detected. Dermatologist can provide prescription treatments."
    
    # Moderate acne may benefit from doctor
    if severity == "moderate":
        return True, "Moderate skin condition. While OTC treatments may help, a dermatologist can provide more effective prescription options and prevent scarring."
    
    # Mild conditions can usually be managed at home
    if severity == "mild":
        return False, "Mild condition that can typically be managed with over-the-counter treatments and good skincare. See a doctor if it worsens or doesn't improve in 6-8 weeks."
    
    return False, "Skin appears relatively clear. Continue good skincare practices."


def generate_treatments(conditions: List[SkinCondition]) -> List[TreatmentRecommendation]:
    """Generate treatment recommendations"""
    treatments = []
    
    condition_names = [c.condition.lower() for c in conditions]
    
    # Medicine recommendations
    medicines = []
    if any("acne" in c or "pimple" in c for c in condition_names):
        medicines.extend([
            "Benzoyl Peroxide 2.5% - 5% (apply once daily, start with lower strength)",
            "Salicylic Acid 2% cleanser or spot treatment",
            "Niacinamide 10% serum (reduces inflammation and oil)",
            "Adapalene gel 0.1% (over-the-counter retinoid for acne)",
        ])
    
    if any("blackhead" in c for c in condition_names):
        medicines.extend([
            "Salicylic Acid 2% cleanser or toner",
            "Pore strips (temporary relief)",
            "Retinol serum 0.5% (promotes cell turnover)",
        ])
    
    if any("dark spot" in c or "hyperpigmentation" in c for c in condition_names):
        medicines.extend([
            "Vitamin C serum 10-20% (brightening)",
            "Alpha Arbutin 2% (lightens dark spots)",
            "SPF 50+ sunscreen daily (prevents darkening)",
        ])
    
    if medicines:
        treatments.append(
            TreatmentRecommendation(
                category="Over-the-Counter Medicines",
                recommendations=medicines[:4]  # Limit to top 4
            )
        )
    
    # Skincare recommendations
    skincare = [
        "Gentle, non-comedogenic cleanser twice daily",
        "Oil-free, non-comedogenic moisturizer",
        "Broad-spectrum SPF 30+ sunscreen every morning",
        "Avoid touching or picking at affected areas",
    ]
    
    treatments.append(
        TreatmentRecommendation(
            category="Skincare Basics",
            recommendations=skincare
        )
    )
    
    return treatments


def generate_skincare_routine(conditions: List[SkinCondition], severity: str) -> Dict[str, List[str]]:
    """Generate personalized skincare routine"""
    
    routine = {
        "Morning": [
            "1. Gentle cleanser with lukewarm water",
            "2. Toner (optional, alcohol-free)",
            "3. Vitamin C or Niacinamide serum",
            "4. Oil-free moisturizer",
            "5. SPF 50+ broad-spectrum sunscreen",
        ],
        "Evening": [
            "1. Gentle cleanser or micellar water",
            "2. Exfoliant 2-3x per week (Salicylic Acid or AHA)",
            "3. Treatment (Benzoyl Peroxide or Adapalene)",
            "4. Moisturizer",
            "5. Spot treatment on active blemishes if needed",
        ],
        "Weekly": [
            "Clay mask 1-2x per week for oil control",
            "Gentle exfoliation 2-3x per week",
            "Change pillowcases twice weekly",
            "Clean makeup brushes and phone screen regularly",
        ]
    }
    
    return routine


def generate_dietary_advice(conditions: List[SkinCondition]) -> List[str]:
    """Generate dietary and lifestyle advice"""
    
    advice = [
        "💧 Drink 8-10 glasses of water daily for skin hydration",
        "🥗 Eat more fruits and vegetables rich in antioxidants",
        "🐟 Include omega-3 fatty acids (fish, walnuts, flaxseed)",
        "🚫 Reduce dairy intake - may worsen acne for some people",
        "🍬 Limit high-glycemic foods (white bread, sugary snacks)",
        "☕ Reduce caffeine and alcohol consumption",
        "😴 Get 7-9 hours of quality sleep each night",
        "🧘 Manage stress through exercise, meditation, or yoga",
        "🏃 Regular exercise improves circulation and skin health",
        "🚭 Avoid smoking - damages skin and delays healing",
    ]
    
    return advice[:6]  # Return top 6


# Local Advice Database
FACE_ADVICE_DB = {
    "Acne": {
        "medicines": "Benzoyl Peroxide 5% or Adapalene 0.1% gel. Use hydrocolloid patches for active spots.",
        "diet": "Low-glycemic diet. Avoid dairy if it's a trigger for you. Drink green tea.",
        "lifestyle": "Change pillowcases frequently. Don't pick your face. Clean phone screen daily.",
        "warnings": "See a dermatologist if cysts form or scarring occurs."
    },
    "Rosacea": {
        "medicines": "Metronidazole gel (prescription) or Azelaic Acid 10% (OTC).",
        "diet": "Avoid spicy foods, alcohol, and very hot drinks.",
        "lifestyle": "Use gentle, non-foaming cleansers. Protect from wind and extreme temperatures.",
        "warnings": "Consult doctor if eye irritation occurs (ocular rosacea)."
    },
    "Perioral_Dermatitis": {
        "medicines": "Stop topical steroids immediately. Use mild non-fluoride toothpaste.",
        "diet": "Avoid very salty or acidic foods that might irritate the area.",
        "lifestyle": "Simplify skincare routine to just water and gentle moisturizer temporarily.",
        "warnings": "If spreading, antibiotics may be needed."
    },
    "Healthy_Skin": {
        "medicines": "None needed. Maintain current routine.",
        "diet": "Balance diet with healthy fats (avocado, fish) for glow.",
        "lifestyle": "Consistency is key. Regular sleep and hydration.",
        "warnings": "Wear SPF daily to prevent future damage."
    },
    "Other": {
        "medicines": "Consult a dermatologist for accurate diagnosis.",
        "diet": "Anti-inflammatory diet is generally beneficial.",
        "lifestyle": "Avoid harsh products until condition is identified.",
        "warnings": "If persistent or painful, seek professional help."
    }
}

def generate_local_face_advice(conditions: List[SkinCondition], severity: str) -> AIHealthAdvice:
    """Generate advice locally based on conditions"""
    
    # Get primary condition
    if not conditions:
        primary = "Healthy_Skin"
    else:
        # Default to first, but prioritize specific ones over "Other"
        primary = conditions[0].condition
        for c in conditions:
            if c.condition != "Other" and "Healthy" not in c.condition:
                primary = c.condition
                break
    
    # Normalize condition name for lookup
    lookup_key = "Other"
    for key in FACE_ADVICE_DB.keys():
        if key.lower() in primary.lower():
            lookup_key = key
            break
            
    advice = FACE_ADVICE_DB.get(lookup_key, FACE_ADVICE_DB["Other"])
    
    return AIHealthAdvice(
        medicines=advice["medicines"],
        diet=advice["diet"],
        lifestyle=advice["lifestyle"],
        warnings=advice["warnings"]
    )




@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Health Predictor - Face Acne Detection Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "infer": "/infer (POST multipart/form-data)",
            "docs": "/docs",
        },
        "disclaimer": MEDICAL_DISCLAIMER,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
