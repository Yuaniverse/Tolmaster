TolMaster Style Guide — 精密工程美學
整體風格定位 (Overall Aesthetic)
Precision Engineering — 精密工程儀器感。介於 modern SaaS（Linear / Vercel）和科學儀器（Bloomberg Terminal、CAD 軟體）之間。重視資訊密度、技術權威感、表格數字的可讀性，去除一切不必要的裝飾。冷靜、克制、可信賴。

字體系統 (Typography)
介面字體：Inter（400 / 500 / 600 / 700）
數字 / 識別字 / 技術標籤：JetBrains Mono（400 / 500 / 600）— 所有數值、單位、ID、欄位 label 一律 monospace + tabular-nums，讓數字垂直對齊。
基礎字級：13.5px，行高 1.45
大數值（KPI、stat value）：26px，font-weight 600
section header / 欄位 label：10.5px，全大寫，letter-spacing 0.05–0.10em，monospace
介面標題避免大字級；用「小寫＋微妙的 letter-spacing」傳達層級，而不是粗體大字
色彩系統 (Color)
全部用 oklch() 定義，避免 hex 跑色。

中性色（暖灰白系）
背景 canvas：oklch(98.5% 0.004 80)（極淺暖白）
卡片表面：oklch(100% 0 0)（純白）
凹陷區（表頭、輸入框 readonly）：oklch(96.5% 0.005 80)
文字主：oklch(20% 0.015 240)（近黑帶冷藍）
文字次：oklch(40% 0.012 240)
輔助文字：oklch(58% 0.01 240)
線框：oklch(92% 0.005 80) / 強線 oklch(78% 0.01 240)
頂部 rail / status bar：深藍黑 oklch(20% 0.01 240)，跟整體淺色對比，作為「應用程式 chrome」
主題強調色（Accent）
單一 accent，可用 hue slider 切換：oklch(60% 0.13 <hue>)
預設 hue = 200（teal-cyan，工程藍綠）
強調色軟版（badge、tag、selection）：oklch(95% 0.025 <hue>) + 邊框 oklch(86% 0.06 <hue>)
狀態色（同一 chroma / lightness，只變 hue）
成功 / 通過：oklch(62% 0.13 155)（綠）
警告 / fit-shift：oklch(72% 0.15 75)（琥珀）
失敗 / 超規格：oklch(58% 0.18 25)（橘紅）
每個狀態色都有 soft 版本作為背景填色
暗色主題（graphite）
背景：oklch(18% 0.012 240) / 卡片 oklch(22% 0.013 240)
文字：oklch(96% 0.005 80)
強調色不變、軟色重新算
幾何與空間
圓角：4px（小元件）/ 6px（按鈕、輸入框）/ 10px（卡片）
卡片邊框：1px hairline，配 border-radius: 10px，不用陰影（陰影會讓工程介面變軟）
表格列高：44px（預設）/ 36px（compact）/ 52px（roomy）
卡片內邊距：14–18px
canvas 最大寬 1400px 置中，gap 18px
元件規範
頂部 Rail（深色 chrome）
48px 高、深藍黑
左：方塊 logo mark（accent 底）+ 品牌名 + 版本 pill（mono、半透明）
右：狀態指示燈（脈動）+ 透明白底按鈕群 + 一個 accent primary 按鈕
Tab Bar
比 rail 稍淺（oklch(16% 0.012 240)）
38px 高
active tab 用 canvas 同色「升起」，無底線
卡片標題
小型方塊 icon container（22×22，accent-soft 底，accent 邊框）
標題 13px / 600
副標題 monospace 10.5px 全大寫，描述脈絡（1D LINEAR STACK · N=100,000 · 3 DIMENSIONS）
表格
表頭：sunken 底、10.5px 全大寫 mono label
資料列：hover 時整列淡灰底
特殊列（如 fit-shift）用 accent-tinted 底色 + 列內 tag
第一欄 drag handle（六點 icon，灰）+ 序號（mono）
輸入框
預設：白底 + 1px 線、focus 時 accent 邊框 + 3px 半透明 ring
數字輸入靠右對齊、tabular nums
公差輸入：把 + − ± 符號做成 22px 寬的左側「sign chip」，貼著輸入框；正公差用綠軟底、負公差用紅軟底、雙向用灰底。整個 group 共用一個 focus ring。
按鈕
secondary：白底細線、hover 時 sunken
primary：accent 底、深色文字（保證對比）、無 border、加 inset highlight inset 0 1px 0 oklch(100% 0 0 / 0.2)
run / 主要 CTA：font-weight 600、letter-spacing 0.01em
Toggle 開關
28×16px，accent 開、灰關
配 mono 全大寫 label
Segmented control
sunken 容器、active button 升起 + 微陰影
Stat 卡片
5 欄等寬
上：mono 全大寫 label（10px）+ 右上小型 spark badge
中：26px mono 大數字
下：可選 sub-meta（k: v 排版，灰冒號式）
狀態變色：Cpk ≥ 1.33 整卡轉為綠軟漸層底
可加小型 edit icon button（22×22，sunken 底，hover accent）
Status Bar（底部）
跟 rail 同深色家族
28–32px 高
mono 10.5px 全大寫
用 18px gap 分組，組間放 1px 12px 高的分隔線
顯示 engine 版本、最後執行 N、即時 μ/σ
圖表規範
永遠用 <svg viewBox> 自繪，不用第三方 lib（避免風格污染）
軸線：1px、var(--line-strong)
格線：2 3 dashed、var(--line)
軸文字：mono 9–9.5px、var(--ink-3)
bar：rx="0.5"–"2"，極小圓角
mean / 平均線：accent 色、1.5px 實線，配上方 pill 標籤（accent 底白字 mono）
規格界線（LSL/USL）：紅色 1px，配紅色軟底陰影區標示「out of spec」
target 線：灰色虛線
legend 用 8×8 方塊 + mono 10.5px 標籤、靠右
動效
全部過渡 120–160ms ease
focus ring：box-shadow 0 0 0 3px <accent at 15% alpha>
狀態指示燈：2s 透明度 pulse
不要：bouncing、spring、parallax、scroll-driven animation
載入態：button text 換成「Running…」、disable
內容語氣
避免 marketing 詞彙
用 engineer 慣用語：σ̂、Cpk、PPM、μ、±、RSS
數字精度：機率用 5 位小數（百分比）、量測值 3–4 位、Cpk 2 位
大數字用 toLocaleString()、不縮寫
「不要做」清單
不要漸層背景（除了 stat 卡的 status tint）
不要 emoji（用 stroked SVG icon，1.5px stroke、14px viewBox）
不要陰影（除了 button inset highlight 和 toolbar hover）
不要彩色 brand gradient logo
不要 sans-serif 數字
不要居中對齊的長表格（左對齊文字、右對齊數字）
不要圓角 > 10px