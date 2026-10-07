# Andrei Alexandru's Personal Website

This is a personal website and technical blog focused on AI safety research.

## Technology Stack

- **Static Site Generator:** [Zola](https://www.getzola.org/) v0.22.1
- **Theme:** [Serene](https://github.com/isunjn/serene) v5.4.3
- **Hosting:** GitHub Pages
- **Deployment:** GitHub Actions

## Features

- Blog posts with categories and tags
- Math rendering with KaTeX
- Syntax highlighting with custom themes
- Table of contents
- Comment system (Giscus)
- RSS feed generation
- Light/dark theme switching
- Responsive design
- **Bookshelf** at `/bookshelf/`: a searchable, filterable grid of books rendered at build time from
  `static/data/books.json`, with covers served from this site (see *Bookshelf data* below).
- No inline scripts, and no third-party requests by default, on the Zola pages: KaTeX is served from
  `static/katex/` (vendored from `katex@0.16.11`, MIT), the theme and math bootstraps live in
  `static/js/`, and the bookshelf serves its own cover images. The opt-in features that do reach
  out are Mermaid (`mermaid = true` per page; loaded from jsDelivr at a pinned version with
  Subresource Integrity) and giscus comments (`comment = true`). See *Hardening notes* below.
- **Conceptions of the Heavens** at `/space`: an interactive 3D tour of historical models of the
  cosmos (source in `heavens/`, see its README). It is built in CI and linked from a blog post
  rather than from the navigation.
- **Orbis — The Changing Heavens** at `/orbis/`: a second, independent 3D interpretation with ten
  historical chapters, guided explorations and source notes (source in `orbis/`). The article's
  dated addendum links to it; the original `/space/` implementation remains unchanged.
- **Cosmographia** at `/cosmographia/`: a third, independent implementation with thirteen
  worldviews built on historical parameters, each viewable as machinery or from the astronomer's
  own sky and measured against a modern ephemeris (source in `cosmographia/`, see its README). The
  article's second dated addendum links to it.

## Local Development

### Prerequisites

- [Zola](https://www.getzola.org/documentation/getting-started/installation/) v0.22.1 or later
- Node.js 22.12+ and npm to build the astronomy apps
- Python 3 to serve the assembled site during browser tests

### Setup

```bash
# Clone the repository
git clone https://github.com/inwaves/inwaves.github.io.git
cd inwaves.github.io

# Initialize the theme submodule
git submodule update --init --recursive

# Build the site
zola build

# Serve locally (note: for local development, set base_url appropriately)
zola serve
```

### Development Notes

- The `base_url` in `config.toml` should be set to your development URL for local testing
- For production deployment, the GitHub Actions workflow automatically sets it to `https://inwaves.io`
- Static assets are in the `static/` directory
- Content is in the `content/` directory (posts in `content/posts/`)
- The `/space` app is built separately in CI (`cd heavens && npm ci --ignore-scripts && npm test && npm run build`)
  and copied into `public/space/`; to work on it locally run `npm run dev` inside `heavens/`
- Orbis is built independently from `orbis/` and copied into `public/orbis/`. Its assets and home
  link are relative, so its standalone preview and nested site URL both work.
- Cosmographia is built independently from `cosmographia/` and copied into `public/cosmographia/`.
  Its build also uses a relative base; to work on it locally run `npm run dev` inside `cosmographia/`.
- All three app dev servers use port 8080; run only one at a time.

### Build and validate the complete site

Run these commands from the repository root. Zola recreates `public/`, so copy the app builds
**after** running it, just as the Pages workflow does. Generated output is not committed.

```sh
npm --prefix heavens ci --ignore-scripts
npm --prefix heavens test
npm --prefix heavens run build
npm --prefix orbis ci --ignore-scripts
npm --prefix orbis test
npm --prefix orbis run build
npm --prefix cosmographia ci --ignore-scripts
npm --prefix cosmographia test
npm --prefix cosmographia run build
zola build
cp CNAME public/CNAME
mkdir -p public/space public/orbis public/cosmographia
cp -R heavens/dist/. public/space/
cp -R orbis/dist/. public/orbis/
cp -R cosmographia/dist/. public/cosmographia/
# Install Chromium and Linux browser libraries (sudo may be required).
(cd orbis && npx playwright install --with-deps chromium)
npm --prefix orbis run test:site
npm --prefix cosmographia run test:site
# Optional: leave the complete site available in a browser after the tests.
python3 -m http.server 8080 --directory public
```

The integrated browser suite starts its own server on port 8080, runs all Orbis interactions at
`/orbis/` in desktop Chromium, follows both article links, and checks that the original `/space/`
app and blog homepage still load. Cosmographia's site check also serves `public/` on port 8080: it
follows the article's Cosmographia link, checks that the third-party notices are served, and renders
every era in both views at `/cosmographia/`. Stop other servers on that port before running either.

### Bookshelf data

`templates/bookshelf.html` renders the shelf at build time from `static/data/books.json`, and the
covers are served from `static/images/books/`, so the published page makes no requests to Open
Library or any other third party. Both are generated by `scripts/fetch_books.py` (Python 3,
requires [Pillow](https://pypi.org/project/pillow/)) and committed:

```sh
python3 -m pip install pillow
# Add ISBNs (one per line) to ../books/isbns.csv, then:
python3 scripts/fetch_books.py            # fetches only ISBNs not already in books.json
python3 scripts/fetch_books.py --reprocess  # rebuild genres and covers without an ISBN list
```

The script validates ISBN checksums, fetches metadata from Open Library, classifies each book into
high-level genres (the mapping is in the script), downloads each cover once, rejects placeholder
images, and shrinks the cover to a 320px-wide WebP. Each card links to `https://openlibrary.org/isbn/<isbn>`.
Run `python3 scripts/fetch_books.py --help` for the other options.

### Hardening notes

- `templates/_math.html` and `templates/_mermaid.html` are the only places that load KaTeX and
  Mermaid; the page templates include them. To upgrade KaTeX, copy `katex.min.css`, `katex.min.js`,
  `contrib/auto-render.min.js`, `contrib/copy-tex.min.js` and `fonts/*.woff2` from the new npm
  package into `static/katex/` and update the `integrity` hashes in `_math.html`
  (`openssl dgst -sha384 -binary FILE | openssl base64 -A`). Mermaid is pinned the same way.
- The site ships no inline `<script>`; `static/js/theme-init.js` replaces the former inline theme
  bootstrap and receives the dark highlight stylesheet URL via a `data-hl-dark` attribute, and
  `templates/categories/` overrides the theme's script-based redirects with a meta refresh. This
  keeps a `script-src 'self'` Content Security Policy possible at the CDN/proxy layer (add
  `https://cdn.jsdelivr.net` and `https://giscus.app` only if those opt-in features are enabled).
- Orbis bundles its fonts from `@fontsource-variable/dm-sans` and `@fontsource/libre-caslon-display`
  rather than loading them from Google Fonts, as Cosmographia already does.
- The deploy workflow pins every action to a commit SHA (the tag is kept as a comment), installs
  npm dependencies with `--ignore-scripts`, and gives only the deploy job Pages permissions.
  `.github/dependabot.yml` raises monthly update PRs for the actions, the three apps and the theme
  submodule. When Dependabot bumps an action, the SHA and the comment move together.

## Content Structure

```
content/
├── _index.md           # Home page
├── posts/              # Blog posts
│   ├── _index.md       # Posts section config
│   └── *.md            # Individual posts
├── about/              # About page
├── bookshelf/          # Bookshelf page (data in static/data/books.json)
├── now/                # Now page
├── cool_things/        # Cool things page
└── presentations/      # Presentations page
    └── items.toml      # Presentations collection

heavens/                # Conceptions of the Heavens (Vite + three.js), deployed to /space
orbis/                  # Orbis (React + TypeScript + Three.js), deployed to /orbis
cosmographia/           # Cosmographia (Vite + React + TypeScript + three.js), deployed to /cosmographia
```

## Deployment

Pull requests targeting `master` or `main` build and test the combined site without deploying it.
The site automatically deploys to GitHub Pages on pushes to those branches (this repository uses
`master`), or a manual workflow run on one of them. PR checks use separate concurrency groups so
they cannot cancel a production deployment; only the deployment job receives Pages write permissions.

## License

This work is published under [MIT License](LICENSE).

## Previous Version

This site was previously built with Jekyll and the Chirpy theme. The migration to Zola was completed in December 2025.
