#!/usr/bin/env python3
"""
Build the data behind the bookshelf page.

Pipeline
--------
1. Read ISBNs (one per line) from an ``isbns.csv`` file.
2. Fetch title, authors and subjects from the Open Library API. Results are cached in the
   existing ``books.json`` so a re-run only contacts the API for ISBNs it has not seen.
3. Classify every book into a few high-level genres from its Open Library subjects.
4. Download each cover once, check that it is a real image (Open Library and Goodreads serve
   1x1 or "no cover" placeholders for unknown books), shrink it, and store it as
   ``static/images/books/<isbn>.webp``.
5. Write ``static/data/books.json``. ``templates/bookshelf.html`` loads that file at Zola build
   time and renders the cards, so the published site never contacts Open Library or any other
   third party.

Usage
-----
    python3 scripts/fetch_books.py                   # read ../books/isbns.csv, update data and covers
    python3 scripts/fetch_books.py --isbns my.csv    # read ISBNs from another file
    python3 scripts/fetch_books.py --reprocess       # no ISBN list: rebuild genres and covers for the
                                                     # books already in books.json
    python3 scripts/fetch_books.py --refresh         # re-fetch metadata for every ISBN
    python3 scripts/fetch_books.py --refresh-covers  # re-download every cover

Requires Pillow (``pip install pillow``) for cover processing.
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

try:
    from PIL import Image, UnidentifiedImageError
except ImportError:  # pragma: no cover - exercised only when Pillow is missing
    print("This script needs Pillow: pip install pillow", file=sys.stderr)
    raise SystemExit(1)

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ISBNS = REPO_ROOT.parent / "books" / "isbns.csv"
DEFAULT_OUTPUT = REPO_ROOT / "static" / "data" / "books.json"
DEFAULT_COVERS_DIR = REPO_ROOT / "static" / "images" / "books"

OPEN_LIBRARY_API = "https://openlibrary.org/api/books"
USER_AGENT = "inwaves.io bookshelf builder (https://inwaves.io; static site, one-off fetch)"
REQUEST_TIMEOUT = 20
API_PAUSE_SECONDS = 0.25
MAX_SUBJECTS = 5

# Covers are shown at ~140px wide (up to 2x on high-density screens), so 320px is plenty.
COVER_MAX_SIZE = (320, 480)
COVER_FORMAT = "WEBP"
COVER_EXTENSION = ".webp"
COVER_QUALITY = 80
# Anything smaller than this is a tracking pixel or a "no cover" badge, not a cover.
MIN_COVER_PX = 60
# Source URLs that are known placeholders rather than covers.
PLACEHOLDER_URL_PATTERNS = ("no-cover", "nophoto", "nocover")

# Map Open Library subjects to a handful of high-level genres. A subject matches a genre when
# either string contains the other, case-insensitively.
GENRE_MAPPING: dict[str, list[str]] = {
    "Fiction": ["Fiction", "American fiction", "British fiction", "Novels", "Short stories", "Fiction in English"],
    "Science Fiction": ["Science fiction", "Science Fiction", "American Science fiction", "Fiction, science fiction"],
    "Philosophy": ["Philosophy", "Ethics", "Aesthetics", "Stoics", "Existentialism", "German Philosophy"],
    "Biography": ["Biography", "Autobiography", "Biography & Autobiography", "Biographical fiction"],
    "Psychology": ["Psychology", "Cognitive science", "Artificial intelligence", "Neurosciences"],
    "History": ["History", "World history", "Modern Civilization", "Historical Chronology"],
    "Art & Photography": ["Art", "Painting", "Photography", "Artistic Photography", "Arts"],
    "Buddhism & Meditation": ["Buddhism", "Meditation", "Zen Buddhism", "Spiritual life"],
    "Self-Improvement": ["Self-Improvement", "Success", "Conduct of life", "Personal Growth"],
    "Business": ["Business", "Entrepreneurship", "Leadership", "Management"],
    "Science": ["Science", "Physics", "Mathematics", "Calculus", "Biology"],
    "Literature": ["Poetry", "American literature", "English literature", "Essays"],
    "Drama": ["Drama", "Plays", "Theater"],
    "Politics": ["Politics", "World politics", "Political science"],
    "Classics": ["Classical literature", "Greek mythology", "Roman Empire", "Mythology"],
}


# --------------------------------------------------------------------------------------------
# ISBN handling
# --------------------------------------------------------------------------------------------


def normalise_isbn(raw: str) -> str | None:
    """Return the bare ISBN-10 or ISBN-13 if ``raw`` is a valid ISBN (checksum included), else None."""
    clean = re.sub(r"[^0-9Xx]", "", raw).upper()
    if len(clean) == 13 and clean.isdigit() and _isbn13_checksum_ok(clean):
        return clean
    if len(clean) == 10 and clean[:9].isdigit() and clean[9] in "0123456789X" and _isbn10_checksum_ok(clean):
        return clean
    return None


def _isbn13_checksum_ok(isbn: str) -> bool:
    total = sum((1 if i % 2 == 0 else 3) * int(ch) for i, ch in enumerate(isbn))
    return total % 10 == 0


def _isbn10_checksum_ok(isbn: str) -> bool:
    total = sum((10 - i) * (10 if ch == "X" else int(ch)) for i, ch in enumerate(isbn))
    return total % 11 == 0


def read_isbns(path: Path) -> list[str]:
    """Read, validate and de-duplicate ISBNs from a one-per-line file, preserving order."""
    with path.open(encoding="utf-8") as fh:
        raw = [line.strip() for line in fh if line.strip()]
    seen: set[str] = set()
    valid: list[str] = []
    for entry in raw:
        isbn = normalise_isbn(entry)
        if isbn is None:
            print(f"  Skipping invalid ISBN: {entry!r}")
        elif isbn not in seen:
            seen.add(isbn)
            valid.append(isbn)
    print(f"Found {len(raw)} entries, {len(valid)} valid unique ISBNs")
    return valid


# --------------------------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------------------------


def http_get(url: str) -> bytes | None:
    """GET ``url``; return the body, or None on any network/HTTP error."""
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            return response.read()
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        print(f"  Error fetching {url}: {exc}")
        return None


# --------------------------------------------------------------------------------------------
# Metadata
# --------------------------------------------------------------------------------------------


def fetch_metadata(isbn: str) -> dict | None:
    """Fetch a book's metadata from Open Library. Returns None if the ISBN is unknown."""
    query = urllib.parse.urlencode({"bibkeys": f"ISBN:{isbn}", "format": "json", "jscmd": "data"})
    body = http_get(f"{OPEN_LIBRARY_API}?{query}")
    if body is None:
        return None
    try:
        data = json.loads(body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        print(f"  Bad response for {isbn}: {exc}")
        return None

    book = data.get(f"ISBN:{isbn}")
    if not book:
        return None

    cover = book.get("cover") or {}
    return {
        "isbn": isbn,
        "title": book.get("title") or "Unknown Title",
        "authors": [a.get("name", "") for a in book.get("authors", []) if a.get("name")],
        "publish_date": book.get("publish_date", ""),
        "publishers": [p.get("name", "") for p in book.get("publishers", []) if p.get("name")],
        "number_of_pages": book.get("number_of_pages"),
        "subjects": [s.get("name", "") for s in book.get("subjects", []) if s.get("name")][:MAX_SUBJECTS],
        # Where the cover came from. Only used by this script; the site serves its own copy.
        "cover_source": cover.get("large") or cover.get("medium") or cover.get("small"),
    }


def classify(subjects: list[str]) -> list[str]:
    """Map Open Library subjects onto the high-level genres in GENRE_MAPPING."""
    genres: set[str] = set()
    for subject in subjects:
        subject_l = subject.lower()
        for genre, keywords in GENRE_MAPPING.items():
            for keyword in keywords:
                keyword_l = keyword.lower()
                if keyword_l in subject_l or subject_l in keyword_l:
                    genres.add(genre)
                    break
    return sorted(genres)


# --------------------------------------------------------------------------------------------
# Covers
# --------------------------------------------------------------------------------------------


def cover_download_url(source: str) -> str:
    """Ask Open Library for a 404 instead of a 1x1 placeholder when it has no cover."""
    if "covers.openlibrary.org" in source and "default=" not in source:
        joiner = "&" if "?" in source else "?"
        return f"{source}{joiner}default=false"
    return source


def process_cover(data: bytes) -> tuple[bytes, int, int] | None:
    """Decode, validate and shrink a downloaded cover. Returns (webp bytes, width, height) or None."""
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        print(f"  Not an image: {exc}")
        return None

    if image.width < MIN_COVER_PX or image.height < MIN_COVER_PX:
        print(f"  Rejected placeholder image ({image.width}x{image.height})")
        return None

    image = image.convert("RGB")
    image.thumbnail(COVER_MAX_SIZE, Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format=COVER_FORMAT, quality=COVER_QUALITY, method=6)
    return buffer.getvalue(), image.width, image.height


def ensure_cover(book: dict, covers_dir: Path, refresh: bool) -> dict | None:
    """Make sure the book's cover exists locally. Returns the cover record or None."""
    filename = f"{book['isbn']}{COVER_EXTENSION}"
    target = covers_dir / filename

    if target.exists() and not refresh:
        with Image.open(target) as existing:
            return {"file": filename, "width": existing.width, "height": existing.height}

    source = book.get("cover_source")
    if not source:
        return None
    if any(pattern in source.lower() for pattern in PLACEHOLDER_URL_PATTERNS):
        print(f"  Skipping placeholder cover URL: {source}")
        return None

    data = http_get(cover_download_url(source))
    if data is None:
        return None
    processed = process_cover(data)
    if processed is None:
        return None

    webp, width, height = processed
    covers_dir.mkdir(parents=True, exist_ok=True)
    target.write_bytes(webp)
    return {"file": filename, "width": width, "height": height}


# --------------------------------------------------------------------------------------------
# books.json
# --------------------------------------------------------------------------------------------


def load_existing(path: Path) -> dict[str, dict]:
    """Load books from an existing books.json, keyed by ISBN, accepting the older list layout."""
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as fh:
        data = json.load(fh)
    books = data if isinstance(data, list) else data.get("books", [])

    existing: dict[str, dict] = {}
    for book in books:
        isbn = normalise_isbn(str(book.get("isbn", "")))
        if isbn is None:
            continue
        # Older files stored the remote cover URL as cover_url and a Goodreads search link.
        cover_source = book.get("cover_source", book.get("cover_url"))
        existing[isbn] = {
            "isbn": isbn,
            "title": book.get("title") or "Unknown Title",
            "authors": list(book.get("authors", [])),
            "publish_date": book.get("publish_date", ""),
            "publishers": list(book.get("publishers", [])),
            "number_of_pages": book.get("number_of_pages"),
            "subjects": list(book.get("subjects", []))[:MAX_SUBJECTS],
            "cover_source": cover_source,
        }
    return existing


def genre_counts(books: list[dict]) -> list[dict]:
    counts: dict[str, int] = {}
    for book in books:
        for genre in book["genres"]:
            counts[genre] = counts.get(genre, 0) + 1
    return [{"name": name, "count": counts[name]} for name in sorted(counts)]


def write_output(path: Path, books: list[dict]) -> None:
    payload = {
        "generated": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "count": len(books),
        "genres": genre_counts(books),
        "books": books,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print(f"Wrote {len(books)} books to {path}")


# --------------------------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--isbns", type=Path, default=DEFAULT_ISBNS, help=f"ISBN list, one per line (default: {DEFAULT_ISBNS})")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help=f"books.json to write (default: {DEFAULT_OUTPUT})")
    parser.add_argument("--covers-dir", type=Path, default=DEFAULT_COVERS_DIR, help=f"where covers are stored (default: {DEFAULT_COVERS_DIR})")
    parser.add_argument("--reprocess", action="store_true", help="ignore the ISBN list and rebuild from the books already in books.json")
    parser.add_argument("--refresh", action="store_true", help="re-fetch metadata from Open Library for every ISBN")
    parser.add_argument("--refresh-covers", action="store_true", help="re-download every cover")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    existing = load_existing(args.output)

    if args.reprocess:
        isbns = list(existing)
        print(f"Reprocessing {len(isbns)} books from {args.output}")
    else:
        if not args.isbns.exists():
            print(f"ISBN list not found: {args.isbns} (use --isbns PATH or --reprocess)", file=sys.stderr)
            return 1
        isbns = read_isbns(args.isbns)

    books: list[dict] = []
    for index, isbn in enumerate(isbns, start=1):
        book = None if args.refresh else existing.get(isbn)
        if book is None:
            print(f"[{index}/{len(isbns)}] Fetching {isbn}...")
            book = fetch_metadata(isbn)
            time.sleep(API_PAUSE_SECONDS)
            if book is None:
                print("  Not found")
                continue
            print(f"  Found: {book['title']}")
        else:
            print(f"[{index}/{len(isbns)}] {book['title']}")

        book["genres"] = classify(book["subjects"])
        book["cover"] = ensure_cover(book, args.covers_dir, args.refresh_covers)
        books.append(book)

    with_cover = sum(1 for b in books if b["cover"])
    print(f"\n{len(books)} books, {with_cover} with a local cover")
    write_output(args.output, books)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
