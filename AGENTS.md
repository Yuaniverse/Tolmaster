# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**TolMaster** — 機械工程師用的公差分析與堆疊模擬工具，採用 Monte Carlo 方法（每次模擬 1M–5M 次迭代）。

## Commands

```bash
npm run build   # Vite 單一 HTML 檔案建置，輸出至 dist-single/
npm run lint    # ESLint
```

目前無測試框架設定（無 Jest / Vitest）。

## Architecture

### Tech Stack
- **Build**: Vite 7 + `vite-plugin-singlefile`（單一 HTML 檔案輸出）
- **Language**: TypeScript 5 + React 19
- **Styling**: Tailwind CSS v4（via PostCSS）
- **Charts**: Recharts 3
- **DnD**: @dnd-kit

### Core Data Models (`src/components/TolMaster.tsx`)

```typescript
ToleranceItem      // 單一尺寸公差，支援 Simple / FitShift 兩種類型
AnalysisProject    // 包含多個 ToleranceItem，儲存至 localStorage
SimulationResult   // Monte Carlo 輸出：mean/stdDev/yieldRate/ppm/Cpk/Ppk
```

Distribution 類型：Normal、Normal(Sort)、Uniform、Fixed、Empirical（實測資料 bootstrap）

### Component Structure

```
src/components/
├── TolMaster.tsx              # 主應用 (~104KB，包含模擬引擎與所有 UI)
├── SPCModal.tsx               # Statistical Process Control 分析視窗
│   ├── Anderson-Darling 常態性檢定
│   ├── 直方圖、箱型圖、Run Chart、Q-Q Plot
│   └── 統計結果匯出至公差項目
└── DualPairAnalysisModal.tsx  # 雙對分析（共享間隙）視窗
    ├── 2D 間隙視覺化
    └── 干涉機率 Monte Carlo 計算
```

### Simulation Engine

位於 `TolMaster.tsx`，關鍵實作：
- Box-Muller transform 產生常態分布樣本
- Acklam's inverse normal CDF
- Anderson-Darling 常態性檢定
- Cpk / Ppk 計算
- FitShift：銷孔配合間隙模擬（考慮 MMC 偏移）
- Compression Mode：專用組裝分析加權堆疊

### Data Persistence
- `localStorage`：自動儲存所有專案
- JSON export/import：專案備份與分享
- Portable HTML：Vite 單一檔案建置

### Path Aliases
`@/*` → `./src/*`（定義於 `tsconfig.json`）

### Build Configuration
- `vite.config.ts`：單一 HTML 檔案 plugin，輸出至 `dist-single/`

## Performance Target
Monte Carlo 模擬目標：1M 次迭代 < 2 秒（spec.md 定義）

## Design References
- `design_system.txt`：色彩系統、字體、間距設計 tokens
- `chart_design.txt`：圖表樣式規範
- `spec.md`：完整功能規格與技術需求

