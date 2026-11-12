# Test Series (Admin Side) — Implementation Plan

**Date:** 12 Nov 2026
**Scope:** Admin-side test series, complete — the admin creates a series, opens it and
puts tests inside it as a **tree** (series → tests), reorders them, and sees what is
ready. **Publishing is explicitly out of scope** (deferred; only a clearly-labelled
placeholder is left in the UI).
**Companion file:** `docs/TEST-SERIES-REPORT.md` (what was actually done).

---

## 1. Where we are today

### Backend (already built)
| Piece | Status |
|---|---|
| `TestSeries` model (title, exam, description) | ✅ exists |
| `GET/POST/PUT/DELETE /api/admin/series[/:id]` | ✅ exists (`adminSeriesController.js`) |
| Tests inside a series: `POST /api/admin/tests` with `seriesId` | ✅ exists (`adminTestsController.js`) |
| Validation (title, exam, paper JSON check) | ✅ exists |
| Order of tests inside a series | ❌ only `createdAt` (oldest first), not editable |
| Readiness summary (which tests have a paper) | ⚠️ partial (`hasPaper` per test, no counts) |
| Series publishing | ❌ not built (agreed: later) |

### Frontend (already built)
| Piece | Status |
|---|---|
| Admin › Test series list → one series → test editor (3 screens) | ✅ exists (`SeriesAdmin.jsx`) |
| New series form, series details edit, delete series/test | ✅ exists |
| Test editor for a series test (details, marking, instructions, paper JSON, preview) | ✅ exists (`TestEditor.jsx`, `kind="series"`) |
| **Tree presentation** (series as root, its tests as children) | ❌ flat table of cards |
| **Reorder tests** (move up / move down) | ❌ not possible |
| Ready / not-ready status at a glance | ⚠️ only a "No paper yet" pill in the table |
| Publish placeholder | ❌ missing |

## 2. Target (what "done" means)

```
Admin › Test series
 └── 📁 JEE Main 2027 Test Series            [N tests · M ready]   ▸ expand
       ├── 1  Part Test 1        Physics…   [Ready]      ↑ ↓  Edit  Delete
       ├── 2  Part Test 2        Chemistry… [No paper]   ↑ ↓  Edit  Delete
       └── ＋ Add test
```

1. **Tree structure.** The series list shows each series as an expandable root node;
   its tests are the child nodes, in the admin's chosen order. The series page shows
   the same tree as an ordered outline (position number + connector styling).
2. **Admin puts tests inside a series** — "Add test" exists both on the root's child
   list and on the series page (already built, kept as-is).
3. **Ordering is persistent** — `Test.sortOrder`, changed with Move up / Move down.
4. **Readiness is visible** — per test: `Ready` (paper saved) / `No paper yet`;
   per series: "X of Y ready".
5. **Publish = placeholder only** — a disabled "Publish series" control with a note
   that publishing comes later. No publish logic, no student visibility.

## 3. Non-goals (this round)

- Publishing series or its tests to students, student-side series pages.
- Pricing, payments, coupons (separate workstream).
- Fixed positions (Part 1–6 / Half 1–3 / Full 1–2) — can be layered on top of
  `sortOrder` later.
- Drag-and-drop reordering (buttons only; simpler and accessible).
- Moving a test between two series.

## 4. Backend changes

### 4.1 Schema — `backend/prisma/schema.prisma`
- `Test` gains `sortOrder Int @default(0)` (position inside its series).
- New migration `20261112000000_add_test_sort_order`:
  `ALTER TABLE "Test" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;`
  Existing rows get `0` and keep their `createdAt` order (tie-break on read).

### 4.2 `adminSeriesController.js`
- `getSeries`: order tests by `[{ sortOrder: 'asc' }, { createdAt: 'asc' }]`;
  return `status` and `sortOrder` per test.
- `listSeries`: add `ready` (tests with a paper) alongside `tests` / `questions`
  counts, so each root can show "N of Y ready".
- **New** `reorderSeries` → `PUT /api/admin/series/:id/order`, body
  `{ testIds: [id, id, …] }`:
  - 404 if the series doesn't exist;
  - 400 unless `testIds` is exactly the set of that series' test ids, with no
    duplicates (prevents cross-series writes / silent drops);
  - one transaction writing `sortOrder = index`.

### 4.3 `adminTestsController.js`
- `createTest` with `seriesId`: assign `sortOrder = max(sortOrder in series) + 1`
  so a new test is appended at the end of the tree.
- `summaryOf`: expose `sortOrder`.

### 4.4 `adminTestRoutes.js`
- `router.put('/series/:id/order', series.reorderSeries);`

## 5. Frontend changes

### 5.1 `testsApi.js`
- `reorderSeriesTests(id, testIds)` → the new endpoint.

### 5.2 `SeriesAdmin.jsx`
- **List screen → tree.** Series cards become tree roots: chevron toggle
  (aria-expanded), title/exam/counts on the root row, and an expandable child list:
  ordered test nodes (position badge, title, subject, `Ready` / `No paper yet` pill,
  Edit + Delete), then an "Add test" child row. Expanding a root doesn't navigate;
  clicking the root title opens the series page (unchanged behaviour).
  Empty series children: "No tests yet — add the first one".
- **Series page → ordered outline.** The flat table is replaced by the same tree
  nodes with **Move up / Move down** (disabled at the ends), Edit and Delete.
  Reordering calls the endpoint and refreshes; the row is disabled while saving.
- **Publish placeholder.** Next to "Add test": a disabled
  `Publish series` button (`title="Publishing a series comes later"`) plus a one-line
  hint, so the intended final step is visible without any logic behind it.
- Stats row gains a "Ready" figure ("X of Y have a paper").

### 5.3 `Admin.css`
New `.tree-*` classes (root card, head, toggle, kids, node, position badge,
node actions, add-row), reusing existing tokens (`--line`, `--soft`, `--blue`,
pills `p-published` / `p-warn`) and matching the existing admin look.

## 6. Verification

1. Backend: `node --check` on changed files; `npx prisma validate`.
2. Migration: `npx prisma migrate dev --name add_test_sort_order`
   (falls back to `migrate deploy` if the dev prompt can't run).
3. Frontend: `npm install`, `npm run build`, `npm run lint`.
4. Manual smoke (API level, if a server + admin token are available):
   create series → add 2 tests → `PUT …/order` with ids reversed → `GET` shows the
   new order → `PUT …/order` with a foreign id → 400.

## 7. Decisions taken while planning

- **Tree = 2 levels** (series → tests). Groups/positions inside a series are a
  later layer, not needed to "put tests in a series".
- **Buttons, not drag-and-drop**, for reorder — keyboard accessible, no new deps.
- **`sortOrder` on `Test`** rather than a join table — one column, one migration.
- **Publish stays a stub** — per the explicit instruction "publish it which will
  implement later".
