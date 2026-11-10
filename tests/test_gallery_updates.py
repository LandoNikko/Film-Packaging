import json
import tempfile
import unittest
from pathlib import Path

from gallery_updates import load_updates, record_additions


class GalleryUpdateTests(unittest.TestCase):
    def test_only_new_scans_receive_arrival_dates(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'gallery_updates.json'
            first = record_additions(['00001_000.jpg'], added_at=1700000000, path=path)
            self.assertEqual(first, {'00001_000.jpg': 1700000000})
            second = record_additions(['00001_000.jpg', '00001_001.jpg'],
                                      added_at=1700604800, path=path)
            self.assertEqual(second, {'00001_000.jpg': 1700000000, '00001_001.jpg': 1700604800})
            before = path.read_bytes()
            record_additions([], added_at=1701209600, path=path)
            self.assertEqual(path.read_bytes(), before)

    def test_empty_sync_does_not_create_a_new_batch(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'gallery_updates.json'
            self.assertEqual(record_additions([], path=path), {})
            self.assertFalse(path.exists())

    def test_invalid_history_fails_instead_of_resetting_badge_dates(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'gallery_updates.json'
            for invalid in [[], {'00001_000.jpg': 'yesterday'},
                            {'00001_000.jpg': -1}, {'wrong-filename': 1700000000}]:
                with self.subTest(invalid=invalid):
                    path.write_text(json.dumps(invalid), encoding='utf-8')
                    with self.assertRaises(ValueError):
                        load_updates(path)


if __name__ == '__main__':
    unittest.main()
