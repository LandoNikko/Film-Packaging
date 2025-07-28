# Film Packaging Gallery System

## Overview
The gallery dynamically loads all images from the `film_packaging/archive/` directory without hardcoding filenames.

## How It Works

### 1. Dynamic Data Generation
- **`generate_gallery_data.py`** - Python script that scans the archive directory
- **Scans all `.jpg` files** in `film_packaging/archive/`
- **Matches with CSV data** from `film_packaging/database.csv`
- **Generates JSON file** at `assets/js/gallery-data.json`

### 2. Gallery Loading
- **Primary**: Loads from `assets/js/gallery-data.json` (fastest)
- **Fallback**: Loads from `film_packaging/database.csv` (if JSON fails)
- **Emergency**: Uses sample data (if both fail)

### 3. Features
- ✅ **152 images** loaded dynamically
- ✅ **27 brands** with filtering
- ✅ **Search functionality** across all fields
- ✅ **Grid/List view** switching
- ✅ **Lightbox** with navigation
- ✅ **Responsive design**

## Usage

### To Update Gallery Data:
```bash
# Run the Python script
python generate_gallery_data.py

# Or use the batch file (Windows)
update_gallery.bat
```

### To Add New Images:
1. Add images to `film_packaging/archive/`
2. Add data to `film_packaging/database.csv`
3. Run `python generate_gallery_data.py`
4. Gallery automatically includes new images

## File Structure
```
├── generate_gallery_data.py    # Generates gallery data
├── update_gallery.bat          # Windows batch script
├── gallery.html                # Gallery page
├── assets/
│   ├── css/gallery.css         # Gallery styles
│   └── js/
│       ├── gallery.js          # Gallery functionality
│       └── gallery-data.json   # Generated data (152 items)
└── film_packaging/
    ├── archive/                # Image files (152 .jpg)
    └── database.csv            # Metadata
```

## GitHub Pages Compatibility
- ✅ **Static files** work perfectly
- ✅ **JSON loading** is fast and reliable
- ✅ **No server-side processing** required
- ✅ **All 152 images** will load on deployment

## Performance
- **JSON loading**: ~1-2 seconds
- **Image lazy loading**: Progressive loading
- **Caching**: Browser caches JSON and images
- **Fallback system**: Always works even if files fail

## Troubleshooting
- **No images showing**: Run `python generate_gallery_data.py`
- **Missing metadata**: Check `film_packaging/database.csv`
- **Slow loading**: Images are large, consider compression
- **CORS errors**: Use local server for development 