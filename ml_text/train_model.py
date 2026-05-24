import pandas as pd
import numpy as np
import joblib
import os
import random
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# 1. Define Comprehensive Disease & Symptom Database
# Dictionary mapping diseases to their characteristic symptoms
disease_symptoms = {
    "Heart Attack": [
        "chest pain", "chest tightness", "shortness of breath", "pain in arm", "pain in jaw", "sweating", "nausea", "dizziness", "crushing chest pain", "heart palpitations", "cold sweat", "extreme fatigue"
    ],
    "Common Cold/Flu": [
        "fever", "cough", "runny nose", "sneezing", "body ache", "fatigue", "sore throat", "nasal congestion", "chills", "headache", "watery eyes", "mucus production"
    ],
    "COVID-19": [
        "fever", "dry cough", "loss of taste", "loss of smell", "fatigue", "difficulty breathing", "sore throat", "body aches", "congestion", "persistent cough"
    ],
    "Pneumonia": [
        "chest pain when breathing", "cough with phlegm", "fever", "sweating", "chills", "shortness of breath", "nausea", "vomiting", "confusion", "rapid breathing"
    ],
    "Asthma": [
        "wheezing", "shortness of breath", "chest tightness", "coughing at night", "difficulty breathing", "rapid breathing", "trouble sleeping"
    ],
    "Malaria": [
        "high fever", "shaking chills", "sweating", "headache", "nausea", "vomiting", "abdominal pain", "muscle pain", "fatigue", "anemia"
    ],
    "Dengue": [
        "high fever", "severe headache", "pain behind eyes", "joint pain", "muscle pain", "rash", "bleeding gums", "vomiting", "fatigue", "nausea"
    ],
    "Typhoid": [
        "prolonged fever", "weakness", "stomach pain", "headache", "loss of appetite", "rash", "constipation", "diarrhea", "fatigue"
    ],
    "Food Poisoning": [
        "nausea", "vomiting", "watery diarrhea", "stomach cramps", "fever", "abdominal pain", "dehydration", "weakness", "loss of appetite"
    ],
    "Appendicitis": [
        "sudden pain on right side of abdomen", "pain around navel", "nausea", "vomiting", "loss of appetite", "fever", "bloating", "inability to pass gas"
    ],
    "GERD (Acid Reflux)": [
        "heartburn", "burning sensation in chest", "regurgitation", "difficulty swallowing", "sensation of lump in throat", "acid taste", "chronic cough", "chest pain"
    ],
    "Migraine": [
        "severe throbbing pain", "pulsing sensation", "pain on one side of head", "nausea", "sensitivity to light", "sensitivity to sound", "visual aura", "vomiting"
    ],
    "Jaundice/Liver Issues": [
        "yellow skin", "yellow eyes", "dark urine", "pale stools", "abdominal pain", "itchy skin", "fatigue", "swollen abdomen", "nausea"
    ],
    "Diabetes": [
        "frequent urination", "excessive thirst", "extreme hunger", "unexplained weight loss", "fatigue", "blurred vision", "slow healing sores", "tingling in hands or feet"
    ],
    "Kidney Stones": [
        "severe pain in side and back", "pain below ribs", "pain spreading to lower abdomen", "pain on urination", "pink urine", "nausea", "vomiting", "frequent urination"
    ],
    "Allergies": [
        "sneezing", "itchy nose", "itchy eyes", "watery eyes", "runny nose", "hives", "swelling", "red eyes", "skin rash", "congestion"
    ],
    "Arthritis": [
        "joint pain", "joint stiffness", "swelling", "redness", "decreased range of motion", "morning stiffness", "tender joints"
    ],
    "Tuberculosis": [
        "coughing for 3 weeks", "coughing up blood", "chest pain", "weight loss", "fatigue", "fever", "night sweats", "loss of appetite"
    ],
    "Anxiety/Panic": [
        "feeling nervous", "rapid heart rate", "trembling", "sweating", "feeling impending doom", "trouble concentrating", "restlessness", "shortness of breath"
    ],
    "Hypertension (High Blood Pressure)": [
        "headaches", "dizziness", "blurred vision", "shortness of breath", "nosebleeds", "chest pain", "pounding in chest", "fatigue"
    ],
    "Stroke": [
        "sudden numbness", "face drooping", "arm weakness", "speech difficulty", "confusion", "trouble walking", "severe headache", "vision problems", "loss of balance"
    ],
    "UTI (Urinary Tract Infection)": [
        "burning sensation when urinating", "frequent urination", "urgent need to urinate", "cloudy urine", "strong smelling urine", "pelvic pain", "blood in urine", "lower back pain"
    ],
    "Conjunctivitis (Pink Eye)": [
        "red eyes", "itchy eyes", "watery eyes", "discharge from eyes", "crusting of eyelids", "sensitivity to light", "gritty feeling in eyes"
    ],
    "Sinusitis": [
        "facial pain", "nasal congestion", "thick nasal discharge", "reduced sense of smell", "headache", "ear pressure", "tooth pain", "cough", "fatigue"
    ],
    "Bronchitis": [
        "persistent cough", "mucus production", "chest discomfort", "shortness of breath", "fatigue", "wheezing", "low fever", "sore throat"
    ],
    "Gastritis": [
        "burning stomach pain", "nausea", "vomiting", "feeling of fullness", "loss of appetite", "bloating", "indigestion", "hiccups"
    ],
    "IBS (Irritable Bowel Syndrome)": [
        "abdominal pain", "cramping", "bloating", "gas", "diarrhea", "constipation", "mucus in stool", "stomach discomfort"
    ],
    "Anemia": [
        "fatigue", "weakness", "pale skin", "shortness of breath", "dizziness", "cold hands and feet", "headaches", "irregular heartbeat"
    ],
    "Hyperthyroidism": [
        "weight loss", "rapid heartbeat", "increased appetite", "nervousness", "trembling hands", "sweating", "difficulty sleeping", "frequent bowel movements"
    ],
    "Hypothyroidism": [
        "fatigue", "weight gain", "cold sensitivity", "dry skin", "hair loss", "muscle weakness", "depression", "constipation", "memory problems"
    ],
    "Vitamin D Deficiency": [
        "fatigue", "bone pain", "muscle weakness", "mood changes", "frequent infections", "hair loss", "slow wound healing"
    ],
    "Dehydration": [
        "extreme thirst", "dark urine", "infrequent urination", "dry mouth", "fatigue", "dizziness", "confusion", "rapid heartbeat"
    ],
    "Heat Stroke": [
        "high body temperature", "confusion", "rapid breathing", "rapid heart rate", "headache", "dizziness", "nausea", "hot dry skin", "unconsciousness"
    ],
    "Chickenpox": [
        "itchy rash", "red spots", "blisters", "fever", "fatigue", "loss of appetite", "headache", "spots all over body"
    ],
    "Measles": [
        "high fever", "cough", "runny nose", "red eyes", "rash", "white spots in mouth", "sore throat", "muscle pain"
    ],
    "Depression": [
        "persistent sadness", "loss of interest", "fatigue", "difficulty sleeping", "changes in appetite", "trouble concentrating", "feelings of worthlessness", "thoughts of death"
    ],
    "Insomnia": [
        "difficulty falling asleep", "waking up at night", "waking up too early", "fatigue during day", "irritability", "difficulty concentrating", "worry about sleep"
    ],
    "Eczema": [
        "dry skin", "itchy skin", "red patches", "thick skin", "cracked skin", "small bumps", "skin inflammation", "sensitive skin"
    ],
    "Psoriasis": [
        "red patches of skin", "silvery scales", "dry cracked skin", "itching", "burning sensation", "thick nails", "swollen joints"
    ],
    "Gout": [
        "severe joint pain", "swollen joints", "red joints", "hot joints", "limited range of motion", "pain in big toe", "tenderness"
    ],
    "Scabies": [
        "intense itching", "itching at night", "rash", "sores from scratching", "thick crusts on skin", "pimple-like bumps"
    ]
}

# 2. Natural Language Templates
# To create realistic user inputs
templates = [
    "I have {symptom}",
    "I have been feeling {symptom}",
    "suffering from {symptom}",
    "experiencing {symptom} since yesterday",
    "severe {symptom} and {symptom}",
    "I feel {symptom} and {symptom}",
    "diagnosed with {symptom}",
    "my symptoms are {symptom}",
    "I have got {symptom}",
    "feeling {symptom} from last 3 days",
    "constant {symptom} and {symptom}",
    "having trouble with {symptom}",
    "painful {symptom}",
    "doctor i have {symptom}",
    "{symptom} is getting worse",
    "can you help with {symptom}?",
    "complaining of {symptom}",
    "what causes {symptom}?",
    "worried about {symptom}",
    "I'm concerned about {symptom}",
    "recently started having {symptom}",
    "chronic {symptom}",
    "mild {symptom}",
    "extreme {symptom}",
    "unbearable {symptom}",
    "keep getting {symptom}",
    "can't stop {symptom}",
    "sudden {symptom}",
    "persistent {symptom}",
    "intermittent {symptom}"
]

TIME_PHRASES = ["since yesterday", "from last 3 days", "for a week", "since morning", "lately"]

def generate_synthetic_data(num_samples_per_class=150):
    dataset = []
    
    for disease, symptoms in disease_symptoms.items():
        # 1. Single Symptom variations
        for _ in range(num_samples_per_class // 3):
            symptom = random.choice(symptoms)
            template = random.choice(templates)
            text = template.format(symptom=symptom)
            if random.random() > 0.7:
                text += " " + random.choice(TIME_PHRASES)
            dataset.append((text, disease))
            
        # 2. Multi-symptom variations (User example: "chest pain and stomach pain")
        for _ in range(num_samples_per_class // 3):
            s1 = random.choice(symptoms)
            s2 = random.choice(symptoms)
            if s1 == s2: s2 = random.choice(symptoms)
            
            text = f"I am feeling {s1} and {s2}"
            if random.random() > 0.5:
                text += f" {random.choice(TIME_PHRASES)}"
            dataset.append((text, disease))
            
        # 3. Complex Sentences
        for _ in range(num_samples_per_class // 3):
            symptoms_subset = random.sample(symptoms, min(3, len(symptoms)))
            s_text = ", ".join(symptoms_subset)
            text = f"I have {s_text}"
            dataset.append((text, disease))

    return dataset

# 3. Generate Data
print("Generating comprehensive synthetic dataset...")
data = generate_synthetic_data(num_samples_per_class=300)
df = pd.DataFrame(data, columns=['text', 'label'])
print(f"Generated {len(df)} training examples covering {len(disease_symptoms)} diseases.")

# 4. Train Model
print("Training Natural Language Understanding Model...")
X = df['text']
y = df['label']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Pipeline with N-grams to capture "chest pain" vs "pain"
pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(stop_words='english', ngram_range=(1, 3), max_features=8000)),
    ('clf', RandomForestClassifier(n_estimators=200, random_state=42, class_weight='balanced'))
])

pipeline.fit(X_train, y_train)

# 5. Evaluate
print("\nModel Evaluation:")
y_pred = pipeline.predict(X_test)
print(classification_report(y_test, y_pred))

# 6. Save Model
model_dir = "models"
if not os.path.exists(model_dir):
    os.makedirs(model_dir)

model_path = os.path.join(model_dir, "symptom_model.joblib")
joblib.dump(pipeline, model_path)
print(f"\n✅ Model saved to {model_path}")

# 7. Test User Example
test_case = "i am feeling chest pain and stomach pain from last 3 days"
prediction = pipeline.predict([test_case])[0]
proba = pipeline.predict_proba([test_case]).max()
print(f"\n🧪 Test Case: '{test_case}'")
print(f"🧠 Prediction: {prediction} (Confidence: {proba:.2f})")
