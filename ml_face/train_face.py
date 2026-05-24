#!/usr/bin/env python3
"""
Acne Detection Training Script
Trains MobileNetV2 on acne dataset for skin condition classification.
Organizes images by filename patterns into categories.
"""

import os
import json
import argparse
import shutil
from pathlib import Path
import re

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
from tqdm import tqdm
import matplotlib.pyplot as plt

# Set random seed
torch.manual_seed(42)


def organize_acne_dataset(source_dir, target_dir):
    """
    Organize acne images into categories based on filename patterns
    Categories: Acne, Rosacea, Clear/Healthy, Perioral Dermatitis, Other
    """
    categories = {
        'Acne': ['acne', 'pimple', 'scar'],
        'Rosacea': ['rosacea'],
        'Perioral_Dermatitis': ['perioral'],
        'Healthy_Skin': ['skin.jpg', 'before.jpg', '0_skin'],
    }
    
    # Create category directories
    for category in categories.keys():
        os.makedirs(os.path.join(target_dir, category), exist_ok=True)
    
    # Create "Other" category for uncategorized
    os.makedirs(os.path.join(target_dir, 'Other'), exist_ok=True)
    
    # Organize files
    image_files = [f for f in os.listdir(source_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    categorized_count = {cat: 0 for cat in categories.keys()}
    categorized_count['Other'] = 0
    
    print(f"Found {len(image_files)} images to organize...")
    
    for img_file in tqdm(image_files, desc="Organizing images"):
        img_lower = img_file.lower()
        categorized = False
        
        # Try to categorize
        for category, keywords in categories.items():
            if any(keyword.lower() in img_lower for keyword in keywords):
                src = os.path.join(source_dir, img_file)
                dst = os.path.join(target_dir, category, img_file)
                shutil.copy2(src, dst)
                categorized_count[category] += 1
                categorized = True
                break
        
        # If not categorized, put in "Other" (likely acne-related)
        if not categorized:
            src = os.path.join(source_dir, img_file)
            dst = os.path.join(target_dir, 'Other', img_file)
            shutil.copy2(src, dst)
            categorized_count['Other'] += 1
    
    # Print summary
    print("\nDataset organization complete:")
    for category, count in categorized_count.items():
        print(f"  {category}: {count} images")
    
    return categorized_count


def get_transforms(augment=True):
    """Get data transforms"""
    if augment:
        transform = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.RandomRotation(10),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.15, contrast=0.15),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
    else:
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
    return transform


def create_dataloaders(data_dir, batch_size=32, val_split=0.2):
    """Create training and validation dataloaders"""
    # Create full dataset
    full_dataset = datasets.ImageFolder(data_dir, transform=get_transforms(augment=False))
    
    # Split into train and validation
    dataset_size = len(full_dataset)
    val_size = int(dataset_size * val_split)
    train_size = dataset_size - val_size
    
    train_dataset, val_dataset = torch.utils.data.random_split(
        full_dataset, [train_size, val_size],
        generator=torch.Generator().manual_seed(42)
    )
    
    # Apply different transforms
    train_dataset.dataset.transform = get_transforms(augment=True)
    val_dataset.dataset.transform = get_transforms(augment=False)
    
    # Create dataloaders
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=4)
    
    return train_loader, val_loader, full_dataset.classes


def create_model(num_classes, pretrained=True):
    """Create MobileNetV2 model"""
    model = models.mobilenet_v2(pretrained=pretrained)
    
    # Modify classifier
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, num_classes)
    
    return model


def train_epoch(model, train_loader, criterion, optimizer, device):
    """Train for one epoch"""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    pbar = tqdm(train_loader, desc='Training')
    for inputs, labels in pbar:
        inputs, labels = inputs.to(device), labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item() * inputs.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        
        pbar.set_postfix({'loss': f'{loss.item():.4f}', 'acc': f'{100.*correct/total:.2f}%'})
    
    epoch_loss = running_loss / total
    epoch_acc = 100. * correct / total
    return epoch_loss, epoch_acc


def validate(model, val_loader, criterion, device):
    """Validate the model"""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for inputs, labels in tqdm(val_loader, desc='Validation'):
            inputs, labels = inputs.to(device), labels.to(device)
            
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
    
    epoch_loss = running_loss / total
    epoch_acc = 100. * correct / total
    return epoch_loss, epoch_acc


def plot_metrics(train_losses, train_accs, val_losses, val_accs, save_path):
    """Plot training metrics"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    
    ax1.plot(train_losses, label='Train Loss')
    ax1.plot(val_losses, label='Val Loss')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Loss')
    ax1.set_title('Training and Validation Loss')
    ax1.legend()
    ax1.grid(True)
    
    ax2.plot(train_accs, label='Train Acc')
    ax2.plot(val_accs, label='Val Acc')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Accuracy (%)')
    ax2.set_title('Training and Validation Accuracy')
    ax2.legend()
    ax2.grid(True)
    
    plt.tight_layout()
    plt.savefig(save_path)
    print(f"Metrics plot saved to {save_path}")


def main(args):
    """Main training function"""
    # Setup
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Organize dataset if needed
    organized_dir = 'data/acne_organized'
    if not os.path.exists(organized_dir) or args.reorganize:
        print("\nOrganizing acne dataset...")
        organize_acne_dataset('data/Acne', organized_dir)
    else:
        print(f"\nUsing existing organized dataset at {organized_dir}")
    
    # Create dataloaders
    print("\nLoading data...")
    train_loader, val_loader, classes = create_dataloaders(organized_dir, args.batch_size)
    print(f"Classes: {classes}")
    print(f"Training samples: {len(train_loader.dataset)}")
    print(f"Validation samples: {len(val_loader.dataset)}")
    
    # Create model
    print("\nCreating model...")
    model = create_model(len(classes), pretrained=args.pretrained)
    model = model.to(device)
    
    # Loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=args.lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=3)
    
    # Training loop
    print(f"\nTraining for {args.epochs} epochs...")
    best_acc = 0.0
    train_losses, train_accs = [], []
    val_losses, val_accs = [], []
    
    for epoch in range(args.epochs):
        print(f"\nEpoch {epoch+1}/{args.epochs}")
        
        # Train
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        train_losses.append(train_loss)
        train_accs.append(train_acc)
        
        # Validate
        val_loss, val_acc = validate(model, val_loader, criterion, device)
        val_losses.append(val_loss)
        val_accs.append(val_acc)
        
        # Print stats
        print(f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%")
        print(f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%")
        
        # Learning rate scheduling
        scheduler.step(val_loss)
        
        # Save best model
        if val_acc > best_acc:
            best_acc = val_acc
            model_dir = Path(args.output_dir)
            model_dir.mkdir(parents=True, exist_ok=True)
            
            # Save model
            model_path = model_dir / 'best_model.pth'
            torch.save(model.state_dict(), model_path)
            print(f"✓ Saved best model to {model_path} (acc: {val_acc:.2f}%)")
            
            # Save classes
            classes_path = model_dir / 'classes.json'
            with open(classes_path, 'w') as f:
                json.dump({'classes': classes}, f, indent=2)
            print(f"✓ Saved classes to {classes_path}")
    
    # Plot metrics
    plot_path = Path(args.output_dir) / 'training_metrics.png'
    plot_metrics(train_losses, train_accs, val_losses, val_accs, plot_path)
    
    print(f"\n{'='*60}")
    print(f"Training completed!")
    print(f"Best validation accuracy: {best_acc:.2f}%")
    print(f"Model saved to: {args.output_dir}")
    print(f"{'='*60}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train Acne Detection Model')
    parser.add_argument('--output-dir', type=str, default='models/face_model',
                        help='Path to save trained model')
    parser.add_argument('--epochs', type=int, default=20,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32,
                        help='Batch size for training')
    parser.add_argument('--lr', type=float, default=0.001,
                        help='Learning rate')
    parser.add_argument('--pretrained', action='store_true', default=True,
                        help='Use pretrained ImageNet weights')
    parser.add_argument('--reorganize', action='store_true',
                        help='Force reorganization of dataset')
    parser.add_argument('--quick-test', action='store_true',
                        help='Quick test with 5 epochs')
    
    args = parser.parse_args()
    
    if args.quick_test:
        args.epochs = 5
        print("Quick test mode: training for 5 epochs only")
    
    main(args)
