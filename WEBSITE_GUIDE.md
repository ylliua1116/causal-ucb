# Interactive research website guide

The website in `docs/` complements the paper with a guided network explanation, the core causal-selection ideas, archived benchmark evidence and separate browser-executable Python demonstrations.

## Page map

1. **Network overview:** a conceptual illustration of fixed network topology and interference. Changes in appearance represent explanatory animations rather than estimated network edges.
2. **Research overview and poster:** a compact poster PDF preview close to the explanation of the steady-state target.
3. **Method:** causal value estimation, DR correction, certificate-based optimism and theoretical context.
4. **Evidence:** primary **High Mismatch** benchmark with seven policies, 24-seed curves and CSV export. Low Mismatch can be selected as a boundary analysis.
5. **Run Python in browser:** independently executed, tunable five-policy conditional experiment. It is not the seven-method matched-seed benchmark.
6. **Reproducibility and figures:** access to paper plots, recorded data, protocol metadata and audit sources.

## Data interpretation

The benchmark reads `docs/assets/certified-benchmark/seven-method-comparison.json`. It shows original archived High Mismatch traces and certified-policy Low Mismatch traces, plus five Low Mismatch traces verified by deterministic replay. The **Configuration / optimal rate** column reports a modal selected configuration with seed count, and at the terminal round the fraction that selected the target-best configuration.

A missing certified width for a reference policy means no corresponding valid decision-active certificate is available; it must not be turned into zero. For science-facing details see [`REPRODUCIBILITY.md`](REPRODUCIBILITY.md).

## Presentation decisions

- High Mismatch is the main scientific evidence; Low Mismatch tests the claim's boundary.
- The poster is a **PDF preview**, rather than an editable slide download.
- The paper link goes to [official OpenReview](https://openreview.net/pdf?id=sO7mOWC5TC).
- Decorative videos can be disabled via **SAVE DATA** without changing any benchmark records.
- Scientific limitations appear where relevant instead of repeating lengthy disclaimer text throughout the page.
- Internal asset metadata can contain protocol/version keys needed for parsing, but the public presentation avoids revision-number marketing labels.

For publishing instructions, see [`DEPLOYMENT.md`](DEPLOYMENT.md).
