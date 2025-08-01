# Expensabl Documentation

This directory contains the documentation for Expensabl, built using [mdBook](https://rust-lang.github.io/mdBook/).

## Local Development

To build and serve the documentation locally:

1. Install mdBook:
   ```bash
   cargo install mdbook
   ```
   
   Or download a pre-built binary from the [releases page](https://github.com/rust-lang/mdBook/releases).

2. Build the documentation:
   ```bash
   cd docs
   mdbook build
   ```

3. Serve locally with hot-reload:
   ```bash
   cd docs
   mdbook serve
   ```
   
   This will start a local server at `http://localhost:3000`.

## Structure

- `book.toml` - mdBook configuration
- `src/` - Documentation source files
  - `SUMMARY.md` - Table of contents
  - `introduction.md` - Homepage
  - `user-guide/` - End-user documentation
  - `developer-guide/` - Developer documentation
  - `api/` - API reference

## Deployment

Documentation is automatically built and deployed to GitHub Pages when changes are pushed to the `main` branch. The workflow is defined in `.github/workflows/deploy-docs.yml`.

## Contributing

When adding new documentation:

1. Add your content as a Markdown file in the appropriate directory
2. Update `src/SUMMARY.md` to include your new page
3. Test locally with `mdbook serve`
4. Submit a pull request