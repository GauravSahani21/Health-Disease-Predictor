from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import joblib
import os
import pandas as pd
# Google AI removed - using local advice only
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Local Symptom Analysis Service")

# Load Model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../models/symptom_model.joblib")
model = None

# Response Models
class PredictionItem(BaseModel):
    condition: str
    score: float  # Changed from confidence to match frontend
    explanation: str
    evidence: Optional[List[str]] = []

class AIHealthAdvice(BaseModel):
    severity: str
    precautions: str
    medicines: str
    diet: str
    lifestyle: str
    urgency: str

class PredictionResponse(BaseModel):
    predictions: List[PredictionItem]
    severity: str
    advice: str
    health_advice: Optional[AIHealthAdvice] = None  # Added for Frontend Compatibility

@app.on_event("startup")
def startup_event():
    global model
    
    # Load ML Model
    try:
        logger.info(f"Attempting to load model from {MODEL_PATH}")
        if os.path.exists(MODEL_PATH):
            model = joblib.load(MODEL_PATH)
            logger.info("Model loaded successfully")
        else:
            logger.error(f"Model file not found at {MODEL_PATH}")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        model = None

    # Google AI removed - using local advice only
    logger.info("Using local health advice database (no AI)")


class SymptomRequest(BaseModel):
    text: str
    age: Optional[int] = None
    sex: Optional[str] = None
    reports: Optional[List[dict]] = []

# Comprehensive Local Advice Database
ADVICE_DB = {
    "Allergies": {
        "severity": "Minor",
        "precautions": "Identify and avoid triggers.\nWear a mask outdoors if pollen is high.\nKeep windows closed during high pollen seasons.",
        "medicines": "Antihistamines (Loratadine, Cetirizine).\nNasal corticosteroids.",
        "diet": "Avoid histamine-rich foods (aged cheese, fermented foods).\nEat Vitamin C rich foods.",
        "lifestyle": "Shower before bed to remove allergens.",
        "urgency": "See doctor if breathing becomes difficult."
    },
    "Anxiety/Panic": {
        "severity": "Moderate",
        "precautions": "Practice deep breathing.\nIdentify triggers.",
        "medicines": "Consult a psychiatrist for prescription options.",
        "diet": "Limit caffeine and alcohol.\nEat complex carbohydrates.",
        "lifestyle": "Regular exercise.\nMeditation and mindfulness.",
        "urgency": "Seek help if affecting daily life significantly."
    },
    "Appendicitis": {
        "severity": "Critical",
        "precautions": "Do not take laxatives or pain medication before diagnosis.\nRest.",
        "medicines": "Antibiotics (Hospital use only).",
        "diet": "Do not eat or drink until seen by a doctor (surgery may be needed).",
        "lifestyle": "Immediate rest.",
        "urgency": "GO TO ER IMMEDIATELY. Risk of rupture."
    },
    "Arthritis": {
        "severity": "Moderate",
        "precautions": "Protect joints from injury.\nMaintain healthy weight.",
        "medicines": "NSAIDs (Ibuprofen, Naproxen).\nTopical analgesics.",
        "diet": "Anti-inflammatory diet (fatty fish, nuts, fruits).",
        "lifestyle": "Low-impact exercise (swimming, cycling).\nHot/Cold therapy.",
        "urgency": "See rheumatologist for management."
    },
    "Asthma": {
        "severity": "Moderate",
        "precautions": "Avoid smoke, dust, and cold air.\nCarry rescue inhaler everywhere.",
        "medicines": "Inhalers (Albuterol).\nController medications.",
        "diet": "Avoid known food triggers.\nMaintain healthy weight.",
        "lifestyle": "Regular checkups.\nMonitor peak flow.",
        "urgency": "ER if inhaler doesn't help breathing."
    },
    "COVID-19": {
        "severity": "Major",
        "precautions": "Isolate to prevent spread.\nWear a mask.",
        "medicines": "Acetaminophen for fever.\nCough suppressants.",
        "diet": "Hydrate well.\nEat immunity-boosting foods.",
        "lifestyle": "Rest is crucial.",
        "urgency": "Seek help for trouble breathing or chest pain."
    },
    "Common Cold/Flu": {
        "severity": "Minor",
        "precautions": "Wash hands frequently.\nCover coughs.",
        "medicines": "Decongestants.\nPain relievers (Ibuprofen/Acetaminophen).",
        "diet": "Hot soups (chicken soup).\nWarm fluids.",
        "lifestyle": "Sleep and rest.",
        "urgency": "See doctor if high fever lasts > 3 days."
    },
    "Dengue": {
        "severity": "Major",
        "precautions": "Use mosquito repellent.\nRemove standing water.",
        "medicines": "Acetaminophen only (Avoid Aspirin/Ibuprofen as they increase bleeding risk).",
        "diet": "Papaya leaf juice (consult doctor).\nHydrate with electrolytes.",
        "lifestyle": "Bed rest under mosquito net.",
        "urgency": "Hospital visit required for platelet monitoring."
    },
    "Diabetes": {
        "severity": "Major",
        "precautions": "Monitor blood sugar regularly.\nInspect feet daily.",
        "medicines": "Insulin or Metformin (Prescription only).",
        "diet": "Low sugar, low carb diet.\nMore fiber.",
        "lifestyle": "Regular physical activity.\nWeight control.",
        "urgency": "ER for ketoacidosis (fruity breath, confusion)."
    },
    "Food Poisoning": {
        "severity": "Moderate",
        "precautions": "Wash hands.\nDisinfect surfaces.",
        "medicines": "Oral Rehydration Salts (ORS).\nAnti-diarrheals (if no fever).",
        "diet": "BRAT diet (Bananas, Rice, Applesauce, Toast).\nAvoid dairy.",
        "lifestyle": "Rest heavily.",
        "urgency": "See doctor for bloody stool or severe dehydration."
    },
    "GERD (Acid Reflux)": {
        "severity": "Moderate",
        "precautions": "Don't lie down after eating.\nElevate head while sleeping.",
        "medicines": "Antacids.\nH2 blockers or PPIs.",
        "diet": "Avoid spicy, acidic, and fried foods.",
        "lifestyle": "Eat smaller, frequent meals.\nLose weight if needed.",
        "urgency": "See doctor if swallowing is difficult."
    },
    "Heart Attack": {
        "severity": "Critical",
        "precautions": "Stop all activity immediately.",
        "medicines": "Chew Aspirin (if not allergic) while waiting for ambulance.",
        "diet": "N/A - Emergency.",
        "lifestyle": "N/A - Emergency.",
        "urgency": "CALL EMERGENCY SERVICES IMMEDIATELY."
    },
    "Jaundice/Liver Issues": {
        "severity": "Major",
        "precautions": "Avoid alcohol completely.\nAvoid hepatotoxic drugs.",
        "medicines": "Prescription only.",
        "diet": "Low fat, high carb diet.\nAvoid oily foods.",
        "lifestyle": "Complete rest.",
        "urgency": "See doctor immediately for diagnosis."
    },
    "Kidney Stones": {
        "severity": "Major",
        "precautions": "Hydrate aggressively.",
        "medicines": "Pain relievers (Prescription often needed).",
        "diet": "Limit sodium and animal protein.\nDrink lemon water.",
        "lifestyle": "Increase water intake significantly.",
        "urgency": "ER for severe pain or inability to pass urine."
    },
    "Malaria": {
        "severity": "Major",
        "precautions": "Use mosquito nets.\nWear long sleeves.",
        "medicines": "Antimalarials (Prescription).",
        "diet": "Nutritious, easy to digest food.",
        "lifestyle": "Rest.",
        "urgency": "Immediate medical testing and treatment."
    },
    "Migraine": {
        "severity": "Moderate",
        "precautions": "Identify triggers (stress, food).\nRegular sleep schedule.",
        "medicines": "Pain relievers (Excedrin).\nTriptans (Prescription).",
        "diet": "Magnesium rich foods.\nHydration.",
        "lifestyle": "Rest in a dark, quiet room.",
        "urgency": "See neurologist if frequency increases."
    },
    "Pneumonia": {
        "severity": "Major",
        "precautions": "Finish full course of antibiotics.\nRest.",
        "medicines": "Antibiotics (Prescription).",
        "diet": "High calorie, high protein for recovery.",
        "lifestyle": "Complete rest.\nSteam inhalation.",
        "urgency": "ER for difficulty breathing."
    },
    "Tuberculosis": {
        "severity": "Major",
        "precautions": "Complete long-term antibiotic course (DOTS).\nCover mouth.",
        "medicines": "Anti-TB drugs (Rifampin, Isoniazid).",
        "diet": "High protein, nutrient-rich diet.",
        "lifestyle": "Isolation during infectious phase.",
        "urgency": "Strict medical adherence required."
    },
    "Typhoid": {
        "severity": "Major",
        "precautions": "Wash hands thoroughly.\nDrink boiled/bottled water.",
        "medicines": "Antibiotics (Ciprofloxacin, Azithromycin).",
        "diet": "Soft, easily digestible foods.\nAvoid raw vegetables.",
        "lifestyle": "Bed rest.",
        "urgency": "Hospital visit required."
    }
}

@app.post("/infer", response_model=PredictionResponse)
async def predict(request: SymptomRequest):
    global model
    if not model:
        try:
            import joblib
            model = joblib.load(MODEL_PATH)
        except:
             raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # 1. ML Prediction
        try:
            # Handle single list input for sklearn
            probas = model.predict_proba([request.text])[0]
            classes = model.classes_
        except AttributeError:
             # Fallback if model doesn't support predict_proba
             # Or if model structure is different (e.g. pipeline)
             prediction = model.predict([request.text])[0]
             return PredictionResponse(
                 predictions=[PredictionItem(
                    condition=prediction,
                    score=1.0,  # Frontend expects 'score' field
                    explanation=f"Based on reported symptoms.",
                    evidence=[]
                 )],
                 severity=ADVICE_DB.get(prediction, {}).get("severity", "Moderate"),
                 advice=f"Symptoms indicate {prediction}.",
                 health_advice=generate_local_health_advice(prediction)
             )

        sorted_indices = probas.argsort()[::-1]
        
        predictions = []
        for i in sorted_indices[:3]:
            condition = classes[i]
            confidence = float(probas[i])
            if confidence > 0.05:
                predictions.append(PredictionItem(
                    condition=condition,
                    score=confidence,  # Frontend expects 'score' field
                    explanation=f"Based on reported symptoms consistent with {condition}.",
                    evidence=[w for w in request.text.split() if len(w) > 3][:3] # Dummy evidence
                ))
        
        if not predictions:
            return PredictionResponse(
                predictions=[],
                severity="Unknown",
                advice="Symptoms unclear. Please consult a doctor.",
                health_advice=None
            )

        top_condition = predictions[0].condition
        
        # 2. Get Advice from Local DB (No AI)
        advice_obj = generate_local_health_advice(top_condition)
        
        return PredictionResponse(
            predictions=predictions,
            severity=advice_obj.severity,
            advice=f"Predicted: {top_condition}. {advice_obj.urgency}",
            health_advice=advice_obj
        )

    except Exception as e:
        logger.error(f"Prediction Error: {e}")
        # Return generic error response instead of 500
        raise HTTPException(status_code=500, detail=str(e))


def generate_local_health_advice(condition: str) -> AIHealthAdvice:
    """Generate structured advice from local DB"""
    
    info = ADVICE_DB.get(condition, {
        "severity": "Moderate",
        "precautions": "Consult a doctor for accurate diagnosis.",
        "medicines": "Over-the-counter pain relief if needed.",
        "diet": "Eat healthy, balanced meals.",
        "lifestyle": "Rest and monitor symptoms.",
        "urgency": "See a doctor if symptoms persist."
    })
    
    return AIHealthAdvice(
        severity=info["severity"],
        precautions=info["precautions"],
        medicines=info["medicines"],
        diet=info["diet"],
        lifestyle=info["lifestyle"],
        urgency=info["urgency"]
    )

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None, "mode": "local_only"}
