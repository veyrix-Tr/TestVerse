/*
  SAMPLE PAPERS. In the real app the server sends the paper for this test
  WITHOUT answers or solutions; those are sent only after submission.
  Question format (matches the admin upload and the question bank spec):
    { id, type, chapter, text:{en,hi?}, options:[{en,hi?}], list1, list2,
      assertion, reason, answer, tolerance, marks:{correct, wrong, partial}, solution }
  type: single | multiple | integer | numerical | ar | match
  answer: single/ar/match -> option index; multiple -> [indexes];
          integer/numerical -> number (numerical uses tolerance)
  Copied from design/test.html.
*/
export const AR_OPTIONS = [
  { en: 'Both A and R are true, and R is the correct explanation of A', hi: 'A और R दोनों सत्य हैं, और R, A की सही व्याख्या है' },
  { en: 'Both A and R are true, but R is not the correct explanation of A', hi: 'A और R दोनों सत्य हैं, परंतु R, A की सही व्याख्या नहीं है' },
  { en: 'A is true but R is false', hi: 'A सत्य है परंतु R असत्य है' },
  { en: 'A is false but R is true', hi: 'A असत्य है परंतु R सत्य है' },
]

const N = { correct: 4, wrong: -1 }

export const PAPERS = {
  P4: {
    id: 'P4',
    title: 'NEET Part Test 4',
    exam: 'NEET',
    kind: 'series',
    durationMin: 20,
    languages: ['en', 'hi'],
    note: 'Demo paper: 12 questions in 20 minutes. The real Part Test has 90 questions.',
    sections: [
      {
        name: 'Physics',
        questions: [
          {
            id: 'q1',
            type: 'single',
            chapter: 'Kinetic Theory of Gases',
            marks: N,
            answer: 2,
            text: {
              en: 'The rms speed of the molecules of a gas at temperature $T$ is $v$. At temperature $4T$, the rms speed becomes:',
              hi: 'तापमान $T$ पर किसी गैस के अणुओं की वर्ग-माध्य-मूल चाल $v$ है। तापमान $4T$ पर यह चाल हो जाएगी:',
            },
            options: [{ en: '$v/2$' }, { en: '$v$' }, { en: '$2v$' }, { en: '$4v$' }],
            solution: '$v_{rms} = \\sqrt{3RT/M}$, so $v_{rms} \\propto \\sqrt{T}$. When $T$ becomes $4T$, the speed becomes $\\sqrt{4}\\,v = 2v$.',
          },
          {
            id: 'q2',
            type: 'single',
            chapter: 'Oscillations',
            marks: N,
            answer: 1,
            text: {
              en: 'A particle executes SHM with amplitude $A$. At what displacement from the mean position is its kinetic energy equal to its potential energy?',
              hi: 'एक कण आयाम $A$ के साथ सरल आवर्त गति करता है। माध्य स्थिति से किस विस्थापन पर इसकी गतिज ऊर्जा, स्थितिज ऊर्जा के बराबर होगी?',
            },
            options: [{ en: '$A/2$' }, { en: '$A/\\sqrt{2}$' }, { en: '$A/\\sqrt{3}$' }, { en: '$A$' }],
            solution: 'KE = PE means each is half the total energy: $\\tfrac12 kx^2 = \\tfrac12 \\cdot \\tfrac12 kA^2$, so $x = A/\\sqrt{2}$.',
          },
          {
            id: 'q3',
            type: 'ar',
            chapter: 'Oscillations',
            marks: N,
            answer: 0,
            assertion: { en: 'The time period of a simple pendulum does not depend on the mass of the bob.', hi: 'सरल लोलक का आवर्तकाल गोलक के द्रव्यमान पर निर्भर नहीं करता।' },
            reason: { en: 'The restoring force on the bob and its inertia are both proportional to its mass.', hi: 'गोलक पर प्रत्यानयन बल और उसका जड़त्व, दोनों उसके द्रव्यमान के समानुपाती होते हैं।' },
            text: {
              en: 'Given below are two statements: Assertion (A) and Reason (R). Choose the correct option.',
              hi: 'नीचे दो कथन दिए गए हैं: अभिकथन (A) और कारण (R)। सही विकल्प चुनिए।',
            },
            solution: 'Restoring force $= mg\\sin\\theta$ and inertia $= m$, so $m$ cancels in the equation of motion and $T = 2\\pi\\sqrt{L/g}$. Both are true and R explains A.',
          },
        ],
      },
      {
        name: 'Chemistry',
        questions: [
          {
            id: 'q4',
            type: 'single',
            chapter: 'Chemical Equilibrium',
            marks: N,
            answer: 1,
            text: { en: 'For the reaction $N_2 + 3H_2 \\rightleftharpoons 2NH_3$, the relation between $K_p$ and $K_c$ is:', hi: 'अभिक्रिया $N_2 + 3H_2 \\rightleftharpoons 2NH_3$ के लिए $K_p$ और $K_c$ के बीच संबंध है:' },
            options: [{ en: '$K_p = K_c(RT)^2$' }, { en: '$K_p = K_c(RT)^{-2}$' }, { en: '$K_p = K_c$' }, { en: '$K_p = K_c(RT)^{-1}$' }],
            solution: '$\\Delta n_g = 2 - (1 + 3) = -2$, so $K_p = K_c(RT)^{\\Delta n_g} = K_c(RT)^{-2}$.',
          },
          {
            id: 'q5',
            type: 'single',
            chapter: 'Redox Reactions',
            marks: N,
            answer: 1,
            text: { en: 'The oxidation number of Cr in $K_2Cr_2O_7$ is:', hi: '$K_2Cr_2O_7$ में Cr की ऑक्सीकरण संख्या है:' },
            options: [{ en: '+3' }, { en: '+6' }, { en: '+7' }, { en: '+2' }],
            solution: '$2(+1) + 2x + 7(-2) = 0 \\Rightarrow 2x = 12 \\Rightarrow x = +6$.',
          },
          {
            id: 'q6',
            type: 'match',
            chapter: 'Redox Reactions',
            marks: N,
            answer: 2,
            text: { en: 'Match the element in List I with its oxidation state in List II.', hi: 'सूची I के तत्व का सूची II में उसकी ऑक्सीकरण अवस्था से मिलान कीजिए।' },
            list1: ['(A) Mn in KMnO₄', '(B) S in H₂SO₄', '(C) N in NH₃', '(D) O in H₂O₂'],
            list2: ['(p) −3', '(q) +7', '(r) −1', '(s) +6'],
            options: [{ en: 'A-q, B-p, C-s, D-r' }, { en: 'A-s, B-q, C-p, D-r' }, { en: 'A-q, B-s, C-p, D-r' }, { en: 'A-q, B-s, C-r, D-p' }],
            solution: 'Mn in KMnO₄ = +7, S in H₂SO₄ = +6, N in NH₃ = −3, O in H₂O₂ = −1. So A-q, B-s, C-p, D-r.',
          },
        ],
      },
      {
        name: 'Botany',
        questions: [
          {
            id: 'q7',
            type: 'single',
            chapter: 'Cell Cycle and Cell Division',
            marks: N,
            answer: 2,
            text: { en: 'Crossing over takes place during which stage of prophase I?', hi: 'जीन विनिमय (क्रॉसिंग ओवर) प्रोफेज़ I की किस अवस्था में होता है?' },
            options: [{ en: 'Leptotene', hi: 'लेप्टोटीन' }, { en: 'Zygotene', hi: 'ज़ाइगोटीन' }, { en: 'Pachytene', hi: 'पैकीटीन' }, { en: 'Diplotene', hi: 'डिप्लोटीन' }],
            solution: 'Crossing over between non-sister chromatids of homologous chromosomes happens in pachytene, with the help of the enzyme recombinase.',
          },
          {
            id: 'q8',
            type: 'single',
            chapter: 'Transport in Plants',
            marks: N,
            answer: 2,
            text: { en: 'Which of these needs energy (ATP) to move molecules across a membrane?', hi: 'इनमें से किसमें झिल्ली के पार अणुओं को ले जाने के लिए ऊर्जा (ATP) की आवश्यकता होती है?' },
            options: [{ en: 'Simple diffusion', hi: 'सरल विसरण' }, { en: 'Facilitated diffusion', hi: 'सुसाध्य विसरण' }, { en: 'Active transport', hi: 'सक्रिय परिवहन' }, { en: 'Osmosis', hi: 'परासरण' }],
            solution: 'Active transport moves molecules against the concentration gradient, which needs energy from ATP.',
          },
          {
            id: 'q9',
            type: 'ar',
            chapter: 'Cell Cycle and Cell Division',
            marks: N,
            answer: 1,
            assertion: { en: 'The synaptonemal complex dissolves during diplotene.', hi: 'डिप्लोटीन के दौरान सिनैप्टोनीमल सम्मिश्र विघटित हो जाता है।' },
            reason: { en: 'Chiasmata become visible during diplotene.', hi: 'डिप्लोटीन के दौरान काएज़्मेटा दिखाई देने लगते हैं।' },
            text: {
              en: 'Given below are two statements: Assertion (A) and Reason (R). Choose the correct option.',
              hi: 'नीचे दो कथन दिए गए हैं: अभिकथन (A) और कारण (R)। सही विकल्प चुनिए।',
            },
            solution: 'Both statements are true facts about diplotene, but chiasmata becoming visible is not the reason the synaptonemal complex dissolves.',
          },
        ],
      },
      {
        name: 'Zoology',
        questions: [
          {
            id: 'q10',
            type: 'single',
            chapter: 'Breathing and Exchange of Gases',
            marks: N,
            answer: 0,
            text: { en: 'The tidal volume of a healthy adult is approximately:', hi: 'एक स्वस्थ वयस्क का ज्वारीय आयतन लगभग होता है:' },
            options: [{ en: '500 mL' }, { en: '1000 mL' }, { en: '2500 mL' }, { en: '3000 mL' }],
            solution: 'Tidal volume, the air breathed in or out in a normal breath, is about 500 mL (6000–8000 mL per minute).',
          },
          {
            id: 'q11',
            type: 'single',
            chapter: 'Body Fluids and Circulation',
            marks: N,
            answer: 0,
            text: { en: 'Which are the most abundant cells in human blood?', hi: 'मानव रक्त में सबसे अधिक संख्या में कौन-सी कोशिकाएँ होती हैं?' },
            options: [{ en: 'Erythrocytes (RBCs)', hi: 'लाल रक्त कणिकाएँ' }, { en: 'Leucocytes (WBCs)', hi: 'श्वेत रक्त कणिकाएँ' }, { en: 'Platelets', hi: 'प्लेटलेट्स' }, { en: 'Lymphocytes', hi: 'लिम्फोसाइट्स' }],
            solution: 'RBCs are the most abundant, about 5 to 5.5 million per mm³ of blood.',
          },
          {
            id: 'q12',
            type: 'single',
            chapter: 'Body Fluids and Circulation',
            marks: N,
            answer: 1,
            text: { en: 'The SA node is located in the wall of the:', hi: 'SA नोड किसकी भित्ति में स्थित होता है?' },
            options: [{ en: 'Left atrium', hi: 'बायाँ आलिंद' }, { en: 'Right atrium', hi: 'दायाँ आलिंद' }, { en: 'Left ventricle', hi: 'बायाँ निलय' }, { en: 'Interventricular septum', hi: 'अंतर-निलय पट' }],
            solution: 'The SA node, the pacemaker, lies in the right upper corner of the right atrium.',
          },
        ],
      },
    ],
  },
  JA1: {
    id: 'JA1',
    title: 'JEE Advanced Full Syllabus Test 1',
    exam: 'JEE Advanced',
    kind: 'series',
    durationMin: 15,
    languages: ['en'],
    note: 'Demo paper with every JEE question type: multiple correct with partial marking, integer, numerical, single correct and matching.',
    sections: [
      {
        name: 'Physics',
        questions: [
          {
            id: 'j1',
            type: 'multiple',
            chapter: 'Circular Motion',
            marks: { correct: 4, wrong: -2, partial: true },
            answer: [0, 2],
            text: { en: 'For a particle in uniform circular motion, which of the following are correct? (One or more options may be correct.)' },
            options: [{ en: 'Its speed is constant' }, { en: 'Its velocity is constant' }, { en: 'Its acceleration is directed towards the centre' }, { en: 'The net force on it is zero' }],
            solution: 'Speed is constant but direction changes, so velocity is not constant. Acceleration is centripetal, so the net force is not zero. Correct: A and C.',
          },
          {
            id: 'j2',
            type: 'integer',
            chapter: 'Laws of Motion',
            marks: { correct: 4, wrong: 0 },
            answer: 4,
            text: { en: 'A body of mass $2\\,\\text{kg}$ is acted on by a net force of $8\\,\\text{N}$. Find its acceleration in $\\text{m s}^{-2}$.' },
            solution: '$a = F/m = 8/2 = 4\\,\\text{m s}^{-2}$.',
          },
        ],
      },
      {
        name: 'Chemistry',
        questions: [
          {
            id: 'j3',
            type: 'numerical',
            chapter: 'Some Basic Concepts',
            marks: { correct: 4, wrong: 0 },
            answer: 44.0,
            tolerance: 0.05,
            text: { en: 'Find the molar mass of $CO_2$ in g/mol, correct to one decimal place. (C = 12, O = 16)' },
            solution: '$12 + 2 \\times 16 = 44.0$ g/mol.',
          },
          {
            id: 'j4',
            type: 'single',
            chapter: 'Chemical Bonding',
            marks: { correct: 3, wrong: -1 },
            answer: 0,
            text: { en: 'The hybridisation of carbon in $CO_2$ is:' },
            options: [{ en: '$sp$' }, { en: '$sp^2$' }, { en: '$sp^3$' }, { en: '$sp^3d$' }],
            solution: 'Carbon forms two σ bonds and has no lone pairs, so it is $sp$ hybridised and the molecule is linear.',
          },
        ],
      },
      {
        name: 'Mathematics',
        questions: [
          {
            id: 'j5',
            type: 'single',
            chapter: 'Definite Integration',
            marks: { correct: 3, wrong: -1 },
            answer: 1,
            text: { en: 'The value of $\\displaystyle\\int_0^1 x\\,dx$ is:' },
            options: [{ en: '$0$' }, { en: '$\\tfrac12$' }, { en: '$1$' }, { en: '$2$' }],
            solution: '$\\int_0^1 x\\,dx = \\left[\\tfrac{x^2}{2}\\right]_0^1 = \\tfrac12$.',
          },
          {
            id: 'j6',
            type: 'match',
            chapter: 'Differentiation',
            marks: { correct: 3, wrong: -1 },
            answer: 3,
            text: { en: 'Match each function in List I with its derivative in List II.' },
            list1: ['(P) sin x', '(Q) eˣ', '(R) ln x', '(S) x²'],
            list2: ['(1) 1/x', '(2) cos x', '(3) 2x', '(4) eˣ'],
            options: [{ en: 'P-2, Q-1, R-4, S-3' }, { en: 'P-3, Q-4, R-1, S-2' }, { en: 'P-2, Q-4, R-3, S-1' }, { en: 'P-2, Q-4, R-1, S-3' }],
            solution: '(sin x)′ = cos x, (eˣ)′ = eˣ, (ln x)′ = 1/x, (x²)′ = 2x. So P-2, Q-4, R-1, S-3.',
          },
        ],
      },
    ],
  },
}

PAPERS.P5 = PAPERS.P6 = PAPERS.P4

export const STUDENT = { name: 'Riya Sharma', roll: 'TV-NEET-104812', course: true, videoLeft: 8, videoHours: 48 }

export const Q_TYPE_LABELS = {
  single: 'Single correct',
  multiple: 'One or more correct',
  integer: 'Integer answer',
  numerical: 'Numerical answer',
  ar: 'Assertion–Reason',
  match: 'Match the following',
}

export function flatten(paper) {
  const flat = []
  paper.sections.forEach((s, si) => s.questions.forEach((q, qi) => flat.push({ q, si, qi, sec: s.name })))
  return flat
}
