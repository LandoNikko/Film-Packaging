import contextlib
import csv
import io
import subprocess
import tempfile
import unittest
from pathlib import Path

from generate_js_data import INTENTIONALLY_UNMAPPED_FILENAMES, validate_archive_mappings
from gallery_updates import load_updates
from sync_upstream import merge_upstream, read_catalogue, reconcile_catalogues


def catalogue(rows, extra_fields=()):
    output = io.StringIO(newline='')
    writer = csv.DictWriter(
        output, fieldnames=['index', 'sub_index', 'filename', 'brand', 'quantity', *extra_fields],
        lineterminator='\n',
    )
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()


def row(index, brand='Upstream', quantity='36exp', **extra):
    return dict(index=str(index), sub_index='0', filename=f'{index:05}_000.jpg',
                brand=brand, quantity=quantity, **extra)


class CatalogueTests(unittest.TestCase):
    def test_schema_migration_preserves_overrides_and_adds_upstream_rows(self):
        local = catalogue([row(1, brand='Local', quantity='12 Sheets'), row(3)], ['notes'])
        upstream = catalogue([
            row(1, quantity='24', unit='exp', new_column='new metadata'),
            row(2, quantity='100', unit='ft', new_column='another value'),
        ], ['unit', 'new_column'])
        content, additions, overrides = reconcile_catalogues(local, upstream)
        fields, rows = read_catalogue(content, 'result')
        self.assertEqual(additions, 1)
        self.assertEqual(overrides, 1)
        self.assertEqual(list(rows), ['00001_000.jpg', '00002_000.jpg', '00003_000.jpg'])
        self.assertEqual(rows['00001_000.jpg']['brand'], 'Local')
        self.assertEqual(rows['00001_000.jpg']['quantity'], '12')
        self.assertEqual(rows['00001_000.jpg']['unit'], 'sheets')
        self.assertEqual(rows['00001_000.jpg']['new_column'], 'new metadata')
        self.assertEqual(rows['00002_000.jpg']['unit'], 'ft')
        self.assertIn('notes', fields)
        self.assertEqual(reconcile_catalogues(content, upstream)[0], content)

    def test_numeric_decimal_and_unknown_quantities(self):
        local = catalogue([row(1, quantity='7.5m'), row(2, quantity='Unknown'),
                           row(3, quantity='N/A'), row(4, quantity='24')])
        upstream = catalogue([row(1, quantity='7.5', unit='m')], ['unit'])
        content, _, _ = reconcile_catalogues(local, upstream)
        _, rows = read_catalogue(content, 'result')
        self.assertEqual([(item['quantity'], item['unit']) for item in rows.values()],
                         [('7.5', 'm'), ('Unknown', ''), ('N/A', ''), ('24', '')])

    def test_invalid_catalogues_fail_instead_of_discarding_metadata(self):
        valid = catalogue([row(1)])
        cases = [catalogue([row(1), row(1)]), valid + '2,0,00002_000.jpg\n',
                 catalogue([dict(row(1), filename='00002_000.jpg')]), valid.splitlines()[0]]
        for invalid in cases:
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                reconcile_catalogues(invalid, valid)

    def test_known_unmapped_scan_is_allowed_but_new_missing_records_fail(self):
        images = [Path(name) for name in INTENTIONALLY_UNMAPPED_FILENAMES]
        self.assertIn('00755_001.jpg', validate_archive_mappings(images, {}))
        with self.assertRaisesRegex(ValueError, '00999_000.jpg'):
            validate_archive_mappings(images + [Path('00999_000.jpg')], {})


class MergeTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='film-sync-test-')
        self.addCleanup(self.temporary.cleanup)
        self.directory = contextlib.chdir(self.temporary.name)
        self.directory.__enter__()
        self.addCleanup(self.directory.__exit__, None, None, None)
        self.git('init', '-b', 'master')
        self.git('config', 'user.name', 'Sync Test')
        self.git('config', 'user.email', 'sync-test@example.invalid')
        self.git('config', 'commit.gpgsign', 'false')
        Path('film_packaging').mkdir()
        self.catalogue = Path('film_packaging/database.csv')

    def git(self, *args):
        return subprocess.run(['git', *args], check=True, capture_output=True,
                              text=True, encoding='utf-8').stdout

    def prepare_branches(self, conflict_path):
        self.catalogue.write_text(catalogue([row(1)]), encoding='utf-8')
        Path('film_packaging/archive').mkdir()
        Path('film_packaging/archive/00001_000.jpg').write_bytes(b'original scan')
        path = Path(conflict_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b'base\0content')
        self.git('add', '.')
        self.git('commit', '-m', 'Base catalogue')
        self.git('checkout', '-b', 'upstream-test')
        Path('film_packaging/archive/00002_000.jpg').write_bytes(b'new upstream scan')
        self.catalogue.write_text(catalogue([row(1, quantity='36', unit='exp'),
                                             row(2, quantity='12', unit='sheets')], ['unit']),
                                  encoding='utf-8')
        path.write_bytes(b'upstream\0content')
        self.git('add', '.')
        self.git('commit', '-m', 'Upstream schema and cache changes')
        self.git('checkout', 'master')
        self.git('rm', conflict_path)
        self.catalogue.write_text(catalogue([row(1, brand='Local')]), encoding='utf-8')
        self.git('add', '.')
        self.git('commit', '-m', 'Keep local metadata and remove generated file')

    def test_cache_conflict_is_resolved_and_next_sync_is_unchanged(self):
        cache = 'film_packaging/__pycache__/shared.cpython-314.pyc'
        self.prepare_branches(cache)
        merge_upstream('upstream-test')
        self.assertEqual(self.git('diff', '--name-only', '--diff-filter=U'), '')
        self.assertFalse(Path(cache).exists())
        self.assertNotIn(cache, self.git('ls-files'))
        self.assertTrue(self.git('rev-parse', '--verify', 'MERGE_HEAD').strip())
        _, rows = read_catalogue(self.catalogue.read_text(encoding='utf-8'), 'result')
        self.assertEqual(rows['00001_000.jpg']['brand'], 'Local')
        self.assertEqual(rows['00001_000.jpg']['unit'], 'exp')
        self.assertIn('00002_000.jpg', rows)
        arrivals = load_updates()
        self.assertEqual(set(arrivals), {'00002_000.jpg'})
        self.assertGreater(arrivals['00002_000.jpg'], 0)
        self.git('add', '.')
        self.git('commit', '-m', 'Complete test merge')
        merge_upstream('upstream-test')
        self.assertEqual(load_updates(), arrivals)
        self.assertEqual(self.git('status', '--porcelain'), '')

    def test_non_cache_conflicts_are_left_for_review(self):
        self.prepare_branches('notes.txt')
        with self.assertRaisesRegex(RuntimeError, 'non-cache conflicts'):
            merge_upstream('upstream-test')
        self.assertEqual(self.git('diff', '--name-only', '--diff-filter=U').strip(), 'notes.txt')

    def test_uncommitted_catalogue_changes_are_preserved(self):
        self.prepare_branches('notes.txt')
        content = catalogue([row(1, brand='Uncommitted edit')])
        self.catalogue.write_text(content, encoding='utf-8')
        with self.assertRaisesRegex(RuntimeError, 'Commit catalogue changes'):
            merge_upstream('upstream-test')
        self.assertEqual(self.catalogue.read_text(encoding='utf-8'), content)


if __name__ == '__main__':
    unittest.main()
