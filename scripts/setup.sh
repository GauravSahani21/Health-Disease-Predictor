#!/bin/bash

# Health Predictor Setup Script
# This script sets up the development environment

set -e

echo "🏥 Health Predictor - Development Setup"
echo "========================================"

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose found"

# Create environment files
echo ""
echo "Setting up environment files..."

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
else
    echo "⚠️  backend/.env already exists"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env"
else
    echo "⚠️  frontend/.env already exists"
fi

# Create necessary directories
echo ""
echo "Creating directories..."
mkdir -p ml_text/models
mkdir -p ml_image/models
mkdir -p backend/logs
echo "✅ Directories created"

# Pull images
echo ""
echo "Pulling Docker images (this may take a while)..."
docker-compose -f docker-compose.dev.yml pull

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  docker-compose -f docker-compose.dev.yml up --build"
echo ""
echo "Services will be available at:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:5000"
echo "  Text ML:   http://localhost:8001/docs"
echo "  Image ML:  http://localhost:8002/docs"
echo "  MinIO:     http://localhost:9001"
