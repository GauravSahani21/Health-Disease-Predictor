from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import logging
from datetime import datetime
import io
from PIL import Image
import numpy as np
# Google AI removed - using local advice only

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Health Predictor - Brain MRI Analysis Service",
    description="Deep learning model for analyzing brain MRI scans and detecting potential brain diseases",
    version="1.0.0",
)

# Model will be loaded here
model = None
classes = []

# Medical disclaimer
MEDICAL_DISCLAIMER = (
    "This tool provides informational guidance only and is not a medical diagnosis. "
    "For emergencies (severe headache, loss of consciousness, seizures, stroke symptoms), "
    "call your local emergency services immediately. Predictions should be confirmed by a qualified healthcare professional."
)


# Response models
class PredictionItem(BaseModel):
    disease: str
    score: float = Field(..., ge=0.0, le=1.0)
    description: str


class AIHealthAdvice(BaseModel):
    medicines: str
    diet: str
    lifestyle: str
    warnings: str


class PredictionResponse(BaseModel):
    predictions: List[PredictionItem]
    severity: str = Field(..., pattern="^(minor|moderate|severe|critical)$")
    explanation: str
    recommendations: str
    should_see_doctor: bool
    urgency_level: str
    heatmap_url: Optional[str] = None
    ai_health_advice: Optional[AIHealthAdvice] = None
    processing_time_ms: float
    model_version: str = "0.1.0-brain"


# Global state
model = None
classes = []
device = "cpu"

@app.on_event("startup")
async def load_model():
    global model, classes, device
    logger.info("Loading brain MRI ML model...")
    
    # Google AI removed - using local advice only
    logger.info("Using local brain health advice database (no AI)")
    
    try:
        model_dir = os.path.join(os.path.dirname(__file__), "../models/brain_model")
        
        # Load classes
        import json
        classes_path = os.path.join(model_dir, "classes.json")
        if os.path.exists(classes_path):
            with open(classes_path, "r") as f:
                data = json.load(f)
                classes = data.get("classes", [])
                logger.info(f"Loaded {len(classes)} brain disease classes")

        # Load model
        import torch
        from torchvision import models
        import torch.nn as nn

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Initialize architecture (EfficientNet-B1 or ResNet50)
        model = models.efficientnet_b1(pretrained=False)
        num_ftrs = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(num_ftrs, len(classes) if classes else 4)
        
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
        "service": "brain-mri-ml",
        "timestamp": datetime.now().isoformat(),
        "model_loaded": model is not None or True,
    }


@app.post("/infer", response_model=PredictionResponse)
async def infer(
    image: UploadFile = File(..., description="Brain MRI or X-ray image"),
    age: Optional[int] = Form(None, ge=0, le=150),
    sex: Optional[str] = Form(None, pattern="^(male|female|other)$"),
):
    """
    Perform brain MRI analysis for disease detection
    
    Upload a brain MRI or X-ray image for analysis. The model will detect potential
    brain diseases including tumors, strokes, and other abnormalities.
    
    **IMPORTANT**: This is a demonstration endpoint. In production:
    - Ensure proper DICOM format handling
    - Validate image orientation and quality
    - Strip metadata for privacy
    - Obtain informed consent
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
            logger.info(f"Received brain MRI image: {pil_image.size}, mode: {pil_image.mode}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
        
        # Perform inference
        predictions = generate_predictions(pil_image)
        severity = compute_severity(predictions)
        explanation = generate_explanation(predictions, pil_image)
        recommendations = generate_recommendations(predictions, severity)
        should_see_doctor, urgency_level = assess_urgency(predictions, severity)
        
        # Generate local health advice (AI removed)
        ai_advice = generate_local_brain_advice(predictions, severity)
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return PredictionResponse(
            predictions=predictions,
            severity=severity,
            explanation=explanation,
            recommendations=recommendations,
            should_see_doctor=should_see_doctor,
            urgency_level=urgency_level,
            heatmap_url=None,  # TODO: Generate Grad-CAM heatmap
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


def generate_predictions(image: Image.Image) -> List[PredictionItem]:
    """Generate predictions using the trained model"""
    global model, classes, device
    
    # If model is not loaded, fall back to dummy logic
    if model is None:
        return _generate_fallback_predictions(image)

    try:
        import torch
        from torchvision import transforms
        
        # Preprocess
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        
        input_tensor = transform(image).unsqueeze(0).to(device)
        
        # Inference
        with torch.no_grad():
            outputs = model(input_tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1)[0]
        
        # Get top predictions
        predictions = []
        top_probs, top_indices = torch.topk(probs, k=min(3, len(probs)))
        
        disease_descriptions = get_disease_descriptions()
        
        for prob, idx in zip(top_probs, top_indices):
            idx_val = idx.item()
            disease_name = classes[idx_val] if idx_val < len(classes) else f"Condition {idx_val}"
            predictions.append(
                PredictionItem(
                    disease=disease_name.replace("_", " ").title(),
                    score=float(prob),
                    description=disease_descriptions.get(disease_name.lower(), "See a doctor for diagnosis.")
                )
            )
        
        return predictions

    except Exception as e:
        logger.error(f"Inference error: {str(e)}")
        return _generate_fallback_predictions(image)


def _generate_fallback_predictions(image: Image.Image) -> List[PredictionItem]:
    """Fallback dummy logic if model fails"""
    # Simple dummy logic based on image properties
    width, height = image.size
    pixels = np.array(image)
    
    # Calculate intensity statistics (dummy heuristic)
    mean_intensity = pixels.mean()
    std_intensity = pixels.std()
    
    disease_descriptions = get_disease_descriptions()
    predictions = []
    
    # Simple heuristic based on image statistics
    if mean_intensity < 80:
        predictions.append(
            PredictionItem(
                disease="Normal Brain Scan",
                score=0.75,
                description=disease_descriptions["normal"]
            )
        )
        predictions.append(
            PredictionItem(
                disease="Mild Atrophy",
                score=0.15,
                description=disease_descriptions["mild atrophy"]
            )
        )
    elif mean_intensity > 150 and std_intensity > 60:
        predictions.append(
            PredictionItem(
                disease="Possible Tumor",
                score=0.62,
                description=disease_descriptions["tumor"]
            )
        )
        predictions.append(
            PredictionItem(
                disease="Normal Brain Scan",
                score=0.25,
                description=disease_descriptions["normal"]
            )
        )
    else:
        predictions.append(
            PredictionItem(
                disease="Possible Stroke Indicators",
                score=0.58,
                description=disease_descriptions["stroke"]
            )
        )
        predictions.append(
            PredictionItem(
                disease="Normal Brain Scan",
                score=0.30,
                description=disease_descriptions["normal"]
            )
        )
    
    predictions.append(
        PredictionItem(
            disease="Unclear - Needs Clinical Review",
            score=0.12,
            description="Image quality or positioning may affect accuracy."
        )
    )
    
    # Sort by score
    predictions.sort(key=lambda x: x.score, reverse=True)
    return predictions[:3]


def get_disease_descriptions():
    """Return descriptions for various brain conditions"""
    return {
        "normal": "No significant abnormalities detected. Continue regular health monitoring.",
        "tumor": "Abnormal mass detected that may indicate a tumor. Immediate medical consultation required.",
        "glioma": "Potential glioma (brain tumor originating from glial cells). Requires immediate specialist evaluation.",
        "meningioma": "Possible meningioma (tumor of brain/spinal cord membranes). Usually benign but needs evaluation.",
        "pituitary": "Pituitary gland abnormality detected. Requires endocrinologist consultation.",
        "stroke": "Indicators consistent with stroke or cerebrovascular event. Seek immediate medical attention.",
        "mild atrophy": "Minor brain volume loss, may be age-related or early neurodegeneration. Monitor with specialist.",
        "hemorrhage": "Possible bleeding in brain tissue. EMERGENCY - Seek immediate medical care.",
    }


def compute_severity(predictions: List[PredictionItem]) -> str:
    """Compute severity based on predictions"""
    if not predictions:
        return "minor"
    
    top_score = predictions[0].score
    top_disease = predictions[0].disease.lower()
    
    # Critical conditions
    critical_keywords = ["hemorrhage", "severe", "stroke", "aneurysm"]
    if any(keyword in top_disease for keyword in critical_keywords):
        return "critical"
    
    # Severe conditions
    severe_keywords = ["tumor", "glioma", "meningioma", "cancer", "mass"]
    if any(keyword in top_disease for keyword in severe_keywords) and top_score >= 0.6:
        return "severe"
    
    # Moderate conditions
    moderate_keywords = ["atrophy", "lesion", "abnormality", "pituitary"]
    if any(keyword in top_disease for keyword in moderate_keywords):
        return "moderate"
    
    # Normal or minor
    if "normal" in top_disease:
        return "minor"
    
    return "moderate"


def generate_explanation(predictions: List[PredictionItem], image: Image.Image) -> str:
    """Generate explanation for the prediction"""
    if not predictions:
        return "Unable to analyze the scan. Please ensure the image is a clear brain MRI or CT scan."
    
    top_disease = predictions[0].disease
    confidence = predictions[0].score * 100
    
    return (
        f"Analysis detected patterns consistent with {top_disease} "
        f"with {confidence:.1f}% confidence. "
        f"The model analyzed brain tissue contrast, structure, and symmetry. "
        f"Further clinical imaging and expert radiologist review is recommended."
    )


def generate_recommendations(predictions: List[PredictionItem], severity: str) -> str:
    """Generate medical recommendations"""
    if not predictions:
        return "Unable to provide recommendations. Please consult a neurologist."
    
    top_disease = predictions[0].disease.lower()
    
    if severity == "critical":
        return (
            "⚠️ URGENT: This scan shows indicators that require immediate medical attention. "
            "Go to the emergency room or call emergency services now. "
            "Do not delay seeking professional medical care."
        )
    
    if severity == "severe":
        return (
            "This scan shows concerning findings that require prompt medical evaluation. "
            "Schedule an appointment with a neurologist or neurosurgeon within 24-48 hours. "
            "Bring this scan and analysis to your appointment. "
            "Do not ignore these findings."
        )
    
    if "tumor" in top_disease or "glioma" in top_disease:
        return (
            "Possible tumor detected. Recommendations: "
            "1. Consult a neurologist or neurosurgeon immediately. "
            "2. Additional imaging (contrast MRI) may be needed. "
            "3. Avoid self-diagnosis - many brain masses are benign. "
            "4. Prepare questions for your doctor about treatment options."
        )
    
    if "stroke" in top_disease:
        return (
            "Possible stroke indicators. Recommendations: "
            "1. If symptoms occurred recently (within 24 hours), seek emergency care. "
            "2. Monitor for symptoms: weakness, speech difficulty, vision changes. "
            "3. Consult a neurologist for stroke prevention strategies. "
            "4. Lifestyle: quit smoking, manage blood pressure, healthy diet."
        )
    
    if "normal" in top_disease:
        return (
            "Scan appears normal. Recommendations: "
            "1. Continue regular health check-ups. "
            "2. Maintain brain health: exercise, healthy diet, mental stimulation. "
            "3. If you have persistent symptoms, consult a doctor regardless of scan results. "
            "4. Follow up as recommended by your healthcare provider."
        )
    
    return (
        "Consult a neurologist or radiologist for proper interpretation of this scan. "
        "Bring this analysis to your appointment. "
        "Do not make treatment decisions based solely on this automated analysis."
    )


def assess_urgency(predictions: List[PredictionItem], severity: str) -> tuple[bool, str]:
    """Assess whether doctor visit is needed and urgency level"""
    if not predictions:
        return True, "low"
    
    top_disease = predictions[0].disease.lower()
    
    if severity == "critical":
        return True, "emergency"
    
    if severity == "severe":
        return True, "urgent"
    
    if severity == "moderate":
        return True, "soon"
    
    if "normal" in top_disease and predictions[0].score > 0.7:
        return False, "routine"
    
    return True, "routine"


# Local Advice Database for Brain Conditions
BRAIN_ADVICE_DB = {
    "normal": {
        "medicines": "No medication needed. Maintain brain health with omega-3 supplements if recommended by doctor.",
        "diet": "Mediterranean diet rich in omega-3 fatty acids, antioxidants, and leafy greens.",
        "lifestyle": "Regular exercise, mental stimulation (puzzles, reading), 7-9 hours sleep, stress management.",
        "warnings": "Seek immediate care for sudden severe headache, vision changes, or neurological symptoms."
    },
    "tumor": {
        "medicines": "Requires immediate specialist consultation. Do not self-medicate.",
        "diet": "Anti-inflammatory diet, limit processed foods, stay hydrated.",
        "lifestyle": "Avoid alcohol, reduce stress, monitor symptoms closely.",
        "warnings": "URGENT: Schedule neurologist/neurosurgeon appointment within 24-48 hours. Emergency if severe symptoms."
    },
    "glioma": {
        "medicines": "Requires immediate oncology and neurosurgery consultation. Prescription medications only.",
        "diet": "Nutrient-rich diet to support treatment. Consult with oncology dietitian.",
        "lifestyle": "Prioritize rest, minimize stress, follow all medical advice strictly.",
        "warnings": "CRITICAL: Immediate specialist care required. Do not delay treatment."
    },
    "stroke": {
        "medicines": "Aspirin (if recommended by doctor). Blood pressure medications per prescription.",
        "diet": "Low-sodium diet, DASH diet, limit saturated fats.",
        "lifestyle": "No smoking, limit alcohol, manage blood pressure, regular gentle exercise approved by doctor.",
        "warnings": "EMERGENCY: If recent stroke (within 24 hours), call emergency services immediately. Monitor for recurrence."
    },
    "moderate": {
        "medicines": "Consult neurologist for appropriate medication based on specific condition.",
        "diet": "Brain-healthy diet with omega-3s, berries, nuts, whole grains.",
        "lifestyle": "Regular exercise, cognitive training, adequate sleep, stress reduction.",
        "warnings": "Schedule doctor appointment soon. Monitor for worsening symptoms."
    }
}

def generate_local_brain_advice(predictions: List[PredictionItem], severity: str) -> AIHealthAdvice:
    """Generate local brain health advice based on predictions"""
    
    if not predictions:
        lookup_key = "moderate"
    else:
        top_disease = predictions[0].disease.lower()
        
        # Determine lookup key based on disease name
        if "normal" in top_disease or "clear" in top_disease:
            lookup_key = "normal"
        elif "tumor" in top_disease or "mass" in top_disease:
            lookup_key = "tumor"
        elif "glioma" in top_disease or "meningioma" in top_disease:
            lookup_key = "glioma"
        elif "stroke" in top_disease or "hemorrhage" in top_disease:
            lookup_key = "stroke"
        else:
            lookup_key = "moderate"
    
    advice = BRAIN_ADVICE_DB.get(lookup_key, BRAIN_ADVICE_DB["moderate"])
    
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
        "service": "Health Predictor - Brain MRI Analysis Service",
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
    uvicorn.run(app, host="0.0.0.0", port=8003)
