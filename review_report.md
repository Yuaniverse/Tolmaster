# TolMaster 底層數學與統計邏輯審查報告

**審查日期：** 2026-04-02  
**審查範圍：** `TolMaster.tsx`、`SPCModal.tsx`、`DualPairAnalysisModal.tsx`

---

## 審查結果總覽

### 正確的實作 (無需修改)

| 項目 | 位置 | 說明 |
|------|------|------|
| Box-Muller Transform | TolMaster.tsx:130-136 | 常態分布取樣，公式 z = √(-2ln(U)) × cos(2πV) 正確 |
| Acklam's Inverse Normal CDF | TolMaster.tsx:194-243 | 標準係數與三區段邏輯正確，精度 ~10⁻⁴ |
| Error Function (normSDist) | TolMaster.tsx:2275-2295 | Abramowitz-Stegun 近似，精度 ~1.5×10⁻⁷ |
| Beta(0.5,0.5) Sampler | TolMaster.tsx:138-154 | Arcsine 分布 inverse CDF：sin²(U × π/2) 正確 |
| Uniform 分布取樣 | TolMaster.tsx | `U × (max - min) + min` 正確 |
| Empirical Bootstrap 重抽樣 | TolMaster.tsx:158-161 | 無參數重抽樣 + 正確的中心化平移 (sample - empiricalMean + toleranceMean) |
| Mean 計算 | TolMaster.tsx:883 | Σx / N 正確 |
| StdDev 計算 | TolMaster.tsx:889 | Bessel's correction (N-1 分母) 正確 |
| Yield Rate / PPM | TolMaster.tsx:924-946 | 計數法正確：yield = pass/N × 100, PPM = fail/N × 10⁶ |
| RSS 變異數累加 | TolMaster.tsx:830-842 | RSS = 3 × √(Σσ²)，獨立假設下正確 |
| 敏感度分析 | TolMaster.tsx:846-877 | 變異數貢獻百分比 σᵢ²/Σσ² × 100 正確 |
| FitShift Monte Carlo 模擬 | TolMaster.tsx:1089-1115 | Gap = max(0, hole-shaft)，shift 分布 (Beta0.5/Uniform) 正確 |
| Worst Case Analysis | TolMaster.tsx:804-844 | 極端值累加 Σ(nom±tol) 正確 |
| Effective Mean 計算 | TolMaster.tsx:179-181 | nominal + (tolPlus - tolMinus)/2 正確處理不對稱公差 |
| Sigma 計算 (Uniform) | TolMaster.tsx:163-177 | σ = range/√12 正確 |
| Sigma 計算 (Normal) | TolMaster.tsx:163-177 | σ = halfRange/(3×Cp) 正確 |
| Anderson-Darling 檢定 | SPCModal.tsx:107-158 | Stephens (1974) 公式與修正項正確 |
| Normal PDF | SPCModal.tsx:53-56 | f(x) = (1/(σ√(2π))) × e^(-(x-μ)²/(2σ²)) 正確 |
| Standard Normal CDF | SPCModal.tsx:58-70 | Abramowitz-Stegun 近似正確 |
| Q-Q Plot | SPCModal.tsx:258-275 | Blom's plotting position (k-0.5)/n 正確 |
| Histogram Normal 曲線 | SPCModal.tsx:236-256 | normalY = PDF(mid) × n × binWidth 正確疊加 |
| DualPair Worst Case | DualPairAnalysisModal.tsx:141-188 | 間隙與節距極端值正確 |
| DualPair Monte Carlo | DualPairAnalysisModal.tsx:191-250 | Margin = (C1+C2)/2 - |PA-PB| 公式正確 |

---

## 發現的問題

### HIGH — Equivalent Cpk 計算假設對稱規格

**位置：** `TolMaster.tsx:948-966`

**現行公式：**
```typescript
const p = (1 + (yieldRate / 100)) / 2;
const z = normSInv(p);
cp = z / 3;
```

**問題：** 此公式將 yield rate 反推回 Z-score 再除以 3，**隱含假設規格對稱於平均值**。

**數學推導：**
- 公式假設：P(-Z < X < Z) = yield → P(X < Z) = (1 + yield)/2
- 但實際上，當 LSL 和 USL 距離 mean 不等時，yield 是 Φ((USL-μ)/σ) - Φ((LSL-μ)/σ)
- 此公式無法區分「mean 偏向 LSL」或「mean 偏向 USL」的情況

**範例：**
- LSL=0, USL=10, mean=3, σ=1 → 真實 Cpk = min((10-3)/(3×1), (3-0)/(3×1)) = min(2.33, 1.0) = **1.0**
- 但 yield = Φ(7) - Φ(-3) ≈ 99.87% → Equivalent Cp = normSInv(0.99935)/3 ≈ **1.10** (高估)

**建議：** 新增傳統 Cpk 計算，與 yield-based 的 Equivalent Cp 並列顯示：
```typescript
const cpu = usl !== undefined ? (usl - mean) / (3 * stdDev) : Infinity;
const cpl = lsl !== undefined ? (mean - lsl) / (3 * stdDev) : Infinity;
const cpk = Math.min(cpu, cpl);
```
**我的決定：**
改成拆分單側不良率：
1. 從模擬樣本中，分別算出低於 LSL 的單側不良率，以及高於 USL 的單側不良率。
2. 針對這兩個單側不良率，分別使用單尾常態分佈反推，取得兩個獨立的 Z值。
3. 取較小的 Z值除以 3。
---

### HIGH — DualPairAnalysis Equivalent Cpk 使用雙側公式於單側問題

**位置：** `DualPairAnalysisModal.tsx:603-607`

**現行公式：**
```typescript
const z = normSInv(1 - pFailDecimal / 2);  // 除以 2 = 雙側
equivCpk = z / 3;
```

**問題：** 干涉判定條件是 `margin < 0`（單側失效），但公式中 `pFail/2` 假設了雙側檢定。

**數學說明：**
- 單側失效 P(margin < 0) = p_fail
- 等效 Z-score 應為 Z = Φ⁻¹(1 - p_fail)，**不需要除以 2**
- 除以 2 會使 Z 值偏高，導致 Cpk 被高估

**範例：**
- p_fail = 1% → 現行：Z = Φ⁻¹(0.995) = 2.576, Cpk = 0.859
- p_fail = 1% → 正確：Z = Φ⁻¹(0.99) = 2.326, Cpk = **0.775**

**建議修正：**
```typescript
const z = normSInv(1 - pFailDecimal);  // 單側
equivCpk = z / 3;
```

**我的決定：**
同意修正

---

### MEDIUM — Normal(Sort) 截斷分布的 Rejection + Clamping 方法

**位置：** `TolMaster.tsx:1141-1147`

**現行實作：**
```typescript
let attempts = 0;
do {
  itemVal = randomNormal(currentMean, p.sigma);
  attempts++;
} while ((itemVal < p.min || itemVal > p.max) && attempts < 100);

if (itemVal < p.min) itemVal = p.min;
if (itemVal > p.max) itemVal = p.max;
```

**問題：**
- 當公差範圍相對於 σ 很窄時（例如 range < 2σ），拒絕率高，100 次可能不夠
- Clamping 到邊界值會在 min/max 處產生人為的機率質量集中（Dirac delta）
- 結果不是真正的截斷常態分布

**影響：** 對於 range/σ < 2 的情況，模擬結果的分布形狀會被扭曲。

**建議改用 Inverse CDF 方法（精確的截斷常態）：**
```typescript
const a_cdf = normSDist((p.min - currentMean) / p.sigma);
const b_cdf = normSDist((p.max - currentMean) / p.sigma);
const u = a_cdf + Math.random() * (b_cdf - a_cdf);
itemVal = currentMean + p.sigma * normSInv(u);
```
**我的決定：**
同意修正

---

### MEDIUM — Anderson-Darling p-value 在區段邊界的不連續性

**位置：** `SPCModal.tsx:147-155`

**問題：** 四個分段函數在邊界值（A²*=0.2, 0.34, 0.60）可能產生 p-value 的微小跳躍。

**影響：** 實際影響極小。在邊界值附近的 p-value 差異通常 < 0.01，不會影響常態性判斷的結論。

**建議：** 可選擇性加入平滑處理，但非必要修改。

**我的決定：**
不做修改

---

### LOW — Float32Array 精度限制

**位置：** `TolMaster.tsx:1039`, `SPCModal.tsx:302`

**問題：** Float32 僅有 ~7 位有效數字。

**影響場景：**
- 極小公差 (< 0.0001mm) 的精度損失
- 大尺寸 (> 1000mm) 時相對精度降低
- 一般機械公差分析 (0.01~10mm) 完全足夠

**建議：** 可作為進階選項，對精度敏感的場景改用 Float64Array。

**我的決定：**
不做修改

---

### LOW — Box-Muller 只使用一半輸出

**位置：** `TolMaster.tsx:130-136`, `DualPairAnalysisModal.tsx:48-54`

**問題：** Box-Muller 可同時產生兩個獨立常態變數（cos 和 sin 分量），但目前只用 cos。

**影響：** 純效能問題，不影響正確性。在 5M 迭代下，修正後可節省約 30-40% 的隨機數生成時間。

**建議：** 可選擇性實作快取機制，將 sin 分量存起來供下次呼叫使用。

**我的決定：**
同意修改

---

### LOW — isSymmetric 欄位未使用

**位置：** `TolMaster.tsx` (ToleranceItem interface)

**問題：** `isSymmetric: boolean` 定義於介面但在所有計算中未被使用。

**影響：** 功能殘留，不影響計算正確性。

**我的決定：**
用不到就清掉

