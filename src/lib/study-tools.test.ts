import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildLocalCoachPlan, formatOcrText, scoreVivaAnswer } from "./study-tools";

describe("local study-tool helpers", () => {
  it("cleans OCR line spacing and structures all-caps headings", () => {
    assert.equal(
      formatOcrText("  CELL   BIOLOGY \r\n\nCells   are alive.  "),
      "## CELL BIOLOGY\nCells are alive.",
    );
  });

  it("returns bounded, explicitly heuristic viva feedback", () => {
    assert.equal(scoreVivaAnswer("").score, 1);
    const developedAnswer = scoreVivaAnswer(
      "The process changes over time because the evidence supports this example and explains how the result follows from the original observations.",
    );
    assert.ok(developedAnswer.score > 1);
    assert.ok(developedAnswer.score <= 10);
    assert.match(developedAnswer.feedback, /reason or example/u);
  });

  it("builds a local coach plan from real due dates and prioritizes exams", () => {
    const tasks = [
      {
        id: "assignment",
        user_id: "student",
        subject: "Biology",
        topic: "",
        title: "Lab report",
        date: "2026-11-20",
        time: "",
        minutes: 45,
        priority: "medium" as const,
        done: false,
        is_exam: false,
      },
      {
        id: "exam",
        user_id: "student",
        subject: "Math",
        topic: "",
        title: "Algebra exam",
        date: "2026-11-19",
        time: "",
        minutes: 60,
        priority: "low" as const,
        done: false,
        is_exam: true,
      },
    ];
    const plan = buildLocalCoachPlan("Help me prepare", tasks, "2026-11-19", 2);
    assert.ok(plan.indexOf("Algebra exam") < plan.indexOf("Lab report"));
    assert.match(plan, /EXAM/u);
    assert.match(plan, /2026-11-20/u);
    assert.match(plan, /not AI-generated/u);
  });
});
