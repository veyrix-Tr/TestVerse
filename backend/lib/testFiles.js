// lib/testFiles.js — tidy R2 when tests go away or change their paper.
// Called AFTER the database change, so the test itself no longer counts as
// using its pictures. A picture is only removed when no other test's paper
// still links to it (a paper can be copied into another test). Best effort:
// a leftover file only costs a little storage, so failures are just logged.
const prisma = require('./prisma');
const { imagesOf } = require('./paperFormat');
const storage = require('./storage');

async function dropFiles({ images = [], solutions = [] }) {
  try {
    const keys = [];
    for (const url of new Set(images)) {
      const key = storage.imageKeyOf(url);
      if (!key) continue;
      const used = await prisma.$queryRaw`SELECT 1 FROM "Test" WHERE paper::text LIKE ${'%' + key + '%'} LIMIT 1`;
      if (!used.length) keys.push(key);
    }
    const c = storage.config();
    await Promise.all([storage.removeAll(c.images, keys), storage.removeAll(c.files, solutions.filter(Boolean))]);
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

module.exports = { dropTestFiles, dropReplacedImages };
