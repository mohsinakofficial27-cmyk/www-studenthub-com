import {
  mutate,
  read,
  todayISO,
  uid,
  type CardRow,
  type Database,
  type DeckRow,
  type NoteRow,
  type PlanId,
  type QuizRow,
  type TaskRow,
} from "./store";

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
    });
  });
}

export function updateCard(id: string, patch: Partial<CardRow>) {
  mutate((d) => {
    const c = d.flashcards.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
  });
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

export function recordAttempt(userId: string, quizId: string, answers: number[], score: number, total: number) {
  mutate((d) => {
    d.quiz_attempts.unshift({
      id: uid(),
      user_id: userId,
      quiz_id: quizId,
      answers,
      score,
      total,
      taken_at: new Date().toISOString(),
    });
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

/* ---------------- subscription ---------------- */

const PRICES: Record<PlanId, number> = { free: 0, student: 10, pro: 20 };

export function changePlan(userId: string, plan: PlanId) {
  mutate((d) => {
    const sub = d.subscriptions.find((s) => s.user_id === userId);
    if (!sub) return;
    sub.plan = plan;
    sub.status = "active";
    sub.started_at = todayISO();
    const renew = new Date();
    renew.setMonth(renew.getMonth() + 1);
    sub.renews_at = plan === "free" ? "" : renew.toISOString().slice(0, 10);
    if (plan !== "free") {
      sub.history.unshift({
        id: uid(),
        date: todayISO(),
        description: `${plan === "pro" ? "Pro" : "Student"} plan — test mode`,
        amount: PRICES[plan],
        status: "Test charge",
      });
    }
    d.notifications.unshift({
      id: uid(),
      user_id: userId,
      kind: "billing",
      title: plan === "free" ? "Subscription canceled" : `Upgraded to ${plan === "pro" ? "Pro" : "Student"}`,
      body:
        plan === "free"
          ? "You are back on the Free plan."
          : "Test mode: no real payment was taken. Connect a payment provider to go live.",
      created_at: new Date().toISOString(),
      read: false,
    });
  });
}

export function cancelPlan(userId: string) {
  mutate((d) => {
    const sub = d.subscriptions.find((s) => s.user_id === userId);
    if (!sub) return;
    sub.status = "canceled";
    d.notifications.unshift({
      id: uid(),
      user_id: userId,
      kind: "billing",
      title: "Subscription canceled",
      body: "Your plan stays active until the end of the billing period.",
      created_at: new Date().toISOString(),
      read: false,
    });
  });
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
  return iso.slice(0, 10);
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
    const key = cursor.toISOString().slice(0, 10);
    if (!studiedDays.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sorted = [...studiedDays].sort();
  let bestStreak = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const d = new Date(`${key}T00:00:00`);
    if (prev && (d.getTime() - prev.getTime()) / 86400000 === 1) run += 1;
    else run = 1;
    bestStreak = Math.max(bestStreak, run);
    prev = d;
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
      minutes: sessions.filter((s) => dayKey(s.ended_at) === key).reduce((sum, s) => sum + s.minutes, 0),
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
    ? Math.round((new Date(`${nextExam.date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000)
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
