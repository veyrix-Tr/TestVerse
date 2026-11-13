/* Features in the sidebar that aren't built yet. Keyed by the URL segment after /student/. */
export const SOON = {
  solutions: {
    eyebrow: 'Solutions',
    title: 'Worked solutions',
    text: 'Step-by-step solutions for the tests you take. Until then, your result shows the correct answer for every question, and your solutions and analysis come by email.',
    points: [
      ['Every question explained', 'A worked solution for each question, not just the answer.'],
      ['Start with your mistakes', 'Jump straight to the questions you got wrong.'],
    ],
  },
  analysis: {
    eyebrow: 'Analysis',
    title: 'Your performance analysis',
    text: 'One place to see how you’re improving across every test you take.',
    points: [
      ['Score trend', 'Your marks test by test, so you can see the direction you’re heading.'],
      ['Subject-wise accuracy', 'Which of your subjects are strongest, and which need more practice.'],
      ['Chapters losing you marks', 'The exact chapters where your marks slip, ranked.'],
      ['Time per question', 'Where you spend too long, and where you rush.'],
    ],
  },
  'video-requests': {
    eyebrow: 'Video requests',
    title: 'Ask for a video solution',
    text: 'Stuck on a question? Ask your teachers to explain it on video.',
    points: [
      ['Snap the question', 'Take a photo of any question from a test or your own practice.'],
      ['Say what’s confusing', 'Add a short note so the explanation hits the right spot.'],
      ['Get a video back', 'Your teacher records a step-by-step solution for you.'],
    ],
  },
}
