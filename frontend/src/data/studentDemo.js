/*
  SAMPLE DATA, used only by the hidden performance section
  (src/pages/StudentHome/sections/PerformanceSection.jsx) until real analytics
  exist. Everything else on the dashboard comes from the server.
  Copied from design/student-home.html.
*/
const H = 36e5
const now = Date.now()
export function at(hoursFromNow) {
  return new Date(now + hoursFromNow * H).toISOString()
}
export { H }

export const RESULTS = [
  { test: 'NEET Full Syllabus Live Test', when: at(-24 * 6), score: 459, max: 720, rank: '1,284 of 9,640', acc: 75, live: true },
  { test: 'Part Test 3', when: at(-24 * 9), score: 262, max: 360, rank: null, acc: 78 },
  { test: 'Half Syllabus Test 1', when: at(-24 * 14), score: 498, max: 720, rank: null, acc: 76 },
  { test: 'Part Test 2', when: at(-24 * 20), score: 231, max: 360, rank: null, acc: 70 },
  { test: 'Part Test 1', when: at(-24 * 27), score: 248, max: 360, rank: null, acc: 72 },
]

export const SUBJECT_ACC = [
  ['Physics', 64],
  ['Chemistry', 71],
  ['Botany', 82],
  ['Zoology', 80],
]

export const WEAK = [
  ['Rotational Motion', '38% correct'],
  ['Chemical Equilibrium', '44% correct'],
  ['Plant Kingdom', '51% correct'],
]
