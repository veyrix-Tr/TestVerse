// lib/paperCache.js
// A question paper doesn't change while students write it, so each server
// keeps it in memory instead of reading it (~100 KB) from the database on every
// autosave, submit and page open. An admin edit changes the test's updatedAt,
// which makes the next read load the new copy. When many students arrive at
// once, they share one database read.

const prisma = require('./prisma');

const cache = new Map(); // testId -> { at: updatedAt in ms, paper: Promise }

// The paper of `test` ({ id, updatedAt }), or null.
const paperOf = (test) => {
  const at = test.updatedAt.getTime();
  let hit = cache.get(test.id);
  if (!hit || hit.at !== at) {
    if (cache.size >= 200) cache.clear();
    hit = { at, paper: prisma.test.findUnique({ where: { id: test.id }, select: { paper: true } }).then((r) => (r ? r.paper : null)) };
    hit.paper.catch(() => cache.delete(test.id)); // a failed read is retried next time
    cache.set(test.id, hit);
  }
  return hit.paper;
};

// The test's columns students' requests use: everything but the paper (from
// paperOf) and the admin's original JSON (never needed here).
const TEST_FIELDS = {
  id: true, title: true, subject: true, exam: true, durationMin: true, instructions: true, marking: true,
  languages: true, questionCount: true, totalMarks: true, status: true, isFree: true, kind: true,
  seriesId: true, opensAt: true, closesAt: true, watermark: true, updatedAt: true,
  series: { select: { title: true } },
};

// Attaches the cached paper to a test row loaded with TEST_FIELDS.
const withPaper = async (test) => {
  if (test) test.paper = await paperOf(test);
  return test;
};

module.exports = { paperOf, withPaper, TEST_FIELDS };
