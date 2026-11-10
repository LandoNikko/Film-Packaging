"""Full-resolution scans stay in Git; only thumbnails are published to Pages."""

from urllib.parse import quote


# The weekly sync pushes originals and generated data to this branch together.
ARCHIVE_BASE_URL = (
    'https://raw.githubusercontent.com/LandoNikko/Film-Packaging/master/film_packaging/archive'
)


def full_size_url(filename):
    return f'{ARCHIVE_BASE_URL}/{quote(filename, safe="")}'
