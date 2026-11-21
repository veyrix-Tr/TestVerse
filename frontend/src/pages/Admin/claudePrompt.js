/* The prompt admins paste into Claude (claude.ai) together with a question
   paper PDF. Claude returns questions.json and diagrams.zip in the format
   backend/lib/paperFormat.js reads, which the test form then takes as they are. */
export const CLAUDE_PROMPT = `I've attached a question paper (PDF) and its answer key. Convert it into two files for our test website, Testverse.

FILE 1: questions.json, in exactly this format:
{
  "languages": ["en"],
  "sections": [
    { "name": "Physics", "questions": [ ... ] },
    { "name": "Chemistry", "questions": [ ... ] },
    { "name": "Mathematics", "questions": [ ... ] }
  ]
}
- One section per subject, named after the subject, in the paper's order. Keep the paper's question order.
- If the paper also has Hindi, use "languages": ["en", "hi"] and write every text as {"en": "...", "hi": "..."}.

Each question looks like this:
{
  "type": "single",
  "chapter": "Rotational Motion",
  "text": "The question text ...",
  "image": "phy-q1.png",
  "options": ["...", "...", "...", "..."],
  "answer": "B"
}
- "type": "single" = exactly one correct option; "multiple" = one or more correct options; "integer" = the student types a whole number; "numerical" = the student types a decimal number.
- "answer": single -> one letter, "B"; multiple -> a list of letters, ["A", "C"]; integer -> a whole number, 105; numerical -> a number, 1.2. When the key gives a range, add "tolerance": for "1.15 to 1.25" write "answer": 1.2, "tolerance": 0.05.
- Take every answer from the answer key. If an answer is missing or unclear, ask me instead of guessing.
- "options" only for single and multiple questions (2 to 6 options, in order A, B, C, D).
- "chapter": the NCERT chapter the question comes from.
- "image": only when the question has a figure. Several figures: a list, ["phy-q4-fig1.png", "phy-q4-fig2.png"].
- An option that is a picture: {"en": "", "image": "chem-q4-a.png"}. Text and a picture: {"en": "...", "image": "..."}.
- Write all maths in LaTeX between single dollar signs, like "$\\\\frac{1}{2}mv^{2}$". In JSON every backslash must be doubled.
- Match-the-list questions (List-I and List-II): type "single". Put both lists in "text", one item per line, like "(P) ...", "(1) ...", and the four combinations as the options.
- If a section has its own marking (for example +4 / -1 while the paper's single-correct questions are +3 / -1), add "marks": {"correct": 4, "wrong": -1} to each question of that section.
- Do not include solutions or explanations.
- The JSON must be valid.

FILE 2: diagrams.zip, every figure as its own PNG file:
- Crop each figure tightly from the paper: only the drawing, not the question text around it. Clear and readable, white background, at least 600 pixels wide.
- Name them by subject and question number, with the option letter or figure number when needed: phy-q1.png, phy-q4-fig1.png, chem-q4-a.png, math-q14.png.
- Use exactly these names in the "image" fields. Every picture named in questions.json must be in the zip, and nothing else.
- A simple table can be written in the text as LaTeX instead of a picture.

When you're done, give me both files to download, and list any question you weren't sure about (text you couldn't read, a missing answer, an unclear figure).`
