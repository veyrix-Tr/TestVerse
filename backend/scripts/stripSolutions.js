// scripts/stripSolutions.js
// One-off clean-up: removes written solutions from tests saved before the
// website stopped keeping them. Solutions now reach students by email, outside
// the site. Both the checked paper and the admin's original JSON (`source`)
// lose every "solution" field; answers, marks and videos stay exactly as they
// are, so stored scores still match.
//
//   npm run strip-solutions             # list what would change, write nothing
//   npm run strip-solutions -- --write  # remove the solutions
//
// Uses DATABASE_URL from .env, so it writes to whichever database that points at.

require('dotenv').config();
const prisma = require('../lib/prisma');

const write = process.argv.includes('--write');

// A copy of `v` without any "solution" key, and how many it removed.
const strip = (v) => {
  let removed = 0;
  const walk = (o) => {
    if (Array.isArray(o)) return o.map(walk);
    if (!o || typeof o !== 'object') return o;
    const out = {};
    for (const [k, x] of Object.entries(o)) {
      if (k === 'solution') removed++;
      else out[k] = walk(x);
    }
    return out;
  };
  return { value: walk(v), removed };
};

const main = async () => {
  const tests = await prisma.test.findMany({ select: { id: true, title: true, paper: true, source: true } });
  let changed = 0;
  for (const t of tests) {
    const paper = t.paper == null ? null : strip(t.paper);
    const source = t.source == null ? null : strip(t.source);
    const n = (paper ? paper.removed : 0) + (source ? source.removed : 0);
    if (!n) continue;
    changed++;
    console.log(`${write ? 'Cleaned' : 'Would clean'} "${t.title}": ${paper ? paper.removed : 0} in the paper, ${source ? source.removed : 0} in the original JSON`);
    if (write) {
      await prisma.test.update({
        where: { id: t.id },
        data:  { ...(paper && paper.removed ? { paper: paper.value } : {}), ...(source && source.removed ? { source: source.value } : {}) },
      });
    }
  }
  console.log(changed ? `${changed} of ${tests.length} tests ${write ? 'cleaned' : 'have solutions; run again with --write to remove them'}.` : `No solutions found in ${tests.length} tests.`);
};

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
