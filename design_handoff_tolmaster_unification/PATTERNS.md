# COMPONENT PATTERNS

Add these as utility classes in the global stylesheet, then replace the
existing ad-hoc Tailwind strings with them. The classes are intentionally
**presentational** (not BEM) because they map 1:1 to existing inline class
constellations and make the find-replace in `CHANGES.md` mechanical.

You can also wrap them in Tailwind `@apply` if your project prefers — either
way works. The point is that after this, **the className for a "primary
button" should be one token, not eight**.

> All patterns assume the tokens in `TOKENS.md` are in place.

---

## Button

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: var(--h-md); padding: 0 12px;
  border-radius: var(--r-2);
  border: 1px solid transparent;
  font: 500 var(--t-body)/1 var(--sans);
  color: var(--ink-1);
  cursor: pointer;
  transition: background .12s, border-color .12s, color .12s;
  white-space: nowrap;
}
.btn:focus-visible { outline: none; box-shadow: var(--ring); }
.btn.sm { height: var(--h-sm); padding: 0 8px; font-size: 12px; }
.btn.lg { height: var(--h-lg); padding: 0 14px; font-size: 13.5px; font-weight: 600; }

.btn--primary       { background: var(--accent); color: white; }
.btn--primary:hover { background: #2461c4; }

.btn--secondary       { background: var(--surface); border-color: var(--line-strong); color: var(--ink-1); }
.btn--secondary:hover { background: var(--surface-subtle); }

.btn--ghost       { background: transparent; color: var(--ink-2); }
.btn--ghost:hover { background: var(--surface-subtle); color: var(--ink-1); }

.btn--danger-ghost       { background: transparent; color: var(--ink-2); }
.btn--danger-ghost:hover { background: var(--danger-soft); color: var(--danger); }
```

**Header inverted variants** (header chrome is dark, so these adjust contrast):

```css
.header .btn--secondary       { background: transparent; border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.85); }
.header .btn--secondary:hover { background: rgba(255,255,255,0.08); color: white; border-color: rgba(255,255,255,0.25); }
.header .btn--ghost           { color: rgba(255,255,255,0.7); }
.header .btn--ghost:hover     { background: rgba(255,255,255,0.08); color: white; }
```

**Sizes:** `sm` (24px) for inline icon-bearing buttons in tables, `md` (28px)
for toolbar/header default, `lg` (34px) for the **Run Analysis** primary CTA
only. Nothing else uses `lg`.

**Intent picker:**

- One primary action per region → `btn--primary`. The screen has exactly three:
  Save (header), Add Dimension (toolbar), Run Analysis (analysis card).
- Anything destructive in a confirmation context still uses `btn--primary`
  styled red? **No** — primary stays blue. Destructive hovers come from
  `btn--danger-ghost` (used on row-delete icon buttons), and the "Reset" /
  "New Project" buttons stay as `btn--secondary` since their confirm is in a
  modal.
- Everything else → `btn--secondary` if it has weight in the page (Load, Fit
  Shift Calc, Invert All, Dual-Pair Clearance) or `btn--ghost` if it's
  ambient (Screenshot, Reset).

**Forbidden:**

- ❌ `shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.2)]` — remove from every button
- ❌ Custom paddings like `pl-3 pr-4 py-2` — use the size variants
- ❌ Custom radii — they're all `--r-2`

---

## Icon button

```css
.iconbtn {
  display: inline-grid; place-items: center;
  width: var(--h-md); height: var(--h-md);
  border-radius: var(--r-2);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
  transition: background .12s, color .12s, border-color .12s;
}
.iconbtn:hover { background: var(--surface-subtle); color: var(--ink-1); }
.iconbtn:focus-visible { outline: none; box-shadow: var(--ring); }
.iconbtn.sm { width: var(--h-sm); height: var(--h-sm); }

/* No border, no bg — used inside crowded table cells */
.iconbtn.ghost { border-color: transparent; background: transparent; }
.iconbtn.ghost:hover { background: var(--surface-subtle); }

/* Destructive hover — used on row-delete only */
.iconbtn.danger:hover { color: var(--danger); border-color: var(--danger-line); background: var(--danger-soft); }
```

**Where it replaces existing code:** the `sunken inline-flex h-[22px] w-[22px]`
recipe (`TolMaster.tsx` ~line 466) becomes `<button class="iconbtn sm ghost">`.
The "sunken" CSS class can be removed from the global stylesheet after.

---

## Input

```css
.input {
  display: inline-flex; align-items: center;
  height: var(--h-md); padding: 0 10px;
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: var(--r-2);
  font: 500 var(--t-body)/1 var(--mono);
  color: var(--ink-1);
  outline: none;
  transition: border-color .12s, box-shadow .12s;
}
.input:focus, .input.is-focused { border-color: var(--accent); box-shadow: var(--ring); }
.input.right  { text-align: right;  justify-content: flex-end; }
.input.center { text-align: center; justify-content: center; }
.input.lg     { height: var(--h-lg); padding: 0 12px; font-size: var(--t-strong); }

/* Validation state */
.input.warn { border-color: var(--warning); background: var(--warning-soft); }
```

**Replaces:** `field-shell` (which can stay defined as `.field-shell { @apply
input; }` if you want backwards-compat) and all the inline
`border border-[var(--line)] bg-[var(--surface)] rounded-[6px] ...` strings.

**Forbidden:**

- ❌ `border-b border-[var(--line)] bg-transparent` (the bottom-line-only Cp
  input on line ~728). Use full `.input` consistently — there's no reason it's
  styled differently from the tolerance input next to it.
- ❌ `bg-[var(--accent-soft)]` on the CP input in the modal — remove the tint.

---

## Select

```css
.select {
  display: inline-flex; align-items: center; gap: 8px;
  height: var(--h-md); padding: 0 28px 0 10px;
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: var(--r-2);
  font: 500 var(--t-body)/1 var(--mono);
  color: var(--ink-1);
  cursor: pointer; appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238a8884' stroke-width='2.5' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.select:focus-visible { outline: none; border-color: var(--accent); box-shadow: var(--ring); }
```

Apply to: Simulations count select, Distribution selectors in the table, shift
distribution in FitShift modal.

---

## Badge

```css
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  height: 20px; padding: 0 6px;
  border-radius: var(--r-1);
  border: 1px solid var(--line);
  background: var(--surface-subtle);
  font: 600 10px/1 var(--mono);
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-2);
}
.badge--accent  { background: var(--accent-soft);  border-color: var(--accent-line);  color: var(--accent);  }
.badge--success { background: var(--success-soft); border-color: var(--success-line); color: var(--success); }
.badge--warning { background: var(--warning-soft); border-color: var(--warning-line); color: var(--warning); }
.badge--danger  { background: var(--danger-soft);  border-color: var(--danger-line);  color: var(--danger);  }
.badge .dot     { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
```

**One shape. Colour means status.**

| Place | Variant | Content |
|---|---|---|
| Distribution column, normal rows | `.badge` (neutral) | `NORM`, `UNIF`, `FIXD` |
| Distribution column, empirical | `.badge--accent` | `EMPR` (or `Empirical`) |
| FitShift row label | `.badge` (neutral) | `FIT SHIFT` |
| Header version | `.badge` (neutral, no dot) | `v2.7` |
| Yield stat card | `.badge--success` / `.badge--warning` / `.badge--danger` | `Capable` / `Marginal` / `Failing` |
| Header status | `.badge--success` (or just a 6px pulse dot inline) | `Ready` |

**Forbidden:**

- ❌ `rounded-[999px]` pill shape for any badge (the FitShift one currently is)
- ❌ Variable padding `px-2 py-1` vs `px-1.5 py-0.5` — pick `.badge` and stay

---

## Card

```css
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  position: relative;
}
.card.pad { padding: var(--s-5); }   /* 20px — standard interior padding */

/* The status stripe: a 3px column running down the left edge.
   This is the ONLY mechanism for indicating "this card has a status." */
.card .stripe {
  position: absolute; left: 0; top: 12px; bottom: 12px;
  width: 3px; border-radius: 2px; background: transparent;
}
.card .stripe.accent  { background: var(--accent);  }
.card .stripe.success { background: var(--success); }
.card .stripe.warning { background: var(--warning); }
.card .stripe.danger  { background: var(--danger);  }
```

**Replaces:** `hairline-card` (which can keep its existing definition or be
aliased to `.card`).

**Inside stat cards**, give the card `padding: var(--s-4) var(--s-4) var(--s-4)
calc(var(--s-4) + 4px)` so the stripe doesn't crowd the text.

**Forbidden:**

- ❌ `background: linear-gradient(180deg, var(--success-soft) 0%, ...)` on the
  Yield card. Replace with `.card stripe.success` + a `.badge--success` in the
  card head.
- ❌ `bg-[var(--success-soft)] border-[var(--success)]/25` on the Cpk card.
  Same replacement: stripe + (optional) badge.

---

## Toggle (switch)

```css
.toggle {
  display: inline-flex; align-items: center;
  width: 28px; height: 16px; padding: 2px;
  border-radius: 999px;
  background: var(--line-strong);
  cursor: pointer;
  transition: background .15s;
  flex-shrink: 0;
}
.toggle .knob {
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--surface);
  transform: translateX(0);
  transition: transform .15s;
}
.toggle.on        { background: var(--accent); }
.toggle.on .knob  { transform: translateX(12px); }
.toggle:focus-visible { outline: none; box-shadow: var(--ring); }
```

**Used in three places — they currently look different. After: identical.**

- Symmetric / Asymmetric tolerance toggle (table row)
- Mean Drift toggle (table row, distribution cell). Currently uses `rounded-[6px]` knob and a 16px×4px-thick switch — change.
- Compression Mode toggle (analysis card). Currently uses different dims (`width:28, height:16, knob:12×12`) — those happen to be correct; just port to the class.

**Forbidden:**

- ❌ Inline `style={{ width: 28, height: 16 }}` per-instance overrides

---

## Segmented control

```css
.seg {
  display: inline-flex; padding: 2px;
  background: var(--surface-subtle);
  border: 1px solid var(--line);
  border-radius: var(--r-2);
}
.seg button {
  height: 22px; padding: 0 10px;
  border: 0; background: transparent;
  border-radius: 4px;
  color: var(--ink-3);
  font: 500 12px/1 var(--sans);
  cursor: pointer;
}
.seg button.active {
  background: var(--surface);
  color: var(--ink-1);
  box-shadow: 0 1px 1px rgba(0,0,0,0.04);
}
```

Currently the Manual / Target Cpk segmented control uses `rounded-[10px]` on
the wrapper and `rounded-md` on the inner buttons. After: `--r-2` wrapper,
4px inner — visually quieter, consistent with everything else.

---

## Stat card

```html
<div class="card stat">
  <div class="stripe success"></div>
  <div class="stat-head">
    <span class="label">Yield rate</span>
    <span class="badge badge--success"><span class="dot"></span>Capable</span>
  </div>
  <div class="stat-val">99.984<span class="unit">%</span></div>
  <div class="stat-kv">
    <span class="k">FitShift</span><span class="v">0.01243%</span>
    <span class="k">Upper</span><span class="v">0.00204%</span>
    <span class="k">Lower</span><span class="v">0.00112%</span>
  </div>
</div>
```

```css
.stat { padding: var(--s-4) var(--s-4) var(--s-4) calc(var(--s-4) + 4px);
        display: flex; flex-direction: column; gap: var(--s-2); }
.stat-head { display: flex; align-items: center; justify-content: space-between; }
.stat-val  { font: 600 var(--t-display)/1 var(--mono); letter-spacing: -0.02em; color: var(--ink-1); }
.stat-val .unit { font-size: 14px; color: var(--ink-3); font-weight: 500; margin-left: 2px; }
.stat-kv { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px;
           font: 500 11px/1.4 var(--mono); }
.stat-kv .k { color: var(--ink-3); letter-spacing: 0.04em; text-transform: uppercase; font-size: 10px; }
.stat-kv .v { color: var(--ink-2); }
```

**Rule of the row:** all five stat cards share `.card .stat`. They differ only
in whether they have a `.stripe.*` and what's inside `.stat-head`'s right
slot.

---

## Table row (Dimensions)

The table itself is already well-structured. The cleanup is mostly in the
cells:

- **Index cell** (`#`) — use `.idx` class (mono, 11px, ink-3).
- **Name cell** — `<div class="name">Part A</div>` plus optional `<div class="subname">Aluminum bracket — datum face</div>`. The FitShift row also gets a `.badge` next to the name.
- **Sign toggle** (`+` / `−`) — `<button class="sign pos">+</button>` / `.sign.neg`. Drop the inline `h-[22px] w-[22px] rounded-[4px] border text-[11px] font-semibold ...`.
- **Editing-row indicator** — when a cell inside is focused, give the `<tr>` class `editing`. CSS:
  ```css
  .tbl tbody tr.editing td { background: var(--accent-soft-tint, rgba(42, 111, 219, 0.04)); }
  .tbl tbody tr.editing td:first-child { box-shadow: inset 3px 0 0 var(--accent); }
  ```
  Replaces the current `bg-[var(--accent-soft)]` whole-row tint on drag, which conflicts with the drag-target state.

---

## What you delete after

After the rollout, search-and-delete these global CSS utility classes (they're
replaced by the patterns above):

- `field-shell` (or alias to `.input`)
- `hairline-card` (or alias to `.card`)
- `sunken` (or alias to `.iconbtn` / `.input` depending on use)
- `mono-label` (replace with `.label` from PATTERNS.md, or keep as alias)

If you alias rather than delete, your diff is smaller and the refactor can ship
without breaking unrelated screens. Recommended: alias for now, mark as
deprecated, schedule removal.
