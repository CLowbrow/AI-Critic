#!/bin/bash
# Quick activation script for AI-Critic Python environment

if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run ./setup_python.sh first"
    exit 1
fi

echo "🐍 Activating AI-Critic Python environment..."
source venv/bin/activate

echo "✅ Python environment active!"
echo "💡 You can now run: python src/python/audio2face_unreal.py"
echo "💡 To deactivate: deactivate"

# Keep shell open in activated environment
exec bash