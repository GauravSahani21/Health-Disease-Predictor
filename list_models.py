
import joblib
import pandas as pd
import os

model_path = "models/symptom_model.joblib"
if os.path.exists(model_path):
    model = joblib.load(model_path)
    print("Classes found in model:")
    print(model.classes_)
else:
    print("Model file not found!")
