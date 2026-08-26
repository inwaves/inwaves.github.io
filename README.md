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

## Local Development

### Prerequisites

- [Zola](https://www.getzola.org/documentation/getting-started/installation/) v0.22.1 or later

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
```

## Deployment

The site automatically deploys to GitHub Pages when changes are pushed to the `master` branch via GitHub Actions.

## License

This work is published under [MIT License](LICENSE).

## Previous Version

This site was previously built with Jekyll and the Chirpy theme. The migration to Zola was completed in December 2025.
