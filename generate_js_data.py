#!/usr/bin/env python3
"""
Generate JavaScript gallery data file to avoid CORS issues
"""

import os
import csv
import json
import glob
from pathlib import Path

def generate_js_data():
    # Read the CSV database
    csv_data = {}
    csv_file = 'film_packaging/database.csv'
    
    if os.path.exists(csv_file):
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                filename = row.get('filename', '').strip()
                if filename:
                    csv_data[filename] = row
    
    # Scan archive directory for images
    archive_dir = 'film_packaging/archive'
    image_files = glob.glob(os.path.join(archive_dir, '*.jpg'))
    
    gallery_data = []
    
    for image_path in sorted(image_files):
        filename = os.path.basename(image_path)
        
        # Get data from CSV if available
        if filename in csv_data:
            row = csv_data[filename]
            item = {
                'filename': filename,
                'brand': row.get('brand', 'Unknown'),
                'product': row.get('product', 'Unknown'),
                'film_format': row.get('film_format', 'Unknown'),
                'film_speed_iso': row.get('film_speed_iso', 'Unknown'),
                'process': row.get('process', 'Unknown'),
                'item_type': row.get('item_type', 'Unknown'),
                'author': row.get('author', 'Unknown'),
                'imageUrl': f'film_packaging/archive/{filename}',
                'title': f"{row.get('brand', 'Unknown')} {row.get('product', 'Unknown')}",
                'details': f"{row.get('film_format', 'Unknown')} • ISO {row.get('film_speed_iso', 'Unknown')} • {row.get('process', 'Unknown')} • {row.get('item_type', 'Unknown')}"
            }
        else:
            # Fallback for images not in CSV
            item = {
                'filename': filename,
                'brand': 'Unknown',
                'product': 'Unknown',
                'film_format': 'Unknown',
                'film_speed_iso': 'Unknown',
                'process': 'Unknown',
                'item_type': 'Unknown',
                'author': 'Unknown',
                'imageUrl': f'film_packaging/archive/{filename}',
                'title': f'Unknown Film ({filename})',
                'details': 'Unknown format • Unknown ISO • Unknown process • Unknown type'
            }
        
        gallery_data.append(item)
    
    # Generate JavaScript file
    js_content = f"""// Gallery Data Generator
// This file contains all the gallery data to avoid CORS issues
// Generated from film_packaging/database.csv and archive directory
// Total items: {len(gallery_data)}

const GALLERY_DATA = {json.dumps(gallery_data, indent=2, ensure_ascii=False)};

// Export the data for use in gallery.js
if (typeof module !== 'undefined' && module.exports) {{
    module.exports = GALLERY_DATA;
}} else {{
    window.GALLERY_DATA = GALLERY_DATA;
}}
"""
    
    # Save to JavaScript file
    output_file = 'assets/js/gallery-data.js'
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"Generated JavaScript gallery data for {len(gallery_data)} images")
    print(f"Data saved to: {output_file}")
    
    # Print some stats
    brands = set(item['brand'] for item in gallery_data if item['brand'] != 'Unknown')
    print(f"Found {len(brands)} brands: {', '.join(sorted(brands))}")
    
    return gallery_data

if __name__ == '__main__':
    generate_js_data() 