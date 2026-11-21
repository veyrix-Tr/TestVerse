// lib/testFiles.js — keep R2 and the tests' papers in step.
//
// Cleanup runs AFTER the database change, so the test itself no longer counts
// as using its pictures. A picture is only removed when no test's paper still
// links to it (a paper can be copied into another test). One scan of all
// papers lists every picture in use, however many pictures go. Best effort:
// a leftover file only costs a little storage, so failures are just logged.
const prisma = require('./prisma');
const { imagesOf } = require('./paperFormat');
const storage = require('./storage');

// Every picture name any test's paper links to (keys look like q/202611/<hex>.webp)
async function picturesInUse() {
  const rows = await prisma.$queryRaw`
    SELECT DISTINCT m[1] AS k
    FROM "Test", regexp_matches("paper"::text, 'q/[0-9]{6}/[0-9a-f]{32}\\.(?:webp|png|jpg)', 'g') AS m
    WHERE "paper" IS NOT NULL`;
  return new Set(rows.map((r) => r.k));
}

async function dropFiles({ images = [], solutions = [] }) {
  try {
    const keys = [...new Set(images.map(storage.imageKeyOf).filter(Boolean))];
    const used = keys.length ? await picturesInUse() : new Set();
    const c = storage.config();
    await Promise.all([storage.removeAll(c.images, keys.filter((k) => !used.has(k))), storage.removeAll(c.files, solutions.filter(Boolean))]);
  } catch (e) {
    console.error('dropFiles:', e.message);
  }
}

// After deleting tests: their pictures and solution PDFs.
const dropTestFiles = (tests) =>
  dropFiles({ images: tests.flatMap((t) => imagesOf(t.paper)), solutions: tests.map((t) => t.solutionsKey) });

// After replacing a paper: the pictures the new paper no longer uses.
const dropReplacedImages = (oldPaper, newPaper) => {
  const keep = new Set(imagesOf(newPaper));
  return dropFiles({ images: imagesOf(oldPaper).filter((u) => !keep.has(u)) });
};

// Before saving a paper: links to pictures that aren't actually uploaded
// (an upload that failed, or a stale editor tab whose pictures were since
// replaced and removed). Pictures already in the saved paper aren't re-checked.
async function missingImages(newPaper, oldPaper) {
  const had = new Set(imagesOf(oldPaper));
  const fresh = [...new Set(imagesOf(newPaper).filter((u) => !had.has(u)))];
  if (!fresh.length) return [];
  const bucket = storage.config().images;
  const missing = [];
  for (let i = 0; i < fresh.length; i += 10) {
    const batch = fresh.slice(i, i + 10);
    const sizes = await Promise.all(batch.map((u) => storage.sizeOf(bucket, storage.imageKeyOf(u)).catch(() => 0)));
    batch.forEach((u, j) => sizes[j] == null && missing.push(u));
  }
  return missing;
}

// A paper as it is sent out: every picture name swapped for a signed link
// (lib/storage.js imageLink). The saved paper keeps the names.
async function withImageLinks(paper) {
  if (!paper || !Array.isArray(paper.sections) || !storage.imagesReady()) return paper;
  const link = (v) => (storage.imageKeyOf(v) ? storage.imageLink(v) : v);
  const sections = await Promise.all(
    paper.sections.map(async (s) => ({
      ...s,
      questions: await Promise.all(
        (s.questions || []).map(async (q) => {
          if (!q.images && !(q.options || []).some((o) => o && o.image)) return q;
          const out = { ...q };
          if (q.images) out.images = await Promise.all(q.images.map(link));
          if (q.options) out.options = await Promise.all(q.options.map(async (o) => (o && o.image ? { ...o, image: await link(o.image) } : o)));
          return out;
        }),
      ),
    })),
  );
  return { ...paper, sections };
}

module.exports = { dropTestFiles, dropReplacedImages, missingImages, withImageLinks };
