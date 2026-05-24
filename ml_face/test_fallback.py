
import numpy as np
from PIL import Image
from pydantic import BaseModel
from typing import List

class SkinCondition(BaseModel):
    condition: str
    severity: str
    score: float
    affected_areas: List[str]

def _generate_fallback_detections(image: Image.Image) -> List[SkinCondition]:
    """Fallback dummy logic if model fails"""
    # Simple analysis based on image properties
    pixels = np.array(image)
    
    # Calculate color statistics
    mean_color = pixels.mean(axis=(0, 1))
    std_color = pixels.std(axis=(0, 1))
    
    print(f"Mean Color: {mean_color} (R, G, B)")
    print(f"Std Dev: {std_color} (R, G, B) -> Mean Std: {std_color.mean()}")

    conditions = []
    
    # Reddish tones -> inflammation/acne
    if mean_color[0] > 140 and mean_color[0] > mean_color[1] + 15:
        print("Detected: Redness/Acne criteria met")
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
    # High variance -> uneven texture/pimples
    elif std_color.mean() > 40:
        print("Detected: High variance/Pimples criteria met")
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
    else:
        print("Detected: Default/Minor Blemishes")
        # Relatively clear
        conditions.append(
            SkinCondition(
                condition="Minor Blemishes",
                severity="mild",
                score=0.45,
                affected_areas=["forehead"]
            )
        )
    
    return conditions

if __name__ == "__main__":
    img = Image.open("test_face.jpg").convert("RGB")
    conditions = _generate_fallback_detections(img)
    for c in conditions:
        print(f"Result: {c.condition} ({c.severity})")
