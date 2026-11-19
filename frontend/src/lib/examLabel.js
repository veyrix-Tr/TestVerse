/* A JEE test's paper pattern. Every JEE student sees every JEE test whatever its
   pattern; this only says which exam the paper follows. */
export const PATTERNS = [
  ['main', 'JEE Main'],
  ['advanced', 'JEE Advanced'],
]
const PATTERN_LABEL = Object.fromEntries(PATTERNS)

/* A test's exam as students and admins see it: "JEE Main", "JEE Advanced",
   "JEE" (a JEE test with no pattern chosen yet), "NEET", or '' for no exam. */
export function testExamLabel(exam, pattern) {
  if (exam === 'jee') return PATTERN_LABEL[pattern] || 'JEE'
  if (exam === 'neet') return 'NEET'
  return ''
}
