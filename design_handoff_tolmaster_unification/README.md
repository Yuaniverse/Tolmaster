# TolMaster — Design System Unification

## What this is

A **CSS/styling refactor** of the existing TolMaster app. The product's structure,
content, layout, and behaviour stay **exactly the same**. Only the visual
language is being tightened so the UI feels like one product instead of an
accumulation of one-off styles.

> **This is not a new feature and not a redesign.** Do not change the React tree
> shape, the markup hierarchy, the routing, or any business logic. Touch only:
>
> - global CSS / Tailwind tokens
> - `className` strings on existing elements
> - small visual primitives (e.g. a unified `<Badge>` if you want to extract one)

If you find yourself rewriting a component's logic to "fix" the design, stop —
the design fix is upstream in the token / class layer.

## About the bundled files

The HTML files in this folder are **design references**, not production code.
They show the intended end-state in plain HTML/CSS so you can see exactly what
each element should look like after the refactor.

The real codebase is React + Tailwind (the existing
`components/TolMaster.tsx`, `EngineeringCharts.tsx`, `SPCModal.tsx`,
`DualPairAnalysisModal.tsx`). Implement the changes there, using the project's
existing Tailwind setup and CSS-variable token system — don't copy the HTML
files into the app.

## Fidelity

**High-fidelity.** Every colour, radius, height, padding and font size in the
HTML references is intentional. Match them.

## Files in this folder

| File | What it's for |
|---|---|
| **README.md** | This brief. Read first. |
| **TOKENS.md** | The canonical token set. The whole job is downstream of this table. |
| **PATTERNS.md** | Concrete specs for every visual primitive (button, badge, card, input, toggle, segmented control, table row, stat card, chart card). |
| **CHANGES.md** | Punch list of specific edits in `TolMaster.tsx` with `file:line` references. Work top-to-bottom. |
| **refined.html** | Pixel-accurate reference of the main screen after the refactor. Open this in a browser and inspect when in doubt. |
| **system.html** | Side-by-side before/after of the 6 rule changes, with reasoning. Useful context, not strictly needed to implement. |
| **current_tolmaster.tsx** | Snapshot of the file you're editing, so this bundle is self-contained. |
| **current_charts.tsx** | Snapshot of EngineeringCharts.tsx (uses `var(--…)` tokens — should just work after the token rename). |
| **current_spc_modal.tsx** | Snapshot of SPCModal.tsx — same patterns, apply CHANGES.md rules there too. |
| **current_dualpair_modal.tsx** | Snapshot of DualPairAnalysisModal.tsx — same. |

## Order of operations

1. **Read TOKENS.md.** Apply the new token values to the project's global CSS.
   Most existing tokens keep the same name; some are added (`--r-1/2/3`, `--h-sm/md/lg`, `--ring`, status-line colors). Old offending tokens stay (for now) so nothing breaks mid-refactor — they'll just stop being referenced.

2. **Read PATTERNS.md.** Add the reusable utility classes (`.btn`, `.btn--primary`, `.badge`, `.stat-card` stripe, `.toggle`, etc.) to the global stylesheet. These replace the constellation of one-off Tailwind strings.

3. **Walk CHANGES.md top to bottom.** Each entry is an isolated find-and-replace
   in `TolMaster.tsx`. After each section, save and reload — the app should
   still work; you're only swapping classNames.

4. **Repeat the same patterns in `SPCModal.tsx` and `DualPairAnalysisModal.tsx`.**
   They use the same `hairline-card`, `mono-label`, `field-shell`, `sunken`
   utilities — the rules from PATTERNS.md apply identically.

5. **Verify against `refined.html`.** Run the app, open `refined.html` in a
   second tab. They should look like the same screen.

## What "done" looks like

- A user opening the app sees the same content, in the same place, behaving the
  same way.
- But: every button matches every other button. Every badge matches every other
  badge. Every card has the same chrome. Status is communicated through stripe
  + small badge, not through tinted backgrounds. Accent blue appears in ≤ 4
  places per screen.
- Radius values across the entire codebase reduce to **3 values only**:
  `4px / 6px / 10px`. Grep for `rounded-\[` and `rounded-md` after — there
  should be zero matches outside the new token use.
- Inset-shadow "gloss" (`shadow-[inset_0_1px_0...]`) is gone from every button.
- The Dual-Pair FAB at the bottom-right is replaced by a normal button in the
  Analysis card's toolbar (yellow is now reserved for actual warnings).

## What NOT to do

- Don't introduce new colors, even if a soft tint "would look nice."
- Don't change which element shows yield rate vs. PPM vs. Cpk — order, content,
  decimal precision all stay.
- Don't reshape the modals; they get the same token treatment but not a
  structural rewrite.
- Don't refactor the simulation engine, the localStorage logic, or any of the
  numerical helpers (`normSInv`, `randomNormal`, `calculateSigma`…). They're
  invisible to this work.
- Don't rebuild the charts — `EngineeringCharts.tsx` already uses `var(--…)`
  references, so updating the token values is the entire fix there.

## After the refactor

You should be able to grep the codebase for these and find roughly zero hits
outside this design system:

```
rounded-\[4px\]    rounded-\[6px\]   rounded-\[10px\]   rounded-\[999px\]
rounded-md         shadow-\[inset
oklch\(            bg-\[var\(--accent-soft\)\]    bg-\[var\(--success-soft\)\]
```

(`bg-[var(--*-soft)]` should only appear inside the `.badge--*` and
`.stat-card stripe` patterns from PATTERNS.md.)

Good luck. Read TOKENS → PATTERNS → CHANGES in that order.
