const prisma = require('../lib/prisma');

const DAY_MS  = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const DAYS    = 14;               // length of the daily chart
const IST_MS  = 5.5 * 60 * 60 * 1000; // days are counted in India time

const pct = (score, max) => (max > 0 ? Math.round((score / max) * 1000) / 10 : null);
const avg = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

// "2026-11-09" for a moment, in India time
const dayKey = (d) => new Date(new Date(d).getTime() + IST_MS).toISOString().slice(0, 10);
// Midnight (India time) of the day `n` days before today, as a Date
const istMidnight = (now, n = 0) => {
  const t = now.getTime() + IST_MS;
  return new Date(t - (t % DAY_MS) - n * DAY_MS - IST_MS);
};

const avgPct = (rows) => avg(rows.map((a) => pct(a.score, a.maxScore)).filter((p) => p != null));

const testRow = (t) => ({ id: t.id, title: t.title, kind: t.kind, exam: t.exam, isFree: t.isFree, opensAt: t.opensAt, closesAt: t.closesAt, questionCount: t.questionCount, durationMin: t.durationMin });

// GET /api/admin/overview — everything the dashboard shows, from the database
const getOverview = async (req, res) => {
  try {
    const now      = new Date();
    const weekAgo  = new Date(now.getTime() - WEEK_MS);
    const twoWeeks = new Date(now.getTime() - 2 * WEEK_MS);
    const today    = istMidnight(now);
    const chartFrom = istMidnight(now, DAYS - 1);
    const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
    const dayAhead = new Date(now.getTime() + DAY_MS);
    const student  = { role: 'student' };

    const [
      students, newWeek, newPrevWeek,
      activeSubs, pending,
      submittedToday, doneWeek, donePrevWeek,
      inProgress,
      signupRows, submitRows,
      tests, top,
      batches,
      recentUsers, recentSubs, recentAttempts,
    ] = await Promise.all([
      prisma.user.count({ where: student }),
      prisma.user.count({ where: { ...student, createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { ...student, createdAt: { gte: twoWeeks, lt: weekAgo } } }),
      prisma.subscription.findMany({ where: { status: 'active', user: student }, select: { amount: true, activatedAt: true, batch: { select: { price: true } } } }),
      prisma.subscription.count({ where: { status: 'pending', user: student } }),
      prisma.attempt.count({ where: { submittedAt: { gte: today } } }),
      prisma.attempt.findMany({ where: { submittedAt: { gte: weekAgo } }, select: { score: true, maxScore: true } }),
      prisma.attempt.findMany({ where: { submittedAt: { gte: twoWeeks, lt: weekAgo } }, select: { score: true, maxScore: true } }),
      prisma.attempt.findMany({
        where:   { submittedAt: null, deadline: { gt: now } },
        orderBy: { deadline: 'asc' },
        take:    12,
        select:  { attemptNo: true, startedAt: true, deadline: true, user: { select: { id: true, name: true } }, test: { select: { id: true, title: true } } },
      }),
      prisma.user.findMany({ where: { ...student, createdAt: { gte: chartFrom } }, select: { createdAt: true } }),
      prisma.attempt.findMany({ where: { submittedAt: { gte: chartFrom } }, select: { submittedAt: true } }),
      prisma.test.findMany({
        select: { id: true, title: true, kind: true, exam: true, isFree: true, status: true, opensAt: true, closesAt: true, questionCount: true, durationMin: true, paper: false, createdAt: true, _count: { select: { attempts: true } } },
      }),
      prisma.attempt.groupBy({ by: ['testId'], where: { submittedAt: { gte: monthAgo } }, _count: { _all: true }, orderBy: { _count: { testId: 'desc' } }, take: 5 }),
      prisma.batch.findMany({
        where:   { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select:  { id: true, name: true, exam: true, grade: true, price: true, subscriptions: { where: { user: student }, select: { status: true } } },
      }),
      prisma.user.findMany({ where: student, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, name: true, exam: true, createdAt: true } }),
      prisma.subscription.findMany({ where: { status: 'active', activatedAt: { not: null }, user: student }, orderBy: { activatedAt: 'desc' }, take: 8, select: { activatedAt: true, amount: true, user: { select: { id: true, name: true } }, batch: { select: { name: true, price: true } } } }),
      prisma.attempt.findMany({ where: { submittedAt: { not: null } }, orderBy: { submittedAt: 'desc' }, take: 8, select: { submittedAt: true, score: true, maxScore: true, attemptNo: true, autoSubmitted: true, user: { select: { id: true, name: true } }, test: { select: { id: true, title: true } } } }),
    ]);

    // Money: what each active purchase was charged, else its batch's price
    const paidAmount = (s) => (s.amount != null ? s.amount : (s.batch && s.batch.price) || 0);
    const revenue     = activeSubs.reduce((a, s) => a + paidAmount(s), 0);
    const revenueWeek = activeSubs.filter((s) => s.activatedAt && s.activatedAt >= weekAgo).reduce((a, s) => a + paidAmount(s), 0);

    // 14 days of signups and submissions, oldest first
    const daily = [];
    for (let i = DAYS - 1; i >= 0; i--) daily.push({ day: dayKey(istMidnight(now, i)), signups: 0, submissions: 0 });
    const byDay = Object.fromEntries(daily.map((d) => [d.day, d]));
    signupRows.forEach((u) => byDay[dayKey(u.createdAt)] && byDay[dayKey(u.createdAt)].signups++);
    submitRows.forEach((a) => byDay[dayKey(a.submittedAt)] && byDay[dayKey(a.submittedAt)].submissions++);

    // Tests by state
    const published = tests.filter((t) => t.status === 'published');
    const isOpen = (t) => (!t.opensAt || t.opensAt <= now) && (!t.closesAt || t.closesAt > now);
    const openNow  = published.filter((t) => t.kind !== 'series' && isOpen(t)).sort((a, b) => (a.closesAt || Infinity) - (b.closesAt || Infinity));
    const upcoming = published.filter((t) => t.opensAt && t.opensAt > now).sort((a, b) => a.opensAt - b.opensAt);

    // Most-taken tests in the last 30 days, with their average score
    const topIds = top.map((g) => g.testId);
    const topScores = topIds.length
      ? await prisma.attempt.findMany({ where: { testId: { in: topIds }, submittedAt: { gte: monthAgo } }, select: { testId: true, score: true, maxScore: true } })
      : [];
    const titleOf = Object.fromEntries(tests.map((t) => [t.id, t]));
    const topTests = top
      .filter((g) => titleOf[g.testId])
      .map((g) => ({ ...testRow(titleOf[g.testId]), attempts: g._count._all, avgPct: avgPct(topScores.filter((a) => a.testId === g.testId)) }));

    // Needs attention, most urgent first
    const attention = [];
    const closingSoon = openNow.filter((t) => t.closesAt && t.closesAt <= dayAhead);
    closingSoon.forEach((t) => attention.push({ level: 'warn', text: `${t.title} closes ${t.closesAt.toISOString()}`, at: t.closesAt, kind: 'closing', testId: t.id, view: t.kind === 'live' ? 'live' : 'free' }));
    if (pending) attention.push({ level: 'info', kind: 'pending', count: pending, view: 'students' });
    const drafts = tests.filter((t) => t.status === 'draft');
    const emptyDrafts = drafts.filter((t) => !t.questionCount);
    if (emptyDrafts.length) attention.push({ level: 'warn', kind: 'empty-drafts', count: emptyDrafts.length, view: 'free' });
    const untaken = published.filter((t) => t.kind !== 'series' && isOpen(t) && t._count.attempts === 0 && now - t.createdAt > 3 * DAY_MS);
    if (untaken.length) attention.push({ level: 'info', kind: 'untaken', count: untaken.length, titles: untaken.slice(0, 3).map((t) => t.title), view: 'free' });

    // Recent activity, newest first
    const activity = [
      ...recentUsers.map((u) => ({ type: 'signup', at: u.createdAt, student: { id: u.id, name: u.name }, exam: u.exam })),
      ...recentSubs.map((s) => ({ type: 'purchase', at: s.activatedAt, student: s.user, batch: s.batch.name, amount: paidAmount(s) })),
      ...recentAttempts.map((a) => ({ type: 'submission', at: a.submittedAt, student: a.user, test: a.test, score: a.score, maxScore: a.maxScore, pct: pct(a.score, a.maxScore), attemptNo: a.attemptNo, autoSubmitted: a.autoSubmitted })),
    ]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 12);

    res.json({
      serverNow: now,
      kpis: {
        students,
        newWeek,
        newPrevWeek,
        paid:          activeSubs.length,
        free:          students - activeSubs.length,
        pending,
        revenue,
        revenueWeek,
        submittedToday,
        submittedWeek: doneWeek.length,
        submittedPrevWeek: donePrevWeek.length,
        avgPctWeek:    avgPct(doneWeek),
        avgPctPrevWeek: avgPct(donePrevWeek),
        liveNow:       inProgress.length,
      },
      daily,
      liveNow: inProgress.map((a) => ({ student: a.user, test: a.test, attemptNo: a.attemptNo, startedAt: a.startedAt, deadline: a.deadline })),
      tests: {
        published: published.length,
        drafts:    drafts.length,
        byKind:    ['free', 'live', 'series'].map((k) => ({ kind: k, published: published.filter((t) => t.kind === k).length, total: tests.filter((t) => t.kind === k).length })),
        openNow:   openNow.slice(0, 6).map((t) => ({ ...testRow(t), attempts: t._count.attempts })),
        upcoming:  upcoming.slice(0, 6).map(testRow),
      },
      topTests,
      batches: batches.map((b) => ({
        id: b.id, name: b.name, exam: b.exam, grade: b.grade, price: b.price,
        active:  b.subscriptions.filter((s) => s.status === 'active').length,
        pending: b.subscriptions.filter((s) => s.status === 'pending').length,
      })),
      activity,
      attention,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load the overview' });
  }
};

module.exports = { getOverview };
