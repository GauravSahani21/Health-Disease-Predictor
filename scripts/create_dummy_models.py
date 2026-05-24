import torch
import torch.nn as nn
from torchvision import models
import os
import json
import argparse

def create_dummy_model(model_name, num_classes, output_dir, classes_list):
    print(f"Creating {model_name} with {num_classes} classes...")
    
    # Initialize model with random weights (no pretrained weights download to avoid issues)
    if model_name == 'efficientnet_b1':
        model = models.efficientnet_b1(weights=None)
        num_ftrs = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(num_ftrs, num_classes)
    elif model_name == 'mobilenet_v2':
        model = models.mobilenet_v2(weights=None)
        num_ftrs = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(num_ftrs, num_classes)
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Save weights
    model_path = os.path.join(output_dir, 'best_model.pth')
    torch.save(model.state_dict(), model_path)
    
    # Save classes
    classes_path = os.path.join(output_dir, 'classes.json')
    with open(classes_path, 'w') as f:
        # Structure expected by app uses simple dict not wrapped in 'classes' key?
        # Let's check app/main.py.
        # ml_brain/app/main.py: 
        #   with open(os.path.join(model_path, 'classes.json'), 'r') as f:
        #       classes = json.load(f)['classes']
        # ml_face/app/main.py:
        #   with open(os.path.join(model_path, 'classes.json'), 'r') as f:
        #       data = json.load(f)
        #       classes = data['classes']
        json.dump({'classes': classes_list}, f)
        
    print(f"Saved model to {model_path}")
    print(f"Saved classes to {classes_path}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--type', required=True, choices=['brain', 'face'])
    parser.add_argument('--output-dir', required=True)
    args = parser.parse_args()
    
    if args.type == 'brain':
        classes = ['glioma', 'meningioma', 'pituitary', 'normal']
        create_dummy_model('efficientnet_b1', len(classes), args.output_dir, classes)
    elif args.type == 'face':
        classes = ['acne', 'redness', 'pimples', 'blackheads', 'clear']
        create_dummy_model('mobilenet_v2', len(classes), args.output_dir, classes)
