# Changelog

All notable changes to **TolMaster** are recorded here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); versions use the `vMAJOR.MINOR.PATCH` scheme already used in commit prefixes.

## [2.8.0] — 2026-06-18

### Added — Compression-Mode Nominal Optimizer（尺寸最佳化）
- New **Solve Nominal** mode in *Specification Settings* (Compression Mode only), alongside *Manual specs* and *Target Cpk*.
- Given a target Cpk and a fixed compression-ratio window (LSL/USL %), the optimizer back-solves the free nominals:
  - The **compression target (denominator)** is the spread lever — its magnitude sets σ_ratio (σ_ratio ∝ 1/|T|).
  - One other **free variable centres the mean ratio** in the window.
- Each item can be toggled free/fixed with optional **min/max bounds** (interpreted in displayed/absolute magnitude). When the target is unreachable within the bounds, the best achievable design is reported and flagged.
- **Preview-then-apply**: results are shown first; *Apply to table* writes the nominals back in a single update (each item's +/- sign preserved). *Dismiss* discards.
- Solver method: closed-form/proportional seed on |T| (parametric Cpk ∝ |T| when centred), a few 200k-sample Monte Carlo iterations to converge, then a higher-N verification pass.

### Changed — Cpk reporting matches the app
- The optimizer now **targets and reports the equivalent (defect-based) Cpk** — the same metric shown in the *Equiv. Cpk* stat — so the predicted value lines up with what *Run Analysis* displays. A single non-normality correction (`k = parametric / equivalent`) is applied so the equivalent Cpk lands on the target. The parametric μ/σ Cpk is shown as a secondary reference.
  - Background: the compression ratio is a ratio of normals, whose tails are heavier than Gaussian, so the defect-based Cpk sits a few % below the μ/σ Cpk.
- In very-high-yield designs where tail defects are too sparse (< 8 sampled) to estimate the equivalent Cpk reliably, the headline falls back to the stable parametric μ/σ Cpk with an explanatory note (prevents the saturated metric from producing a bad correction factor).

### Internal
- Extracted the Monte Carlo stack-up loop from `runSimulation` into a reusable pure function `runMonteCarloSamples(items, opts)`. *Run Analysis* output is unchanged; the optimizer reuses it to evaluate candidate nominals.
- Added a lightweight `ratioStats` helper returning mean / σ / parametric Cpk / equivalent Cpk / yield / defect count.

### Fixed / UX
- Guard: if no non-denominator free variable is selected, the solver returns a clear message instead of an uncentred (garbage) result.
- Stale solver result cards are now auto-cleared whenever an input (free set, bounds, target Cpk, or the window) changes, so an out-of-date suggestion can't mislead.

## [2.7.0]
- UI/UX refinements to the analysis workspace, charts, and modals (Compression Mode, Dual-Pair, SPC).

## [2.6.0]
- Fixed statistical-correctness issues raised in code review.
- Updated version strings; added Google Analytics gtag injection on build.

## [2.5.0]
- Earlier baseline release.
