# Test Series — Publishing, Pricing, Audience & Purchase — Implementation Plan

**Date:** 12 Nov 2026
**Precedes:** `docs/TEST-SERIES-PLAN.md` (admin tree builder — done) · **Companion:** `docs/TEST-SERIES-SELLING-REPORT.md`

## 1. Goal (the whole chain)

```
Admin: set price + targeted audience → Publish series
   ↓
Student sidebar "Test series" (no longer "Soon") → sees the published series
   ↓
Student buys it (one-time payment; gateway comes later — same MOCK_PAYMENTS
convention the batch purchase uses) → owns it
   ↓
Opens the series → takes its tests on the normal CBT screen → scores/results
```

## 2. Current state

| Piece | Status |
|---|---|
| Admin builds series + tests (tree, order, readiness) | ✅ done (previous plan) |
| Series "Publish series" button | ⚠️ disabled placeholder |
| Price / audience on a series | ❌ don't exist |
| Student `/student/test-series` | ❌ "Coming soon" page (`soon.js` SOON map, sidebar "Soon" badge) |
| Purchase of a series | ❌ no model, no endpoints |
| Students taking series tests | ❌ `lib/access.js` hard-excludes them (`seriesId: null`) |

## 3. Data model (one migration)

```prisma
model TestSeries {
  …existing…
  price       Int?        // rupees; null = not set (publish requires it; 0 = free)
  status      String  @default("draft")   // "draft" | "published"
  publishedAt DateTime?
  audience    String  @default("all")     // "all" | "custom" — who may SEE/BUY it
  batches     SeriesBatch[]   groups   SeriesGroup[]   students SeriesStudent[]
  orders      SeriesOrder[]
}
model SeriesBatch / SeriesGroup / SeriesStudent   // mirror of TestBatch/TestGroup/TestStudent
model SeriesOrder {
  userId (cascade) · seriesId (cascade) · amount (rupees at purchase time)
  status "pending"|"active" · paymentRef? · activatedAt? · timestamps
  @@unique([userId, seriesId])   // one purchase per student per series
}
```

## 4. Backend

### 4.1 Admin (`adminSeriesController` + routes)
- `readSeries`: validates **price** (integer ≥ 0 ≤ 1,000,000, or empty → null).
- create/update also read an **audience** through the existing `lib/audience.js`
  `readAudience` (validates batches/groups/students exist) and write it with a new
  `writeSeriesAudience` (same shape as `writeAudience`, for the 3 new tables).
- `seriesOf` gains `price`, `status`, `publishedAt`, `audience`; `getSeries` loads the
  full audience (`AUDIENCE_INCLUDE`) for the editor.
- **New** `POST /api/admin/series/:id/publish`:
  404 unknown · 409 already published · **400 if price not set** (`Set a price… 0 makes it free`)
  · **400 if no test with a paper** · otherwise `status='published'`, `publishedAt=now`,
  then fire-and-forget `notifyMany` to the audience's students ("New test series: <title>").
- **New** `POST /api/admin/series/:id/unpublish` → back to `draft` (buyers' orders stay,
  but the series and its tests disappear until it's published again).

### 4.2 Student API (new `controllers/seriesController.js`, `routes/seriesRoutes.js`, mounted at `/api/series`)
- Visibility filter: `status='published'` + exam family (`examFamily` from access.js)
  + audience (`all` OR their active batch OR their groups OR direct).
- `GET  /api/series` — the catalog: counts (tests, questions, marks), price,
  `owned` + order status for this student.
- `GET  /api/series/:id` — 404 unless visible; details + its tests **with this
  student's attempt state in the exact shape `listTests` returns** (status, best,
  history, canRetake) so the UI can reuse `TestCard`. Test **titles are shown
  pre-purchase** (they are the selling point); no paper data ever leaves the server
  before purchase… (papers are only reachable through `/api/tests/:id`, which is
  access-controlled).
- `POST /api/series/:id/orders` — the purchase, mirroring `subscriptionController`:
  404 not visible · 409 already owned · amount copied from `series.price` ·
  **activated at once when price = 0 or `MOCK_PAYMENTS=true`**, else `pending` +
  **503 "Online payment isn't available yet…"** (the real gateway drops in here later,
  its webhook flips the order to `active`). On success: admin bell ("New purchase: …")
  and student bell ("… is unlocked").

### 4.3 Access (`lib/access.js`)
`visibleTo(userId)` restructured to:

```
OR [
  { status:'published', seriesId: null, OR: [free | subscribed-all | batch | group | direct | attempted] },   // unchanged rules
  { seriesId: { in: <seriesIds this student has an ACTIVE order for> }, series: { status:'published' } },     // NEW
]
```

So a buyer can open, start, retake and be scored on their series' tests through the
existing `/api/tests/*` endpoints untouched. Unpublishing the series hides them again.
`meta()` gains `seriesId`/`seriesTitle` so cards can show where a test came from.

## 5. Frontend

### 5.1 Admin (`SeriesAdmin.jsx`, `AudienceEditor.jsx`)
- Details form gains a **Price (₹)** field (whole rupees, 0 = free, "one-time payment").
- New **"Who can see and buy this series"** block reusing `AudienceEditor` with a new
  `context="series"` prop for its wording (its copy is test-specific today).
  Details + price + audience save in the one existing Save flow.
- The disabled **Publish series** placeholder becomes real:
  draft → `Publish series` button (server errors shown inline: no price / no ready test);
  published → `Published` pill + `Unpublish` + "Published <date>".
- The list tree root shows the price and a `Draft`/`Published` pill.

### 5.2 Student (`StudentHome`)
- `Sidebar.jsx`: **Test series moves from "Coming soon" into the main nav**; `soon.js`
  loses its `test-series` entry; `StudentHome.jsx` PAGES gains the real page.
- New `pages/SeriesPage.jsx` with two screens (list ⇄ detail, same shell):
  - **Catalog**: cards — title, exam chip, description, `N tests · Q questions · M marks`,
    **price / Free**, `Buy ₹X` (busy state, toast on success, inline error on 503) or
    **Open** once owned; empty state when nothing is on sale.
  - **Detail**: header + price/ownership, then the series' tests — owned → `TestCard`
    (Start / Resume / View result / Retake, all existing routes `/test?test=…`),
    not owned → locked rows (title, facts, "Buy to unlock"). Back to the catalog.
- `TestCard` shows a chip with the series name for series tests; a successful purchase
  also reloads `/api/tests` so the new tests appear in "Your tests" at once.

## 6. Explicitly out of scope (again)

Refunds/coupons, sale pricing, real gateway (Cashfree) — the503 + `MOCK_PAYMENTS`
seam is where it plugs in. Ranks/leaderboards, series progress %, account purchase
history page.

## 7. Verification

1. `prisma validate` + migrate · `node --check` · `npm run build` · `npm run lint`.
2. **API smoke test** (real DB, temp data cleaned up): publish rules (no price → 400,
   no paper → 400, ok → 200 + audience notified) · catalog visibility per exam/audience ·
   purchase with `MOCK_PAYMENTS=true` → active, without → 503 pending, double-buy → 409 ·
   `visibleTo` includes/excludes series tests correctly · attempt start/submit on a
   series test · unpublish hides everything · cleanup.
3. **Browser check** (headless Chromium): admin sets price+audience → publishes →
   student sees it in the sidebar page → buys → opens → starts a test → screenshots,
   zero console errors. Temp admin + temp student removed afterwards.

## 8. Decisions taken while planning

- **Price required to publish** (0 = free) — a published series always has a decided price.
- **One order per (student, series)**, amount snapshotted — later price changes never
  touch past purchases (same rule as `Subscription.amount`).
- **Audience = who may see and buy**; ownership = who may take the tests. Both reuse the
  test audience machinery so admins learn one control.
- **Reuse `MOCK_PAYMENTS`/503** instead of inventing a second payment stub — one seam
  for the real gateway later.
- Series tests keep their own `status='draft'`; **the series' publish state governs them**
  (test-level publish stays blocked for `kind='series'`).

## 9. Added: single-subject vs full-syllabus tests (13 Nov 2026)

- Admin test editor: **Test type** = *Full syllabus* (subjects listed, comma-separated) or
  *Single subject* (Physics / Chemistry / Maths / Biology per exam, or a custom one).
  Stored in the existing `Test.subject` text — one name = single subject. No migration.
- `GET /api/series` and `/api/series/:id` return `mix: { full, subjects: [{ name, tests }] }`.
- Student catalog cards show the mix ("1 full syllabus", "Physics · 3"), split into
  *Your series* / *More series*; the detail screen has a progress bar and filter tabs
  (All / Full syllabus / each subject). Admin series tree shows a subject tag per test and
  a "Before you publish" checklist (price, ready tests, unsaved changes).
