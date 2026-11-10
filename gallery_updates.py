"""Remember when scans first arrived in this fork, independently of upstream dates."""

import json
import re
import time
from pathlib import Path


UPDATES_FILE = Path('film_packaging/gallery_updates.json')


def load_updates(path=UPDATES_FILE):
    if not path.exists():
        return {}
    updates = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(updates, dict) or any(
        not re.fullmatch(r'\d+_\d{3}\.jpg', filename)
        or type(timestamp) is not int or timestamp <= 0
        for filename, timestamp in updates.items()
    ):
        raise ValueError(f'Invalid gallery arrival dates in {path}')
    return updates


def record_additions(filenames, *, added_at=None, path=UPDATES_FILE):
    updates = load_updates(path)
    timestamp = int(time.time()) if added_at is None else added_at
    changed = False
    for filename in filenames:
        if filename not in updates:
            updates[filename] = timestamp
            changed = True
    if changed:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(updates, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    return updates
