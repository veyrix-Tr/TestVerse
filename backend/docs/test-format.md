# Testverse question paper format (JSON)

Admins create a test by filling in its details (title, subject, duration,
marking scheme, instructions, optional opening and closing time) and then
uploading or pasting the question paper as JSON in this format.
A full example is in `frontend/public/sample-test.json`. In the admin panel,
"Download sample" gives you the same file.

## The paper

```json
{
  "languages": ["en", "hi"],
  "sections": [
    { "name": "Physics",   "questions": [ … ] },
    { "name": "Chemistry", "questions": [ … ] }
  ]
}
```

- `languages`: `["en"]` (default) or `["en", "hi"]`. With Hindi, students get
  an English/हिंदी switch. A question without Hindi text is shown in English.
- `sections`: one per subject (or part). Each needs a different `name`. Students
  see the sections as tabs on the exam screen.
- **Single-subject shortcut:** a plain list of questions, `[ … ]`, or
  `{ "questions": [ … ] }`, becomes one section named after the test's subject.
- At most 300 questions in a paper.

## A question

| Field | Needed for | What to put |
| --- | --- | --- |
| `type` | all | `single`, `multiple`, `integer` or `numerical` |
| `text` | all | The question. `"…"` or `{"en": "…", "hi": "…"}` |
| `options` | single, multiple | 2 to 6 choices, each `"…"` or `{"en": "…", "hi": "…"}`. Shown as A, B, C… |
| `answer` | all | single: one letter, `"C"`. multiple: letters, `["A", "C"]` (or `"A,C"`). integer: a whole number, `4`. numerical: a number, `44.5` |
| `tolerance` | numerical only, optional | How far off still counts as correct, e.g. `0.05`. Default `0` |
| `marks` | optional | Override the test's marking for this question: `{"correct": 4, "wrong": -1}`; for multiple also `"partial": true/false` |
| `chapter` | optional | Shown in the student's chapter-wise analysis |
| `video` | optional | YouTube link to a video solution, shown after submitting |

### Maths and formulas

Write LaTeX between single dollar signs: `"The roots of $x^2 - 5x + 6 = 0$ are:"`.
In JSON every backslash is doubled: `"$\\sqrt{3RT/M}$"`.

### Examples of each type

```json
{ "type": "single", "text": "The oxidation state of Mn in $KMnO_4$ is:",
  "options": ["+2", "+4", "+6", "+7"], "answer": "D" }

{ "type": "multiple", "text": "For uniform circular motion, which are correct?",
  "options": ["Speed is constant", "Velocity is constant", "Acceleration points to the centre", "Acceleration is zero"],
  "answer": ["A", "C"] }

{ "type": "integer", "text": "How many ways can 3 books be arranged?", "answer": 6 }

{ "type": "numerical", "text": "Molar mass of $CO_2$ in g/mol?", "answer": 44, "tolerance": 0.1 }
```

## Marking

The test's marking scheme (set in the admin form) applies to every question of
that type. The defaults are:

| Type | Correct | Wrong | Notes |
| --- | --- | --- | --- |
| single | +4 | −1 | |
| multiple | +4 | −2 | Partial marking on: +1 for each correct option chosen when no wrong option is chosen |
| integer | +4 | 0 | |
| numerical | +4 | 0 | |

Unanswered questions get 0. A question marked for review that has an answer is
still evaluated (the NTA rule).

## Checking

When you paste or upload, the paper is checked and **every** problem is listed
with where it is, for example:

```
Physics › Q3: "answer" must be one letter, A–D (got "E").
Chemistry › Q1: "text" is missing.
```

A test can be saved as a draft without a paper, but it can only be published
once the paper has no problems. After any student has started the test, its
questions and marking are locked; the title, instructions and timings can still
change.
