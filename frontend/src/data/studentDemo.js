/*
  SAMPLE DATA FOR THE DESIGN. In the real app this comes from the server
  for the signed-in student. Times are set relative to now so every state
  (live now, countdown, due soon) can be seen in the demo.
  Copied from design/student-home.html.
*/
const H = 36e5
const now = Date.now()
export function at(hoursFromNow) {
  return new Date(now + hoursFromNow * H).toISOString()
}
export { H }

export const SETTINGS = {
  announcement: 'Next NEET live test on Sunday at 2:00 PM. Register to get your all-India rank.',
  youtube: 'https://www.youtube.com/@[your-channel]',
  videoLimit: { course: 10, direct: 3 },
  videoHours: 48,
  referral: { friendDiscount: 100, referrerCredit: 100 },
}

export const EXAM = { id: 'neet', label: 'NEET', year: 2027, subjects: ['Physics', 'Chemistry', 'Botany', 'Zoology'] }

export const SERIES = [
  { id: 'P1', kind: 'part', n: 1, title: 'Part Test 1', chapters: 'Units, Kinematics, NLM · Basic Concepts, Atomic Structure · Cell, Biomolecules', status: 'done', score: 248, max: 360 },
  { id: 'P2', kind: 'part', n: 2, title: 'Part Test 2', chapters: 'WPE, Rotation · Classification, Bonding · Plant & Animal Kingdom', status: 'done', score: 231, max: 360 },
  { id: 'P3', kind: 'part', n: 3, title: 'Part Test 3', chapters: 'Gravitation, Matter · States, Thermodynamics · Morphology, Anatomy', status: 'done', score: 262, max: 360 },
  { id: 'P4', kind: 'part', n: 4, title: 'Part Test 4', chapters: 'KTG, Oscillations · Equilibrium, Redox · Cell Cycle, Transport', status: 'progress', left: '41 min left' },
  { id: 'P5', kind: 'part', n: 5, title: 'Part Test 5', chapters: 'Waves, Electrostatics · s-, p-block · Plant Physiology', status: 'open' },
  { id: 'P6', kind: 'part', n: 6, title: 'Part Test 6', chapters: 'Current, Magnetism · Organic basics · Human Physiology I', status: 'open' },
  { id: 'H1', kind: 'half', n: 1, title: 'Half Syllabus Test 1', chapters: 'Class 11 full', status: 'done', score: 498, max: 720 },
  { id: 'H2', kind: 'half', n: 2, title: 'Half Syllabus Test 2', chapters: 'Class 12 first half', status: 'soon' },
  { id: 'H3', kind: 'half', n: 3, title: 'Half Syllabus Test 3', chapters: 'Class 12 second half', status: 'soon' },
  { id: 'F1', kind: 'full', n: 1, title: 'Full Syllabus Test 1', chapters: 'Complete syllabus', status: 'soon' },
  { id: 'F2', kind: 'full', n: 2, title: 'Full Syllabus Test 2', chapters: 'Complete syllabus', status: 'soon' },
]

export const LIVE = [
  { id: 'L0', title: 'NEET Organic Chemistry Live Quiz', meta: '45 questions · 45 min', start: at(-0.15), window: 30, registered: true },
  { id: 'L1', title: 'NEET Full Syllabus Live Test', meta: '180 questions · 3 hours', start: at(52), window: 30, registered: true },
  { id: 'L2', title: 'NEET Half Syllabus Live Test', meta: '180 questions · 3 hours', start: at(52 + 24 * 14), window: 30, registered: false },
  { id: 'L3', title: 'NEET Full Syllabus Live Test 2', meta: '180 questions · 3 hours', start: at(52 + 24 * 28), window: 30, registered: false },
]

export const ASSIGNED = [
  { id: 'A1', title: 'Organic Chemistry Revision Test', from: 'Your Studyverse teacher', meta: '30 questions · 45 min', due: at(20) },
  { id: 'A2', title: 'Weekly Batch Test 1', from: 'NEET 2027 course batch', meta: '45 questions · 60 min', due: at(96) },
]

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

export const REQUESTS = [
  { text: 'Rolling sphere on incline: why is friction upward?', subject: 'Physics', status: 'progress', when: at(-20) },
  { text: 'Meiosis: terminalisation of chiasmata', subject: 'Botany', status: 'done', when: at(-24 * 4), link: 'https://youtu.be/[video-id]' },
]

export const NOTES = [
  { text: 'Your video solution for "Meiosis: terminalisation of chiasmata" is ready.', when: '4 days ago', unread: true },
  { text: 'Live test registered: NEET Full Syllabus Live Test.', when: '5 days ago', unread: true },
  { text: 'Results for NEET Full Syllabus Live Test are out. Your rank: 1,284.', when: '6 days ago', unread: false },
]

export const MODES = {
  course: { name: 'Riya Sharma', first: 'Riya', course: true, bought: true, credits: 150, code: 'RIYA4821', videosUsed: 2 },
  direct: { name: 'Aarav Mehta', first: 'Aarav', course: false, bought: true, credits: 0, code: 'AARAV7310', videosUsed: 1 },
  new: { name: 'Sana Khan', first: 'Sana', course: false, bought: false, credits: 0, code: null, videosUsed: 0 },
}

export function liveState(t) {
  const s = new Date(t.start).getTime()
  const end = s + t.window * 60000
  const n = Date.now()
  if (n < s) return 'upcoming'
  if (n <= end) return 'open'
  return 'closed'
}
