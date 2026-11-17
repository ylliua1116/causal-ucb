# CAUSAL-UCB

**Causal online learning for configuration decisions in networked systems.**

This repository provides Python implementations, controlled comparisons against six baseline methods, and an interactive website for exploring the experimental results.

[Interactive demo on Hugging Face](https://huggingface.co/spaces/ylliua1116/causal-ucb)

## Contents

```text
causal-ucb/
├── docs/                 # Interactive website and selected experimental records
│   ├── index.html
│   ├── assets/           # Figures and data used by the website
│   └── live-lab/         # Python code executed in the browser
├── src/
│   ├── cert_dr.py        # Certificate-aware DR and IPS policies
│   ├── fast_compare.py   # Controlled comparison of seven methods
│   ├── original_source/  # Conditional CAUSAL-UCB implementation
│   └── tests/            # Core validation tests
├── requirements.txt
└── README.md
```

## Methods

The controlled benchmark compares:

1. Certified CAUSAL-UCB (DR)
2. Certified IPS-UCB
3. Reference CAUSAL-UCB
4. Reference IPS-UCB
5. Raw-UCB
6. Greedy-Raw
7. Switchback-OED

## Installation

Python 3.10 or newer is recommended.

```bash
python -m pip install -r requirements.txt
```

## Run experiments

Run the tests:

```bash
python -m unittest discover -s src/tests -v
```

Run a small experiment:

```bash
python src/fast_compare.py --out results_smoke --seeds 1 --T 35 --scenarios high_mismatch
```

Run the controlled high- and low-mismatch comparisons:

```bash
python src/fast_compare.py --out results_full --seeds 24 --T 200 --scenarios high_mismatch,low_mismatch
```

Results are written to the directory specified by `--out`. See [`src/README.md`](src/README.md) for implementation details.

## Interactive website

The `docs/` directory is a static site suitable for GitHub Pages. It includes seven-method comparisons, recorded per-seed trajectories, downloadable results, and interactive figures. The browser-based Live Lab supports adjustable experimental parameters and executes a small conditional CAUSAL-UCB experiment through Pyodide.

The recorded benchmark and the browser-run experiment are distinct protocols. The browser demo does not execute the full certified comparison.

To publish the site using GitHub Pages, select **Settings → Pages → Deploy from a branch → `main` → `/docs`**. A browser-only upload guide is available in [`DEPLOY_CN.md`](DEPLOY_CN.md).

## Experimental data and scope

Selected experimental records, protocol metadata, and integrity checks are included in [`docs/assets/certified-benchmark/`](docs/assets/certified-benchmark/). The comparison uses the specified known-local-interference model, calibration conditions, and controlled noise assumptions; its certificate claims do not extend automatically to arbitrary unknown networks.

This repository contains the core executable comparison and the data needed by the website, rather than every auxiliary experiment or intermediate output.

## License

No open-source license has been specified yet. Please contact the repository owner for reuse permissions.

## Website V11 (November 2026)

The site in `docs/` now follows the uploaded 66-page manuscript revision rather than the earlier 64-page arXiv v1 layout. Main figures 3–7 and appendix figures 26, 27, 28 and 31 are extracted directly from that revision with verified page references. An optional NeurIPS poster preview (PDF and editable PPTX) is included. The controls have larger mobile-friendly hit areas and keyboard support. See [`CHANGELOG_V11.md`](CHANGELOG_V11.md), [`DEPLOY_CN.md`](DEPLOY_CN.md) and [`docs/FIGURE_PROVENANCE_V11.json`](docs/FIGURE_PROVENANCE_V11.json).

**The numerical records and algorithms are not changed by this website update.** The local `Paper` button serves the supplied PDF; `arXiv` points to https://arxiv.org/abs/2611.09665.
