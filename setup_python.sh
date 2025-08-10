#!/bin/bash
# Python environment setup script for AI-Critic

set -e  # Exit on any error

echo "🐍 Setting up Python environment for AI-Critic"

# Check if python3.9 is available
if ! command -v python3.9 &> /dev/null; then
    echo "❌ python3.9 not found. Please install Python 3.9:"
    echo "   sudo apt install python3.9 python3.9-venv python3.9-dev"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment with Python 3.9..."
    python3.9 -m venv venv
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install Python dependencies
echo "📚 Installing Python dependencies..."
cd src/python
pip install -r requirements.txt

# Install NVIDIA ACE SDK if wheel exists
if [ -f "../../workspace/proto/sample_wheel/nvidia_ace-1.2.0-py3-none-any.whl" ]; then
    echo "🎯 Installing NVIDIA ACE SDK..."
    pip install ../../workspace/proto/sample_wheel/nvidia_ace-1.2.0-py3-none-any.whl
else
    echo "⚠️  NVIDIA ACE SDK wheel not found at workspace/proto/sample_wheel/"
    echo "   This is needed for Audio2Face integration"
fi

cd ../..

echo ""
echo "✅ Python environment setup complete!"
echo ""
echo "🚀 To use the environment:"
echo "   source venv/bin/activate"
echo "   python src/python/audio2face_unreal.py --help"
echo ""
echo "💡 To deactivate when done:"
echo "   deactivate"