import type { TaskRow } from "@/lib/store";

export function formatOcrText(value: string) {
  return value
    .replace(/\r/gu, "")
    .split(/\n+/u)
    .map((line) => line.replace(/[ \t]+/gu, " ").trim())
    .filter(Boolean)
    .map((line) =>
      /^[A-Z0-9][A-Z0-9 \-:]{2,50}$/u.test(line) && line.length < 52
        ? `## ${line}`
        : line,
    )
    .join("\n");
}

export function buildLocalCoachPlan(
  question: string,
  tasks: TaskRow[],
  today: string,
  dailyHours: number,
) {
  const openTasks = tasks.filter((task) => !task.done);
  const capacityMinutes = Math.max(30, Math.min(480, Math.round((dailyHours || 2) * 60)));
  const weekEnd = new Date(`${today}T00:00:00`);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndKey = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;
  const scheduled = new Map<string, TaskRow[]>();

  for (const task of openTasks) {
    const date = task.date < today ? today : task.date;
    if (date > weekEndKey) continue;
    const dayTasks = scheduled.get(date) ?? [];
    dayTasks.push(task);
    scheduled.set(date, dayTasks);
  }

  const priorityRank = { high: 0, medium: 1, low: 2 };
  const plan = [...scheduled.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, dayTasks]) => {
      const sorted = dayTasks.sort(
        (left, right) =>
          Number(right.is_exam) - Number(left.is_exam) ||
          priorityRank[left.priority] - priorityRank[right.priority] ||
          left.date.localeCompare(right.date),
      );
      let plannedMinutes = 0;
      const entries = sorted.map((task) => {
        const duration = Math.max(15, Math.min(120, task.minutes || (task.is_exam ? 60 : 25)));
        plannedMinutes += duration;
        const due = task.date < today ? "OVERDUE" : task.is_exam ? "EXAM" : task.date === today ? "DUE TODAY" : `due ${task.date}`;
        return `  • ${duration} min — ${task.subject ? `${task.subject}: ` : ""}${task.title} (${due})`;
      });
      return {
        date,
        entries,
        overloaded: plannedMinutes > capacityMinutes,
        total: plannedMinutes,
      };
    });

  const schedule = plan.length
    ? plan
        .map(
          (day) =>
            `${day.date === today ? "Today" : day.date} (${day.total} min${day.overloaded ? `; above your ${capacityMinutes}-minute daily target` : ""})\n${day.entries.join("\n")}`,
        )
        .join("\n")
    : "No unfinished tasks or exams are scheduled in the next 7 days.";
  const laterCount = openTasks.filter((task) => task.date > weekEndKey).length;
  const suggestion =
    plan.length && plan[0]?.overloaded
      ? "Today's deadlines exceed your daily target; start with the exam or highest-priority item, then move unfinished work in your planner."
      : "Start with the first listed item, work in a focused block, then check it off in your planner.";

  return `Local study plan (built from your saved planner; not AI-generated)\n\nYou asked: "${question.trim()}"\n\n${schedule}${laterCount ? `\n\n${laterCount} later task${laterCount === 1 ? " is" : "s are"} beyond this 7-day view; check your planner for those dates.` : ""}\n\nNext step: ${suggestion}`;
}

export function scoreVivaAnswer(answer: string) {
  const words = answer.trim().split(/\s+/u).filter(Boolean);
  const score = Math.min(
    10,
    Math.max(
      1,
      Math.round(words.length / 12) +
        (/[.!?]/u.test(answer) ? 2 : 0) +
        (/\b(because|therefore|for example|evidence|since)\b/iu.test(answer) ? 2 : 0),
    ),
  );
  const feedback =
    words.length < 12
      ? "Try expanding your response with a definition, one supporting reason, and a concrete example."
      : /\b(because|therefore|for example|evidence|since)\b/iu.test(answer)
        ? "You gave a reason or example. Strengthen it further by naming the evidence and connecting it directly to the question."
        : "You have a useful starting explanation. Add a clear reason, evidence, and a short example to make the answer more convincing.";
  return { score, feedback };
}
