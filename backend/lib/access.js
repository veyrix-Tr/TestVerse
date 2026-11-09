// lib/access.js
// Who may see and take a published test. A student can when ANY of these hold:
//   - it's a free test for their exam (or for any exam): no batch needed
//   - the test is for everyone (audience "all"), it's for their exam (or any
//     exam), and they have an ACTIVE batch
//   - their ACTIVE batch is one the test is given to
//   - they're in a group the test is given to
//   - the test is given to them directly
//   - they've already started it (so a later change never hides their result)
// Use it as a Prisma `where` so the database does the filtering.

const prisma = require('./prisma');

// The student's exam key ("neet" | "jee-main" | "jee-advanced") -> the test's ("neet" | "jee")
const examFamily = (exam) => (exam === 'neet' ? 'neet' : exam === 'jee-main' || exam === 'jee-advanced' ? 'jee' : null);

const forExam = (family) => ({ OR: [{ exam: null }, ...(family ? [{ exam: family }] : [])] });

const visibleTo = async (userId) => {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { exam: true, subscription: { select: { status: true } } },
  });
  const family     = examFamily(user && user.exam);
  const subscribed = !!(user && user.subscription && user.subscription.status === 'active');

  return {
    status: 'published',
    OR: [
      { isFree: true, ...forExam(family) },
      ...(subscribed ? [{ audience: 'all', ...forExam(family) }] : []),
      { batches: { some: { batch: { subscriptions: { some: { userId, status: 'active' } } } } } },
      { groups: { some: { group: { members: { some: { userId } } } } } },
      { students: { some: { userId } } },
      { attempts: { some: { userId } } },
    ],
  };
};

module.exports = { examFamily, visibleTo };
