# Changelog

All notable changes to **TolMaster** are recorded here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); versions use the `vMAJOR.MINOR.PATCH` scheme already used in commit prefixes.

## [2.9.2] — 2026-08-20

### Fixed — 方向為負的項目，非對稱公差往反方向計算

- 問題：`nominal` 的正負號代表堆疊方向，但 UI 顯示與編輯的是量值（|nominal|），`Tol +` / `Tol −` 也是掛在該量值上。舊實作直接把 `tolPlus` 加在帶號的 nominal 上（`nominal + tolPlus`），使方向為 − 的項目公差往反方向展開：`− 13.2 (+0.6/−0)` 實體尺寸為 13.2–13.8，堆疊貢獻應為 −13.8…−13.2，卻被算成 −13.2…−12.6。對稱公差（±）時兩側相同，誤差被完全遮蔽，因此長期未被發現。
- 修正：新增 `signedStats()` / `signedMeanOffset()`，統一以方向投影計算有效平均值與上下界（方向為 − 時，`tolPlus`/`tolMinus` 在堆疊空間互換）。Monte Carlo 抽樣參數、Worst Case 堆疊、Compression Mode 求解器的 `effOffset` 全部改走此處。
- Empirical 分佈抽樣：實測偏差屬於實體（量值）空間，改為先投影到堆疊方向再加上帶號平均值（`sign * (sample − model.mean) + mean`）。
- SPC 匯入（`SPCModal`）：實測資料通常以正值貼入，舊邏輯把 `stats.mean` 原樣寫回會讓負方向項目靜默翻向。改為投影到項目既有方向，並套用同一套方向感知的公差偏移。
- 說明文案（`helpContent.ts`）：`table.nominal` / `table.tolPlus` / `table.tolMinus` 補述「公差相對於顯示的尺寸值，與方向按鈕無關」。

#### 影響範圍

既有存檔中若含「方向為 −」且「非對稱公差」的項目，重新開啟後 Worst Case 與 Monte Carlo 結果會與 2.9.1 不同 —— 這是修正而非退步。全對稱公差的專案結果完全不變。

#### 驗證

- 案例（Brick − 13.2 +0.6/−0、TIM − 3.5 ±0.35、Height + 15.425 ±0.1）：Max / Min / Center 由 −0.225 / −1.725 / −0.975 修正為 −0.825 / −2.325 / −1.575；半寬 ±0.75 不變。
- Monte Carlo（N=1M）：μ = −1.575，與 Worst Case 中心一致。
- 回歸（全對稱：+10 ±0.1、−9.5 ±0.05、−0.3 ±0.02）：維持 Max 0.37 / Min 0.03 / ±0.17，與修正前相同。
- Invert All：全數反號後為 Max 2.325 / Min 0.825，寬度不變。
- `npm run build`：通過；Edge 對最終 `dist-single` smoke test 通過。
- 版本號已在 `package.json`、`package-lock.json` 與應用程式 UI 同步為 2.9.2。

## [2.9.1] — 2026-08-04

### Changed — 專案 Sheet 導覽改為可調整的桌面側邊欄

- 桌面版將原本頁面頂端的水平 Sheet 分頁移至左側垂直側邊欄；低於 768px 的窄螢幕仍使用可水平捲動的分頁導覽。
- Sheet 可透過專用拖曳把手重新排序，並支援鍵盤操作；排序結果直接寫回專案順序並隨既有專案資料持久化。
- 桌面側邊欄可用指標或鍵盤在 160–420px 間調整寬度，也可收合為 48px；寬度與收合狀態儲存於 `tolMasterProjectSidebarUI_v1`。
- Sheet 數量較多時側邊欄可垂直捲動；導覽 rail 維持 sticky，並移除外層 `overflow-x-clip`，避免破壞 sticky 定位。
- 調整寬度時使用 pointer capture，並提供 20px 寬的 resize hit area，讓拖曳在游標離開把手後仍能穩定完成。
- 版本號已在 `package.json`、`package-lock.json` 與應用程式 UI 同步為 2.9.1。

#### 驗證

- `npm run build`：通過。
- Edge 對最終 `dist-single` smoke test：確認 160–420px resize bounds、收合狀態持久化、sticky rail，以及低於 768px 的水平導覽 fallback。
- `git diff --check`：相關變更檔案通過。

## [2.9.0] — 2026-07-09

### Fixed — Solve Nominal 離散步階路徑 + 匯入/多專案穩定性（程式碼審查續批）

延續 2.8.1，本次針對 Solve Nominal（分母對中求解）的離散步階路徑，以及跨專案/匯入的穩定性，再做一輪多角度審查，識別並修復以下問題（含 2 項超出前次上限的已驗證發現）。

#### 嚴重性一：崩潰 / 設定流失

**S1 — 匯入舊版 JSON 導致整個 app 崩潰**
- 問題：2.8.x 之前的 export 其 `failureBreakdown` 沒有 `ratioUndefined` 欄位；帶結果的舊檔匯入後 `simulationResult` 為 truthy，`?? {...}` 後備不觸發，render 時 `simulationFailureBreakdown.ratioUndefined.toFixed(5)` 對 `undefined` 拋 TypeError，ErrorBoundary 取代整個畫面。
- 修正：`simulationFailureBreakdown` 改為逐欄位預設（`?? 0` / 由計數回推），任一欄位缺失都不再讓 render 崩潰。

**S2 — 切換分頁清空其他專案的 solver 設定**
- 問題：`solverFreeIds`/`solverBounds` 為全域 state，pruning effect 用「當前」專案的 item ids 裁剪；在 A 專案設好自由變數/邊界後切到 B 再回來，A 的設定已被 B 的 ids 清光（相對 HEAD 為退步）。
- 修正：solver state 改為 per-project（`solverFreeIdsByProject`/`solverBoundsByProject` 依 project id 儲存），衍生 active slice + wrapper setter（呼叫點不變）；pruning 只作用於自身 slice。

**S3 — Compression Mode 切換永久銷毀 spec 窗**
- 問題：2.8.1 的 toggle 雙向無條件清空 `specLower`/`specUpper`/`targetNominal`，誤觸或「快速看一眼」即永久失去已設定規格窗、autosave 寫入 localStorage 且無法復原。
- 修正：新增 per-(專案, 模式) 規格快取 `specWindowCacheRef`，切換時先保存當前模式的規格窗、再還原目標模式先前的值，不再雙向銷毀。

#### 嚴重性二：solver 承諾的 Cpk 與 Apply 後實跑不一致

**S4 — 離散格點 Cpk 口味假通過**
- 問題：格點 pass gate 在缺陷數 <8 時由缺陷式等效 Cpk 切到偏樂觀的參數式 Cpk（heavy tails），使實際不達標的厚度被判「通過」，Apply 後結果卡（缺陷式 Cpk）與 solver 矛盾。續連解的 k-factor 非常態修正未套用於離散路徑。
- 修正：捕捉續連解量得的非常態因子 `nonNormalK`；gate 統一為「缺陷足夠→等效 Cpk；否則→參數式 ÷ k」，跨候選一致且與結果卡口徑相符。

**S5 — 分母比例公差（tol%）無 step 時被完全忽略**
- 問題：`padTolFor` 只在 `denomStep` 分支被呼叫；連續可調分母填了 tol% 卻仍以項目原本的固定公差求解，Apply 也因 `snappedToStep` 閘門而不寫回公差，且無任何警告。
- 修正：`padTolFor` 移入 `buildCandidate`，不論是否設 step 都套用比例公差；續連解 return 帶回 `denomTol`，Apply 寫回不再受 `snappedToStep` 限制。

**S6 — 對中使用覆寫前的（非對稱）公差**
- 問題：`chk()` 先 `buildCandidate` 解出對中 nominal，再事後覆寫分母公差為對稱 ±mag·ratio；非對稱公差時對中用的是原 `effOffset`，每個格點候選都被評在偏離窗中心處，低估 Cpk、推向更厚的墊片或假性不可行。
- 修正：`buildCandidate` 先套用（對稱化）比例公差、再以覆寫後的分母項目計算對中，兩者一致。

**S7 — FitShift 當分母的回溯性失效（統一禁令）**
- 問題：`normalizeCompressionTarget` 與 UI 禁止 FitShift 當分母，但 sampler 仍保有以 FitShift 間隙為分母的分支，形成矛盾；審查將其視為「舊專案靜默失效」。
- 決策/修正：統一「FitShift 不能當分母」。保留 UI「—」與 `normalizeCompressionTarget` 禁令，移除 sampler 中矛盾的 FitShift-target 死分支，全鏈路單一規則。連帶消除 `ratioStats` 無效樣本盲點的前提（分母恆為實體厚度、不為 0），故 `ratioStats` 未變動。

#### 嚴重性三：陳舊狀態 / UI 誤導

**S8 — 編輯項目後 solver 結果不失效**
- 問題：reset effect 的 deps 不含 item 內容；改了分母 nominal/公差後，舊的「feasible / Cpk」卡片與 Apply 按鈕仍有效，會寫回過時解。
- 修正：reset effect 加入 item 內容簽章（nominal/公差/type/distribution/cp/meanShift/fitParams/empiricalModel），任一改變即清除舊結果。

**S9 — 規格微調後 straddles-zero 警告橫幅消失**
- 問題：spec 變更的 debounced 重算重建 `SimulationResult` 時只保留 `gapStats`，丟失 `compressionTargetStraddlesZero`，使跨零警告橫幅在微調規格後消失。
- 修正：重算時一併保留該旗標（其僅依分佈、與 spec 無關）。

**S10 — step 輸入對所有自由變數開放但只有分母生效**
- 問題：step 輸入對每個自由變數渲染，但 `solveNominals` 只讀分母的 step；非分母填的 step 被靜默忽略、可能寫入 off-grid nominal；`snapMag` 為死代碼。
- 修正：step 輸入閘為僅分母（比照 tol%），非分母顯示占位；移除死代碼 `snapMag`。

#### 情境相依（本版未改）

- **離散格點掃描效能**：最壞情況最多 201 個格點各跑一次全量 Monte Carlo、於單一 main-thread callback 內完成，違反 1M<2s 目標。一般掃描候選數少（通常 <5），本版維持不變；大範圍 + 高 `simulationCount` 時仍可能凍結 UI，後續視需要改二分搜尋或低 N 篩選。

#### 驗證

- `npm run build`：通過（CSS warning 為既有、與本次無關）。

## [2.8.1] — 2026-07-08

### Fixed — Compression Mode 高風險缺陷修復（程式碼審查 10 項）

本次針對 Compression Mode 進行深度程式碼審查，共識別 10 個問題（8 項機制確認、2 項情境相依），全數於本版修復。

#### 嚴重性一：執行期資料錯誤

**F1 — spec-recalc effect 無限重算迴圈**
- 問題：`useEffect`（line ~1490）的 deps 陣列含 `resultsMap`，但 effect body 每次必定寫入 `resultsMap`，導致每次模擬後每 300ms 無限重算一次完整統計（含 5M 樣本的 `Array.from` 複製與直方圖），持續燒 CPU/GC 直到頁面關閉。
- 修正：deps 移除 `resultsMap`（body 已用 functional `setResultsMap`，不需它當依賴）。

**F2 — 刪除壓縮目標後全部樣本變 NaN、誤診為 FitShift 干擾**
- 問題：`handleDeleteItem` 只過濾 items 陣列，不清除 `compressionTargetId`；殘留的 id 通過下游 truthy-only 判斷，`targetItemValue` 恆為 0，分母 `< 1e-6`，使所有 N 個樣本變 NaN，良率顯示 0%、PPM 100 萬，且全部誤標為「FitShift interference」。import 與 localStorage 載入亦不驗證 target id 是否存在於 items。
- 修正：`handleDeleteItem` 刪到 target 時一併清為 null；import 載入後驗證 target 存在性，不存在則清除。

**F3 — NaN 全歸類為 FitShift 干擾，良率與 Equiv. Cpk 互相矛盾**
- 問題：`calculateSimulationStats` 對所有非有限樣本一律計入 `fitShiftInterferenceCount`，把壓縮比未定義（分母 ≈ 0）的 sentinel 誤報成「FitShift 干擾」；NaN 樣本被算進 defects（`N − passCount`）壓低良率、灌高 PPM，但 per-side Cpk 分支（`failLow`/`failHigh`）不含它們，使結果卡片同時出現「Equiv. Cpk > 1.51」與「良率 0%」的矛盾。line 528-530 的引擎註解宣稱 NaN「不影響良率」亦為錯誤。
- 修正：引擎改用 `-Infinity` 作為「ratio 未定義」的獨立 sentinel（與 FitShift 的 `NaN` 區分）；stats 分別計數，`failureBreakdown` 新增 `ratioUndefined` 欄位；修正錯誤註解。型別：`FailureBreakdown` 新增 `ratioUndefined`，`SimulationResult` 新增 `ratioUndefinedCount`。

**F4 — toggle Compression Mode 不清除 spec，絕對單位與比例% 靜默互換**
- 問題：toggle 只翻轉旗標並清結果，`specLower`/`specUpper`/`targetNominal` 保留原值；使用者在一般模式輸入的 9.5/10.5 mm 切到壓縮模式後被當作 9.5%/10.5% 使用，無任何警告；欄位 placeholder 仍顯示絕對 wcResult 數值。
- 修正：toggle 時清除三個 spec 欄位；`%-`標籤欄位 placeholder 改顯示 % 提示（如「e.g. 9.5 (%)」）。

**F5 — result resurrection：toggle 清結果後 300ms 內舊結果復活**
- 問題：`setSimulationResult(null)` 會改動 `resultsMap`，觸發 F1 同一 effect，300ms 後用 `simulationSamplesRef` 的舊樣本重建統計，以對面模式的標籤（DIMENSION vs COMPRESSION RATIO (%)）渲染錯誤模式的資料。
- 修正：toggle 時一併清 `simulationSamplesRef.current` 與 `lastSimulatedProjectId.current`（F1 修正後此路徑已不會被重觸發，雙重防護）。

#### 嚴重性二：功能邏輯錯誤

**F6 — FitShift 項目可被選為壓縮目標，solver 空轉**
- 問題：壓縮目標 radio 對所有 row 類型渲染；FitShift 被選為 target 時，引擎分母為整個 hole-shaft gap（非可控 nominal），solver 寫入的 `nominal` 欄位對 FitShift sampler 無效（sampler 只讀 `fitParams`），fixed-point 迴圈 6 次空轉後回傳外表收斂但實質無效的結果。
- 修正：FitShift row 不渲染 radio，改顯示「—」說明不可選。

**F7 — ratioStats 與 calculateSimulationStats 的 Equiv. Cpk 計算邏輯漂移**
- 問題：`ratioStats`（solver 用）在零缺陷側使用舊版 flat 5.0 cap；`calculateSimulationStats`（結果卡用）於 v2.8 改用 rule-of-three 下界；line 585 的「identical method」註解不實。solver 預測 Cpk ≈ 5.0、Apply 後結果卡顯示「> 1.51」，數字無法重現。
- 修正：抽取共用 helper `defectRateToCpk(failCount, N)`（rule-of-three 版本），兩處統一使用；修正註解。

**F8 — solver 自由變數殘留刪除項 id，選出死 id 當對中變數**
- 問題：`solverFreeIds` 為 transient state，reset effect（line 1065-1068）deps 不含 items 清單；刪除 item 後 id 殘留，`solveNominals` line 1580 從殘留 id 挑 centeringId，`handleApplySolverResult` 對死 id 靜默丟棄——使用者看到「請至少再勾選一顆非分母的自由變數」但 UI 已無對應 checkbox 可取消。
- 修正：`handleDeleteItem` 同步剔除 `solverFreeIds`/`solverBounds`；新增 effect 依 items id 簽章裁剪殘留 id（涵蓋 import/load 情境）。

#### 嚴重性三：計算品質問題

**F9 — 分母 guard 門檻固定 1e-6 且 Math.abs 消去正負號**
- 問題：固定 `1e-6` 門檻對於量級差異大的尺寸過於保守或過於寬鬆；`Math.abs(targetItemValue)` 使目標分佈跨零時正負號被隱藏，分母接近但不過零的樣本產生天文數字比值，主導 mean/σ 並使直方圖 50 格塌縮成一格。
- 修正：門檻改為相對 target 量級（`max(1e-6, scale × 1e-4)`）；偵測 target 分佈跨零並將 `compressionTargetStraddlesZero` flag 傳入 `SimulationResult`（供後續 UI 警告使用）。

**F10 — Contribution Analysis 在 Compression Mode 下顯示絕對堆疊變異份額**
- 問題：`sensitivityData` 純計算絕對堆疊的 analytic variance 分配，完全不含 σ_ratio ∝ 1/|T| 的分母槓桿；壓縮目標的公差可能是比值散佈的最大驅動者，卻在圖表上顯示很小的貢獻值，引導使用者往錯誤方向收緊公差。
- 修正：Compression Mode 下的圖表副標題加註「absolute stack（does not reflect compression-ratio leverage）」，明確標示此圖在該模式下的限制。

#### 驗證

- `npm run build`：通過（454.54 kB，4.84s，CSS warning 為既有與本次無關）。
- `npx tsc --noEmit`：`TolMaster.tsx` 無新增型別錯誤（唯一既有錯誤 line 248 `toUpperCase on never` 為 switch 窮舉問題，位於本次改動範圍之前，早已存在）。

### Fixed — Compression Mode 補強（審查回饋，2026-07-09）

上一版 F2/F3/F6/F9 為部分修復，複審後補完剩餘缺口：

- **F2／F6 集中化驗證**：新增模組級 `normalizeCompressionTarget(project)`，於 compressionTargetId 指向「已刪除」或「FitShift 型別」項目時一律清除。套用於 localStorage 載入（先前完全未驗證）與 JSON import（先前僅檢查存在性、未擋 FitShift）兩條路徑，單一事實來源取代散落的 per-call-site 判斷。修正舊版遺留的 dangling／FitShift target 於升級後仍會觸發全樣本失效的問題。
- **F3 良率／Cpk 一致性**：`calculateSimulationStats` 在存在無效樣本（ratio 未定義或 FitShift 干擾）時，將「總不良率」反推的 Cpk 作為下界折入回報值（`defectRateToCpk` 在不良率趨近 1 時回傳 -Infinity，故 clamp 於 0），使 Equiv. Cpk 不再與崩潰的良率互相矛盾。同時把 `ratioUndefined` 失效比例與提示文字實際呈現在良率卡（先前僅存於資料未顯示）。
- **F9 跨零警告落地**：`compressionTargetStraddlesZero` flag 於結果區以警告橫幅呈現（先前僅計算未顯示），提醒使用者分母跨零時 Mean/σ、直方圖與 Cpk 不可靠。

**驗證**：`npm run build` 通過（455.70 kB，7.31s）；`npx tsc --noEmit` 於 `TolMaster.tsx` 無新增錯誤（僅既有 line 248）；瀏覽器 preview 確認 app 正常渲染、FitShift 目標顯示「—」、含 FitShift 干擾的既有專案 Equiv. Cpk 由零不良下界改為與良率一致之 1.40。

---

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

### Added — In-app help system（站內說明，2026-07-03）

背景：使用者反映常有人詢問術語（Cpk/PPM/RSS/σ）、功能用法（FitShift/Compression Mode/SPC/雙對分析）、選項差異（分佈類型/規格輸入模式）與結果判讀，希望能在 App 內自行找到答案。

- 新增共用元件 **`HelpTip`**（`src/components/HelpTip.tsx`）：以 `createPortal` 掛載至 `document.body`、`position: fixed` 呈現的 tooltip，避免被公差表格的 `overflow-x-auto` 容器裁切。支援 hover（延遲顯示）與點擊釘住（點擊外部或 `Escape` 關閉），並依視窗邊界自動 clamp。
- 新增集中內容檔 **`src/content/helpContent.ts`**：所有繁體中文說明文字（表格欄位、分佈類型、工具列數值、規格輸入模式、結果卡片、FitShift 欄位、SPC 統計量、雙對分析欄位）與 `CPK_BANDS` 分級表，與元件程式碼分離，方便日後只改文字。
- 已套用 tooltip 的位置：公差表頭（`Nominal`/`Tol +`/`Tol −`/`Dist`/`CP`）、分佈類型下拉選單、Mean Drift 開關、CP 輸入欄（依 `Normal(Sort)` 顯示不同說明）、Compression Mode、Specification Settings 三種模式（Manual/Target Cpk/Solve Nominal）、結果卡片（Yield/PPM/Equiv. Cpk/Mean-StdDev/Simulated Range）、直方圖與 Contribution Analysis 圖表標題、RSS/Worst Case 讀數、Fit Shift Calc 視窗（Hole/Shaft/Gap）、SPC 視窗（Sigma/Estimated Cp/Anderson-Darling/Q-Q plot/實測分佈選項）、雙對分析視窗（ΔP Max/WC Margin/P(Margin<0)/Margins）。原本零星的手刻 `group-hover` tooltip（Equiv. Cpk、雙對分析統計量、Anderson-Darling）已統一改用 `HelpTip`。
- 新增 **`HelpModal`**（「說明」按鈕）：五個分頁——快速上手、名詞解釋、分佈類型、功能指南、結果判讀（Cpk 分級與 PPM/良率對照表）。可從 header 按鈕開啟，首次造訪會自動彈出一次（以 `localStorage` 旗標記錄，關閉後不再自動出現）。

**驗證**
- `npm run build`、`npm run lint` 皆通過，無新增錯誤。
- 於瀏覽器手動測試：tooltip 於表格內不被裁切、點擊釘住／Escape／點擊外部可正確關閉；HelpModal 首次造訪自動開啟且僅一次；模擬結果與其餘既有功能行為不變。

## [2.7.0]
- UI/UX refinements to the analysis workspace, charts, and modals (Compression Mode, Dual-Pair, SPC).

## [2.6.0]
- Fixed statistical-correctness issues raised in code review.
- Updated version strings; added Google Analytics gtag injection on build.

## [2.5.0]
- Earlier baseline release.
