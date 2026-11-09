// scripts/seedFreeTests.js
// Publishes the free mock tests (2 NEET + 2 JEE Main) from seed/free-tests/.
// Each folder holds one JSON array of questions per section (docs/test-format.md).
// Free tests are open to every student of their exam, with or without a batch.
//
//   npm run seed:free-tests             # create, or update the papers in place
//   npm run seed:free-tests -- --check  # only check the papers, write nothing
//
// A test is matched by its title. Once a student has started one, its paper and
// marking are left alone (scores would stop matching); details still update.
// Uses DATABASE_URL from .env, so it writes to whichever database that points at.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const { normalizePaper } = require('../lib/paperFormat');

const DIR = path.join(__dirname, '..', 'seed', 'free-tests');

const NEET_MARKING = {
  single:    { correct: 4, wrong: -1 },
  multiple:  { correct: 4, wrong: -2, partial: true },
  integer:   { correct: 4, wrong: 0 },
  numerical: { correct: 4, wrong: 0 },
};
// JEE Main since 2025: Section B (numerical) is compulsory and has −1 for a wrong answer.
const JEE_MARKING = {
  ...NEET_MARKING,
  integer:   { correct: 4, wrong: -1 },
  numerical: { correct: 4, wrong: -1 },
};

const NEET_INSTRUCTIONS = [
  'This is a full-length NEET (UG) mock test on the NTA pattern: 180 questions in Physics, Chemistry, Botany and Zoology (45 each). All questions are compulsory.',
  'The test lasts 180 minutes. A timer at the top shows the time left, and the test is submitted automatically when it reaches zero.',
  'Each question has four options with exactly one correct answer. Correct answer: +4. Wrong answer: −1. Unanswered: 0.',
  'Your answers are saved automatically. Use Save & Next to save an answer and move to the next question.',
  'Use Mark for Review to come back to a question later. A question marked for review that has an answer is still evaluated.',
  'You can move between subjects and questions at any time using the question palette.',
  'Do not refresh or close the window during the test.',
].join('\n');

const JEE_INSTRUCTIONS = [
  'This is a full-length JEE Main mock test on the NTA pattern: 75 questions in Physics, Chemistry and Mathematics (25 each). All questions are compulsory.',
  'In each subject, Q1–20 are multiple choice with one correct answer and Q21–25 need a whole-number answer that you type in.',
  'The test lasts 180 minutes. A timer at the top shows the time left, and the test is submitted automatically when it reaches zero.',
  'Marking for every question: correct answer +4, wrong answer −1, unanswered 0.',
  'Your answers are saved automatically. Use Save & Next to save an answer and move to the next question.',
  'Use Mark for Review to come back to a question later. A question marked for review that has an answer is still evaluated.',
  'Do not refresh or close the window during the test.',
].join('\n');

const NEET_SECTIONS = [['Physics', 'physics'], ['Chemistry', 'chemistry'], ['Botany', 'botany'], ['Zoology', 'zoology']];
const JEE_SECTIONS  = [['Physics', 'physics'], ['Chemistry', 'chemistry'], ['Mathematics', 'maths']];

const TESTS = [
  { folder: 'neet-mock-1', title: 'NEET Free Mock Test 1', subject: 'Physics, Chemistry, Biology', exam: 'neet', sections: NEET_SECTIONS, marking: NEET_MARKING, instructions: NEET_INSTRUCTIONS },
  { folder: 'neet-mock-2', title: 'NEET Free Mock Test 2', subject: 'Physics, Chemistry, Biology', exam: 'neet', sections: NEET_SECTIONS, marking: NEET_MARKING, instructions: NEET_INSTRUCTIONS },
  { folder: 'jee-mock-1',  title: 'JEE Main Free Mock Test 1', subject: 'Physics, Chemistry, Maths', exam: 'jee', sections: JEE_SECTIONS, marking: JEE_MARKING, instructions: JEE_INSTRUCTIONS },
  { folder: 'jee-mock-2',  title: 'JEE Main Free Mock Test 2', subject: 'Physics, Chemistry, Maths', exam: 'jee', sections: JEE_SECTIONS, marking: JEE_MARKING, instructions: JEE_INSTRUCTIONS },
];

const DURATION_MIN = 180;

// Reads and checks one test's paper. Returns { source, paper, summary, marking } or throws.
const loadPaper = (t) => {
  const source = {
    languages: ['en'],
    sections: t.sections.map(([name, file]) => ({
      name,
      questions: JSON.parse(fs.readFileSync(path.join(DIR, t.folder, file + '.json'), 'utf8')),
    })),
  };
  const r = normalizePaper(source, { subject: t.subject, marking: t.marking });
  if (r.errors) throw new Error(`${t.title}:\n  ${r.errors.join('\n  ')}`);
  return { source, ...r };
};

async function main() {
  const checkOnly = process.argv.includes('--check');
  const loaded = TESTS.map((t) => ({ t, ...loadPaper(t) }));
  for (const { t, summary } of loaded) {
    console.log(`${t.title}: ${summary.questionCount} questions, ${summary.totalMarks} marks (${summary.sections.map((s) => `${s.name} ${s.questions}`).join(', ')})`);
  }
  if (checkOnly) return;

  for (const { t, source, paper, summary, marking } of loaded) {
    const details = {
      title:        t.title,
      subject:      t.subject,
      exam:         t.exam,
      isFree:       true,
      audience:     'all',
      durationMin:  DURATION_MIN,
      instructions: t.instructions,
      status:       'published',
      opensAt:      null,
      closesAt:     null,
    };
    const content = {
      marking,
      paper,
      source,
      languages:     paper.languages,
      questionCount: summary.questionCount,
      totalMarks:    summary.totalMarks,
    };

    const existing = await prisma.test.findFirst({ where: { title: t.title }, include: { _count: { select: { attempts: true } } } });
    if (!existing) {
      await prisma.test.create({ data: { ...details, ...content } });
      console.log(`Created ${t.title}.`);
    } else if (existing._count.attempts > 0) {
      await prisma.test.update({ where: { id: existing.id }, data: details });
      console.log(`Updated the details of ${t.title}; its paper is locked (${existing._count.attempts} attempt${existing._count.attempts === 1 ? '' : 's'}).`);
    } else {
      await prisma.test.update({ where: { id: existing.id }, data: { ...details, ...content } });
      console.log(`Updated ${t.title}.`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e.message || e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
