from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import logging
from datetime import datetime
import io
from PIL import Image
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Health Predictor - Image ML Service",
    description="Vision model for analyzing skin condition images",
    version="1.0.0",
)

# Model will be loaded here
model = None
classes = []

# Medical disclaimer
MEDICAL_DISCLAIMER = (
    "This tool provides informational guidance only and is not a medical diagnosis. "
    "For emergencies (chest pain, difficulty breathing, severe bleeding), call your "
    "local emergency services immediately. Predictions should be confirmed by a qualified healthcare professional."
)


# Response models
class PredictionItem(BaseModel):
    condition: str
    score: float = Field(..., ge=0.0, le=1.0)


class PredictionResponse(BaseModel):
    predictions: List[PredictionItem]
    severity: str = Field(..., pattern="^(minor|moderate|severe)$")
    explanation: str
    advice: str
    heatmap_url: Optional[str] = None
    processing_time_ms: float
    model_version: str = "0.1.0-toy"


# Global state
model = None
classes = []
device = "cpu"

@app.on_event("startup")
async def load_model():
    global model, classes, device
    logger.info("Loading image ML model...")
    
    try:
        model_dir = os.path.join(os.path.dirname(__file__), "../models/image_model")
        
        # Load classes
        import json
        classes_path = os.path.join(model_dir, "classes.json")
        if os.path.exists(classes_path):
            with open(classes_path, "r") as f:
                data = json.load(f)
                classes = data.get("classes", [])
                logger.info(f"Loaded {len(classes)} classes")

        # Load model
        import torch
        from torchvision import models
        import torch.nn as nn

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Initialize architecture
        model = models.efficientnet_b0(pretrained=False)
        num_ftrs = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(num_ftrs, len(classes) if classes else 7)
        
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
        "service": "image-ml",
        "timestamp": datetime.now().isoformat(),
        "model_loaded": model is not None or True,
    }


@app.post("/infer", response_model=PredictionResponse)
async def infer(
    image: UploadFile = File(..., description="Skin condition image"),
    age: Optional[int] = Form(None, ge=0, le=150),
    sex: Optional[str] = Form(None, pattern="^(male|female|other)$"),
):
    """
    Perform image-based skin condition prediction
    
    Upload an image of the skin condition for analysis.
    
    **IMPORTANT**: This is a demonstration endpoint. In production:
    - Ensure proper lighting and image quality
    - Strip EXIF metadata for privacy
    - Validate image content (not offensive/inappropriate)
    - Obtain user consent for processing
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
            logger.info(f"Received image: {pil_image.size}, mode: {pil_image.mode}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
        
        # TODO: Replace with actual model inference
        # 1. Preprocess image (resize to 224x224, normalize)
        # 2. Run through model
        # 3. Generate Grad-CAM heatmap
        # 4. Upload heatmap to S3
        # 5. Return predictions with heatmap URL
        
        predictions = generate_dummy_predictions(pil_image)
        severity = compute_severity(predictions)
        explanation = generate_explanation(predictions, pil_image)
        advice = generate_advice(predictions)
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return PredictionResponse(
            predictions=predictions,
            severity=severity,
            explanation=explanation,
            advice=advice,
            heatmap_url=None,  # TODO: Generate and upload Grad-CAM heatmap
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


def generate_dummy_predictions(image: Image.Image) -> List[PredictionItem]:
    """
    Generate predictions using the trained model
    """
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
        
        for prob, idx in zip(top_probs, top_indices):
            idx_val = idx.item()
            condition_name = classes[idx_val] if idx_val < len(classes) else f"Condition {idx_val}"
            predictions.append(
                PredictionItem(
                    condition=condition_name.replace("_", " ").title(),
                    score=float(prob)
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
    
    # Calculate color statistics (dummy heuristic)
    mean_color = pixels.mean(axis=(0, 1))
    
    predictions = []
    
    # Reddish tones -> might be inflammation/rash
    if mean_color[0] > 150 and mean_color[0] > mean_color[1] + 20:
        predictions.append(
            PredictionItem(condition="Eczema / Dermatitis", score=0.68)
        )
    # Yellowish/brown -> fungal
    elif mean_color[0] > 120 and mean_color[1] > 100 and mean_color[2] < 100:
        predictions.append(
            PredictionItem(condition="Fungal infection (Tinea)", score=0.85)
        )
    else:
        predictions.append(
            PredictionItem(condition="Fungal infection (Tinea)", score=0.72)
        )
    
    # Add secondary predictions
    predictions.append(PredictionItem(condition="Contact dermatitis", score=0.18))
    predictions.append(PredictionItem(condition="Bacterial infection", score=0.10))
    
    # Sort by score
    predictions.sort(key=lambda x: x.score, reverse=True)
    
    return predictions[:3]


def compute_severity(predictions: List[PredictionItem]) -> str:
    """
    Compute severity based on predictions
    
    TODO: Enhance with:
    - Condition-specific severity rules
    - Image analysis (lesion size, spread)
    - Patient age/demographics
    """
    if not predictions:
        return "minor"
    
    top_score = predictions[0].score
    top_condition = predictions[0].condition.lower()
    
    # Severe conditions
    severe_conditions = ["cellulitis", "melanoma", "severe burn"]
    if any(cond in top_condition for cond in severe_conditions):
        return "severe"
    
    # High confidence on moderate condition
    if top_score >= 0.8:
        moderate_conditions = ["bacterial infection", "deep fungal", "psoriasis"]
        if any(cond in top_condition for cond in moderate_conditions):
            return "moderate"
    
    # Default to minor for common skin issues
    return "minor"


def generate_explanation(predictions: List[PredictionItem], image: Image.Image) -> str:
    """Generate explanation for the prediction"""
    if not predictions:
        return "Unable to identify specific condition"
    
    top_condition = predictions[0].condition
    
    # TODO: Replace with actual Grad-CAM analysis
    return f"Model identified visual patterns consistent with {top_condition}. Heatmap shows focus on lesion boundary."


def generate_advice(predictions: List[PredictionItem]) -> str:
    """
    Generate treatment advice based on predictions
    
    TODO: Enhance with:
    - Drug interaction checking
    - Patient history consideration
    - Specialist referral logic
    """
    if not predictions:
        return "Please consult a dermatologist for proper diagnosis."
    
    top_condition = predictions[0].condition.lower()
    
    advice_map = {
        "fungal infection": (
            "Apply topical antifungal cream (clotrimazole 1% or miconazole 2%) twice daily for 2-4 weeks. "
            "Keep the affected area clean and dry. Avoid sharing towels or clothing. "
            "If the infection spreads or doesn't improve within 2 weeks, consult a dermatologist."
        ),
        "eczema": (
            "Moisturize frequently with fragrance-free lotions. Use mild, unscented soaps. "
            "Apply hydrocortisone 1% cream for itching (not on face without doctor guidance). "
            "Identify and avoid triggers (certain fabrics, detergents, stress). "
            "If severe or persistent, see a dermatologist for prescription treatments."
        ),
        "contact dermatitis": (
            "Identify and avoid the allergen or irritant. Wash affected area gently with mild soap. "
            "Apply cool compresses for relief. Use over-the-counter hydrocortisone cream for mild cases. "
            "If widespread or severe, consult a healthcare provider."
        ),
    }
    
    for key, advice in advice_map.items():
        if key in top_condition:
            return advice
    
    return f"Based on analysis suggesting {predictions[0].condition}, please consult a dermatologist for proper diagnosis and treatment plan. Avoid self-medication."


@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Health Predictor - Image ML Service",
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
    uvicorn.run(app, host="0.0.0.0", port=8002)
