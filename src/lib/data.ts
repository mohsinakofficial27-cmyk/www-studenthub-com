import {
  mutate,
  read,
  todayISO,
  uid,
  type CardRow,
  type CourseRow,
  type Database,
  type DeckRow,
  type NoteRow,
  type QuizAttemptRow,
  type QuizRow,
  type TaskRow,
  localDateKey,
} from "./store";

/* ---------------- courses ---------------- */

export function createCourse(userId: string, input: Partial<CourseRow>) {
  const id = uid();
  mutate((d) => {
    d.courses.push({
      id,
      user_id: userId,
      name: input.name?.trim() || "New course",
      instructor: input.instructor?.trim() ?? "",
      credits: Number(input.credits) || 3,
      grade: input.grade ?? "",
      target_grade: input.target_grade ?? "",
      color: input.color || "#0e7c66",
      created_at: new Date().toISOString(),
    });
  });
  return id;
}

export function updateCourse(id: string, patch: Partial<CourseRow>) {
  mutate((d) => {
    const c = d.courses.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
  });
}

export function deleteCourse(id: string) {
  mutate((d) => {
    d.courses = d.courses.filter((x) => x.id !== id);
  });
}

/* ---------------- GPA maths (estimates from the student's own entries) ------- */

const GRADE_POINTS: Record<string, number> = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  "D+": 1.3,
  D: 1.0,
  F: 0,
};

export const GRADE_OPTIONS = Object.keys(GRADE_POINTS);
export type GradingSystem = "gpa4" | "gpa5" | "percentage" | "letter" | "uk";

const GPA5_POINTS: Record<string, number> = {
  "A+": 5,
  A: 4.7,
  "A-": 4.5,
  "B+": 4.3,
  B: 4,
  "B-": 3.7,
  "C+": 3.3,
  C: 3,
  "C-": 2.7,
  "D+": 2.3,
  D: 2,
  "D-": 1.7,
  F: 0,
};

const UK_POINTS: Record<string, number> = {
  "First class": 4,
  "Upper second (2:1)": 3.3,
  "Lower second (2:2)": 2.7,
  "Third class": 2,
  Fail: 0,
};

export function gradeOptionsForSystem(system: GradingSystem): string[] {
  if (system === "percentage")
    return Array.from({ length: 21 }, (_, index) => String(100 - index * 5));
  if (system === "uk") return Object.keys(UK_POINTS);
  return GRADE_OPTIONS;
}

export function maximumGradePoints(system: GradingSystem): number {
  if (system === "gpa5") return 5;
  if (system === "percentage") return 100;
  return 4;
}

export function gradePoints(grade: string, system: GradingSystem = "gpa4"): number | null {
  if (system === "gpa5") return GPA5_POINTS[grade] ?? null;
  if (system === "percentage") {
    const percentage = Number(grade);
    return grade.trim() !== "" &&
      Number.isFinite(percentage) &&
      percentage >= 0 &&
      percentage <= 100
      ? percentage
      : null;
  }
  if (system === "uk") return UK_POINTS[grade] ?? null;
  return GRADE_POINTS[grade] ?? null;
}

/** Weighted GPA across graded courses. Returns null when nothing is graded. */
export function computeGpa(courses: CourseRow[], system: GradingSystem = "gpa4"): number | null {
  let points = 0;
  let credits = 0;
  for (const c of courses) {
    const p = gradePoints(c.grade, system);
    if (p === null) continue;
    points += p * c.credits;
    credits += c.credits;
  }
  if (!credits) return null;
  return Math.round((points / credits) * 100) / 100;
}

/** Required final-exam percentage to reach a target overall grade.
 *  current: current average %, weight: final worth as 0-1, target: desired overall % */
export function finalExamNeeded(current: number, weight: number, target: number): number | null {
  if (weight <= 0 || weight > 1) return null;
  const needed = (target - (1 - weight) * current) / weight;
  return Math.round(needed * 10) / 10;
}

/* ---------------- notes ---------------- */

export function createNote(userId: string, input: Partial<NoteRow>) {
  const id = uid();
  const now = new Date().toISOString();
  mutate((d) => {
    d.notes.unshift({
      id,
      user_id: userId,
      title: input.title?.trim() || "Untitled note",
      content: input.content ?? "",
      subject: input.subject ?? "General",
      favorite: false,
      created_at: now,
      updated_at: now,
    });
  });
  return id;
}

export function updateNote(id: string, patch: Partial<NoteRow>) {
  mutate((d) => {
    const n = d.notes.find((x) => x.id === id);
    if (n) Object.assign(n, patch, { updated_at: new Date().toISOString() });
  });
}

export function deleteNote(id: string) {
  mutate((d) => {
    d.notes = d.notes.filter((n) => n.id !== id);
  });
}

/** Local text analysis — no AI service is connected yet. */
export function summarise(content: string) {
  const sentences = content
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s/)
    .map((s) => s.trim())
    .filter(Boolean);
  const summary = sentences.slice(0, 3).join(" ");
  const key_points = sentences
    .slice(0, 6)
    .map((s) => (s.length > 120 ? `${s.slice(0, 117)}...` : s))
    .filter((s) => s.split(" ").length > 3);
  return { summary, key_points };
}

/* ---------------- tasks ---------------- */

export function createTask(userId: string, input: Omit<TaskRow, "id" | "user_id" | "done">) {
  mutate((d) => {
    d.study_tasks.push({ ...input, id: uid(), user_id: userId, done: false });
  });
}

export function updateTask(id: string, patch: Partial<TaskRow>) {
  mutate((d) => {
    const t = d.study_tasks.find((x) => x.id === id);
    if (t) Object.assign(t, patch);
  });
}

export function deleteTask(id: string) {
  mutate((d) => {
    d.study_tasks = d.study_tasks.filter((t) => t.id !== id);
  });
}

/* ---------------- flashcards ---------------- */

export function createDeck(userId: string, name: string, subject: string) {
  const id = uid();
  mutate((d) => {
    d.flashcard_decks.unshift({
      id,
      user_id: userId,
      name: name.trim() || "New deck",
      subject: subject || "General",
      created_at: new Date().toISOString(),
    });
  });
  return id;
}

export function deleteDeck(id: string) {
  mutate((d) => {
    d.flashcard_decks = d.flashcard_decks.filter((x) => x.id !== id);
    d.flashcards = d.flashcards.filter((c) => c.deck_id !== id);
  });
}

export function createCard(userId: string, deckId: string, front: string, back: string) {
  mutate((d) => {
    d.flashcards.push({
      id: uid(),
      user_id: userId,
      deck_id: deckId,
      front,
      back,
      confidence: "unrated",
      due_date: todayISO(),
      interval_days: 0,
      ease_factor: 2.5,
      repetitions: 0,
      review_count: 0,
      last_reviewed_at: null,
    });
  });
}

export function updateCard(id: string, patch: Partial<CardRow>) {
  mutate((d) => {
    const c = d.flashcards.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
  });
}

export type ReviewRating = "again" | "hard" | "good" | "easy";

export function reviewCard(id: string, rating: ReviewRating, now = new Date()) {
  const date = localDateKey(now);
  mutate((d) => {
    const card = d.flashcards.find((item) => item.id === id);
    if (!card) return;

    const quality = { again: 0, hard: 3, good: 4, easy: 5 }[rating];
    let interval = card.interval_days ?? 0;
    let repetitions = card.repetitions ?? 0;
    const ease = card.ease_factor ?? 2.5;
    const nextEase = Math.max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    if (quality < 3) {
      repetitions = 0;
      interval = 1;
    } else {
      interval =
        repetitions === 0 ? 1 : repetitions === 1 ? 6 : Math.max(1, Math.round(interval * ease));
      if (rating === "hard") interval = Math.max(1, Math.round(interval * 1.2));
      if (rating === "easy") interval = Math.max(1, Math.round(interval * 1.3));
      repetitions += 1;
    }

    const due = new Date(`${date}T12:00:00`);
    due.setDate(due.getDate() + interval);
    Object.assign(card, {
      confidence:
        rating === "again" || rating === "hard" ? "hard" : rating === "easy" ? "easy" : "medium",
      due_date: localDateKey(due),
      interval_days: interval,
      ease_factor: Math.round(nextEase * 100) / 100,
      repetitions,
      review_count: (card.review_count ?? 0) + 1,
      last_reviewed_at: now.toISOString(),
    });
  });
}

export function dueCards(cards: CardRow[], date = todayISO()) {
  return cards.filter((card) => !card.due_date || card.due_date <= date);
}

export function deleteCard(id: string) {
  mutate((d) => {
    d.flashcards = d.flashcards.filter((c) => c.id !== id);
  });
}

/** Turns note text into simple term/definition cards. Replace with AI later. */
export function cardsFromText(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.includes(":") || line.includes(" - "))
    .slice(0, 20)
    .map((line) => {
      const [front, ...rest] = line.split(/:| - /);
      return { front: (front ?? "").trim(), back: rest.join(": ").trim() };
    })
    .filter((c) => c.front && c.back);
}

/* ---------------- quizzes ---------------- */

export function createQuiz(userId: string, quiz: Omit<QuizRow, "id" | "user_id" | "created_at">) {
  const id = uid();
  mutate((d) => {
    d.quizzes.unshift({ ...quiz, id, user_id: userId, created_at: new Date().toISOString() });
  });
  return id;
}

/**
 * Quiz attempts are recorded server-side (src/lib/quiz.functions.ts grades the
 * answers against the stored quiz) and the database blocks direct client
 * INSERT/UPDATE on `quiz_attempts`. This helper only mirrors a server-returned
 * row into the in-memory store for display.
 */
export function applyAttempt(row: QuizAttemptRow) {
  mutate((d) => {
    d.quiz_attempts.unshift(row);
  });
}

export function applyLocalAttempt(row: QuizAttemptRow) {
  mutate((d) => {
    d.quiz_attempts.unshift({ ...row, local_only: true });
  });
}

/* ---------------- study sessions ---------------- */

export function logSession(userId: string, minutes: number, kind: "focus" | "break") {
  mutate((d) => {
    d.study_sessions.unshift({
      id: uid(),
      user_id: userId,
      minutes,
      kind,
      ended_at: new Date().toISOString(),
    });
  });
}

/* ---------------- deadline protection & week schedule ---------------- */

function dateKey(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return localDateKey(d);
}

export interface DeadlineSummary {
  overdue: TaskRow[];
  dueToday: TaskRow[];
  dueTomorrow: TaskRow[];
  dueThisWeek: TaskRow[]; // after tomorrow, within 7 days
  completedToday: number;
}

export function deadlineSummary(db: Database, userId: string): DeadlineSummary {
  const today = dateKey(0);
  const tomorrow = dateKey(1);
  const weekEnd = dateKey(6);
  const tasks = db.study_tasks.filter((t) => t.user_id === userId);
  return {
    overdue: tasks.filter((t) => !t.done && t.date < today),
    dueToday: tasks.filter((t) => !t.done && t.date === today),
    dueTomorrow: tasks.filter((t) => !t.done && t.date === tomorrow),
    dueThisWeek: tasks.filter((t) => !t.done && t.date > tomorrow && t.date <= weekEnd),
    completedToday: tasks.filter((t) => t.done && t.date === today).length,
  };
}

/** Minutes of planned (not done) study per day for the next 7 days. */
export function weekSchedule(
  db: Database,
  userId: string,
): { day: string; minutes: number; date: string }[] {
  const tasks = db.study_tasks.filter((t) => t.user_id === userId && !t.done);
  const out: { day: string; minutes: number; date: string }[] = [];
  for (let i = 0; i < 7; i += 1) {
    const key = dateKey(i);
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      minutes: tasks
        .filter((t) => t.date === key && !t.is_exam)
        .reduce((sum, t) => sum + t.minutes, 0),
      date: key,
    });
  }
  return out;
}

/* ---------------- derived stats ---------------- */

export interface Stats {
  streak: number;
  bestStreak: number;
  todayPercent: number;
  todayTasks: TaskRow[];
  totalHours: number;
  weekHours: number;
  quizAverage: number;
  tasksCompleted: number;
  nextExam: TaskRow | null;
  daysToExam: number | null;
  weekly: { day: string; minutes: number }[];
  subjects: { subject: string; average: number; attempts: number }[];
}

function dayKey(iso: string) {
  return localDateKey(new Date(iso));
}

function dateOrdinal(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

export function computeStats(db: Database, userId: string): Stats {
  const sessions = db.study_sessions.filter((s) => s.user_id === userId && s.kind === "focus");
  const tasks = db.study_tasks.filter((t) => t.user_id === userId);
  const attempts = db.quiz_attempts.filter((a) => a.user_id === userId);
  const today = todayISO();

  const studiedDays = new Set(sessions.map((s) => dayKey(s.ended_at)));
  let streak = 0;
  const cursor = new Date();
  if (!studiedDays.has(today)) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    const key = localDateKey(cursor);
    if (!studiedDays.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sorted = [...studiedDays].sort();
  let bestStreak = 0;
  let run = 0;
  let prevDay: string | null = null;
  for (const key of sorted) {
    if (prevDay && (dateOrdinal(key) - dateOrdinal(prevDay)) / 86400000 === 1) run += 1;
    else run = 1;
    bestStreak = Math.max(bestStreak, run);
    prevDay = key;
  }

  const todayTasks = tasks.filter((t) => t.date === today && !t.is_exam);
  const todayPercent = todayTasks.length
    ? Math.round((todayTasks.filter((t) => t.done).length / todayTasks.length) * 100)
    : 0;

  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekMinutes = sessions
    .filter((s) => new Date(s.ended_at) >= weekStart)
    .reduce((sum, s) => sum + s.minutes, 0);

  const weekly: { day: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    weekly.push({
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      minutes: sessions
        .filter((s) => dayKey(s.ended_at) === key)
        .reduce((sum, s) => sum + s.minutes, 0),
    });
  }

  const quizAverage = attempts.length
    ? Math.round((attempts.reduce((sum, a) => sum + a.score / a.total, 0) / attempts.length) * 100)
    : 0;

  const bySubject = new Map<string, { total: number; count: number }>();
  for (const a of attempts) {
    const quiz = db.quizzes.find((q) => q.id === a.quiz_id);
    if (!quiz) continue;
    const entry = bySubject.get(quiz.subject) ?? { total: 0, count: 0 };
    entry.total += (a.score / a.total) * 100;
    entry.count += 1;
    bySubject.set(quiz.subject, entry);
  }

  const exams = tasks
    .filter((t) => t.is_exam && t.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextExam = exams[0] ?? null;
  const daysToExam = nextExam
    ? Math.round(
        (new Date(`${nextExam.date}T00:00:00`).getTime() -
          new Date(`${today}T00:00:00`).getTime()) /
          86400000,
      )
    : null;

  return {
    streak,
    bestStreak: Math.max(bestStreak, streak),
    todayPercent,
    todayTasks,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    weekHours: Math.round((weekMinutes / 60) * 10) / 10,
    quizAverage,
    tasksCompleted: tasks.filter((t) => t.done).length,
    nextExam,
    daysToExam,
    weekly,
    subjects: [...bySubject.entries()].map(([subject, v]) => ({
      subject,
      average: Math.round(v.total / v.count),
      attempts: v.count,
    })),
  };
}

export function scopedRows<T extends { user_id: string }>(rows: T[], userId: string) {
  return rows.filter((r) => r.user_id === userId);
}

export function currentDb() {
  return read();
}

export type { DeckRow, NoteRow, QuizRow, TaskRow };
