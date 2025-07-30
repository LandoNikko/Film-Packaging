# 🚀 Automatic Gallery Refresh System

## Overview
The gallery automatically detects new files and refreshes the data using GitHub Actions.

## How It Works

### 1. **GitHub Actions Workflow** (`.github/workflows/auto-update-gallery.yml`)
- **Triggers**: Automatically runs when files are pushed to:
  - `film_packaging/archive/**` (new images)
  - `film_packaging/database.csv` (updated metadata)
  - `generate_js_data.py` (script changes)
- **Process**: 
  1. Sets up Python environment
  2. Runs `python generate_js_data.py`
  3. Commits updated `gallery-data.js` back to repository
- **Manual Trigger**: Can also be triggered manually via GitHub Actions tab

### 2. **Frontend Auto-Detection** (`assets/js/gallery.js`)
- **Periodic Check**: Every hour, checks for updated `gallery-data.js`
- **Smart Reload**: Only refreshes if new data is detected
- **Silent Updates**: No visual notifications, seamless experience
- **Manual Override**: Refresh button available for immediate updates

## Usage

### For Contributors:
1. **Add new images** to `film_packaging/archive/`
2. **Update metadata** in `film_packaging/database.csv`
3. **Push to GitHub** - that's it!

### For Users:
- **Automatic**: Gallery refreshes automatically every hour
- **Manual**: Click the "Refresh" button in the gallery controls for immediate updates
- **Development**: Manual refresh essential for testing new content

## Technical Details

### Workflow Triggers:
```yaml
on:
  push:
    paths:
      - 'film_packaging/archive/**'
      - 'film_packaging/database.csv'
      - 'generate_js_data.py'
  workflow_dispatch:  # Manual trigger
```

### Auto-Refresh Logic:
```javascript
// Check every hour
setInterval(async () => {
    const response = await fetch('assets/js/gallery-data.js?' + Date.now());
    if (response.ok) {
        await this.reloadGalleryData();
    }
}, 60 * 60 * 1000);
```

### Manual Refresh:
```javascript
// Currently via refresh button in gallery controls
// Only used for development and immediate updates
```

## Troubleshooting

### If Auto-Refresh Isn't Working:
1. Check GitHub Actions tab for workflow status
2. Verify `gallery-data.js` was updated
3. Check browser console for errors
4. Try manual refresh button

### If Workflow Fails:
1. Check repository permissions for GitHub Actions
2. Verify Python script dependencies
3. Check workflow logs for specific errors