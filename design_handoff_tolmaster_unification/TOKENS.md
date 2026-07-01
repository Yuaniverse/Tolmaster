# TOKENS

The whole refactor is downstream of this table. Add these to the project's
global CSS (the file that currently defines `--canvas`, `--surface`, `--accent`,
etc. — likely `globals.css` or `app.css`).

The token **names** are mostly unchanged from today — only the **values** are
tightened. New tokens are added (`--r-1/2/3`, `--h-sm/md/lg`, `--ring`,
`--*-line`). Old offending tokens (e.g. `--chrome-2`) can be removed once
references are gone.

## Final token set

```css
:root {
  /* Surfaces — neutral hierarchy only */
  --canvas:          #f4f4f3;   /* page background */
  --surface:         #ffffff;   /* cards, panels, inputs */
  --surface-subtle:  #f7f7f6;   /* table head, hover row, segmented bg, sunken */
  --chrome:          #1a1a1a;   /* header & footer chrome — that's it */

  /* Lines (only 2 weights) */
  --line:            #e6e5e2;   /* default borders, dividers, table rows */
  --line-strong:     #d5d4d0;   /* select / secondary-button border, separators in mono readouts */

  /* Ink — only 3 levels */
  --ink-1:           #1a1a1a;   /* primary text, data values, bold labels */
  --ink-2:           #555452;   /* body text, helper, secondary button text */
  --ink-3:           #8a8884;   /* mono eyebrow labels, meta, placeholders, grid lines */

  /* Accent — one hue, one soft */
  --accent:          #2a6fdb;
  --accent-soft:     #eaf1fc;
  --accent-line:     #c6d9f7;

  /* Status — used ONLY for status, never as decoration */
  --success:         #1d8a5a;
  --success-soft:    #e7f3ec;
  --success-line:    #c4e1d0;
  --warning:         #b06a00;
  --warning-soft:    #fbf1de;
  --warning-line:    #ecd6a4;
  --danger:          #b93b3b;
  --danger-soft:     #fae8e8;
  --danger-line:     #ecc6c6;

  /* Radius — only 3 values exist anywhere in the product */
  --r-1: 4px;    /* inline tags, badges                     */
  --r-2: 6px;    /* every interactive control               */
  --r-3: 10px;   /* containers (cards, panels, modals)      */

  /* Spacing scale (4px base). Replaces ad-hoc px-1.5 / py-1.5 mixes. */
  --s-1: 4px;
  --s-2: 8px;
  --s-3: 12px;
  --s-4: 16px;
  --s-5: 20px;
  --s-6: 24px;
  --s-8: 32px;

  /* Type scale — 6 sizes total */
  --t-label:   10.5px;   /* mono uppercase eyebrows */
  --t-meta:    11.5px;   /* helper text             */
  --t-body:    13px;     /* default                 */
  --t-strong:  14px;     /* section titles, names   */
  --t-display: 24px;     /* stat values             */

  /* Control heights — single source of truth */
  --h-sm: 24px;
  --h-md: 28px;
  --h-lg: 34px;

  /* Focus ring — single recipe applied everywhere */
  --ring: 0 0 0 3px var(--accent-soft);
}
```

## What's gone

Remove these after the migration finishes (leave them in during the rollout so
nothing breaks):

| Token | Why removed |
|---|---|
| `--chrome-2` | Tabs row now lives on `--chrome` directly |
| Hardcoded `oklch(40% 0.13 155)` and `oklch(80% 0.08 155)` in `TolMaster.tsx` line ~2230 | Use `--success` and `--success-line` |
| Hardcoded inset gradient `shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.2)]` everywhere | Gloss is incompatible with the focus ring; not a token, was a workaround |

## Token usage discipline

Each colour token has **allowed uses** and **forbidden uses**. Stick to the
allowed list — that's the entire point of this refactor.

### `--accent` (blue)

✅ Primary button background
✅ Focus ring (`--ring`)
✅ Selected / active tab text + bottom border
✅ μ line on histogram
✅ "EMPR" badge (it's data sourced from real measurements — meaningful highlight)

❌ "FitShift" badge (use neutral `.badge`)
❌ Hover decoration on icon buttons (use `--ink-1`)
❌ Mean Drift toggle "on" state — wait, this one is **correct**: toggles use accent for "on". Keep.
❌ Random text emphasis ("Calibrate", "Empirical (Measured)" tooltips)

### `--success` / `--warning` / `--danger`

✅ Stat-card stripe + matching badge for that card's status
✅ Inline sign buttons (`+` / `−`) on dimension nominal
✅ Tolerance value asymmetric inputs (`tol-plus` green, `tol-minus` red)
✅ Spec lines on charts (`--danger`)
✅ Validation warning state on tolerance inputs (`--warning`)
✅ Delete icon button hover (`--danger`)
✅ Cpk value text when ≥ 1.33 (`--success`)
✅ Yield rate value text when > 99.7% (`--success`)

❌ The Dual-Pair Clearance FAB at bottom-right (was `--warning` background; now a normal secondary button in the toolbar)
❌ Whole-card tinted backgrounds on Yield / Cpk stat cards (use stripe + badge instead)
❌ Linear-gradient backgrounds on any card
