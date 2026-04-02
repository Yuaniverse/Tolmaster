# Dual-Pair Shared Clearance Analysis – V2
## Vibe Coding Prompt（for TolMaster Extension）

---

## 🎯 任務目標
在現有 **TolMaster** 架構（已支援 Worst Case / RSS / Monte Carlo 的單一尺寸鏈分析）上，新增一個**全新的分析模式**：

> **Dual-Pair Shared Clearance Analysis（V2）**  
>（雙孔軸配合・孔距誤差由兩孔「同時分攤」模型）

本版本為 **V2 修正版**，重點修正：
- 幾何分攤邏輯（避免高估容許能力）
- RSS 的統計適用範圍（明確降級為近似）

---

## 🧠 核心工程假設（必須遵守）

1. 分析目標為「孔距裝配可行性」，而非單一孔軸間隙
2. **總孔距誤差 ΔP 必須由兩個孔的徑向自由度同時分攤**
3. 使用者輸入的 C1、C2 為「直徑間隙（Hole − Shaft）」
4. 所有最終判斷皆基於 **Margin**

---

## 🧮 核心幾何模型（唯一正確版本）

### 定義
```
C1 = Hole1 − Shaft1   // 直徑間隙
C2 = Hole2 − Shaft2   // 直徑間隙
ΔP = |PA − PB|        // 總孔距誤差需求
```

### 核心判斷公式
```
Margin = (C1 + C2) / 2 − ΔP
```

說明：
- (C1 + C2) / 2 為「可吸收的最大孔距偏移量」
- ΔP 為實際需要被吸收的孔距誤差

判斷：
- Margin ≥ 0 → Assembly OK
- Margin < 0 → Interference

---

## 🧱 資料結構設計

### 1️⃣ Pair Clearance（兩組）
每一組 Pair 包含：
- Hole nominal + tolerance
- Shaft nominal + tolerance

輸出為隨機變數或極值：
```
C1, C2
```

---

### 2️⃣ Pitch Mismatch（需求項）

輸入：
- Part A pitch：PA ± tA
- Part B pitch：PB ± tB

定義：
```
ΔP = |PA − PB|
```

ΔP 為「永遠消耗 Margin 的需求項」，不可視為可正可負的量。

---

## 📐 Worst Case（WC）分析

```
C1_min = Hole1_min − Shaft1_max
C2_min = Hole2_min − Shaft2_max
ΔP_max = |PA − PB| + tA + tB

Margin_WC = (C1_min + C2_min) / 2 − ΔP_max
```

特性：
- 純幾何極限
- 與任何統計假設無關
- 為最保守、最容易解釋的結果

---

## 📊 RSS 分析（**近似分析，明確降級**）

⚠️ **RSS 在本分析中僅用於趨勢比較，不可作為最終設計決策依據。**

原因：
- ΔP = |PA − PB| 為絕對值量
- 真實分佈為 Folded Normal
- RSS 無法精確描述其平均值與尾端行為

### 近似隨機變數定義
```
C1 ~ (μ1, σ1)
C2 ~ (μ2, σ2)
PA ~ (μA, σA)
PB ~ (μB, σB)
```

### ΔP 平均值近似
```
μ_ΔP ≈ 0.8 · sqrt(σA² + σB²)
```

### Margin 近似模型
```
μ_M ≈ (μ1 + μ2) / 2 − μ_ΔP
```

### RSS 使用限制（必須標註）
- 僅供快速比較設計趨勢
- 不可用於良率承諾或最終判斷
- **Monte Carlo 為唯一可信的統計結果來源**

---

## 🎲 Monte Carlo（主分析方法，強烈建議）

### 每一次 iteration
1. 隨機抽 Hole1, Shaft1 → 得到 C1ᵢ
2. 隨機抽 Hole2, Shaft2 → 得到 C2ᵢ
3. 隨機抽 PAᵢ, PBᵢ → 得到 ΔPᵢ = |PAᵢ − PBᵢ|
4. 計算：
```
Mᵢ = (C1ᵢ + C2ᵢ) / 2 − ΔPᵢ
```

### Monte Carlo 輸出（統一為 Margin）
- Margin distribution
- Interference probability（M < 0）
- P5 / P50 / P95
- Worst observed margin

---

## 🖥️ UI / UX 指引

- 本分析為獨立 Analysis Mode
- 結果畫面必須清楚顯示：
  - 使用的分析方法（WC / RSS / MC）
  - RSS 標示為「Approximate」
  - MC 標示為「Primary Result」

---

## 🧠 給 AI Coding Agent 的實作提醒

- 不要將第二組孔軸硬塞進既有 stack array
- 本分析本質為：
```
(Supply from 2 holes) − (Pitch demand)
```
- 所有方法最終皆輸出 **Margin**
- RSS 必須在 UI 與文件中明確降級

---

## ✅ Definition of Done

- 核心公式使用 (C1 + C2) / 2 − ΔP
- 支援 WC / RSS / Monte Carlo
- RSS 明確標示為近似
- Monte Carlo 為主要決策依據
- 不影響既有 TolMaster 功能

---

（End of Prompt）

