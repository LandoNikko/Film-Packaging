import contextlib
import csv
import hashlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

import generate_js_data as generator
from image_urls import full_size_url


class GalleryGenerationTests(unittest.TestCase):
    def test_future_imports_get_remote_originals_and_missing_local_thumbnails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archive = root / 'archive'
            lowres = root / 'lowres'
            archive.mkdir()
            lowres.mkdir()
            csv_file = root / 'database.csv'
            output = root / 'gallery-data.js'
            fields = ['filename', 'brand', 'product', 'date_added']
            rows = [dict(filename='00001_000.jpg', brand='Local override', product='Film', date_added='1600000000')]

            def write_csv():
                with csv_file.open('w', encoding='utf-8', newline='') as file:
                    writer = csv.DictWriter(file, fieldnames=fields)
                    writer.writeheader()
                    writer.writerows(rows)

            for filename in ['00001_000.jpg', '00001_001.jpg']:
                Image.new('RGB', (1600, 1200), 'white').save(archive / filename)
            existing = lowres / '00001_000.jpg'
            existing.write_bytes(b'Existing upstream thumbnail is preserved')
            arrivals = {'00001_000.jpg': 1700000000}
            write_csv()
            with mock.patch.multiple(generator, CSV_FILE=csv_file, ARCHIVE_DIR=archive,
                                     LOWRES_DIR=lowres, OUTPUT_FILE=output,
                                     INTENTIONALLY_UNMAPPED_FILENAMES=frozenset({'00001_001.jpg'})), \
                    mock.patch.object(generator, 'load_updates', return_value=arrivals), \
                    contextlib.redirect_stdout(io.StringIO()):
                data = generator.generate_js_data()
                self.assertEqual(existing.read_bytes(), b'Existing upstream thumbnail is preserved')
                self.assertEqual(data[0]['brand'], 'Local override')
                self.assertEqual(data[0]['first_seen_at'], 1700000000)
                self.assertEqual(data[1]['imageUrl'], full_size_url('00001_001.jpg'))
                self.assertEqual(data[1]['thumbnailUrl'], '/film_packaging/lowres/00001_001.jpg')
                with Image.open(lowres / '00001_001.jpg') as thumbnail:
                    self.assertEqual(thumbnail.size, (800, 600))

                # Simulate a later weekly import, with an older upstream date_added.
                rows.append(dict(filename='00002_000.jpg', brand='New scan', product='Film', date_added='1600000000'))
                Image.new('RGB', (1200, 1800), 'white').save(archive / '00002_000.jpg')
                arrivals['00002_000.jpg'] = 1700604800
                write_csv()
                data = generator.generate_js_data()
                self.assertEqual(data[-1]['imageUrl'], full_size_url('00002_000.jpg'))
                self.assertEqual(data[-1]['thumbnailUrl'], '/film_packaging/lowres/00002_000.jpg')
                self.assertEqual(data[-1]['first_seen_at'], 1700604800)
                with Image.open(lowres / '00002_000.jpg') as thumbnail:
                    self.assertLessEqual(max(thumbnail.size), 800)
                digest = hashlib.sha256(output.read_bytes()).digest()
                generator.generate_js_data()
                self.assertEqual(hashlib.sha256(output.read_bytes()).digest(), digest)


if __name__ == '__main__':
    unittest.main()
