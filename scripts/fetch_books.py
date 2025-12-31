#!/usr/bin/env python3
"""
Fetch book metadata from ISBNs using Open Library API.
Generates a JSON file with book data for the bookshelf page.
"""

import csv
import json
import re
import time
import urllib.request
import urllib.error
from pathlib import Path


def is_valid_isbn(isbn: str) -> bool:
    """Check if string looks like a valid ISBN (10 or 13 digits)."""
    clean = re.sub(r'[^0-9X]', '', isbn.upper())
    return len(clean) in (10, 13) and clean.isdigit() or (len(clean) == 10 and clean[:-1].isdigit() and clean[-1] in '0123456789X')


def fetch_book_data(isbn: str) -> dict | None:
    """Fetch book data from Open Library API."""
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
    
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
    except (urllib.error.URLError, json.JSONDecodeError) as e:
        print(f"  Error fetching {isbn}: {e}")
        return None
    
    key = f"ISBN:{isbn}"
    if key not in data:
        return None
    
    book = data[key]
    
    # Extract authors
    authors = []
    if 'authors' in book:
        authors = [a.get('name', '') for a in book['authors']]
    
    # Extract cover - try multiple sizes from API data only
    cover_url = None
    if 'cover' in book:
        # Try large first, then medium, then small - only use URLs with real image IDs
        cover_url = book['cover'].get('large') or book['cover'].get('medium') or book['cover'].get('small')
    
    # Don't use fallback ISBN URLs - they return 1x1 pixel placeholders
    
    # Construct Goodreads URL
    goodreads_url = f"https://www.goodreads.com/search?q={isbn}"
    
    return {
        'isbn': isbn,
        'title': book.get('title', 'Unknown Title'),
        'authors': authors,
        'cover_url': cover_url,
        'goodreads_url': goodreads_url,
        'publish_date': book.get('publish_date', ''),
        'publishers': [p.get('name', '') for p in book.get('publishers', [])],
        'number_of_pages': book.get('number_of_pages'),
        'subjects': [s.get('name', '') for s in book.get('subjects', [])][:5],  # Limit subjects
    }


def main():
    # Read ISBNs
    isbns_file = Path(__file__).parent.parent.parent / 'books' / 'isbns.csv'
    
    with open(isbns_file, 'r') as f:
        raw_isbns = [line.strip() for line in f if line.strip()]
    
    # Filter to valid ISBNs and deduplicate while preserving order
    seen = set()
    valid_isbns = []
    for isbn in raw_isbns:
        if is_valid_isbn(isbn) and isbn not in seen:
            seen.add(isbn)
            valid_isbns.append(isbn)
    
    print(f"Found {len(raw_isbns)} entries, {len(valid_isbns)} valid unique ISBNs")
    
    # Fetch book data
    books = []
    for i, isbn in enumerate(valid_isbns):
        print(f"[{i+1}/{len(valid_isbns)}] Fetching {isbn}...")
        book_data = fetch_book_data(isbn)
        if book_data:
            books.append(book_data)
            print(f"  Found: {book_data['title']}")
        else:
            print(f"  Not found")
        time.sleep(0.2)  # Be nice to the API
    
    print(f"\nSuccessfully fetched {len(books)} books")
    
    # Write output
    output_file = Path(__file__).parent.parent / 'static' / 'data' / 'books.json'
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w') as f:
        json.dump(books, f, indent=2)
    
    print(f"Wrote to {output_file}")


if __name__ == '__main__':
    main()