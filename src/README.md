# Experiment implementations

The source directory contains the policies and controlled evaluation driver used by the CAUSAL-UCB demonstration.

| File | Purpose |
| --- | --- |
| `cert_dr.py` | Certificate-aware DR and IPS online policies |
| `fast_compare.py` | Seven-method matched-seed comparison and result export |
| `original_source/causal_ucb_conditional.py` | Conditional CAUSAL-UCB model and policies |
| `tests/` | Unit tests for the certificate implementation |

From the repository root, install the dependencies and run:

```bash
python -m pip install -r requirements.txt
python -m unittest discover -s src/tests -v
python src/fast_compare.py --out results_smoke --seeds 1 --T 35 --scenarios high_mismatch
```

For 24 paired seeds and 200 rounds under both mismatch regimes:

```bash
python src/fast_compare.py --out results_full --seeds 24 --T 200 --scenarios high_mismatch,low_mismatch
```

The experiment writes fresh outputs under the selected `--out` directory. The web visualizations use the included experimental records in `docs/assets/certified-benchmark/`, not the output of a visitor's browser session.

**Applicability:** The certificate-aware benchmark uses the specified known-ring, local-interference experimental model. The website's adjustable Live Lab runs the conditional implementation separately; its short-horizon results should not be treated as certified-benchmark outcomes.
