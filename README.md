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
- **Conceptions of the Heavens** at `/space`: an interactive 3D tour of historical models of the
  cosmos (source in `heavens/`, see its README). It is built in CI and linked from a blog post
  rather than from the navigation.
- **Orbis — The Changing Heavens** at `/orbis/`: a second, independent 3D interpretation with ten
  historical chapters, guided explorations and source notes (source in `orbis/`). The article's
  dated addendum links to it; the original `/space/` implementation remains unchanged.
- **Firmament** at `/firmament/`: a further independent implementation with ten worldviews from
  Anaximander to Newton, each seen from outside as machinery or from the Earth against a real star
  catalogue, built on sourced historical parameters whose provenance ships with the app (source in
  `firmament/`, see its README). The article's addendum of 18 September 2026 links to it.

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
- The `/space` app is built separately in CI (`cd heavens && npm ci && npm test && npm run build`)
  and copied into `public/space/`; to work on it locally run `npm run dev` inside `heavens/`
- Orbis is built independently from `orbis/` and copied into `public/orbis/`. Its assets and home
  link are relative, so its standalone preview and nested site URL both work.
- Firmament is built independently from `firmament/` and copied into `public/firmament/`. Its build
  also uses a relative base; to work on it locally run `npm run dev` inside `firmament/`.
- All the app dev servers use port 8080; run only one at a time.

### Build and validate the complete site

Run these commands from the repository root. Zola recreates `public/`, so copy the app builds
**after** running it, just as the Pages workflow does. Generated output is not committed.

```sh
npm --prefix heavens ci
npm --prefix heavens test
npm --prefix heavens run build
npm --prefix orbis ci
npm --prefix orbis test
npm --prefix orbis run build
npm --prefix firmament ci
npm --prefix firmament test
npm --prefix firmament run build
zola build
cp CNAME public/CNAME
mkdir -p public/space public/orbis public/firmament
cp -R heavens/dist/. public/space/
cp -R orbis/dist/. public/orbis/
cp -R firmament/dist/. public/firmament/
# Install Chromium and Linux browser libraries (sudo may be required).
(cd orbis && npx playwright install --with-deps chromium)
npm --prefix orbis run test:site
npm --prefix firmament run test:site
# Optional: leave the complete site available in a browser after the tests.
python3 -m http.server 8080 --directory public
```

The integrated browser suite starts its own server on port 8080, runs all Orbis interactions at
`/orbis/` on desktop and mobile, follows both article links, and checks that the original `/space/`
app and blog homepage still load. Stop other servers on that port before running it.

Firmament's site check serves `public/` itself, on a port the system picks, so it needs nothing
stopped. It checks that the licence notices and provenance notes are in the build, follows the
article's Firmament link, loads every worldview from its own link in both views at `/firmament/`,
and checks that each era offers exactly the discoveries of its time.

## Content Structure

```
content/
├── _index.md           # Home page
├── posts/              # Blog posts
│   ├── _index.md       # Posts section config
│   └── *.md            # Individual posts
├── about/              # About page
├── now/                # Now page
├── cool_things/        # Cool things page
└── presentations/      # Presentations page
    └── items.toml      # Presentations collection

heavens/                # Conceptions of the Heavens (Vite + three.js), deployed to /space
orbis/                  # Orbis (React + TypeScript + Three.js), deployed to /orbis
firmament/              # Firmament (Vite + three.js, no framework), deployed to /firmament
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
