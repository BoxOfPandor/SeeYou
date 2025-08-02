# 🗂️ SeeYou | Blob Downloader Overlay

A simple and efficient Chrome extension to detect and download blob files from any web page.

## 🚀 Features

- **Automatic detection**: Scans and finds all blobs present on the page
- **Overlay interface**: Non-intrusive floating interface with toggle button
- **Individual download**: Download blobs one by one with preview
- **Batch download**: Download all found blobs at once
- **Multi-format support**: Images, videos, audio, PDF and other files
- **Direct URL**: Manual input of blob URL or object ID

## 📋 Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right corner)
4. Click "Load unpacked extension"
5. Select the folder containing the extension files

## 🎯 Usage

### Via floating icon
- A 📁 button appears in the top right of pages
- Click it to open/close the overlay

### Via extension popup
- Click the extension icon in the toolbar
- Use the quick action buttons

### Scan and download
1. Click **🔍 Scan blobs** to detect files
2. Use **👁️** to preview a blob
3. Use **↓** to download a specific blob
4. Or **📦 Download all** to get everything

### Manual input
- Enter a complete blob URL or just the object ID
- Click **📥 Download**

## ⚙️ Settings

- **Floating icon**: Enable/disable button display on pages
- **Keyboard shortcut**: Escape to close overlay

## 🛠️ Structure

```
seeyou/
├── manifest.json      # Extension configuration
├── background.js      # Service worker
├── content.js         # Script injected into pages
├── injected.js        # Script executed in page context
├── popup.html         # Popup interface
├── popup.js          # Popup logic
└── overlay.css       # Overlay styles
```

## 🔧 Development

The extension uses Manifest V3 and works by injecting code into web pages to intercept blob URL creation and enable their download.

## 📄 License

Free to use - Personal project
