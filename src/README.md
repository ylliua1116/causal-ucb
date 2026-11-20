# Experimental implementations

This directory contains the policy implementations, a controlled matched-seed evaluation driver, and source-record verification tests for the CAUSAL-UCB research release.

| Path | Role |
| :--- | :--- |
| `cert_dr.py` | Certified doubly robust and IPS online policies |
| `fast_compare.py` | Seven-method benchmark with shared experimental seeds and record export |
| `original_source/causal_ucb_conditional.py` | Conditional CAUSAL-UCB model, oracle and baseline policies |
| `replay_missing_rounds.py` | Reproduce five Low Mismatch baseline trajectories and validate the archived hashes and terminal metrics |
| `build_replayed_comparison.py` | Merge verified replayed trajectories into the website comparison record |
| `tests/` | Policy correctness and data-integrity checks |

## Run from repository root

```bash
python -m pip install -r requirements.txt
python -m unittest discover -s src/tests -v

# Primary evidence: High Mismatch
python src/fast_compare.py --out results_high --seeds 24 --T 200 --scenarios high_mismatch

# Both regimes
python src/fast_compare.py --out results_full --seeds 24 --T 200 --scenarios high_mismatch,low_mismatch
```

The driver outputs per-seed terminal records, summary statistics, certified-policy per-round traces and the experiment protocol. The website's complete frozen seven-method record additionally includes archived High Mismatch reference trajectories and verified Low Mismatch reference replays. See [the reproducibility guide](../REPRODUCIBILITY.md) for the exact provenance distinction and verification procedure.

### Recompute missing-reference replays

```bash
python src/replay_missing_rounds.py
python src/build_replayed_comparison.py
python -m unittest discover -s src/tests -v
```

These commands write to the bundled `docs/assets/certified-benchmark/` directory. Run them in a working copy if you want to preserve the shipped frozen files. The scripts verify original terminal values and decision hashes instead of interpolating or inventing trajectories.

**Model scope:** the comparison assumes the specified known local ring-interference environment. Certification statements apply only to certified policies under their formal conditions. The independent website Python lab is a separate, smaller demonstration.
