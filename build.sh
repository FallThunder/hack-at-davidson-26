#!/bin/bash

# Cross-Browser Extension Build Script
# This script helps package the extension for different browsers

echo "🚀 Cross-Browser Extension Builder"
echo "=================================="

# Create build directory
mkdir -p build

# Function to create Chrome/Edge build
build_chrome() {
    echo "📦 Building for Chrome/Edge..."
    
    # Create Chrome build directory
    mkdir -p build/chrome
    
    # Copy all files except Firefox-specific ones
    cp -r popup build/chrome/
    cp -r content build/chrome/
    cp -r background build/chrome/
    cp -r icons build/chrome/
    cp manifest.json build/chrome/
    
    # Create ZIP package
    cd build/chrome
    zip -r ../chrome-extension.zip . -x "*.DS_Store"
    cd ../..
    
    echo "✅ Chrome/Edge build complete: build/chrome-extension.zip"
}

# Function to create Firefox build
build_firefox() {
    echo "🦊 Building for Firefox..."
    
    # Create Firefox build directory
    mkdir -p build/firefox
    
    # Copy all files
    cp -r popup build/firefox/
    cp -r content build/firefox/
    cp -r background build/firefox/
    cp -r icons build/firefox/
    
    # Use Firefox-specific manifest
    cp manifest-firefox.json build/firefox/manifest.json
    
    # Create ZIP package
    cd build/firefox
    zip -r ../firefox-extension.zip . -x "*.DS_Store"
    cd ../..
    
    echo "✅ Firefox build complete: build/firefox-extension.zip"
}

# Function to create Safari build
build_safari() {
    echo "🧭 Building for Safari..."
    echo "⚠️  Safari requires additional conversion using Xcode"
    echo "    1. Use the Chrome build as a base"
    echo "    2. Open Xcode and create a new Safari Extension project"
    echo "    3. Import the extension files"
    echo "    4. Build and sign the Safari extension"
    
    # For now, just copy Chrome build
    mkdir -p build/safari
    cp -r build/chrome/* build/safari/ 2>/dev/null || build_chrome
    cp -r build/chrome/* build/safari/
    
    echo "📋 Safari base files ready in build/safari/"
}

# Function to clean build directory
clean() {
    echo "🧹 Cleaning build directory..."
    rm -rf build
    echo "✅ Build directory cleaned"
}

# Main menu
case "$1" in
    "chrome")
        build_chrome
        ;;
    "firefox")
        build_firefox
        ;;
    "safari")
        build_safari
        ;;
    "all")
        echo "🔨 Building for all browsers..."
        build_chrome
        build_firefox
        build_safari
        echo ""
        echo "🎉 All builds complete!"
        echo "   Chrome/Edge: build/chrome-extension.zip"
        echo "   Firefox:     build/firefox-extension.zip"
        echo "   Safari:      build/safari/ (requires Xcode conversion)"
        ;;
    "clean")
        clean
        ;;
    *)
        echo "Usage: $0 {chrome|firefox|safari|all|clean}"
        echo ""
        echo "Commands:"
        echo "  chrome   - Build for Chrome/Edge"
        echo "  firefox  - Build for Firefox"
        echo "  safari   - Prepare for Safari (requires Xcode)"
        echo "  all      - Build for all browsers"
        echo "  clean    - Clean build directory"
        echo ""
        echo "Examples:"
        echo "  $0 chrome"
        echo "  $0 all"
        exit 1
        ;;
esac