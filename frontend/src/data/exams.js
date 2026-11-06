/*
  Test details for the home page — copied from design/testverse-home.html
  (the "Edit test details here" block).
*/
export const EXAMS = {
  neet: {
    label: 'NEET',
    subjects: ['Physics', 'Chemistry', 'Botany', 'Zoology'],
    specs: {
      part: '[N] questions, [time] each',
      half: '180 questions, 3 hours, 720 marks',
      full: '180 questions, 3 hours, 720 marks',
    },
    sample: {
      score: '459 / 720',
      acc: '75%',
      bars: [
        ['Physics', 65],
        ['Chemistry', 73],
        ['Botany', 81],
        ['Zoology', 81],
      ],
    },
    live: [
      { start: '2026-11-01T14:00:00+05:30', day: '1', when: 'Nov, Sun', name: 'NEET Full Syllabus Live Test', meta: '2:00 PM, 180 questions, 3 hours' },
      { start: '2026-11-15T14:00:00+05:30', day: '15', when: 'Nov, Sun', name: 'NEET Half Syllabus Live Test', meta: '2:00 PM, 180 questions, 3 hours' },
      { start: '2026-11-29T14:00:00+05:30', day: '29', when: 'Nov, Sun', name: 'NEET Full Syllabus Live Test', meta: '2:00 PM, 180 questions, 3 hours' },
    ],
  },
  'jee-main': {
    label: 'JEE Main',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    specs: {
      part: '[N] questions, [time] each',
      half: '75 questions, 3 hours, 300 marks',
      full: '75 questions, 3 hours, 300 marks',
    },
    sample: {
      score: '182 / 300',
      acc: '68%',
      bars: [
        ['Physics', 64],
        ['Chemistry', 79],
        ['Mathematics', 58],
      ],
    },
    live: [
      { start: '2026-11-08T09:00:00+05:30', day: '8', when: 'Nov, Sun', name: 'JEE Main Full Syllabus Live Test', meta: '9:00 AM, 75 questions, 3 hours' },
      { start: '2026-11-22T09:00:00+05:30', day: '22', when: 'Nov, Sun', name: 'JEE Main Half Syllabus Live Test', meta: '9:00 AM, 75 questions, 3 hours' },
    ],
  },
  'jee-advanced': {
    label: 'JEE Advanced',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    specs: {
      part: '[N] questions, [time] each',
      half: 'Paper 1 + Paper 2, 3 hours each',
      full: 'Paper 1 + Paper 2, 3 hours each',
    },
    sample: {
      score: '[score] / [max]',
      acc: '61%',
      bars: [
        ['Physics', 57],
        ['Chemistry', 70],
        ['Mathematics', 52],
      ],
    },
    live: [
      { start: '2026-11-22T09:00:00+05:30', day: '22', when: 'Nov, Sun', name: 'JEE Advanced Full Syllabus Live Test', meta: 'Paper 1 at 9:00 AM, Paper 2 at 2:30 PM' },
    ],
  },
}

export const EXAM_IDS = ['neet', 'jee-main', 'jee-advanced']
export const EXAM_KEY = 'sv-exam'
