# Cross-Browser Extension Starter Pack

A comprehensive starter template for building browser extensions that work across Chrome, Firefox, Safari, and Edge.

## 🚀 Features

- **Cross-browser compatibility** - Works on Chrome, Firefox, Edge, and Safari
- **Modern manifest v3** - Uses the latest extension API standards
- **Beautiful popup UI** - Modern, responsive design with gradient styling
- **Content script integration** - Interact with web pages seamlessly
- **Background script** - Handle extension lifecycle and background tasks
- **Context menus** - Right-click functionality on web pages
- **Local storage** - Persist data across browser sessions
- **Notification system** - Show in-page notifications
- **Element highlighting** - Visual page interaction features

## 📁 Project Structure

```
├── manifest.json           # Extension configuration
├── popup/
│   ├── popup.html          # Extension popup interface
│   ├── popup.css           # Popup styling
│   └── popup.js            # Popup functionality
├── content/
│   └── content.js          # Content script for page interaction
├── background/
│   └── background.js       # Background/service worker script
├── icons/
│   ├── icon.svg            # Source SVG icon
│   ├── generate-icons.html # Icon generation tool
│   ├── icon16.png          # 16x16 icon (placeholder)
│   ├── icon32.png          # 32x32 icon (placeholder)
│   ├── icon48.png          # 48x48 icon (placeholder)
│   └── icon128.png         # 128x128 icon (placeholder)
└── README.md               # This file
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

### Popup Interface
- Clean, modern design with gradient styling
- Action buttons for common tasks
- Status display and settings access
- Responsive layout that works across browsers

### Content Script
- Injects into all web pages
- Provides page analysis and interaction capabilities
- Shows in-page notifications
- Highlights page elements
- Communicates with popup and background scripts

### Background Script
- Handles extension installation and updates
- Manages context menus and alarms
- Performs periodic cleanup tasks
- Coordinates between popup and content scripts

### Cross-Browser Compatibility
- Uses Manifest V3 for modern browsers
- Includes fallbacks for different browser APIs
- Consistent behavior across Chrome, Firefox, Edge, and Safari

## 📋 Available Actions

### Popup Actions
- **Take Action**: Demonstrates communication with content script
- **Settings**: Opens extension settings (extensible)

### Context Menu Actions
- **Get Page Info**: Analyzes current page statistics
- **Highlight Headings**: Visually highlights all headings on the page
- **Analyze Selection**: Analyzes selected text

### Content Script Features
- Page information extraction
- Element highlighting with numbered badges
- In-page notification system
- Click tracking and interaction monitoring

## 🔒 Permissions

The extension requests minimal permissions:

- `activeTab`: Access to the currently active tab
- `storage`: Local data storage
- `contextMenus`: Right-click menu integration (implicit)
- `notifications`: System notifications (implicit)

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