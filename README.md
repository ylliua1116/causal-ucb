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

## Research website

The project page groups recorded paper evidence and a separate browser-run Python experiment in one interactive workspace. The recorded study compares **seven methods**. The browser lab supports **five reference policies and three supported ablation settings**, executed using the repository's conditional Python implementation. Protocols, plots and certificate scopes remain distinct.

A compact NeurIPS research poster preview appears alongside the paper introduction. The poster is available as a view-only PDF. **Read Paper** opens the official OpenReview PDF: https://openreview.net/pdf?id=sO7mOWC5TC. The arXiv button links to https://arxiv.org/abs/2611.09665.

For hosting, see [`DEPLOY_CN.md`](DEPLOY_CN.md). The website retains the source figures and their provenance files in `docs/assets/`.
