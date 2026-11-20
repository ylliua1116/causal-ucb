# Deploying the CAUSAL-UCB research website

The website is a **static** site in [`docs/`](docs/). Hosting the paper and interactive visualizations does not require a server-side Python application.

## Option A: GitHub Pages

1. Upload the contents of the repository to GitHub. `README.md`, `src/`, and `docs/` must be at the **repository root** (do not upload an enclosing `causal-ucb` directory as an extra level).
2. Open **Settings → Pages** for the repository.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
4. Choose branch `main`, folder `/docs`, and save.
5. For the username and repository paths configured in this archive, the expected project URL is `https://ylliua1116.github.io/causal-ucb/` (subject to the repository name and Pages settings actually matching).

### Upload using only the GitHub web interface

Open the repository and use **Add file → Upload files**, upload the archive contents while retaining relative paths, and commit to `main`. GitHub web uploads may limit file count or size; divide into batches without changing paths if necessary. A git CLI push is more reliable for larger updates.

### Confirm an update is visible

Check that the published branch has the current `docs/index.html`, `docs/benchmark-records.js` and `docs/assets/certified-benchmark/seven-method-comparison.json`. If the browser still displays the older table heading or a column of missing configurations, force refresh with **Ctrl+Shift+R** (macOS: **Cmd+Shift+R**). The correct table reads configuration **mode/count and optimal-selection rate** from the frozen JSON.

## Option B: Local website preview

Run from the repository root:

```bash
python -m http.server 8000 --directory docs
```

Open `http://localhost:8000/`. Use an HTTP server rather than opening `docs/index.html` as a `file://` page: the benchmark fetches local JSON assets and browser security restrictions can block such requests from `file://`.

## Content and links

- **Paper:** the official OpenReview PDF at `https://openreview.net/pdf?id=sO7mOWC5TC`.
- **Benchmark:** static recorded/replayed files in `docs/assets/certified-benchmark/`.
- **Browser lab:** independent Python code in `docs/live-lab/`, executed through a browser Python runtime; first use may require network access to runtime dependencies.
- **External images/videos:** decorative media may load from third-party hosts. The Save Data toggle replaces background video with stills; it does not change experimental evidence. See [`docs/assets/VIDEO_SOURCES.md`](docs/assets/VIDEO_SOURCES.md).
- **Links:** edit `docs/site-config.js` if the GitHub repository, arXiv or Hugging Face Space URLs change. Verify destinations before publishing.

## Troubleshooting

| Symptom | Check |
| :--- | :--- |
| Page shows `404` | The Pages source is `main /docs`; the repo name and URL path match. |
| Chart or dataset fails to load | Preview is served via HTTP(S); JSON files were uploaded with correct paths. |
| Old `Selected configuration` column shows dashes | Redeploy all three linked page/JS/JSON files and refresh cache. |
| Browser Python lab fails to initialize | Browser network access to its runtime packages, supported WebAssembly features, and developer-console errors. |
| Paper link goes to an old local PDF | Confirm `docs/site-config.js` points to the official OpenReview URL. |
