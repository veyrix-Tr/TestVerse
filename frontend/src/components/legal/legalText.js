/*
  Text for the Terms / Privacy / Refund policy / Contact cards (LegalHost.jsx).
  A starting draft written for Testverse by Studyverse: Studyverse should read
  it and replace it with their final wording. Each section is [heading, text].
*/
export const LEGAL = {
  terms: {
    title: 'Terms of use',
    intro: 'By using Testverse by Studyverse, you agree to these terms.',
    sections: [
      ['Your account', 'One account per student. Keep your password private and don’t share your account.'],
      ['Tests and content', 'Tests, solutions and videos are for your own practice. Don’t copy, record or share them.'],
      ['Fair use', 'Don’t misuse the platform or use bots. We may suspend accounts that break these rules.'],
      ['Scores', 'Scores, ranks and predictions are estimates, not official results.'],
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro: 'What we collect and how we use it.',
    sections: [
      ['What we collect', 'Your sign-up details, test answers, results and purchases.'],
      ['Why', 'To run your account, show the right tests, score them, and contact you.'],
      ['Payments', 'Handled by our payment partner. We never store card or bank details.'],
      ['Sharing', 'We never sell your data. Ask us any time to see or delete it.'],
    ],
  },
  refunds: {
    title: 'Refund policy',
    intro: 'How refunds work on Testverse.',
    sections: [
      ['How to ask', 'Contact us with your account email or phone and the purchase details.'],
      ['How we decide', 'The Studyverse team reviews each request, including how much of the batch you’ve used.'],
      ['Getting your money', 'Approved refunds go back to your payment method within a few working days.'],
      ['Payment problems', 'Charged twice or payment failed? Tell us and we’ll fix it.'],
    ],
  },
  contact: {
    title: 'Contact us',
    intro: 'Questions about your account, a test or a payment? A real person will reply.',
    sections: [
      ['When you write', 'Include your account email or phone, and which test or payment it’s about.'],
      ['Reply time', 'We usually reply within one working day.'],
    ],
    link: { href: 'https://studyverse.in', label: 'Visit studyverse.in' },
  },
}

export const LEGAL_PATHS = { '/terms': 'terms', '/privacy': 'privacy', '/refunds': 'refunds', '/contact': 'contact' }
