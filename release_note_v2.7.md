# TolMaster V2.7 Release Note

發布日期：2026-04-24

## 本版重點

V2.7 主要修正 FitShift 在兩個關鍵面向的統計失真：

- `interference` 不再被靜默吞掉，無法組裝樣本會正式納入失敗統計
- 解析端 `RSS` 與敏感度分析不再使用 `maxGap^2 / 12` 的最壞情況代理值，而是改用與 Monte Carlo 假設一致的 gap 二階矩近似

## 更新內容

### 1. FitShift 解析變異數改為與 Monte Carlo 一致

- `RSS` 與敏感度分析中的 FitShift 變異數，原先採用 `maxGap^2 / 12`
- 現在改為依 hole / shaft 的均值與標準差估算 `E[gap^2]`，再依 `shiftDist` 換算 shift 變異數：
  - `Uniform`：`Var(shift) ≈ E[gap^2] / 12`
  - `Beta(0.5, 0.5)`：`Var(shift) ≈ E[gap^2] / 8`
- 這讓解析端的 `RSS` 顯示與敏感度長條圖，能和 Monte Carlo 的抽樣模型保持同一套物理假設

### 2. FitShift interference 正式納入失敗判定

- 當 `holeVal - shaftVal < 0` 時，樣本會被判定為 `FitShift Interference`
- 不再將 interference 樣本強制改寫成 `gap = 0`
- interference 樣本會計入總失敗數，直接反映在 `Yield Rate`、`PPM`、`Equiv. Cpk`

### 3. Failure Breakdown 新增並整合進 Yield Rate 卡片

- `Failure Breakdown` 現在顯示於 `Yield Rate` 卡片內
- 顯示三種互斥失敗來源：
  - `FitShift Interference`
  - `Upper Spec`
  - `Lower Spec`
- 百分比統一顯示到小數點第五位
- UI 改為次要文字資訊，避免卡片過度膨脹

### 4. 統計結果改為只使用有效組裝樣本

- Histogram 不再混入 interference 樣本
- `Mean / StdDev`、`Range`、Compression gap 統計只基於有效組裝樣本
- 當所有樣本都因 interference 失敗時，畫面會顯示對應的保護訊息，避免誤導或 NaN 擴散

### 5. 舊結果相容性處理

- 舊專案或舊匯入結果若沒有新版欄位，系統會自動使用 fallback 邏輯推導：
  - `totalSampleCount`
  - `validSampleCount`
  - `fitShiftInterferenceCount`
  - `failureBreakdown`

### 6. FitShift 現在可編輯既有項目

- 已建立的 `FitShift` 項目新增 `Edit` 入口
- 會重用既有 `Hole / Shaft Fit Shift Calculator` 視窗，不需刪除重建
- 可重新編輯：
  - `Hole` nominal / tolerance / `Cp`
  - `Shaft` nominal / tolerance / `Cp`
- 編輯後會直接覆蓋原本 `fitParams`
- 原有 `shiftDist` 會保留，不會因編輯孔軸參數被重設
- 若名稱仍為系統預設格式，儲存時會自動同步更新為新的 `H... / S...` 名稱；若是手動自訂名稱則保留不變
- 編輯完成後，當前 sheet 的模擬結果會清除，避免沿用舊參數計算出的結果

### 7. FitShift 列表排版與操作區對齊修正

- 修正 `FitShift` 列在表格中的視覺歪斜問題
- 右側操作區改為固定大小按鈕與右對齊配置，`edit / delete` 不再擠在窄欄位內
- `Nominal`、`Max Shift`、`Dist`、`CP` 欄位的顯示容器已重新對齊，與一般尺寸列更一致
- 表頭最後一欄寬度同步調整，避免雙圖示列與單圖示列混排時視覺重心偏移

### 8. 版本號更新

- App header 版本標籤更新為 `v2.7`
- `package.json` 與 `package-lock.json` 版本同步更新為 `2.7.0`

### 9. UI 全面對齊 Style Guide（精密工程美學）

依照新版 Style Guide 進行系統性 UI 修正：

- **主圖表移除第三方 lib**：Distribution 與 Contribution Analysis 兩張圖從 Recharts（含 hex 色彩 `#8884d8`、`#f59e0b`）改為 `EngineeringCharts.tsx` 純 SVG 自繪，完全使用 CSS 變數色彩
- **Tab Bar 改深色背景**：從白色 `surface` 改為 `var(--chrome-2)`（`oklch(16% 0.012 240)`），inactive tab 採半透明白，與 Rail 形成一體的「應用程式 chrome」
- **頂部 Rail 規範化**：固定高度 48px、logo mark 改為 22×22 accent-soft 方塊容器、右側按鈕統一採 ghost 樣式（`railGhostButtonClass`）、Save 按鈕改為唯一 accent primary 按鈕、新增 status pulse dot
- **Stat 卡數字**：`text-3xl font-bold`（30px sans）→ `font-ui-mono text-[26px] font-semibold`（monospace，符合規格）；Cpk ≥ 1.33 時整卡自動轉綠軟漸層底
- **表格標題欄**：改用 `bg-[var(--surface-subtle)]`（sunken 底）+ `.mono-label`（10.5px 全大寫 monospace）
- **Toggle 開關**：尺寸改為 28×16px（規格值），label 改 `.mono-label` 全大寫
- **底部 Status Bar**：新增深色 footer（30px 高），顯示引擎版本、最後執行 N、即時 μ/σ
- **Canvas 最大寬度**：`1600px` → `1400px`（符合規格）

## 影響

- FitShift 項目在 `RSS` 與敏感度分析中的貢獻，會比舊版更接近 Monte Carlo 結果，尤其在小間隙、高變異或 `Beta(0.5, 0.5)` shift 模式下差異更明顯
- FitShift 項目在低 gap、低 Cp、小間隙設計下，結果會比舊版更保守，也更符合實際裝配風險
- 若模型原本存在少量干涉樣本，V2.7 的 `Yield Rate` 可能低於舊版，這是預期修正，不是回歸
- 既有 `FitShift` 的日常調參流程會更直接，不需要先刪除再新增
- 表格混合 `Simple` / `FitShift` 項目時，列表可讀性與操作一致性更好

## 備註

- 本版已完成 build 驗證
- `npm run lint` 目前仍會掃到 `.next/` 產物而失敗，屬既有專案設定問題，非本次變更引入
- 產物已更新至 `dist-single/index.html`
