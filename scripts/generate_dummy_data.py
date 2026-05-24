import os
import random
from PIL import Image
import numpy as np

def create_dummy_dataset(base_dir, classes, num_samples=20):
    """
    Create dummy image dataset for training.
    """
    train_dir = os.path.join(base_dir, 'data', 'train')
    
    print(f"Generating data for {base_dir}...")
    
    for class_name in classes:
        class_dir = os.path.join(train_dir, class_name)
        os.makedirs(class_dir, exist_ok=True)
        
        print(f"  Class '{class_name}': Generating {num_samples} images...")
        
        for i in range(num_samples):
            # Generate random noise image
            # Random color bias based on class index to make them somewhat distinct
            bias = random.randint(0, 255)
            
            # Create random RGB image (height, width, channels)
            img_array = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
            
            # Add some "structure" (random squares)
            for _ in range(5):
                x = random.randint(0, 180)
                y = random.randint(0, 180)
                w = random.randint(20, 50)
                h = random.randint(20, 50)
                color = [random.randint(0, 255) for _ in range(3)]
                img_array[y:y+h, x:x+w] = color
            
            img = Image.fromarray(img_array)
            img.save(os.path.join(class_dir, f"sample_{i}.jpg"))

BRAIN_CLASSES = ['glioma', 'meningioma', 'pituitary', 'normal']
FACE_CLASSES = ['acne', 'redness', 'pimples', 'blackheads', 'clear']

# Generate for Brain ML
create_dummy_dataset('ml_brain', BRAIN_CLASSES)

# Generate for Face ML
create_dummy_dataset('ml_face', FACE_CLASSES)

print("Dummy data generation complete!")
