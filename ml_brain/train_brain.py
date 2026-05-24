#!/usr/bin/env python3
"""
Brain MRI Tumor Classification Training Script
Trains EfficientNet-B1 on brain MRI dataset with 4 classes:
- glioma
- meningioma
- notumor
- pituitary
"""

import os
import json
import argparse
from pathlib import Path
import time

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
from tqdm import tqdm
import matplotlib.pyplot as plt

# Set random seed for reproducibility
torch.manual_seed(42)


def get_transforms(augment=True):
    """Get data transforms for training and validation"""
    if augment:
        transform = transforms.Compose([
            transforms.Resize((240, 240)),
            transforms.RandomRotation(15),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
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


def create_dataloaders(data_dir, batch_size=32):
    """Create training and validation dataloaders"""
    train_dir = os.path.join(data_dir, 'Training')
    test_dir = os.path.join(data_dir, 'Testing')
    
    # Create datasets
    train_dataset = datasets.ImageFolder(train_dir, transform=get_transforms(augment=True))
    test_dataset = datasets.ImageFolder(test_dir, transform=get_transforms(augment=False))
    
    # Create dataloaders
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=4)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=4)
    
    return train_loader, test_loader, train_dataset.classes


def create_model(num_classes, pretrained=True):
    """Create EfficientNet-B1 model"""
    model = models.efficientnet_b1(pretrained=pretrained)
    
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


def validate(model, test_loader, criterion, device):
    """Validate the model"""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for inputs, labels in tqdm(test_loader, desc='Validation'):
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
    
    # Loss plot
    ax1.plot(train_losses, label='Train Loss')
    ax1.plot(val_losses, label='Val Loss')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Loss')
    ax1.set_title('Training and Validation Loss')
    ax1.legend()
    ax1.grid(True)
    
    # Accuracy plot
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
    
    # Create dataloaders
    print("Loading data...")
    train_loader, test_loader, classes = create_dataloaders(args.data_dir, args.batch_size)
    print(f"Classes: {classes}")
    print(f"Training samples: {len(train_loader.dataset)}")
    print(f"Validation samples: {len(test_loader.dataset)}")
    
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
        val_loss, val_acc = validate(model, test_loader, criterion, device)
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
            
            # Save model state dict
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
    parser = argparse.ArgumentParser(description='Train Brain MRI Tumor Classification Model')
    parser.add_argument('--data-dir', type=str, default='data',
                        help='Path to data directory containing Training and Testing folders')
    parser.add_argument('--output-dir', type=str, default='models/brain_model',
                        help='Path to save trained model')
    parser.add_argument('--epochs', type=int, default=25,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32,
                        help='Batch size for training')
    parser.add_argument('--lr', type=float, default=0.001,
                        help='Learning rate')
    parser.add_argument('--pretrained', action='store_true', default=True,
                        help='Use pretrained ImageNet weights')
    parser.add_argument('--quick-test', action='store_true',
                        help='Quick test with 5 epochs')
    
    args = parser.parse_args()
    
    # Quick test mode
    if args.quick_test:
        args.epochs = 5
        print("Quick test mode: training for 5 epochs only")
    
    main(args)
