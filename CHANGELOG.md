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

### Fixed — Statistical correctness (post-review, 2026-07-02)

針對 v2.6 程式碼審查所列 8 項統計/學術正確性問題，於 v2.7 程式碼上逐一複核。其中 #1/#2/#4/#8 已於 v2.6 修正、部分已於 v2.7 修正；本次補上剩餘的實質問題並補充文件說明。

**複核結果總表**

| # | 問題 | 目前狀態 | 本次動作 |
|---|------|---------|---------|
| 1 | DualPair 零不良顯示 `Equiv. Cpk: Infinity` | 已修正 (v2.6) | 複核確認（`pClamped` 夾住 `0.5/N`，顯示上限 `>6.00`） |
| 2 | RSS/敏感度 FitShift 變異數用錯除數（Beta 應為 8 非 12） | 已修正 (v2.6) | 複核確認（`calculateFitShiftVariance` 以 `E[g²]/8`（Beta）vs `/12`（Uniform）） |
| 3 | 零不良直接報 `Cpk = 5.0`（超出 MC 解析度） | **本次修正 (v2.8)** | 改為 rule-of-three 統計下界並加「>」標示 |
| 4 | 全 Fixed 項目時直方圖除以零 | 已修正 (v2.6) | 複核確認（`range === 0` 特判） |
| 5 | Compression Mode 分母趨近零注入 `0`（偏誤） | **本次修正 (v2.8)** | 改為 `NaN` 排除該迭代 |
| 6 | Normal(Sort) 的 Cp 語意未揭露 | **本次補充 (v2.8)** | 於 Cp 輸入欄加 tooltip 說明 |
| 7 | `cpkToSigma` 命名 / `cp<=0` 靜默替換 | 命名已為 `cpToSigma`；靜默 fallback 保留 | 視為防禦性預設，維持現狀 |
| 8 | SPC「Paste absolute values」文字與實作矛盾 | 已修正 (v2.6) | 複核確認（現為 "Paste measurement values"） |

已驗證正確、未修改的核心實作：Box-Muller（含 spare 快取）、Acklam 反常態 CDF、Anderson-Darling A² 與 p-value 近似、Beta(0.5,0.5) 取樣 `sin²(πU/2)`、截斷常態 inverse-CDF、σ 換算（Normal `T/2/(3Cp)`、Uniform `T/√12`）、樣本標準差 n−1、Q-Q plotting position `(k−0.5)/n`。

**#3 — 零不良的等效 Cpk 改用統計下界**
- 問題：5M 次模擬觀察到 0 個不良時直接回報 `Cpk = 5.0`，屬無證據支持的點估計，且與「1 個不良 → Cpk ≈ 1.69」之間存在不連續跳躍。統計上 N 次試驗 0 個不良僅能斷言 `p < 3/N`（rule of three，約 95% 信賴）。
- 修正（`TolMaster.tsx` `calculateSimulationStats`）：任一規格側觀察到 0 個不良時，該側改回報下界 `normSInv(1 − 3/N) / 3` 而非 `5.0`；回報值取各側最小（最差側），新增 `cpIsLowerBound` 旗標跟隨最差側是否為零不良。非零不良情況（分母仍為 N）與 v2.7 完全一致，行為不變。
- UI（Equiv. Cpk 卡片）：`cpIsLowerBound` 為真時數值前綴顯示「>」（例如 `>1.62`），tooltip 說明此為 rule-of-three 95% 信賴下界、實際能力可能更高、需更多迭代才能解析。綠色 success stripe 條件 `cp >= 1.33` 不受影響。
- 型別：`SimulationResult` 新增必填欄位 `cpIsLowerBound: boolean`（唯一建構點為 `calculateSimulationStats`）。

**#5 — Compression Mode 分母趨近零**
- 問題：壓縮比計算中，壓縮目標（分母）實現值 `|denom| < 1e-6` 時將該次迭代設為 `0`，把「比值未定義」當成合法的 0% 樣本，會拉偏平均、標準差與良率。
- 修正（`TolMaster.tsx` Monte Carlo 迴圈）：改設為 `Number.NaN`，交由下游既有的 `Number.isFinite` 防護排除於統計之外（與 FitShift interference 相同的排除機制），而非注入 0。以真實尺寸輸入而言此分支幾乎不會觸發，屬潛在正確性強化。

**#6 — Normal(Sort) 的 Cp 語意揭露**
- 問題：Normal(Sort) 依規格界截斷後，成品實際 σ 必然小於輸入 Cp 所對應的 σ；使用者輸入的 Cp 是「篩選前製程」的能力，易被誤讀。
- 修正（`TolMaster.tsx` Cp 輸入欄）：依分布類型顯示不同 tooltip；Normal(Sort) 明確標示「Cp = 篩選前的製程能力，成品實際 σ 會小於此值對應的 σ」。

**#7 — 說明**
- 函式已命名為 `cpToSigma`（採 Cp 語意），審查所指命名問題已解決。`cp <= 0` 時回退為 `tolerance / 3`（等同 Cp = 1）之靜默替換予以保留，視為避免除零的防禦性預設。

**驗證**
- `npm run build`：通過（Vite 單一 HTML 建置成功，約 6s）。
- 型別：本次新增 `cpIsLowerBound` 已於唯一建構點提供，無新增型別錯誤（既有 `tsc --noEmit` 警告皆與本次修改無關：worker 匯入型別、`design_handoff` 暫存資料夾等）。
- 非零不良路徑數值與 v2.7 一致（分母、公式未變），僅零不良顯示與 compression 分母邊界行為改變。

## [2.7.0]
- UI/UX refinements to the analysis workspace, charts, and modals (Compression Mode, Dual-Pair, SPC).

## [2.6.0]
- Fixed statistical-correctness issues raised in code review.
- Updated version strings; added Google Analytics gtag injection on build.

## [2.5.0]
- Earlier baseline release.
