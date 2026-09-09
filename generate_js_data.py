#!/usr/bin/env python3
"""
Generate JavaScript gallery data file to avoid CORS issues
"""

import csv
import json
from pathlib import Path

CSV_FILE = Path('film_packaging/database.csv')
ARCHIVE_DIR = Path('film_packaging/archive')
OUTPUT_FILE = Path('assets/js/gallery-data.js')

# These images exist in the archive but have no entry in either the local or
# upstream catalogue. Keep them visible as fallback cards, while failing for
# every other missing record so metadata is never silently discarded.
INTENTIONALLY_UNMAPPED_FILENAMES = frozenset({
    '00003_000.jpg',
    '00003_001.jpg',
    '00153_001.jpg',
    '00312_000.jpg',
    '00574_001.jpg',
})


def load_csv_data(csv_file):
    if not csv_file.is_file():
        raise FileNotFoundError(f'Gallery database not found: {csv_file}')

    csv_data = {}
    duplicate_filenames = []

    with csv_file.open('r', encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f):
            filename = row.get('filename', '').strip()
            if not filename:
                continue
            if filename in csv_data:
                duplicate_filenames.append(filename)
                continue
            csv_data[filename] = row

    if duplicate_filenames:
        duplicates = ', '.join(sorted(set(duplicate_filenames)))
        raise ValueError(f'Duplicate filename entries in {csv_file}: {duplicates}')

    return csv_data


def validate_archive_mappings(image_files, csv_data):
    archive_filenames = {image_path.name for image_path in image_files}
    unmapped_filenames = archive_filenames - csv_data.keys()
    unexpected_filenames = unmapped_filenames - INTENTIONALLY_UNMAPPED_FILENAMES

    if unexpected_filenames:
        missing = ', '.join(sorted(unexpected_filenames))
        raise ValueError(
            'Archive images have no database metadata. Add their CSV records '
            f'before generating gallery data: {missing}'
        )

    stale_exceptions = INTENTIONALLY_UNMAPPED_FILENAMES - unmapped_filenames
    if stale_exceptions:
        stale = ', '.join(sorted(stale_exceptions))
        raise ValueError(
            'The intentional-unmapped allow-list is stale. Remove records '
            f'that now have metadata or no longer exist: {stale}'
        )

    return unmapped_filenames


def generate_js_data():
    csv_data = load_csv_data(CSV_FILE)
    image_files = sorted(ARCHIVE_DIR.glob('*.jpg'))
    intentionally_unmapped = validate_archive_mappings(image_files, csv_data)
    
    gallery_data = []
    
    for image_path in image_files:
        filename = image_path.name
        
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
                'expiry_date': row.get('expiry_date', 'Unknown'),
                'date_added': row.get('date_added', ''),
                'item_type': row.get('item_type', 'Unknown'),
                'author': row.get('author', 'Unknown'),
                'imageUrl': f'/film_packaging/archive/{filename}',
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
                'expiry_date': 'Unknown',
                'date_added': '',
                'item_type': 'Unknown',
                'author': 'Unknown',
                'imageUrl': f'/film_packaging/archive/{filename}',
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
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    with OUTPUT_FILE.open('w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"Generated JavaScript gallery data for {len(gallery_data)} images")
    print(f"Data saved to: {OUTPUT_FILE}")
    if intentionally_unmapped:
        filenames = ', '.join(sorted(intentionally_unmapped))
        print(f"Kept {len(intentionally_unmapped)} intentional fallback records: {filenames}")
    
    # Print some stats
    brands = set(item['brand'] for item in gallery_data if item['brand'] != 'Unknown')
    print(f"Found {len(brands)} brands: {', '.join(sorted(brands))}")
    
    return gallery_data

if __name__ == '__main__':
    generate_js_data() 