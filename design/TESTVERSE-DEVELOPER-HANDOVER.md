# Testverse by Studyverse — Developer Handover

**Version:** 1.0 · November 2026
**Owner:** Studyverse (hello@studyverse.in)

This is everything needed to build Testverse, the NEET / JEE online test platform by Studyverse. It comes with working front-end prototypes of the main screens. Build the real product from these: the screens show **what it looks like and how it behaves**, and this document defines **the rules, data and server logic**.

---

## Contents

0. [How to use this package](#0-how-to-use-this-package)
1. [Product in one page](#1-product-in-one-page)
2. [Business rules (decided)](#2-business-rules-decided)
3. [Pages: built prototypes](#3-pages-built-prototypes)
4. [Pages: still to build](#4-pages-still-to-build)
5. [Recommended stack](#5-recommended-stack)
6. [Data model](#6-data-model)
7. [API endpoints](#7-api-endpoints)
8. [Test engine (critical)](#8-test-engine-critical)
9. [Payments, coupons, referrals, credits](#9-payments-coupons-referrals-credits)
10. [Admin panel and roles](#10-admin-panel-and-roles)
11. [Notifications](#11-notifications)
12. [AI paper extraction (Claude API)](#12-ai-paper-extraction-claude-api)
13. [Security checklist](#13-security-checklist)
14. [Legal and compliance](#14-legal-and-compliance)
15. [Non-functional requirements](#15-non-functional-requirements)
16. [Build plan and milestones](#16-build-plan-and-milestones)
17. [Placeholders Studyverse must supply](#17-placeholders-studyverse-must-supply)
18. [Open decisions](#18-open-decisions)
19. [Phase 2 (not now)](#19-phase-2-not-now)

---

## 0. How to use this package

| File | What it is |
|---|---|
| `testverse-home.html` | Public homepage |
| `checkout.html` | Sign-up + student details + payment with coupon / referral / credits |
| `student-home.html` | Student dashboard after login |
| `test.html` | Test engine: instructions → CBT exam → result & analysis |
| `admin.html` | Admin panel |
| `testverse-logo-horizontal-on-navy.svg` | Logo for navy backgrounds (all headers) |
| `testverse-logo-horizontal-on-white.svg` | Logo for white backgrounds (invoices, emails, PDFs) |
| `testverse-app-icon.svg` | App icon / favicon (export PNG 512, 192, 180, 32) |
| `TESTVERSE-DEVELOPER-HANDOVER.md` | This document |

**To run the prototypes:** open any HTML file directly in Chrome. They need no server. They use sample data and save changes in the browser's localStorage, so try everything freely.

| Try this | To see |
|---|---|
| `student-home.html` | Demo bar at the bottom switches between course (LMS) student, direct student, and new student who hasn't bought |
| `test.html?test=P4` | NEET demo paper (12 questions, English/Hindi) |
| `test.html?test=JA1` | JEE Advanced demo: multiple-correct with partial marking, integer, numerical, single, matching |
| `test.html?test=P4&view=result` | Result & analysis directly (sample attempt) |
| `test.html?test=P4&retake=1` | Take the demo again after submitting |
| `checkout.html?exam=neet&ref=ABCD1234` | Referral code pre-applied |
| `checkout.html?coupon=LAUNCH20` | Coupon pre-applied (demo codes: `LAUNCH20`, `RANKER100`, `DIWALI25` = expired) |
| `testverse-home.html?ref=RIYA4821` | Referral banner on the homepage |
| `admin.html` | Every admin section; "Reset demo data" restores samples |

**Code comments marked `REAL APP:`** show exactly where the server must take over: saving answers, creating attempts, scoring, sending reports and requests.

**Design system:**
- Navy `#16294A` (light variant `#1F3961`), gold `#F2C14E`, blue `#3D4FD9`, green `#1E7A46`.
- Fonts: Lexend (headings), IBM Plex Sans (body), Noto Sans Devanagari (Hindi).
- Light and dark mode via `prefers-color-scheme`. Mobile-first.
- Keep these exactly; all colours are CSS variables at the top of each file.

**Ignore** any older design canvas screens that show DPPs, question-bank practice, or a Direct/LMS toggle. Those plans were replaced by this document.

---

## 1. Product in one page

**Testverse** is an online test platform for **NEET, JEE Main and JEE Advanced**, run by Studyverse.

**Phase 1 (this build) offers only tests:**
1. **All-India live tests:** a fixed date and time for everyone, free, with an all-India rank.
2. **Paid test series:** per exam, **11 tests: 6 part tests → 3 half-syllabus tests → 2 full-syllabus tests**, taken any time.
3. **Assigned tests:** papers the Studyverse team publishes to one student, a group, or all students of an exam. Individual and group targeting is for **Studyverse course (LMS) students only**.

Every test runs on an **NTA-style CBT screen** and ends with **detailed analysis and solutions**.

**Supporting features:**
- Coupons, referrals and credits at checkout
- Video solution requests (from a test question or a photo), answered with a YouTube link
- A link to the Studyverse YouTube video library
- A parent progress link via WhatsApp
- "Report a problem" on any question
- An admin panel for running everything

**Users:**

| User | How they arrive | What differs |
|---|---|---|
| Direct student | Signs up on Testverse | Standard app |
| Course (LMS) student | Opens Testverse from the Studyverse LMS, already signed in (same account) | Also gets assigned tests and a higher video-request limit; parents get the LMS Sunday report |
| Admin / staff | Admin panel | Roles: admin, content, support |

---

## 2. Business rules (decided)

### Accounts
- **One Studyverse account across the LMS and Testverse.** No second sign-up for LMS students.
- **Sign-in:** phone OTP or Google.
- **Details collected at checkout:**
  - full name as on the exam admit card
  - date of birth, email, class (11 / 12 / dropper), exam year
  - state, city
  - parent/guardian name and mobile
  - current school/coaching (optional)
  - agreement to Terms and Privacy (required)
  - "contact me after my exam result" (optional)
- **Under 18** (calculated from date of birth): parental consent by OTP to the parent's mobile.

### Tests
- **Live tests are free for all signed-in users**, including those who haven't bought anything.
  - Default entry window: **30 minutes** (set per test in admin).
  - Only attempts **started inside the window** count for all-India rank.
  - Later attempts get a practice score with no rank.
- **The test series is paid per exam.** All published tests in the series are open at once, in any order. Tests published later appear automatically for buyers.
- **Series positions are fixed:** Part 1–6, Half 1–3, Full 1–2 per exam. One test per position.
- **Assigned tests** have an audience (individual students / groups / all students of an exam), plus an optional "opens at" and "due by".
- **One attempt per test per student**, unless admin enables retakes (open decision, §18).
- **NTA rule:** "answered and marked for review" is evaluated; "marked" with no answer is not.

### Money
- **The price is per exam series,** set in admin. Live tests are free.
- **One code per order:** either a **coupon** or a **friend's referral code**, never both.
- **Credits** can be used on top of a code. Credits can't make the total negative. If the total is ₹0, skip the payment gateway.
- **Coupons:**
  - % or ₹ off
  - which exam (or all)
  - expiry date
  - total usage limit
  - on/off switch
  - code is 3–20 letters/digits, stored uppercase
- **Referral codes:**
  - A student gets one after their **first purchase**.
  - The friend gets a discount; the referrer gets credits **only after the friend's payment succeeds**.
  - A student can't use their own code.
  - The maximum number of rewarded referrals per student is set in admin.
- **Admin can add or remove credits** for any student, with a reason shown to the student.

### Video solutions
- The "Video library" link opens the Studyverse YouTube channel, or a per-exam playlist if set in admin.
- **Requests come from:**
  - (a) one tap on a question in the test result page, sending that question; or
  - (b) a photo of any question, with subject, optional chapter and note.
- **Weekly limit per student,** different for LMS and direct students (defaults 10 / 3). Promised reply time is shown to the student (default 48 h). **Declined requests don't count** against the limit.
- **Admin workflow:** New → Recording → Sent (YouTube link, students notified) or Declined (reason sent). Identical requests are merged ("12 students asked"); most-asked first.

### Reports
- "Report a problem" on any question in the result page. Reasons: wrong answer key, mistake in question, wrong/unclear solution, diagram missing, out of syllabus.
- **3+ open reports** on a question auto-hide it from new tests until reviewed (setting).
- **Fixing an answer key re-scores every attempt** containing that question and notifies affected students.

---

## 3. Pages: built prototypes

### 3.1 Homepage — `testverse-home.html`
Public, SEO-indexable.

**Sections in order:**
1. **Header:** logo, links (Test plan, Why Testverse, Analysis, Refer & earn, For parents), Log in, Sign up; mobile menu.
2. **Referral banner:** shown only when the URL has `?ref=CODE`. The code is passed on to checkout.
3. **Hero:**
   - **Exam switch** (NEET / JEE Main / JEE Advanced). **Nothing exam-specific shows until an exam is chosen.** The choice is remembered (localStorage) and can be linked as `#neet`, `#jee-main`, `#jee-advanced`.
   - Headline and copy, CTAs "Get the test series" and "See what's included".
   - **Live test card:** "Which exam?" picker, then the next live test with a countdown and upcoming list.
4. **Why students choose Testverse:** 4 points.
5. **Your test plan:** the 6 / 3 / 2 track for the chosen exam, test sizes, price, and "Get the test series".
6. **CBT screen illustration** (subject tabs per exam).
7. **Analysis section** with a sample result.
8. **How it works:** 4 steps.
9. **Invite friends, earn credits.**
10. **For parents** and **Want a teacher too?** (links to Studyverse courses).
11. **FAQ.**
12. **Final call to action.**
13. **Footer:** links and the YouTube video library.

**Data the real page must load:**
- exams (labels, patterns, part-test size, price, on sale)
- live tests (next 3 per exam)
- referral amounts
- website settings (announcement, FAQ, YouTube links)

In the prototype these live in one `EXAMS` block in the script.

### 3.2 Checkout — `checkout.html`
**Steps:**
1. **Account:** Google or mobile OTP.
2. **About you:** fields per §2. Shows a parent-consent notice when under 18.
3. **Exam:** what's included.

**Order summary:**
- price; Coupon / Referral tab (one code)
- clear errors: invalid, expired, own code
- "Use my credits" toggle
- live total; Pay button, or "Get it free" at ₹0

**Success screen:** the student's referral code, Copy link, Share on WhatsApp.

URL params `exam`, `ref`, `coupon` pre-fill. **All validation is repeated on the server (§9).**

### 3.3 Student home — `student-home.html`
**Top bar:**
- logo; nav (Home, My test series, Live tests, Results, Video solutions)
- credits chip, notifications
- profile menu (profile, credits & referrals, orders & invoices, share with parent, help, log out)

**Announcement strip** (from admin, dismissible).

**Main column:**
1. **Greeting + stats:** series tests done, best all-India rank, last accuracy.
2. **Live tests:**
   - **"Live now"** card with Start, and a countdown to entry closing; or
   - **"Next live test"** with a countdown and Register.
   - **Upcoming** list with one-tap Register.
3. **Assigned to you** (LMS students only), with due dates.
4. **My [exam] test series:** 11 tiles with progress. Tile states:
   - **done** (score → result)
   - **in progress** (Resume + time left)
   - **suggested next**
   - **available**
   - **coming soon** (not yet published)
   - **locked** (not bought → "Get the test series")
5. **Recent results:** score, accuracy, rank, View analysis.
6. **Performance:** score trend, accuracy by subject, chapters losing most marks.

**Side column:**
- **Video solutions:** request with photo (limit shown), my requests with status and "Watch video", YouTube library.
- **Refer & earn:** code, copy, WhatsApp share, credits.
- **Share progress with parent** (WhatsApp link). LMS students are reminded about the Sunday report.
- **Want a teacher too?** (not shown to LMS students), with a data-based message.

**Footer:** Terms, Privacy, Refund policy, Contact.

### 3.4 Test engine — `test.html`
One page, three views.

**Instructions**
- Test facts; marking table generated from the paper.
- Rules and palette legend; language choice.
- Internet check; "I have read" checkbox; Start.
- **Resume** (with the real time left) if an attempt is open.

**Exam**
- **Top bar:** candidate name and roll, timer (orange ≤ 5 min, red ≤ 1 min, auto-submit at 0), save state ("Saved" / "Offline · saved on this device"), language EN/हिंदी, text size A− / A+.
- **Section tabs.**
- **Question area:** all 6 types (single, multiple, integer, numerical with on-screen keypad, assertion–reason, match the following), formulas via KaTeX.
- **Buttons:** Save & next, Mark for review & next, Clear response, Back.
- **Palette** with 5 states and counts. On mobile it's a bottom sheet.
- **Submit confirmation** with a section summary.
- **Integrity:** copy and right-click blocked; tab/app switches counted and shown.
- **Keyboard shortcuts:** 1–4 / A–D choose, N next, P previous, M mark.

**Result**
- **KPIs:** score, accuracy, attempted, correct/wrong/partial, time used.
- **Section-wise bars.**
- **"What to work on":** weakest chapter, negative marks, fast wrong answers (< 30 s), slow wrong answers (> 3 min), average time, unanswered count.
- **Chapter-wise table.**
- **Question review** with filters (All / Wrong / Skipped / Correct / Marked): question, your answer, correct answer, marks, time, solution, **Request video solution**, **Report a problem**.
- Live tests show "rank will be published at …".

**`scoreQuestion()` and `computeResult()` in this file are the exact scoring rules. Move them to the server unchanged (§8.5).**

### 3.5 Admin — `admin.html`

| Section | Contents |
|---|---|
| **Dashboard** | Counts; "needs attention" with Fix buttons (series incomplete, answers missing, live test without file, overdue video requests); upcoming live tests with "Change date" |
| **Tests** | All tests with filters (exam, type). Columns: test, exam, type, **given to**, questions, duration, status. Actions: Edit / Publish / Unpublish / Delete |
| **Upload a test** (wizard) | **1. Details:** exam, type (part / half / full / live / assigned), series position (taken positions blocked), title, syllabus, questions, duration; live: start, entry window, rank publish time; assigned: audience + opens + due. **2. Files:** question paper (Word / PDF / QB JSON; JSON is actually parsed and counted), solutions. **3. Review:** checks; **can't publish with missing answers** (draft only); notify students |
| **Live tests** | Calendar; change date / window / rank time, with "notify registered students" |
| **Test series** | Per exam: 11 positions filled or empty, upload into a position; price and "on sale" |
| **Exams & patterns** | Questions, duration, marks, +/− marking, sections, part-test size per exam |
| **Coupons & referrals** | Coupon list + create/edit/on-off; referral settings; manual credits |
| **Video requests** | Queue with filters; merged requests; Start recording; Add YouTube link & send; Decline with reason; rules (limits, reply time) |
| **Students & groups** | Groups (create/edit/delete from LMS students); students list with LMS/Direct, bought, tests, credits; search; CSV export |
| **Website info** | Announcement strip, YouTube channel + per-exam playlists, FAQ editor; shows the automatic values (price, next live test, referral offer) |

---

## 4. Pages: still to build

Follow the same design system. Build each as a real page.

**Student**

| Page | Must include |
|---|---|
| **Log in** (returning users) | Phone OTP, Google, "new here? Get the test series" |
| **Profile** | Details from checkout (editable except name and date of birth after first test), exam, language preference, delete account |
| **Credits & referrals** | Balance, ledger (earned / used / admin adjustments with reasons), referral code, list of referred friends and rewards |
| **Orders & invoices** | Orders with status; downloadable GST invoice PDF (white logo) |
| **My video requests** | All requests with status, photo, note, link when ready, decline reason |
| **Live test rank list** | After results: top 100 with names masked (e.g. "Riya S."), student's own rank highlighted, score distribution |
| **Parent progress page** (from WhatsApp link, no login) | Last 4 weeks: tests taken, scores, all-India rank, subjects needing attention; English/Hindi; "Book free diagnostic" / "Ask on WhatsApp"; student can switch the link off. Token-based, unguessable, revocable |
| **Payment success / failure** | Success → series unlocked → "Start Part Test 1"; failure → retry, no charge message |
| **Notifications page** | Full list (bell shows recent) |

**Public**
- Terms, Privacy Policy, **Refund Policy**, Contact. Required by the payment gateway.
- Per-exam landing pages are optional, for SEO.

**Admin**

| Page | Must include |
|---|---|
| **Admin login** | Email + password + OTP / 2FA |
| **Question review** | After upload or AI extraction: each question with editable text / options / answer / solution / tags / difficulty, diagram crop preview, approve one by one or all |
| **Results per test** | Attempts, average, distribution, per-question accuracy (flags bad questions), export |
| **Orders & refunds** | Search orders, refund via gateway, resend receipt |
| **Reported questions** | Queue: question, reason, count, status; Fix (opens question editor) / Dismiss; fixing re-scores |
| **Attempt integrity** | Per test: tab switches, multiple devices, very fast completion; view attempt timeline |
| **Staff & roles** | Invite staff, assign roles |

---

## 5. Recommended stack

Fits the existing Studyverse Firebase data and a small team. Equivalent tools are fine.

| Need | Recommendation |
|---|---|
| Front end | React (Next.js) or plain HTML/JS from the prototypes; mobile-first web app (PWA). Native apps later if needed |
| Auth | Firebase Auth (phone OTP + Google), **shared with the LMS** so it's one account |
| Database | Firestore |
| Server logic | Cloud Functions (or Node/Express on Cloud Run). **Scoring, pricing and access checks only here** |
| Files | Firebase Storage (question images, papers, request photos, invoices) |
| Scheduled jobs | Cloud Scheduler: auto-submit, live ranks, reminders, coupon expiry |
| Payments | Razorpay (UPI, cards, net banking), server orders + webhook |
| SMS / WhatsApp | MSG91, Gupshup or the WhatsApp Business API (templates need approval) |
| Formulas | KaTeX |
| AI extraction | Claude API (§12) |
| Monitoring | Error tracking (e.g. Sentry), uptime checks, load-test before the first live test |

---

## 6. Data model

All documents also have `createdAt`, `updatedAt`, `createdBy`.

```text
users/{uid}
  name, phone, email, dob, class, examYear, state, city,
  parentName, parentPhone, currentInstitute, language: "en" | "hi",
  exam: "neet" | "jee-main" | "jee-advanced",
  access: "lms" | "direct", lmsStudentId,
  referralCode, referredBy,
  consents: { terms: ts, privacy: ts, parent: { phone, verifiedAt } | null, resultContact: bool },
  roles: ["student"] | ["admin" | "content" | "support"],
  parentLink: { token, active }

exams/{examId}
  label, questions, minutes, marks, correct, wrong, sections[],
  partQuestions, partMinutes, price, onSale

questions/{qid}                                   // the question bank
  examTags[], subject, chapter, topic, subTopic,
  type: "single" | "multiple" | "integer" | "numerical" | "ar" | "match",
  text { en, hi? }, options [{ en, hi? }],
  assertion { en, hi? }, reason { en, hi? }, list1[], list2[],
  answer,          // single/ar/match: index; multiple: [indexes]; integer/numerical: number
  tolerance,       // numerical only
  solution { en, hi? }, images[], videoUrl?,
  difficulty: "easy" | "medium" | "hard",
  source,          // "NEET 2023" | "Studyverse Part Test 3"
  status: "draft" | "live" | "hidden",
  stats { attempts, correctPct, avgTimeMs, openReports }

tests/{testId}
  exam, kind: "part" | "half" | "full" | "live" | "assigned",
  slot,            // 1–6 / 1–3 / 1–2 for series; unique per exam + kind
  title, chapters, durationMin, languages[],
  status: "draft" | "published" | "scheduled",
  sections: [{ name, questionIds[], marks { correct, wrong, partial? } }],
  // live
  start, entryWindowMin, resultAt, registrations (count),
  // assigned
  audience { type: "all" | "groups" | "students", groupIds[], studentIds[] }, opens, due,
  sourceFiles { paper, solutions }

liveRegistrations/{testId_uid}      testId, uid, at
purchases/{uid_exam}                uid, exam, orderId, at          // grants series access

attempts/{attemptId}
  uid, testId, startedAt, deadline, submittedAt, autoSubmitted,
  isLiveWindow, current, lang, tabSwitches, devices[], ip,
  responses: { [qid]: { answer, marked, visited, timeMs, updatedAt } },
  result {
    total, max, correct, wrong, partial, skipped, negative,
    sections: { [name]: { marks, max, correct, wrong, partial, skipped, time } },
    chapters: { [name]: { right, n, lost } },
    perQuestion: { [qid]: { status, marks } },
    rank, rankOf, publishedAt
  }

groups/{groupId}                    name, studentIds[]
orders/{orderId}                    uid, exam, price, code { type: "coupon" | "referral", code, discount },
                                    creditsUsed, total, gatewayOrderId, gatewayPaymentId,
                                    status: "created" | "paid" | "failed" | "refunded", invoiceNo
coupons/{CODE}                      type: "percent" | "flat", value, exam | "all",
                                    expires, limit, used, active
referrals/{id}                      referrerUid, friendUid, orderId, discount, credit,
                                    status: "pending" | "rewarded" | "reversed"
creditLedger/{id}                   uid, amount (+/−), reason, orderId?, adminUid?
videoRequests/{id}                  source: "test" | "photo", testId?, questionId?, photoUrl?,
                                    extractedText, subject, chapter, note, exam,
                                    askers [{ uid, at }], status: "new" | "progress" | "done" | "declined",
                                    link, declineReason, mergedInto?
reports/{id}                        uid, testId, questionId, reason, note,
                                    status: "open" | "fixed" | "dismissed"
notifications/{id}                  uid, type, text, link, read, at
settings/website                    announcement, showAnnouncement, faqs[{ q, a }],
                                    youtube { channel, playlists { neet, jee-main, jee-advanced } }
settings/video                      limitDirect, limitLms, hours
settings/referral                   enabled, friendDiscount, referrerCredit, maxPerStudent
auditLog/{id}                       adminUid, action, target, before, after, at
```

**Rules**
- **Tests reference question IDs,** never copies. Every upload adds its questions to `questions`, so the bank grows automatically.
- **Credits balance = sum of `creditLedger`** for the user. Cache it on the user, but the ledger is the truth.
- **Answers and solutions are never readable by students before they submit.** Use separate collections or server-only fields, enforced by security rules.

---

## 7. API endpoints

All require auth unless noted. Admin endpoints check roles.

**Public / student**

| Method | Path | Purpose |
|---|---|---|
| GET | `/public/home?exam=` | Exams, prices, next live tests, referral amounts, website settings (no auth) |
| POST | `/auth/profile` | Save checkout details; trigger parent OTP if under 18 |
| POST | `/auth/parent-consent/verify` | Verify parent OTP |
| GET | `/me/home` | Everything the student home needs in one call |
| POST | `/live/:testId/register` | Register for a live test |
| POST | `/orders/quote` | Price preview for `{exam, code?, useCredits}`; returns lines and errors |
| POST | `/orders` | Create the order and gateway order (re-validates everything) |
| POST | `/payments/webhook` | Gateway webhook (signature verified; no auth) |
| POST | `/attempts` | Start or resume an attempt `{testId}` → paper without answers, `deadline`, `serverNow` |
| PUT | `/attempts/:id/responses/:qid` | Save `{answer, marked, timeMs}` |
| POST | `/attempts/:id/events` | `{type: "tab_switch", at}` |
| POST | `/attempts/:id/submit` | Submit → result with answers and solutions |
| GET | `/attempts/:id/result` | Result (after submit; rank when published) |
| GET | `/live/:testId/ranks` | Rank list (after publish) |
| POST | `/reports` | Report a problem |
| POST | `/video-requests` | `{source, testId?, questionId?, photo?, subject, chapter?, note?}` (checks weekly limit) |
| GET | `/me/video-requests` | My requests |
| GET | `/me/credits`, `/me/referrals`, `/me/orders` | Wallet, referrals, orders and invoices |
| POST | `/me/parent-link` / `DELETE` | Create / turn off parent link |
| GET | `/p/:token` | Parent progress data (no auth; token only) |

**Admin**

| Method | Path | Purpose |
|---|---|---|
| CRUD | `/admin/tests` | Create / edit / publish / unpublish / delete; series-position uniqueness |
| POST | `/admin/tests/:id/upload` | Upload paper / solutions → extraction job |
| GET / PUT | `/admin/questions/:id` | Review and edit; answer change triggers re-score |
| PUT | `/admin/live/:id/schedule` | Change date / window / result time `{notify}` |
| CRUD | `/admin/exams`, `/admin/coupons`, `/admin/groups` | Patterns and prices, coupons, groups |
| PUT | `/admin/settings/{website,video,referral}` | Settings |
| POST | `/admin/credits` | `{uid, amount, reason}` |
| GET / PUT | `/admin/video-requests/:id` | Status, link, decline reason, merge |
| GET / PUT | `/admin/reports/:id` | Fix / dismiss |
| GET | `/admin/students`, `/admin/orders`, `/admin/results/:testId` | Lists and exports |
| POST | `/admin/orders/:id/refund` | Refund via gateway |

---

## 8. Test engine (critical)

### 8.1 Start / resume
`POST /attempts {testId}`:

1. **Check access:**
   - **series:** a `purchases/{uid_exam}` record exists and the test is published;
   - **live:** the user is registered (or auto-register), and now is ≥ `start` (inside the window → `isLiveWindow = true`; after the window → practice attempt);
   - **assigned:** the user is in the audience and now ≥ `opens`.
2. **If an unsubmitted attempt exists, return it.** Return the result if already submitted (unless retakes are allowed).
3. **Create the attempt:**
   - series / assigned: `deadline = startedAt + duration`;
   - live: `deadline = start + entryWindow + duration`, capped at `startedAt + duration`. Confirm with Studyverse (§18).
4. **Return** the paper (questions without `answer` / `solution`), `deadline`, `serverNow`, saved responses, `current`, `lang`.

### 8.2 Timer
- Client: `clockOffset = serverNow − Date.now()` at load; `timeLeft = deadline − (Date.now() + clockOffset)`. **Never count down a stored variable.** The prototype computes from start + duration the same way.
- Server rejects saves after `deadline + 30 s` grace.
- **A scheduled job every minute auto-submits** attempts past `deadline + grace`.

### 8.3 Saving answers
- Debounce about 400 ms after a change; also save on every navigation and on `visibilitychange` / `beforeunload`.
- Offline: queue in IndexedDB, retry with backoff, show "Offline · saved on this device"; send the queue before submit.
- Idempotent: the last write per question wins, by `updatedAt`.

### 8.4 Submit
`POST /attempts/:id/submit` (the auto-submit job calls the same function):
1. Flush the queue.
2. Score.
3. Save `result`.
4. Return the result with answers and solutions.
5. Update `questions.stats`.

### 8.5 Scoring (copy from `test.html → scoreQuestion`)

| Type | Rule |
|---|---|
| `single`, `ar`, `match` | `answer === key` → `marks.correct`, else `marks.wrong` |
| `integer` | `Number(answer) === key` → correct, else wrong |
| `numerical` | `abs(Number(answer) − key) ≤ tolerance` → correct, else wrong |
| `multiple` | any chosen option not in key → `marks.wrong` (e.g. −2); all key options chosen → `marks.correct` (e.g. +4); otherwise, if `marks.partial`, **+1 per chosen correct option** |
| not answered | 0 (a marked question with no answer = not answered) |

**Default marks:**
- NEET: +4 / −1.
- JEE Main: MCQ +4 / −1; numerical per the current pattern, set per test.
- JEE Advanced: varies by year; set per section in admin.

### 8.6 Live tests and rank
- **Registration:** reminders at 24 h and 1 h before; a "Live now" notification at start.
- **When `start + entryWindow + duration + grace` has passed,** a job ranks all `isLiveWindow` attempts:
  - by `total` descending;
  - ties broken by fewer wrong answers, then less time used;
  - writes `rank` and `rankOf`.
- **At `resultAt`,** results and the rank list are published and everyone is notified.

### 8.7 Answer key corrections
Admin edits an answer:
1. Re-score all affected attempts.
2. Recompute ranks for affected live tests.
3. Notify students whose score changed.
4. Resolve related reports and notify the reporters.

### 8.8 Integrity
- Never send answers or solutions before submit; enforce with database rules, not just the UI.
- Record tab/app switches, device and IP. Flag the same attempt opened on two devices; optionally block the second device.
- Copy and right-click blocked inside the exam (prototype does this).
- Admin "Attempt integrity" page lists flags. No automatic disqualification in phase 1.

---

## 9. Payments, coupons, referrals, credits

**Flow**
1. Checkout calls `POST /orders/quote` on every change, so the UI shows server-calculated lines.
2. `POST /orders` recalculates everything, then:
   - **price:** from `exams/{exam}.price`; reject if `onSale` is false;
   - **coupon:** exists, active, not expired, `used < limit`, exam matches;
   - **or referral code:** belongs to a student who has bought, isn't the user's own, the user has no previous purchase (first purchase only), and the referrer is under `maxPerStudent`;
   - **credits:** `min(balance, remaining)`;
   - **total:** if ₹0, grant immediately; otherwise create the gateway order.
3. **Webhook `payment.captured`:** verify the signature, then in **one transaction**:
   - set the order to `paid`;
   - create `purchases/{uid_exam}`;
   - increment `coupons.used`;
   - write ledger entries (credits used; **referrer credit**);
   - generate the referral code for the buyer if they don't have one;
   - issue the GST invoice;
   - send the receipt.
4. **Failure / timeout:** the order stays `created`; any reserved credits are released; the student sees a failure page and can retry.
5. **Refund (admin):** gateway refund; revoke the purchase; reverse the referral reward if within the refund window; write ledger entries.

**Never trust prices, discounts or totals from the browser.**

---

## 10. Admin panel and roles

| Role | Can do |
|---|---|
| `admin` | Everything, including prices, coupons, referral settings, credits, staff |
| `content` | Tests, questions, uploads, live schedule, video requests, reports |
| `support` | Students, groups, orders (view), resend receipts, credits (with reason) |

- **Every admin change is written to `auditLog`.**
- **Upload rules:**
  - one test per series position per exam;
  - publishing is blocked if any question lacks an answer;
  - a live test needs a paper before it can be scheduled.
- **Assigned-test audiences are checked on the server** on every read.
- **Changing a live test date** notifies registered students when "notify" is ticked.
- **Website info** feeds the homepage. Prices, the live countdown and referral amounts come from their own collections, so nothing is entered twice.

---

## 11. Notifications

Send in-app always. WhatsApp/SMS where marked (✓). WhatsApp needs approved templates.

| Trigger | To | WhatsApp/SMS |
|---|---|---|
| Payment success (receipt + "Start Part Test 1") | Student | ✓ |
| Payment failed | Student | |
| Live test registered | Student | |
| Live test reminder 24 h / 1 h, "Live now" | Registered | ✓ |
| Live test date changed | Registered | ✓ |
| Live results and rank published | Participants | ✓ |
| Assigned test published / due tomorrow | Audience | ✓ |
| Video ready (link) / declined (reason) | All askers | ✓ |
| Report reviewed / score corrected | Reporter / affected | |
| Referral reward credited | Referrer | ✓ |
| Credits adjusted by admin | Student | |
| Parent consent OTP | Parent | ✓ (SMS) |

---

## 12. AI paper extraction (Claude API)

**Purpose:** turn photos or PDFs of question papers into structured questions, saving manual typing. **A teacher always reviews before publishing.**

**Flow**
1. Admin uploads a PDF or images.
2. The server splits it into page images.
3. For each page, call the Claude API with:
   - **model:** `claude-sonnet-5-5`; use Opus 5.5 only to retry pages that fail checks;
   - **system prompt:** the JSON schema below, the exam's master syllabus list (fixed chapter / topic names), and rules: LaTeX between `$…$`, keep Hindi if present, `null` for anything unreadable, never guess an answer key.
4. Validate the JSON. Crop diagrams using the returned boxes; store them in Storage.
5. Show everything in **Admin → Question review**, then save to `questions` and attach to the test.

**Output schema per page**
```json
{
  "questions": [
    {
      "number": "12",
      "type": "single | multiple | integer | numerical | ar | match",
      "text": "…", "options": ["…", "…", "…", "…"],
      "assertion": null, "reason": null, "list1": null, "list2": null,
      "answer": 2, "answerSource": "key on page | not found",
      "subject": "Physics", "chapter": "…", "topic": "…",
      "difficulty": "easy | medium | hard",
      "diagram": { "present": true, "box": [x, y, w, h] },
      "confidence": 0.0
    }
  ]
}
```

**Also use Claude for:**
- reading **video-request photos** (text, chapter, finding a duplicate of an existing request or question);
- **tagging** existing questions;
- **drafting solutions** for teachers to check.

**Cost** (Sonnet 5.5 at $2 input / $10 output per million tokens):
- about ₹3–4 per page;
- about ₹80–100 per full 180-question paper, or ₹150–200 with solutions;
- **the Batch API halves this** for non-urgent work.

Check https://platform.claude.com/docs/en/about-claude/pricing before budgeting.

---

## 13. Security checklist

- [ ] Database security rules: students read only their own user, attempts, orders, credits, requests; **never** `questions.answer` / `solution` for unsubmitted attempts
- [ ] All prices, discounts, scores, ranks and access decisions computed on the server
- [ ] Payment webhook signature verification; idempotent processing
- [ ] Rate limits: OTP, coupon tries (e.g. 10 / hour), video requests, reports
- [ ] Admin: 2FA, roles, audit log
- [ ] Parent link: random 32+ character token, revocable, shows no phone or email
- [ ] File uploads: images/PDF only, size limits (10 MB photo, 50 MB paper), virus scan if available
- [ ] HTTPS everywhere; secure cookies; CSRF protection on forms
- [ ] Backups and point-in-time recovery for the database
- [ ] Load test: the first live test may have thousands of students starting in the same minute

---

## 14. Legal and compliance

- **Before going live with payments:** Terms, Privacy Policy, Refund Policy, Contact page, GST invoices.
- **Children's data (DPDP Act, India):** most students are under 18 → **verifiable parental consent** (OTP to the parent's mobile, stored with a timestamp). Collect only what's needed; allow account deletion. **Confirm the exact requirements with a lawyer.**
- **Advertising toppers (CCPA coaching guidelines, 2024):** use a student's name, photo or rank only with **written consent taken after the result**, and state the course taken (e.g. "Testverse NEET Test Series, 11 online tests, paid"). Keep the consent record.
- **WhatsApp:** use approved templates and get students' / parents' opt-in.

---

## 15. Non-functional requirements

- **Mobile-first:** most students use Android phones on mobile data. Test page under 300 KB before images; works on 3G; pages load in under 3 s on a mid-range phone.
- **Live test scale:** design for **5,000 students** starting within 5 minutes. Batch and debounce saves; avoid hot documents (don't keep a counter on the test document updated per answer).
- **Uptime:** no deployments during live tests; status alerts.
- **Accessibility:** keyboard use, labels on all controls, 44 px touch targets, contrast at least 4.5:1 (prototypes follow this).
- **Languages:** English and Hindi for questions (per question); interface in English for now.
- **Time zone:** Asia/Kolkata everywhere; store UTC.

---

## 16. Build plan and milestones

Estimate for **one experienced full-stack developer**. Two developers in parallel take roughly 60%.

| # | Milestone | Done when | Time |
|---|---|---|---|
| 1 | Accounts + data + admin core | OTP/Google login, shared LMS account, profile, exams, tests, questions, admin login + roles, upload wizard saving real data | 2 weeks |
| 2 | **Test engine** | Start/resume, server timer, autosave + offline queue, auto-submit job, scoring, result page with solutions, reports | 3 weeks |
| 3 | Payments + series access | Quote/order, Razorpay, webhook, purchase grants access, invoices, success/failure pages, policy pages | 1.5 weeks |
| 4 | Live tests | Registration, entry window, rank job, publish, rank list, reminders | 1 week |
| 5 | Student home on real data | All sections in §3.3 | 1 week |
| — | **First launch** (milestones 1–5) | **~8 weeks** | |
| 6 | Coupons, referrals, credits | Rules in §9, admin screens, wallet page | 1 week |
| 7 | Assigned tests + groups | Audience checks, due dates, notifications | 0.5 week |
| 8 | Video requests + YouTube | Student form, admin queue, merge, notifications | 1 week |
| 9 | Parent link, rank list polish, integrity page | | 1 week |
| 10 | AI extraction + question review | §12 | 1.5 weeks |
| — | **Everything** | **~13 weeks** | |

Run a **closed beta live test** with Studyverse course students before the first public live test.

---

## 17. Placeholders Studyverse must supply

| Item | Where |
|---|---|
| Series price per exam | Admin → Test series; homepage `[PRICE]` |
| Referral discount and referrer credit | Admin → Coupons & referrals; homepage `[REFERRAL DISCOUNT]`, `[REFERRAL CREDIT]` |
| Part-test size and duration per exam | Admin → Exams & patterns; homepage `[N] questions, [time]` |
| Live test calendar | Admin → Live tests (homepage dates are examples) |
| Faculty credential line | Homepage "Why students choose Testverse" `[with X+ years …]` |
| YouTube channel and playlists | Admin → Website info (`@[your-channel]`) |
| Domain (e.g. testverse.in), trademark check | Hosting, links, referral URLs |
| Razorpay account + KYC | Payments |
| SMS / WhatsApp provider + templates | Notifications |
| Terms, Privacy, Refund policy text | Legal pages |
| GSTIN and invoice details | Invoices |
| JEE Advanced pattern for the current year | Admin → Exams & patterns |

---

## 18. Open decisions

Confirm these with Studyverse before building the related part:

1. **Live test end time:** does everyone end at the same time (NTA style), or does each student get the full duration from their own start within the window? *Recommended: fixed end time.*
2. **Retakes:** can a student retake a series test after submitting, for practice only (first attempt counts)? *Recommended: allowed after 7 days, practice only.*
3. **Refund policy:** e.g. full refund within 7 days if no test has been attempted.
4. **Video request limits and reply time:** defaults 10 / 3 per week, 48 h.
5. **Series validity:** until the exam date of the chosen year, or 12 months?
6. **Live tests for logged-out visitors:** must they sign up first? *Recommended: yes, free sign-up.*

---

## 19. Phase 2 (not now)

Design the data model so these are easy later. It already supports them.

- **Question bank practice:** topic practice, PYQs by year/chapter, custom tests, My Mistakes, bookmarks.
- **Personalised papers** for each student from weak topics (after 100+ LMS students).
- **Personal schedule:** series tests unlocking from each student's enrolment date.
- **Predicted percentile / rank** once enough live-test data exists.
- **Daily goal, streak, leaderboard.**
- **Native Android app.**
