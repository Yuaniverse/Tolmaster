# CHANGES — punch list

Walk this top to bottom. Each entry is an isolated edit. Line numbers refer to
the snapshot `current_tolmaster.tsx` in this folder (≈ 2569 lines). After each
group, save and reload; the app should still work.

> **Pattern:** every change here is either (a) replace a long ad-hoc class string
> with a utility from `PATTERNS.md`, or (b) remove a forbidden artifact (gloss,
> tint, oklch hardcode, non-standard radius).

---

## 1. Header — lines ~1791-1822

### 1a. Brand mark icon container (line ~1795-1797)

```diff
- <div className="h-[22px] w-[22px] rounded-[4px] bg-[var(--accent-soft)] border border-[var(--accent-line)] flex items-center justify-center">
-   <Calculator className="w-3.5 h-3.5 text-[var(--accent)]" />
- </div>
+ <div className="h-[22px] w-[22px] rounded-[var(--r-2)] bg-white text-[var(--chrome)] grid place-items-center font-mono font-bold text-[13px]">
+   τ
+ </div>
```

The Calculator icon-in-accent-soft mark conflicts with the rule that accent
is only for primary action. A simple inverted Tau (τ — Tolerance) mark reads
as "brand" without burning the accent budget.

If you want to keep the Calculator icon, do **not** wrap it in `accent-soft` —
make the container `bg-white text-[var(--chrome)]` instead.

### 1b. v2.7 version pill (line ~1799)

```diff
- <span className="font-ui-mono text-[10px] font-medium text-white/40 bg-white/8 border border-white/12 px-1.5 py-0.5 rounded-[4px]">v2.7</span>
+ <span className="badge" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}>v2.7</span>
```

(Or define a `.badge.on-chrome` modifier in CSS so the inline style isn't
needed.)

### 1c. Status dot + header buttons (lines ~1801-1822)

The 4 buttons (`New Project`, `Screenshot`, `Load`, `Save`) currently use
the constants `railGhostButtonClass` and `railPrimaryButtonClass` defined at
line ~1778-1780. **Delete those constants** and replace each button:

```diff
- <button onClick={handleNewProject} className={railGhostButtonClass}>
-   <FilePlus className="w-3.5 h-3.5" />
-   New Project
- </button>
+ <button onClick={handleNewProject} className="btn btn--ghost">
+   <FilePlus className="w-3.5 h-3.5" />
+   New Project
+ </button>
```

Same swap for Screenshot (ghost), Load (secondary), Save (primary):

| Button | Old constant | New className |
|---|---|---|
| New Project | `railGhostButtonClass` | `btn btn--ghost` |
| Screenshot | `railGhostButtonClass` | `btn btn--ghost` |
| Load | `railGhostButtonClass` | `btn btn--secondary` |
| Save | `railPrimaryButtonClass` | `btn btn--primary` |

The header-specific dark-mode contrast comes from the `.header .btn--*`
overrides in `PATTERNS.md`.

---

## 2. Tabs row — lines ~1824-1859

### 2a. Background — remove `--chrome-2`

```diff
- <div className="bg-[var(--chrome-2)] px-4 pt-2 flex items-center gap-1 overflow-x-auto" style={{ minHeight: '38px' }}>
+ <div className="bg-[var(--chrome)] px-5 pt-0 flex items-end gap-0.5 overflow-x-auto border-b border-[var(--line)]" style={{ height: 40 }}>
```

`--chrome-2` was a slightly different dark grey from `--chrome` and added
nothing semantically. Use `--chrome` throughout; tabs read as part of the same
chrome region.

### 2b. Tab item

Inline class is long and has a custom rounded value. Replace with `.tab`
utility (see `PATTERNS.md`). The active state is now ink-1 text on
`--canvas` (the body background) with a `margin-bottom: -1px` overlap.

```diff
- <div
-   className={`group flex items-center gap-2 px-4 py-1.5 border-t border-l border-r rounded-t-[6px] cursor-pointer select-none text-sm font-medium
-     ${activeTabId === p.id
-       ? 'bg-[var(--canvas)] border-[var(--line)] text-[var(--ink-1)]'
-       : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white/80'}`}
- >
+ <div className={`tab${activeTabId === p.id ? ' active' : ''}`}>
```

The hover-shown copy/delete icons stay; just make sure they're 12-13px and
ghost (`color: currentColor; opacity: 0.5 → 1 on hover`) — they're fine
otherwise.

---

## 3. Controls toolbar — lines ~1869-1962

### 3a. Outer card — drop `hairline-card`, use `.card`

```diff
- <div className="flex justify-between items-center hairline-card p-3 ">
+ <div className="card flex justify-between items-center px-4 py-3">
```

### 3b. Toolbar buttons (lines ~1873-1932)

All five toolbar buttons currently have their own long Tailwind strings.
Replace:

| Button | New className |
|---|---|
| Add Dimension (`onClick={handleAddItem}`) | `btn btn--primary` |
| Fit Shift Calc | `btn btn--secondary` |
| Invert All | `btn btn--secondary` |
| Reset | `btn btn--ghost` |

Drop the `shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.2)]` gloss from Add
Dimension. Drop the `text-[var(--chrome)]` (it was needed because the gloss
darkened the accent — without gloss, plain `white` from `.btn--primary` works).

### 3c. Worst Case readout (line ~1935)

Already pretty good. Just normalize the radius and use the `.wc-readout`
utility from `PATTERNS.md` (which is essentially what's there minus the
inconsistent inline `bg-[var(--surface-subtle)] px-1.5 rounded` micro-pill).

```diff
- <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-[var(--canvas)] rounded border border-[var(--line)] font-ui-mono text-[11px]">
+ <div className="wc-readout hidden lg:inline-flex">
```

Inside, drop the `bg-[var(--surface-subtle)] px-1.5 rounded` wrapper on the
`±{wcResult.halfRange}` value — render it bare like the other values.

### 3d. Simulations select (line ~1948-1958)

```diff
- <select
-   className="field-shell px-2 py-1 text-sm outline-none"
-   value={activeProject.simulationCount}
+ <select
+   className="select"
+   value={activeProject.simulationCount}
```

(`field-shell` becomes `select` here because it's a `<select>` element.)

---

## 4. Dimensions table — lines ~1967-2022

### 4a. Table card

```diff
- <div className="hairline-card overflow-hidden">
+ <div className="card overflow-hidden">
```

### 4b. Table header (line ~1975-1986)

Already uses `mono-label`. If you alias `.mono-label → .label` in
`PATTERNS.md`, no edit needed. If you delete `mono-label`, replace each
`mono-label` with `label`.

### 4c. Row content — SortableTableRow component (lines ~466-758)

This is where most of the visual noise lives. Apply these:

**Action button class constant (line ~466):**

```diff
- const actionButtonClass = "sunken inline-flex h-[22px] w-[22px] items-center justify-center text-[var(--ink-3)] transition-colors";
+ const actionButtonClass = "iconbtn sm ghost";
```

**FitShift label badge (line ~516):**

```diff
- <span className="mono-label rounded-[999px] border border-[var(--accent-line)] bg-[var(--accent-soft)] px-2 py-1 text-[var(--accent)] whitespace-nowrap">FitShift</span>
+ <span className="badge">FIT SHIFT</span>
```

**FitShift max-shift readout (line ~529-535):**

```diff
- <div className="sunken mx-auto flex w-full max-w-[15rem] items-center justify-center gap-2 px-3 py-1.5">
-   <span className="font-ui-mono text-[var(--ink-3)]">±</span>
-   <span className="font-ui-mono min-w-[4.5rem] text-center text-[12px] font-medium text-[var(--ink-1)]">{maxShiftDisplay}</span>
-   <span className="mono-label whitespace-nowrap text-[var(--ink-3)]">Max shift</span>
- </div>
+ <div className="mx-auto flex w-[200px] h-[var(--h-md)] items-center justify-center gap-2 px-3 bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[var(--r-2)]">
+   <span className="label" style={{ fontSize: 9.5 }}>max shift</span>
+   <span className="font-mono text-[12px] font-semibold text-[var(--ink-1)]">±{maxShiftDisplay}</span>
+ </div>
```

**FitShift distribution select (line ~538-548):** swap `field-shell` → `select`,
drop the hard-coded width / padding.

**Sign-toggle button (lines ~569-575):**

```diff
- <button
-   onClick={() => toggleNominalSign(item.id)}
-   className={`flex h-[22px] w-[22px] items-center justify-center rounded-[4px] border text-[11px] font-semibold transition-colors ${
-     item.nominal >= 0
-       ? 'border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]'
-       : 'border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]'
-   }`}
-   title="Toggle Sign"
- >
+ <button
+   onClick={() => toggleNominalSign(item.id)}
+   className={`sign ${item.nominal >= 0 ? 'pos' : 'neg'}`}
+   title="Toggle Sign"
+ >
```

**Tolerance inputs (lines ~597-619):** all `field-shell font-ui-mono ...` →
`.input.center` (or `.input.right`). The warning state currently inlines
`border-[var(--warning)] bg-[var(--warning-soft)]` — replace with
`.input.warn`. The `+ / −` colour cues on asymmetric tolerances are correct;
the inline `text-[var(--success)]` / `text-[var(--danger)]` stays as long as
the field shell is `.input`.

**Empirical distribution span (lines ~681-687):**

```diff
- <span
-   className="font-ui-mono w-28 cursor-help rounded-[6px] border border-[var(--accent-line)] bg-[var(--accent-soft)] px-2 py-1.5 text-center text-[11px] font-medium text-[var(--accent)] select-none truncate"
-   title={"Empirical (Measured)\n..."}
- >
-   Empirical
- </span>
+ <span className="badge badge--accent" title={"Empirical (Measured)\n..."}>
+   <span className="dot"></span>EMPR
+ </span>
```

**Distribution `<select>` (line ~687-697):** `field-shell` → `select`.

**Mean Drift toggle (lines ~704-707):**

```diff
- <div className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-[6px] transition-colors ${item.enableDynamicMeanShift ? 'bg-[var(--accent)]' : 'bg-[var(--line-strong)]'}`}>
-   <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-[6px] bg-[var(--surface)] shadow ring-0 transition duration-200 ease-in-out ${item.enableDynamicMeanShift ? 'translate-x-4' : 'translate-x-0'}`} />
- </div>
+ <div className={`toggle${item.enableDynamicMeanShift ? ' on' : ''}`}>
+   <span className="knob"></span>
+ </div>
```

**Symmetric/Asymmetric lock icons (lines ~619, ~668):** the link / unlink
buttons currently use `sunken ... p-1.5` (line 620, 668). Just `iconbtn sm
ghost`. Same icon, smaller surface.

**SPC button (line ~734-737):** same — `sunken p-1` → `iconbtn sm ghost`.

---

## 5. Analysis card — lines ~2026-2218

### 5a. Outer card

```diff
- <div className="hairline-card p-5 flex flex-col gap-6">
+ <div className="card pad flex flex-col gap-5">   {/* p-5 → padding: var(--s-5) which is 20px */}
```

### 5b. Run row — header icon + Run button (lines ~2030-2046)

The header icon container repeats the brand-mark pattern. Replace the same
way:

```diff
- <div className="h-[22px] w-[22px] flex-shrink-0 rounded-[4px] bg-[var(--accent-soft)] border border-[var(--accent-line)] flex items-center justify-center mt-0.5">
-   <BarChart3 className="w-3.5 h-3.5 text-[var(--accent)]" />
- </div>
+ <div className="h-8 w-8 rounded-[var(--r-2)] bg-[var(--surface-subtle)] border border-[var(--line)] grid place-items-center text-[var(--ink-2)]">
+   <BarChart3 className="w-4 h-4" />
+ </div>
```

Run Analysis button (line ~2043):

```diff
- <button
-   onClick={runSimulation}
-   className="bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--chrome)] shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.2)] pl-3 pr-4 py-2 rounded-[6px] flex items-center gap-2 transition-transform active:scale-95 font-semibold tracking-[0.01em]"
- >
+ <button
+   onClick={runSimulation}
+   className="btn btn--primary lg"
+ >
```

### 5c. Compression mode toggle (lines ~2051-2068)

```diff
- <button
-   onClick={() => { … }}
-   className={`relative inline-flex items-center rounded-[999px] transition-colors focus:outline-none focus-visible:box-shadow:var(--shadow-focus) ${isCompressionMode ? 'bg-[var(--accent)]' : 'bg-[var(--line-strong)]'}`}
-   style={{ width: 28, height: 16 }}
- >
-   <span
-     className={`${isCompressionMode ? 'translate-x-3' : 'translate-x-0.5'} inline-block transform rounded-[999px] bg-[var(--surface)] transition-transform`}
-     style={{ width: 12, height: 12 }}
-   />
- </button>
+ <button
+   onClick={() => { … }}
+   className={`toggle${isCompressionMode ? ' on' : ''}`}
+ >
+   <span className="knob"></span>
+ </button>
```

### 5d. Manual/Target Cpk segmented control (lines ~2084-2098)

```diff
- <div className="flex bg-[var(--surface-subtle)] p-1 rounded-[10px]">
+ <div className="seg">
```

Inner buttons:

```diff
- <button onClick={() => setSpecInputMode('Manual')}
-   className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${specInputMode === 'Manual' ? 'bg-[var(--surface)] text-[var(--ink-1)] ' : 'text-[var(--ink-3)] hover:text-[var(--ink-2)]'}`}>
-   Manual Specs
- </button>
+ <button onClick={() => setSpecInputMode('Manual')}
+   className={specInputMode === 'Manual' ? 'active' : ''}>
+   Manual specs
+ </button>
```

Same for Target Cpk. **Remove** the line `text-[var(--accent)]` on the active
Target Cpk state — segmented controls use ink-1 for active text uniformly.

### 5e. Spec input grid (lines ~2102-2138)

Each `<input>` → `.input.right` (or `.input.lg.right` if you want them bigger
for the spec inputs — they're a focal control). Drop `field-shell`.

### 5f. Calculate Limits button (line ~2208)

```diff
- className="bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--chrome)] shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.2)] px-4 py-1.5 rounded-[6px] text-sm font-medium transition-colors mb-[1px] "
+ className="btn btn--primary"
```

---

## 6. Stats grid (5 cards) — lines ~2222-2316

This is the biggest visual change. **Every card gets the same chrome.** Status
moves into a left stripe + a status badge in the head.

### 6a. Yield card (lines ~2225-2253)

```diff
- <div
-   className={`p-4 rounded-[10px] border overflow-hidden ${simulationResult.yieldRate > 99.7 ? 'border-[oklch(80%_0.08_155)]' : 'border-[var(--warning)]/35'}`}
-   style={{ background: simulationResult.yieldRate > 99.7 ? 'linear-gradient(180deg, var(--success-soft) 0%, var(--canvas) 70%)' : 'var(--warning-soft)' }}
- >
-   <div className="mono-label text-[var(--ink-3)]">Yield Rate</div>
-   <div className={`font-ui-mono text-[26px] font-semibold mt-1 ${simulationResult.yieldRate > 99.7 ? 'text-[oklch(40%_0.13_155)]' : 'text-[var(--warning)]'}`}>
-     {simulationResult.yieldRate.toFixed(5)}%
-   </div>
-   …
+ <div className="card stat">
+   <div className={`stripe ${simulationResult.yieldRate > 99.7 ? 'success' : 'warning'}`} />
+   <div className="stat-head">
+     <span className="label">Yield rate</span>
+     <span className={`badge ${simulationResult.yieldRate > 99.7 ? 'badge--success' : 'badge--warning'}`}>
+       <span className="dot" />{simulationResult.yieldRate > 99.7 ? 'Capable' : 'Marginal'}
+     </span>
+   </div>
+   <div className="stat-val">{simulationResult.yieldRate.toFixed(5)}<span className="unit">%</span></div>
+   …
```

The value text colour goes back to `--ink-1` — no more `oklch(40% 0.13 155)`
hardcode. (Status is shown by the stripe + badge already.)

The "Failure Breakdown" inner block stays but its `mono-label` headers use
`.label` and its rows use `.stat-kv` (k/v cells, no more
`flex-between flex-between flex-between`).

### 6b. Defects (PPM) card (line ~2256-2259)

```diff
- <div className="p-4 rounded-[10px] border bg-[var(--canvas)] border-[var(--line)]">
-   <div className="mono-label text-[var(--ink-3)]">Defects (PPM)</div>
-   <div className="font-ui-mono text-[26px] font-semibold mt-1 text-[var(--ink-2)]">{Math.round(simulationResult.ppm).toLocaleString()}</div>
- </div>
+ <div className="card stat">
+   <div className="stat-head">
+     <span className="label">Defects</span>
+     <span className="meta mono">PPM</span>
+   </div>
+   <div className="stat-val">{Math.round(simulationResult.ppm).toLocaleString()}</div>
+ </div>
```

The bg goes from `--canvas` to `--surface` (because all stat cards must share
chrome). Card backgrounds being `--canvas` was inconsistent with how the rest
of the cards on this page work — they're all `--surface`.

### 6c. Cpk card (lines ~2261-2277)

```diff
- <div className={`p-4 rounded-[10px] border relative group ${simulationResult.cp >= 1.33 ? 'bg-[var(--success-soft)] border-[var(--success)]/25' : 'bg-[var(--canvas)] border-[var(--line)]'}`}>
-   <div className="mono-label text-[var(--ink-3)] flex items-center gap-1">
-     Equiv. Cpk
-     <Info className="w-3.5 h-3.5 cursor-help" />
-   </div>
-   <div className={`font-ui-mono text-[26px] font-semibold mt-1 ${simulationResult.cp >= 1.33 ? 'text-[var(--success)]' : 'text-[var(--ink-2)]'}`}>{simulationResult.cp.toFixed(2)}</div>
+ <div className="card stat relative group">
+   {simulationResult.cp >= 1.33 && <div className="stripe success" />}
+   <div className="stat-head">
+     <span className="label flex items-center gap-1">Equiv. Cpk <Info className="w-3.5 h-3.5 cursor-help opacity-60" /></span>
+     <span className="meta">≥ 1.33</span>
+   </div>
+   <div className="stat-val">{simulationResult.cp.toFixed(2)}</div>
```

Drop the conditional text colour — the stripe communicates status.

Tooltip (line ~2270-2275) — keep markup but normalize:

```diff
- <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-3 bg-[var(--chrome)] text-[var(--surface)] text-xs rounded  z-50 leading-relaxed pointer-events-none">
+ <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-3 bg-[var(--chrome)] text-white text-xs rounded-[var(--r-2)] z-50 leading-relaxed pointer-events-none shadow-lg">
```

(`rounded` with no value → explicit `r-2`; `text-[var(--surface)]` on dark
chrome was confusing — just use white.)

### 6d. Mean/StdDev card (lines ~2279-2295)

Same shape as 6b — `.card .stat` with `.stat-head` and either `.stat-val` or
a `.stat-kv` grid for the μ/σ/3σ list. Drop the inline `font-ui-mono
text-[12px] font-medium text-[var(--ink-2)] mt-2 leading-relaxed`.

### 6e. Simulated Range card (lines ~2297-2317)

Same shape. The compression-mode "Compression Amt / Ratio %" sub-blocks
become two `.stat-kv` grids stacked, with a `border-top: 1px solid
var(--line)` separator.

---

## 7. Charts — lines ~2318-2354

`EngineeringCharts.tsx` already uses CSS variables. Only the histogram bar
colours need a small update — they currently use
`oklch(95% 0.025 ${accentHue})` / `oklch(86% 0.06 ${accentHue})`. Pin them to
the design tokens:

```diff
- fill={`oklch(95% 0.025 ${accentHue})`}
- stroke={`oklch(86% 0.06 ${accentHue})`}
+ fill="var(--accent-soft)"
+ stroke="var(--accent-line)"
```

Similarly in `HorizontalBarChart` (line ~321-323):

```diff
- fill={`oklch(95% 0.025 ${accentHue})`}
- stroke={`oklch(86% 0.06 ${accentHue})`}
+ fill="var(--accent-soft)"
+ stroke="var(--accent-line)"
```

You can drop the `accentHue` prop now that the colour comes from the token —
or keep it for the sensitivity chart's second variant.

The chart card wrapper containers in `TolMaster.tsx` (lines ~2323-2354) wrap
the SVGs in plain `<h3 className="mono-label …">` headers and bare `<div
className="h-80">` boxes. Wrap each in a `.card .chart-card` instead:

```diff
- <div className="h-80 w-full min-w-0">
-   <h3 className="mono-label text-[var(--ink-3)] mb-2 flex justify-between">
-     <span>Distribution</span>
-     …
-   </h3>
-   <HistogramChart … />
- </div>
+ <div className="card chart-card">
+   <div className="chart-head">
+     <div className="chart-title">Distribution</div>
+     <div className="chart-legend">…</div>
+   </div>
+   <div className="chart-body"><HistogramChart … /></div>
+ </div>
```

Wrap both charts in a `.charts-grid` parent (replacing the existing `grid
grid-cols-1 md:grid-cols-2 gap-8`).

---

## 8. FitShift modal — lines ~2370-2492

Same patterns apply inside the modal. Specifically:

- Line ~2376: `bg-[var(--accent-soft)] p-3 rounded text-xs` for the explainer
  banner. **Replace** with `.card .pad-sm` (or just a quieter
  `bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[var(--r-2)] p-3 text-xs`).
  The accent-soft banner reads as "selected"; this is informational copy, not
  a selection state.

- Each `.field-shell` input → `.input`.

- The Cp inputs (lines ~2428, 2471) currently have `bg-[var(--accent-soft)]`.
  **Remove the tint** — Cp inputs aren't more important than any other input
  in this modal; they get the standard `.input`.

- Add Dynamic Fit Shift button (line ~2487-2491):

  ```diff
  - className="w-full bg-[var(--accent)] text-[var(--chrome)] shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.2)] py-2 rounded-[6px] font-semibold tracking-[0.01em] transition-colors"
  + className="btn btn--primary w-full"
  ```

- The "sunken p-3 space-y-1" min/max gap readout (lines ~2475-2484) → use the
  same `.wc-readout` style as the toolbar's Worst Case readout, or just
  `.card .pad` with `.stat-kv` inside.

---

## 9. Dual-Pair Clearance FAB — lines ~2511-2520

**Remove the FAB entirely** and add a normal secondary button to the Analysis
card's run row (around line ~2043, next to the Compression toggle):

```jsx
<button onClick={() => setIsDualPairModalOpen(true)} className="btn btn--secondary">
  <ArrowUpDown className="w-3.5 h-3.5" />
  Dual-Pair Clearance
</button>
```

Then delete the floating button block at line ~2511-2520. The FAB was the
only yellow element in the product and didn't behave like a FAB (the action it
opens isn't more important than Run Analysis, which isn't a FAB). Yellow goes
back to meaning "warning."

---

## 10. Footer — lines ~2526-2543

Mostly fine. Just normalize:

- `mono-label` → `.label` (or keep as alias)
- `bg-white/8` divider lines → `bg-white/12` (matches header)
- Drop the height inline-style; use a class with `height: 28px`
- The hidden `@HPY` selection text (line ~2542) — leave it, it's a deliberate
  easter egg.

---

## 11. SPCModal.tsx & DualPairAnalysisModal.tsx

Apply the same five rules. Hot spots:

**SPCModal.tsx:**

- Line 317: `hairline-card flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[10px]` — already uses r-3, just swap `hairline-card` for `.card`.
- Line 323-325: Calculator icon container (same as TolMaster line ~1795) — same fix.
- Line 334: `sunken inline-flex h-8 w-8` close button → `iconbtn` (md, ghost).
- Line 353: `.field-shell font-ui-mono h-64 w-full` textarea — needs a `.textarea` variant of `.input` that allows multi-line. Add to PATTERNS.md:
  ```css
  .textarea { @apply input; height: auto; padding: 10px; font-family: var(--mono); resize: vertical; }
  ```
- Line 422: radio input — give it `accent-color: var(--accent)` instead of `text-[var(--accent)]`.
- Line 439: Apply button — `btn btn--primary` (drop the `inline-flex w-full items-center justify-center gap-2 rounded-[6px] bg-[var(--accent)] px-4 py-3 font-semibold` mash).

**DualPairAnalysisModal.tsx:**

- Line 264: same `hairline-card rounded-[10px]` → `.card`.
- Line 266-: header band; same pattern as TolMaster.

---

## Cleanup pass

After all the above, do a final sweep:

```bash
grep -rn "rounded-\[" src/components/      # should be ~0 hits outside design-system patterns
grep -rn "rounded-md" src/components/      # should be 0
grep -rn "rounded-\[999px\]" src/         # should be 0
grep -rn "shadow-\[inset" src/components/  # should be 0
grep -rn "oklch(" src/components/         # only in EngineeringCharts is acceptable IF you decide to keep the hue prop
grep -rn "font-ui-mono" src/components/   # should be replaced by `font-mono` Tailwind or `.mono` class — pick one
```

If any of these still hit, that's a missed spot. The audit grep is the
finish line.

---

## Done

When you can stand on the running app and `refined.html` side by side and the
only differences are caused by real data vs. mock data, you're done. The
business logic is untouched; the surface is unified.
