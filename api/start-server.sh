#!/bin/bash
# Quick start script for Email API server

echo "📧 Starting GST Buddy Email API Server..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node -v)"
echo ""

# Navigate to api folder
cd "$(dirname "$0")"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install express cors axios dotenv
    echo ""
fi

# Start the server
echo "🚀 Starting server..."
echo ""
node server.js
