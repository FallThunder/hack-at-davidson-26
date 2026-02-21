#!/bin/bash

# Chrome/Firefox Extension Build Script
# This script helps package the extension for Chrome/Chromium and Firefox browsers

echo "🚀 Smart Page Analyzer - Extension Builder"
echo "=========================================="

# Create build directory
mkdir -p build

# Function to create Chrome/Chromium build
build_chrome() {
    echo "📦 Building for Chrome/Chromium browsers (Chrome, Edge, Brave, Opera, etc.)..."
    
    # Create Chrome build directory
    mkdir -p build/chrome
    
    # Copy all files except Firefox-specific ones
    cp -r popup build/chrome/
    cp -r content build/chrome/
    cp -r background build/chrome/
    cp -r icons build/chrome/
    cp manifest.json build/chrome/
    
    # Remove Firefox-specific background script from Chrome build
    rm -f build/chrome/background/background-firefox.js
    
    # Create ZIP package
    cd build/chrome
    zip -r ../chrome-extension.zip . -x "*.DS_Store" "*.git*"
    cd ../..
    
    echo "✅ Chrome/Chromium build complete: build/chrome-extension.zip"
    echo "   Compatible with: Chrome, Edge, Brave, Opera, Vivaldi, Arc, and other Chromium browsers"
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

# Function to show development instructions
dev_setup() {
    echo "🛠️  Development Setup Instructions"
    echo ""
    echo "Chrome/Chromium Development:"
    echo "  1. Open Chrome and go to chrome://extensions/"
    echo "  2. Enable 'Developer mode' in the top right"
    echo "  3. Click 'Load unpacked' and select the project directory"
    echo "  4. The extension will appear in your toolbar"
    echo ""
    echo "Firefox Development:"
    echo "  1. Open Firefox and go to about:debugging"
    echo "  2. Click 'This Firefox'"
    echo "  3. Click 'Load Temporary Add-on'"
    echo "  4. Select the manifest-firefox.json file"
    echo ""
    echo "For production builds, use: $0 chrome or $0 firefox"
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
        echo "🔨 Building for all supported browsers..."
        build_chrome
        build_firefox
        echo ""
        echo "🎉 All builds complete!"
        echo "   Chrome/Chromium: build/chrome-extension.zip"
        echo "   Firefox:         build/firefox-extension.zip"
        ;;
    "clean")
        clean
        ;;
    "dev")
        dev_setup
        ;;
    *)
        echo "Usage: $0 {chrome|firefox|all|dev|clean}"
        echo ""
        echo "Commands:"
        echo "  chrome   - Build for Chrome/Chromium browsers"
        echo "  firefox  - Build for Firefox"
        echo "  all      - Build for both Chrome and Firefox"
        echo "  dev      - Show development setup instructions"
        echo "  clean    - Clean build directory"
        echo ""
        echo "Examples:"
        echo "  $0 chrome    # Build Chrome extension"
        echo "  $0 all       # Build both versions"
        echo "  $0 dev       # Show setup instructions"
        exit 1
        ;;
esac