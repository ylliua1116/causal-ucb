# Benchmark reproducibility and data provenance

## Purpose

This guide explains which experiments are originally archived and which are deterministic replays. It also defines the boundary between measured numerical evidence, diagnostic quantities and certificates.

## Frozen benchmark protocol

| Item | Configuration |
| :--- | :--- |
| Experimental regimes | High Mismatch (`η = 0.55`) and Low Mismatch (`η = 0.08`) |
| Primary study | **High Mismatch** |
| Paired seeds | 24 (`51001`–`51024`) |
| Horizon | 200 rounds |
| Candidates | 5 configurations |
| Network | 24 nodes, known radius-one ring interference |
| Outcome windows | 2 per round |
| Policies | Certified DR, Certified IPS, reference CAUSAL-UCB, reference IPS-UCB, Raw-UCB, Greedy-Raw, Switchback-OED |
| Model details | [`protocol.json`](docs/assets/certified-benchmark/protocol.json) and the official paper |

The generator and policies use the controlled assumptions specified in the source (`src/original_source/causal_ucb_conditional.py`). The oracle is used **for evaluation after actions**, not as a decision input to the policies.

## Record inventory

| Path | What it contains | Provenance |
| :--- | :--- | :--- |
| [`per_seed.csv`](docs/assets/certified-benchmark/per_seed.csv) | Frozen terminal per-seed outcomes, selected configurations, choice digests | Original reference record |
| [`summary.csv`](docs/assets/certified-benchmark/summary.csv) | Frozen aggregate terminal quantities | Original reference record |
| [`cert_dr_all_rounds.csv`](docs/assets/certified-benchmark/cert_dr_all_rounds.csv) | Certified-policy round traces | Original archive |
| [`reference_high_mismatch_5methods.csv.gz`](docs/assets/certified-benchmark/reference_high_mismatch_5methods.csv.gz) | High Mismatch five-reference-policy traces | Original archive |
| [`replayed_low_mismatch_5methods.csv.gz`](docs/assets/certified-benchmark/replayed_low_mismatch_5methods.csv.gz) | Low Mismatch five-reference-policy traces, 24,000 rows | Deterministic replay, newly generated |
| [`replayed_low_mismatch_audit.json`](docs/assets/certified-benchmark/replayed_low_mismatch_audit.json) | SHA-256 / terminal record comparison and generator digests | Replay audit |
| [`seven-method-comparison.json`](docs/assets/certified-benchmark/seven-method-comparison.json) | Website-ready seven-method curves and terminal statistics for both regimes | Aggregated from original and verified replay records |
| [`SOURCE_SHA256.json`](docs/assets/certified-benchmark/SOURCE_SHA256.json) | Archived integrity references | Integrity metadata |

## Verification of five Low Mismatch reference trajectories

Original Low Mismatch files contained all seven methods' **terminal per-seed outcomes and full decision sequence SHA-256 digests**, but originally logged per-round data only for the two certified methods. The missing reference-policy trajectories were recomputed with the original generator, seeds and algorithms.

The replay generated **5 × 24 × 200 = 24,000** reference-policy rows. The audit verifies **168/168** policy–seed choice digests (seven policies × 24 seeds) and checks final regret, gap, ATE error, deployment statistic, diagnostic width and chosen configuration against the frozen terminal records. The audit reports **zero maximum absolute terminal difference**. It provides a strong integrity check for the replay, not a claim that the new CSV existed in the original archive.

### Re-run and validate

```bash
python -m pip install -r requirements.txt
python -m unittest discover -s src/tests -v

# Recreate five Low Mismatch reference trajectories and audit
python src/replay_missing_rounds.py

# Rebuild website aggregation from verified source data
python src/build_replayed_comparison.py

# Verify the resulting artifacts
python -m unittest discover -s src/tests -v
```

The replay writes to `docs/assets/certified-benchmark/`. Use a working copy so you can compare regenerated files with the published archive. The computed results are not smoothed, interpolated or fabricated.

### Run the original comparison driver

```bash
# Primary high-mismatch experiment
python src/fast_compare.py --out results_high --seeds 24 --T 200 --scenarios high_mismatch

# Full two-regime experiment
python src/fast_compare.py --out results_full --seeds 24 --T 200 --scenarios high_mismatch,low_mismatch
```

The core driver produces all seven methods' terminal records, summary statistics and certified-method round records. It does not itself export full reference-method trajectories in the same way as the separately retained High Mismatch archive or the verified Low Mismatch replay. Use `replay_missing_rounds.py` for that missing-reference trace workflow.

## Interpreting results

- **Target regret:** cumulative evaluation-oracle regret of actions selected online.
- **Deployment gap:** accumulated target-vs-exploration value discrepancy for selected actions, not target regret.
- **Final ATE error:** a terminal diagnostic, not a saved 200-point series.
- **Certified width:** only the two certified decision policies carry a decision-active certified width. Diagnostic intervals for references must not be represented as interchangeable certificates.
- **Configuration mode / optimal rate:** the mode is the most frequently selected configuration in the sampled seed cohort; optimal-selection rate measures what proportion end at a target-best configuration.

High Mismatch is the primary stress test. Low Mismatch is an informative boundary case: Greedy-Raw's mean regret (1.000) is slightly below Certified DR's (1.018). Keep this negative/qualifying result visible. A result in the defined ring model does not automatically establish certified guarantees for arbitrary network topologies.

## Figure and website provenance

The website's paper figures are derived from a supplied manuscript archive. [`docs/FIGURE_PROVENANCE.json`](docs/FIGURE_PROVENANCE.json) maps the figure crops to source pages; the public paper link is the official OpenReview PDF. Homepage decorative videos are not measurements. The browser's adjustable conditional experiment uses a distinct implementation and protocol from the seven-method fixed comparison.
