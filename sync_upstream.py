#!/usr/bin/env python3
"""Merge upstream without committing, preserving this fork's catalogue overrides."""

import csv
import io
import re
import subprocess
from pathlib import Path, PurePosixPath


CATALOGUE_PATH = Path('film_packaging/database.csv')


def git(*args, check=True):
    return subprocess.run(
        ['git', *args], check=check, capture_output=True,
        text=True, encoding='utf-8',
    )


def read_catalogue(content, source):
    reader = csv.DictReader(io.StringIO(content, newline=''))
    fields = reader.fieldnames or []
    required = {'filename', 'index', 'sub_index', 'quantity'}
    if not required.issubset(fields) or len(fields) != len(set(fields)):
        raise ValueError(f'Invalid catalogue schema in {source}')
    rows = {}
    for row in reader:
        if None in row or any(value is None for value in row.values()):
            raise ValueError(f'Malformed catalogue row in {source}: {row}')
        filename = row['filename'].strip()
        if not filename or filename in rows:
            raise ValueError(f'Duplicate or empty filename in {source}: {filename!r}')
        if filename != f"{int(row['index']):05}_{int(row['sub_index']):03}.jpg":
            raise ValueError(f'Filename and catalogue indexes disagree in {source}: {filename}')
        rows[filename] = dict(row, filename=filename)
    if not rows:
        raise ValueError(f'Empty catalogue in {source}')
    return fields, rows


def migrate_quantity(row, fields):
    row = dict(row)
    if 'unit' in fields:
        quantity = row['quantity'].strip()
        match = re.fullmatch(r'(\d+(?:\.\d+)?)\s*([A-Za-z]+)', quantity)
        if match and not row.get('unit', '').strip():
            row['quantity'] = match[1]
            row['unit'] = match[2].lower()
        else:
            row.setdefault('unit', '')
    return row


def reconcile_catalogues(local_content, upstream_content):
    local_fields, local_rows = read_catalogue(local_content, 'local database')
    upstream_fields, upstream_rows = read_catalogue(upstream_content, 'upstream database')
    fields = upstream_fields + [field for field in local_fields if field not in upstream_fields]
    merged = {
        filename: migrate_quantity(row, fields)
        for filename, row in upstream_rows.items()
    }
    overrides = 0
    for filename, row in local_rows.items():
        upstream_row = merged.get(filename, {})
        local_row = migrate_quantity(row, fields)
        if upstream_row and any(upstream_row.get(key, '') != value for key, value in local_row.items()):
            overrides += 1
        # New upstream columns are retained unless the local catalogue has a value.
        merged[filename] = {**upstream_row, **local_row}
    rows = sorted(merged.values(), key=lambda row: (int(row['index']), int(row['sub_index'])))
    output = io.StringIO(newline='')
    writer = csv.DictWriter(output, fieldnames=fields, lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)
    additions = len(upstream_rows.keys() - local_rows.keys())
    return output.getvalue(), additions, overrides


def is_python_cache(path):
    path = PurePosixPath(path)
    return '__pycache__' in path.parts or path.suffix in {'.pyc', '.pyo'}


def merge_upstream(upstream_ref='upstream/master'):
    if git('rev-parse', '-q', '--verify', 'MERGE_HEAD', check=False).returncode == 0:
        raise RuntimeError('Finish the existing merge before syncing upstream')
    if git('diff', '--name-only', 'HEAD', '--', CATALOGUE_PATH.as_posix()).stdout.strip():
        raise RuntimeError('Commit catalogue changes before syncing upstream')
    # Read HEAD before the merge: CSV line merges can lose rows or mix schemas.
    local_content = git('show', f'HEAD:{CATALOGUE_PATH.as_posix()}').stdout
    upstream_content = git('show', f'{upstream_ref}:{CATALOGUE_PATH.as_posix()}').stdout
    content, additions, overrides = reconcile_catalogues(local_content, upstream_content)

    result = git('merge', '--no-commit', '--no-ff', '-X', 'ours', upstream_ref, check=False)
    print(result.stdout, end='')
    print(result.stderr, end='')
    if result.returncode:
        conflicts = git('diff', '--name-only', '--diff-filter=U', '-z').stdout.split('\0')
        conflicts = [path for path in conflicts if path]
        if not conflicts:
            raise RuntimeError(f'Upstream merge failed: {result.stderr.strip()}')
        if any(not is_python_cache(path) for path in conflicts):
            raise RuntimeError('Upstream merge failed; resolve non-cache conflicts before continuing')
        git('rm', '-f', '--', *conflicts)

    tracked = git('ls-files', '-z').stdout.split('\0')
    caches = [path for path in tracked if path and is_python_cache(path)]
    if caches:
        git('rm', '-f', '--', *caches)
    CATALOGUE_PATH.write_text(content, encoding='utf-8', newline='')
    print(f'Added {additions} upstream rows; kept {overrides} local metadata overrides.')


if __name__ == '__main__':
    merge_upstream()
