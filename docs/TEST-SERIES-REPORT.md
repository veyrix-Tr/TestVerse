# Test Series (Admin Side) — Implementation Report

**Date:** 12 Nov 2026
**Plan implemented:** `docs/TEST-SERIES-PLAN.md`
**Status:** ✅ Complete and verified end-to-end (publishing intentionally left as a placeholder, per the plan).

---

## 1. What was delivered

The admin test-series section is now a **tree**: a series is a root node, its tests are
ordered child nodes the admin puts there, reorders, edits and deletes — with a visible
**Publish series** placeholder for the step that comes later.

| Requirement | Delivered |
|---|---|
| Admin creates a series | ✅ existing (kept): New series → title, exam, description |
| Tree structure | ✅ list screen shows each series as an expandable root with its tests as children (connector lines, position badges); the series page shows the same tests as an ordered outline |
| Admin puts tests inside the series | ✅ "Add test" on the root's child list and on the series page → the existing test editor (details, marking, instructions, JSON paper, live validation, preview) |
| Order of tests is admin-controlled | ✅ new `sortOrder` column + Move up / Move down, persisted and shown after reload |
| Readiness at a glance | ✅ per test: `Ready` / `No paper yet` pill; per series: "N of Y ready"; series stats: "X of Y have a paper" |
| Publish (later, for now just the slot) | ✅ disabled **Publish series** button + line in the section copy: *"Publishing a series comes later — every test stays a draft until then."* No publish logic added |

## 2. Files changed

### Backend
| File | Change |
|---|---|
| `backend/prisma/schema.prisma` | `Test.sortOrder Int @default(0)` — position inside its series |
| `backend/prisma/migrations/20261112000000_add_test_sort_order/migration.sql` | `ALTER TABLE "Test" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;` — **applied** to the database (`prisma migrate deploy`, 13/13 migrations OK) |
| `backend/controllers/adminSeriesController.js` | `getSeries` returns tests ordered by `sortOrder, createdAt` (with `status`, `sortOrder` per test); `listSeries` adds a `ready` count per series; new `reorderSeries` handler |
| `backend/controllers/adminTestsController.js` | `createTest` appends a series test at the end (`max(sortOrder) + 1`); `summaryOf` exposes `sortOrder`; `listTests?seriesId=` returns the tree order (other lists stay newest-first) |
| `backend/routes/adminTestRoutes.js` | `PUT /api/admin/series/:id/order` → `series.reorderSeries` |

### Frontend
| File | Change |
|---|---|
| `frontend/src/pages/Admin/testsApi.js` | `reorderSeriesTests(id, testIds)` |
| `frontend/src/pages/Admin/SeriesAdmin.jsx` | List screen rebuilt as a tree (root card + chevron toggle + lazily loaded children); shared `TestNode` component (row opens the editor, actions beside it); series page's table replaced by the ordered outline with Move up / Move down; disabled **Publish series** placeholder; ready counts |
| `frontend/src/pages/Admin/Admin.css` | New `.tree-*` styles (root, head, toggle, children + connector lines, nodes, position badge, actions, add-row, notes) using the existing design tokens; small-screen rules ≤640 px |

## 3. API changes

```
PUT /api/admin/series/:id/order     (admin, new)
body: { testIds: [id, id, …] }      // exactly this series' tests, each once, in the new order
200 { message: "Order saved" }
400 { field: "testIds" | error }    // incomplete / duplicate / foreign id — nothing is written
404 { error: "Test series not found" }
```

Response additions (no breaking changes): `GET /admin/series` items gained `ready`;
`GET /admin/series/:id` tests gained `status` and `sortOrder`; test summaries gained
`sortOrder`.

## 4. Verification

**Static:** `npx prisma validate` OK · `node --check` on all changed backend files OK ·
`npm run build` OK · `npm run lint` OK (only pre-existing warnings, none in changed files).

**API smoke test** (real controllers against the real DB, temp data deleted after):
create series → add 2 tests (sortOrder 0, 1) → `getSeries` order A→B → reverse via
`PUT …/order` → order B→A with sortOrder rewritten → incomplete/duplicate/foreign/missing
`testIds` all rejected with 400 → `listSeries` counts correct → series deleted.
**7/7 passed.**

**Browser check** (headless Chromium against the running app, temp admin + temp series
created and then removed):

1. Log in → Admin → Test series: root card shows title, NEET badge, description,
   `3 tests · 1 of 3 ready · 7 questions · Updated …`.
2. Chevron expands the root → children load with connector lines, position badges,
   `Ready` / `No paper yet` pills, Delete, dashed **Add test** row.
3. Series page → stats (`1 of 3 have a paper`), details form, outline with ↑ ↓ ,
   disabled **Publish series**, **Add test**.
4. Clicked ↑ on row 3 → `PUT /api/admin/series/:id/order → 200 {"message":"Order saved"}`,
   DB order changed, DOM refreshed to the new order, order persisted across a page reload.
5. **Zero console errors** across all runs.

Screenshots: `/tmp/opencode/shot-1-list-collapsed.png` … `shot-4-after-move.png`.

## 5. Environment observations (not caused by this change)

- **Every API call takes 3–6 s** from this machine (login 3.0 s, plain series list
  4.8–5.4 s, the reorder transaction 5.7 s — the transaction itself adds <1 s). This is
  the Supabase round-trip (`ap-northeast-2` pooler) and affects untouched endpoints too.
  Worth investigating separately; the UI's busy states cover it.
- **Port 5000 was held by a backend started at 10:34** (before these edits), so it did
  not have the new route; two `nodemon` instances and a Vite on 5173 were also already
  running. I used port 5001 + a second Vite for testing and **left all your processes
  running**; my test servers were shut down afterwards.
- Dev note: restart your backend (`nodemon` will usually pick the changes up) so
  `PUT /api/admin/series/:id/order` exists on the port you use.

## 6. How to try it

1. Restart the backend, then open **Admin → Test series**.
2. **New series** → name it → open it (chevron in the list, or click the title).
3. **Add test** → fill details, paste/upload the JSON paper → **Save test** → it lands at
   the end of the tree with a `Ready`/`No paper yet` pill.
4. On the series page use **↑ ↓** to order the tests; the order survives reloads.
5. **Publish series** is disabled on purpose — that is the next piece of work.

## 7. Not in this change (per plan)

Publishing (series or tests to students), student-side series pages, pricing/payments,
fixed Part/Half/Full positions (can be layered on `sortOrder` later), drag-and-drop,
moving a test between series.
