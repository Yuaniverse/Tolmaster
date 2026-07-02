# TolMaster v2.8 更新日誌

本版本聚焦於**學術正確性與統計嚴謹性**的修正，針對 v2.6 程式碼審查中發現的統計方法與邊界情況問題進行處理。所有數值方法（Box–Muller、Acklam 反常態 CDF、Anderson–Darling、截斷常態、Beta(0.5, 0.5) 取樣）皆已重新驗證無誤，以下為本次修正項目。

---

## 🔴 重大修正（影響數值結果）

### 1. FitShift 解析變異數與 Monte Carlo 模型一致化
**檔案**：`src/components/TolMaster.tsx`（RSS 計算、敏感度分析）

- **問題**：先前 RSS 與敏感度分析對 FitShift 項目一律使用 `Var = MaxGap² / 12`。但模擬中 shift 是分布於**實際實現的間隙 g** 內，而非最大間隙；且對於 `Beta(0.5, 0.5)` shift，其條件變異數為 `g² / 8`（非 `g² / 12`）。這導致：
  - Uniform shift：以 MaxGap 高估變異（偏保守，尚可接受）。
  - **Beta(0.5, 0.5) shift：使用錯誤除數 12（應為 8），造成 RSS 低估變異——方向性不保守，是公差分析上的錯誤。**
- **修正**：新增共用函式 `fitShiftVariance()`，以與模擬一致的模型計算：
  ```
  Var(shift) = E[g²] · k
  E[g²] = meanGap² + σ_hole² + σ_shaft²
  k = 1/12 (Uniform) 或 1/8 (Beta(0.5, 0.5))
  ```
  RSS 與敏感度分析改為呼叫此函式，消除兩處重複邏輯。

### 2. 零不良觀察值的等效 Cpk 改用 rule of three 下界
**檔案**：`src/components/TolMaster.tsx`、`src/components/DualPairAnalysisModal.tsx`

- **問題**：
  - 主程式：某一側觀察到 0 個不良時直接報 `Cpk = 5.0`——這是無統計證據支持的點估計，且從「1 個不良 → Cpk ≈ 1.68」跳到「0 個不良 → 5.0」不連續。
  - 雙對分析：`P(Margin < 0) = 0` 時 `normSInv(1 - 0) = normSInv(1)` 進入尾段分支使 `log(0) = -∞`，畫面顯示 **`Equiv. Cpk: Infinity`**（以預設參數跑 5M 次幾乎必然觸發）。
- **修正**：0 不良時改報 rule of three 的 95% 信賴下界 `Cpk ≥ normSInv(1 − 3/N) / 3`（上限仍為 5.0），並在 UI 以 `>` 前綴（如 `>1.60`）與 tooltip 標示此為下界，實際值可能更高。此舉同時消除 Infinity 顯示與不連續跳點。

### 3. Compression Mode 剔除退化樣本（分母 ≈ 0）
**檔案**：`src/components/TolMaster.tsx`

- **問題**：當目標尺寸接近 0（比值未定義）時，先前將 `samples[i] = 0` 注入樣本陣列，把「未定義比值」當成合法的 0% 樣本，會拉偏平均值、標準差與良率。
- **修正**：改以獨立寫入索引剔除退化迭代，並將有效樣本裁切後再計算統計量；剔除次數記錄於 `excludedCount`，於 UI 顯示（如「已剔除 N 次 (目標≈0)」）並輸出 `console.warn`。

---

## 🟡 邊界情況與穩健性

### 4. 直方圖 range = 0 時的除零保護
**檔案**：`src/components/TolMaster.tsx`（`calculateSimulationStats`）

- **問題**：當所有樣本相同（例如全部項目為 Fixed 分布）時 `binSize = 0`，`(val − min) / 0 = NaN`，導致 `histogram[NaN]++` 使所有 bin 為 0。
- **修正**：`range === 0` 時所有樣本落入單一 bin，避免 NaN 索引。

---

## 🔵 文件與命名嚴謹性

### 5. Normal(Sort) 的 Cp 語意說明
**檔案**：`src/components/TolMaster.tsx`

- Normal(Sort) 會依規格界截斷，成品實際 σ 必然小於輸入 Cp 所對應的 σ。於 Cp 輸入欄位新增 tooltip，明示此為「篩選前製程 Cp」，避免使用者誤讀模擬 σ。

### 6. 雙對分析 `cpkToSigma` → `cpToSigma` 命名修正
**檔案**：`src/components/DualPairAnalysisModal.tsx`

- UI 標籤為「CP」且公式 `σ = T / (3·Cp)` 為 **Cp**（不含均值偏移）語意，與 Cpk 不同。函式更名為 `cpToSigma` 並補充註解；`Cp ≤ 0` 時保留 `σ = Tol/3`（等同 Cp = 1）之後備行為，但改為輸出 `console.warn` 不再靜默。

### 7. SPC 資料輸入提示修正
**檔案**：`src/components/SPCModal.tsx`

- 實作明確保留正負號、不假設資料為正，但 UI 原提示為「Paste absolute values」與之矛盾。改為「Paste raw measured values (sign preserved)」。

---

## ✅ 已驗證正確（未變動）

以下核心方法經逐一比對標準文獻，確認實作正確：

- **Box–Muller**（含 spare 快取）
- **Acklam 反標準常態 CDF**（`normSInv`，相對誤差 ~1.15e-9）
- **Anderson–Darling 常態性檢定**（A²、小樣本修正、四段 p-value 近似，與 D'Agostino & Stephens 1986 一致）
- **Beta(0.5, 0.5) 取樣** `sin²(πU/2)`
- **σ 換算**（Normal `T/2/(3Cp)`、Uniform `T/√12`）
- **截斷常態 Normal(Sort)** 的 inverse-CDF 取樣
- **樣本標準差 (n−1)**、**Q-Q plot plotting position (k−0.5)/n**、**單邊不良率取兩側最小等效 Cpk**

---

_建置驗證：`npm run lint`、`tsc --noEmit`、`npm run build` 均通過。_
