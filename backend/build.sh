#!/bin/bash
set -e

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Build complete! No migrations needed - using Beanie/MongoDB (schema-less)."
