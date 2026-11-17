# CAUSAL-UCB project website V11 · update log

This release updates **the existing website**, rather than replacing the research algorithms.

## What was changed

| Location | Before | After |
|---|---|---|
| `docs/index.html` | generic project narrative; older figure labels | NeurIPS 2026/66-page manuscript narrative, theoretical contribution summaries, refreshed main/appendix tabs, embedded poster preview |
| `docs/site-config.js` | blank arXiv URL; externally hosted older paper URL | `https://arxiv.org/abs/2611.09665` and bundled `assets/paper/CAUSAL_UCB_2026_Latest_66p.pdf` |
| `docs/science-v5.js` | appendix Fig. 27 erroneously called full-path coverage; Fig. 31 wrongly linked to p. 63 | correct Fig. 28 (p. 61) full-path coverage; separate Fig. 27 paired-regret forest (p. 60); Fig. 31 p. 62; updated captions and source navigation |
| `docs/site-v11.css` (new) | five crowded small tab hit targets | larger ~73px-or-greater touchable tiles, responsive grid, active/hover/focus feedback |
| `docs/v11.js` (new) | pointer-only tab controls | Arrow Left/Right, Home/End and keyboard-focus support |
| `docs/assets/paper-figures/paper-figure-{3..7}.png` | previous figure crops | regenerated from supplied 66-page PDF pages 8/9/10 |
| `docs/assets/paper-audit-figures/` | wrongly named Fig27 coverage & old Fig31 p63 | actual Fig26 p60, Fig27 p60, Fig28 p61, Fig31 p62 |
| `docs/assets/paper/` | manuscript opened by older offsite link | original supplied 66-page manuscript hosted with the site |
| `docs/assets/poster/` and `poster-preview.jpg` | no optional poster preview | viewable PDF, editable PPTX download and compact JPEG preview |
| `README.md`, `DEPLOY_CN.md` | no V11 publication instructions | actual update paths and GitHub Pages deployment instructions |

## Scientific guardrails

- Supplied 66-page PDF is the source of figure numbering, cropping and figure-page links; the arXiv v1 preprint currently has 64 pages.
- The 24-paired-seed, 200-round controlled comparisons are separate from the independent 300-seed × 160-round certificate audit.
- The decision benefit is not assumed universal; high-mismatch regret improves but deployment gap is larger.
- METR-LA and FlockLab tests use network-derived traces and model-generated counterfactual outcomes, not live network deployments.
- Poster graphics are a high-level summary, not replacement data.
- No experimental data, estimators, benchmark records or Python source implementation was changed.

## Obsolete asset names

The full archive omits `docs/assets/paper-audit-figures/Fig27_Full_Path_Coverage_p60.png` and `docs/assets/paper-audit-figures/Fig31_Hidden_Misspecification_p63.png`. They can also be deleted from the deployed repository after confirming the new site. The new site does not refer to them.
