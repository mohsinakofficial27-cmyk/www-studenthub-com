/**
 * AI integration boundary.
 *
 * No AI provider is connected yet. Nothing in this app calls a model — the
 * responses below are clearly-labelled offline study prompts, not model output.
 *
 * TO CONNECT A REAL MODEL
 * -----------------------
 * 1. Add the provider key as a server-side secret (e.g. `AI_API_KEY`).
 *    Never put it in client code or a `VITE_` variable.
 * 2. Create `src/lib/ai.functions.ts` with a `createServerFn` handler that
 *    reads `process.env['AI_API_KEY']` inside `.handler()` and calls the API.
 * 3. Replace the body of `askAssistant` / `generateQuizQuestions` with a call
 *    to that server function. The rest of the UI needs no changes.
 */

export const AI_CONNECTED = false;
export const AI_SETUP_MESSAGE =
  "AI service is not configured. Add LOVABLE_API_KEY to the server environment and restart the app.";
export const AI_USAGE_SETUP_MESSAGE =
  "AI usage tracking is not configured in Supabase; using the local study fallback.";

export function isAiSetupIssue(message: string) {
  return /AI service isn't configured|AI service is not configured|LOVABLE_API_KEY/i.test(message);
}

export const AI_MODES = [
  { id: "explain", label: "Explain Simply" },
  { id: "steps", label: "Step-by-Step" },
  { id: "exam", label: "Exam Prep" },
  { id: "summarize", label: "Summarize" },
  { id: "quiz", label: "Quiz Me" },
  { id: "math", label: "Math Solver" },
  { id: "essay", label: "Essay Assistant" },
  { id: "research", label: "Research Assistant" },
  { id: "homework", label: "Homework Explainer" },
  { id: "language", label: "Language Learning" },
] as const;

export type AiMode = (typeof AI_MODES)[number]["id"];

const FRAMES: Record<AiMode, (q: string) => string> = {
  explain: (q) =>
    `Offline study guide — "${q}"\n\nStart from the plainest version of the idea, then add detail:\n1. Say it in one sentence, no jargon.\n2. Give one everyday comparison.\n3. Name the one condition where it stops working.\n\nWrite your own answer to each line above, then check it against your notes.`,
  steps: (q) =>
    `Offline study guide — "${q}"\n\nWork it as a procedure:\n1. Write down what you are given.\n2. Write down what you are asked for.\n3. Name the rule or formula that links them.\n4. Apply it, showing each substitution.\n5. Sanity-check the units and the size of the answer.`,
  exam: (q) =>
    `Offline study guide — "${q}"\n\nExam drill:\n- Two definitions you must be able to state cold.\n- One worked example you can reproduce from memory.\n- One common trap examiners use here.\n- A 10-minute timed question to attempt tonight.`,
  summarize: (q) =>
    `Offline study guide — "${q}"\n\nCompress it:\n- Core claim in one line.\n- Three supporting points, five words each.\n- One example.\n- One thing it is often confused with.`,
  quiz: (q) =>
    `Offline study guide — "${q}"\n\nSelf-test:\n1. Define the main term without looking.\n2. Give an example and a non-example.\n3. Explain it to someone two years below you.\n4. Where would this appear in an exam question?`,
  math: (q) =>
    `Offline math practice — "${q}"\n\nWrite down what is known, choose a rule that connects it to the unknown, and show each operation. Check the result by substituting it back into the original problem.`,
  essay: (q) =>
    `Offline writing guide — "${q}"\n\nBrainstorm three possible claims. Choose one you can support with evidence, outline the reasoning, then revise for clarity and grammar while keeping your own voice.`,
  research: (q) =>
    `Offline research guide — "${q}"\n\nTurn the topic into a focused question. List the evidence you still need, record sources as you verify them, and label any generated ideas as suggestions rather than facts.`,
  homework: (q) =>
    `Offline homework guide — "${q}"\n\nIdentify what the question asks, break it into smaller steps, and explain the idea behind each step. Try a similar example to check your understanding.`,
  language: (q) =>
    `Offline language practice — "${q}"\n\nWrite a short response in your target language, note one new word, and check its grammar and pronunciation using a trusted learning source.`,
};

export interface AskResult {
  content: string;
  offline: boolean;
}

export async function askAssistant(question: string, mode: AiMode): Promise<AskResult> {
  await new Promise((r) => setTimeout(r, 450));
  return { content: FRAMES[mode](question.trim()), offline: !AI_CONNECTED };
}

/* ---------------- quiz generation ---------------- */

export interface GeneratedQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

const BANK: Record<string, GeneratedQuestion[]> = {
  Mathematics: [
    {
      id: "m1",
      prompt: "What is the derivative of x³?",
      options: ["3x²", "x²", "3x", "x⁴/4"],
      answer: 0,
      explanation: "Power rule: d/dx xⁿ = n·xⁿ⁻¹, so x³ becomes 3x².",
    },
    {
      id: "m2",
      prompt: "∫ 2x dx equals:",
      options: ["x² + C", "2 + C", "x + C", "2x² + C"],
      answer: 0,
      explanation: "Raise the power and divide: 2x → 2·x²/2 = x², plus a constant.",
    },
    {
      id: "m3",
      prompt: "The sine of 90° is:",
      options: ["0", "1", "0.5", "Undefined"],
      answer: 1,
      explanation: "sin reaches its maximum of 1 at 90°.",
    },
    {
      id: "m4",
      prompt: "Solve: 3x + 6 = 21",
      options: ["3", "5", "7", "9"],
      answer: 1,
      explanation: "3x = 15, so x = 5.",
    },
    {
      id: "m5",
      prompt: "The gradient of a line through (0,1) and (2,5) is:",
      options: ["1", "2", "3", "4"],
      answer: 1,
      explanation: "(5 − 1) / (2 − 0) = 2.",
    },
  ],
  Science: [
    {
      id: "s1",
      prompt: "Newton's second law is written as:",
      options: ["F = ma", "E = mc²", "v = u + at", "P = IV"],
      answer: 0,
      explanation: "Force equals mass times acceleration.",
    },
    {
      id: "s2",
      prompt: "Which organelle produces most of a cell's ATP?",
      options: ["Nucleus", "Ribosome", "Mitochondrion", "Golgi body"],
      answer: 2,
      explanation: "Aerobic respiration happens in the mitochondria.",
    },
    {
      id: "s3",
      prompt: "The pH of a neutral solution at 25°C is:",
      options: ["0", "7", "10", "14"],
      answer: 1,
      explanation: "Neutral water has equal H⁺ and OH⁻ concentrations, pH 7.",
    },
    {
      id: "s4",
      prompt: "Photosynthesis mainly takes place in the:",
      options: ["Root hair", "Chloroplast", "Vacuole", "Cell wall"],
      answer: 1,
      explanation: "Chloroplasts hold chlorophyll, which absorbs light energy.",
    },
    {
      id: "s5",
      prompt: "The SI unit of electrical resistance is the:",
      options: ["Volt", "Ampere", "Ohm", "Watt"],
      answer: 2,
      explanation: "Resistance is measured in ohms (Ω).",
    },
  ],
  English: [
    {
      id: "e1",
      prompt: "A metaphor differs from a simile because it:",
      options: ["Uses 'like' or 'as'", "States one thing is another", "Rhymes", "Repeats sounds"],
      answer: 1,
      explanation: "A simile compares with 'like'/'as'; a metaphor asserts the identity directly.",
    },
    {
      id: "e2",
      prompt: "Which word is an adverb?",
      options: ["Quick", "Quickly", "Quickness", "Quicken"],
      answer: 1,
      explanation: "Adverbs usually modify verbs; 'quickly' does.",
    },
    {
      id: "e3",
      prompt: "The narrator in a first-person story uses:",
      options: ["'I'", "'You'", "'He/She'", "'They' only"],
      answer: 0,
      explanation: "First person is told from inside the character, using 'I'.",
    },
    {
      id: "e4",
      prompt: "Alliteration is the repetition of:",
      options: ["Vowel sounds", "Initial consonant sounds", "Whole words", "Line lengths"],
      answer: 1,
      explanation: "It repeats the consonant sound at the start of nearby words.",
    },
    {
      id: "e5",
      prompt: "A thesis statement belongs:",
      options: ["In the conclusion only", "In the introduction", "In every paragraph", "Nowhere"],
      answer: 1,
      explanation: "It sets out the argument the essay will defend, up front.",
    },
  ],
  History: [
    {
      id: "h1",
      prompt: "A primary source is:",
      options: ["A textbook", "A first-hand record", "A documentary", "An encyclopedia"],
      answer: 1,
      explanation: "Primary sources come from the period or participants themselves.",
    },
    {
      id: "h2",
      prompt: "The Industrial Revolution began in:",
      options: ["France", "Britain", "Germany", "The USA"],
      answer: 1,
      explanation: "It started in Britain in the late 18th century.",
    },
    {
      id: "h3",
      prompt: "'Causation' in history means:",
      options: [
        "Order of events",
        "Why events happened",
        "Who wrote a source",
        "How long an era lasted",
      ],
      answer: 1,
      explanation: "Causation asks what made an event occur.",
    },
    {
      id: "h4",
      prompt: "The Second World War ended in:",
      options: ["1918", "1939", "1945", "1949"],
      answer: 2,
      explanation: "Fighting ended in 1945.",
    },
    {
      id: "h5",
      prompt: "Bias in a source means it:",
      options: ["Is always false", "Leans to one view", "Is unreadable", "Has no date"],
      answer: 1,
      explanation: "Biased sources are still useful — you read them for perspective.",
    },
  ],
};

export const QUIZ_SUBJECTS = Object.keys(BANK);

export interface GenerateQuizInput {
  subject: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  count: number;
}

export async function generateQuizQuestions(
  input: GenerateQuizInput,
): Promise<GeneratedQuestion[]> {
  await new Promise((r) => setTimeout(r, 500));
  const pool = BANK[input.subject] ?? BANK["Mathematics"]!;
  const picked: GeneratedQuestion[] = [];
  for (let i = 0; i < input.count; i += 1) {
    const base = pool[i % pool.length]!;
    picked.push({ ...base, id: `${base.id}-${i}` });
  }
  return picked;
}
