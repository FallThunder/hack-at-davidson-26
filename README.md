# Smart Page Analyzer

An intelligent browser extension that automatically detects news articles and analyzes website popularity across all major browsers.

## 🚀 Features

- **🤖 Intelligent News Detection** - Automatically identifies news articles with confidence scoring
- **🌟 Site Popularity Analysis** - Categorizes websites from major to unknown based on multiple factors
- **📊 Real-time Analysis** - Instant page analysis with detailed metrics and insights
- **🔍 Content Intelligence** - Analyzes article structure, metadata, and content patterns
- **🎯 Smart Notifications** - Alerts for high-confidence news on lesser-known sites
- **📱 Beautiful Interface** - Modern, responsive popup with detailed analysis results
- **🌐 Cross-browser compatibility** - Works on Chrome, Firefox, Edge, and Safari
- **⚡ Performance Optimized** - Efficient analysis with intelligent caching

## 📁 Project Structure

```
├── manifest.json              # Extension configuration (Manifest V3)
├── manifest-firefox.json     # Firefox-compatible manifest (V2)
├── popup/
│   ├── popup.html            # Analysis results interface
│   ├── popup.css             # Modern UI styling
│   └── popup.js              # Analysis display logic
├── content/
│   ├── content-analyzer.js   # Intelligent content analysis engine
│   └── content.js            # Content script integration
├── background/
│   ├── background.js         # Chrome/Edge background script
│   └── background-firefox.js # Firefox-compatible background script
├── icons/
│   ├── icon.svg              # Source SVG icon
│   ├── generate-icons.html   # Icon generation tool
│   └── icon*.png             # Generated icons (16, 32, 48, 128px)
├── build.sh                  # Cross-browser build script
├── package.json              # Project configuration
└── README.md                 # This documentation
```

## 🛠️ Installation & Development

### Chrome/Edge Installation

1. Open Chrome/Edge and navigate to `chrome://extensions/` or `edge://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this directory
4. The extension will appear in your toolbar

### Firefox Installation

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this directory

### Safari Installation

1. Open Safari and go to Safari > Preferences > Advanced
2. Check "Show Develop menu in menu bar"
3. Go to Develop > Allow Unsigned Extensions
4. Convert to Safari extension format (requires Xcode)

## 🎨 Customization

### Icons

The extension includes placeholder icons. To create proper icons:

1. Open `icons/generate-icons.html` in your browser
2. Click "Generate Icons" to create PNG versions from the SVG
3. Download each size (16px, 32px, 48px, 128px)
4. Replace the placeholder PNG files in the `icons/` directory

### Styling

- Modify `popup/popup.css` to change the popup appearance
- Update the gradient colors in the CSS variables
- Customize the notification styles in `content/content.js`

### Functionality

- **Popup actions**: Edit `popup/popup.js` to add new button behaviors
- **Page interactions**: Modify `content/content.js` to add new page manipulation features
- **Background tasks**: Update `background/background.js` for extension lifecycle management
- **Context menus**: Add new right-click options in the background script

## 🔧 Key Features Explained

### 🤖 Intelligent News Detection
The extension uses multiple analysis techniques to identify news articles:

- **Structured Data Analysis** - Parses JSON-LD and meta tags for article information
- **Content Pattern Recognition** - Analyzes article structure, word count, and formatting
- **URL Pattern Analysis** - Detects news-specific URL patterns and date structures
- **Element Detection** - Identifies bylines, timestamps, and news-specific CSS classes
- **Confidence Scoring** - Provides 0-100% confidence ratings for news detection

### 🌟 Site Popularity Analysis
Multi-factor analysis to determine website popularity and credibility:

- **Domain Recognition** - Database of major news outlets and popular websites
- **Domain Characteristics** - TLD analysis, domain length, and structure patterns
- **Performance Metrics** - Load times, SSL status, and technical indicators
- **Social Presence** - Detection of social media integration and sharing features

### 📊 Real-time Analysis Interface
Modern popup interface displaying:

- **News Article Status** - Visual indicators with confidence percentages
- **Site Popularity Badges** - Color-coded popularity levels (Major, Established, Moderate, Emerging, Unknown)
- **Article Metadata** - Author, publish date, word count, and paragraph analysis
- **Site Metrics** - Performance data, security status, and technical details

### 🎯 Smart Notifications
- **Badge Indicators** - Extension icon shows 📰 for detected news articles
- **Desktop Notifications** - Alerts for high-confidence news on lesser-known sites
- **Contextual Information** - Hover tooltips with analysis summaries

## 📋 Available Actions

### Popup Interface
- **Automatic Analysis**: Page analysis runs automatically when popup opens
- **Re-analyze Page**: Force refresh of analysis for dynamic content
- **Take Action**: Perform custom actions on the current page
- **Settings**: Access extension configuration options

### Context Menu Actions
- **Get Page Info**: Detailed page statistics and metadata
- **Highlight Headings**: Visual highlighting of page structure
- **Analyze Selection**: Text analysis for selected content

### Analysis Features
- **News Article Detection**: Automatic identification with confidence scoring
- **Site Popularity Assessment**: Categorization from major to unknown sites
- **Content Metrics**: Word count, paragraph analysis, and structure evaluation
- **Performance Analysis**: Load times, SSL status, and technical metrics
- **Metadata Extraction**: Author information, publish dates, and article data

## 🔒 Permissions

The extension requests minimal permissions for maximum privacy:

- **`activeTab`**: Access to analyze the currently active tab only
- **`storage`**: Local data storage for analysis caching and settings
- **`notifications`**: Desktop notifications for interesting findings
- **`contextMenus`**: Right-click menu integration (implicit)

**Privacy Note**: All analysis is performed locally in your browser. No data is sent to external servers.

## 🚀 Publishing

### Chrome Web Store
1. Create a developer account at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Package your extension as a ZIP file
3. Upload and fill out the store listing
4. Submit for review

### Firefox Add-ons
1. Create an account at [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
2. Package as a ZIP file
3. Upload and complete the listing
4. Submit for review

### Edge Add-ons
1. Register at [Microsoft Edge Add-ons Developer Portal](https://partner.microsoft.com/dashboard/microsoftedge/)
2. Follow similar process to Chrome Web Store
3. Submit for review

## 🛠️ Development Tips

1. **Testing**: Use the browser's extension developer tools for debugging
2. **Reload**: Remember to reload the extension after making changes
3. **Console**: Check both the popup console and background script console
4. **Permissions**: Add new permissions to `manifest.json` as needed
5. **Storage**: Use `chrome.storage.local` for persistent data

## 📝 License

This starter pack is provided as-is for educational and development purposes. Feel free to modify and use for your own projects.

## 🤝 Contributing

This is a starter template. Feel free to fork and customize for your specific needs!

---

**Happy Extension Building!** 🎉